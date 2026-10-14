import type {World} from '../world';
import type {ExpeditionState,Payment} from '../expedition-state';
import {LINE_SKILLS,PRODUCTION_LINES,type ProductionLineId} from '../../data/expedition-buildings';
import type {FamilyId} from '../../data/races';
import {activeGroupOutputs,applyPlacement,grantFacility,linesFor,placementDraft,setGroupEnabled,setGroupOutputs,type BuildingState,type FacilityKind,type PlacementDraft,type ProductionGroup,type Talents} from './rules';

/** Bind a new-run module to the native window. No legacy-archive conversion occurs here. */
export function buildingContext(s:ExpeditionState,stage:number,window:number,phase:BuildingState['phase'],wallet?:Payment,talents?:Partial<Talents>):BuildingState|null {
 const b=s.building;if(!b)return null;
 b.race=s.race;b.stage=stage;b.window=window;b.phase=phase;b.tech=s.tech;
 b.direction=s.developmentDirection??linesFor(s.race)[0];b.revision=s.shopRevision;b.bought=s.developmentBought;
 b.baseRefreshUsed=s.freeRefresh.building<=0;b.bonusRefresh=s.bonusRefreshRemaining;b.paidRefresh=s.refreshCount;
 b.frozenTarget=s.frozenDevelopmentTarget;
 if(wallet)b.wallet=wallet;if(talents)Object.assign(b.talents,talents);
 return b;
}
export function readBuildingContext(s:ExpeditionState,stage:number,window:number,phase:BuildingState['phase'],wallet?:Payment):BuildingState|null {
 const b=s.building;if(!b)return null;
 return {...b,race:s.race,tech:s.tech,wallet:wallet??b.wallet,stage,window,phase,direction:s.developmentDirection??linesFor(s.race)[0],revision:s.shopRevision,bought:s.developmentBought,baseRefreshUsed:s.freeRefresh.building<=0,bonusRefresh:s.bonusRefreshRemaining,paidRefresh:s.refreshCount,frozenTarget:s.frozenDevelopmentTarget};
}
export function worldBuildingContext(w:World):BuildingState|null {
 const s=w.expedition;if(!s)return null;
 const phase=w.phase==='reward'?w.rewardRound==='building'?'building':'shop':w.phase==='menu'?'building':'front';
 const stage=w.phase==='reward'?w.draftStage:Math.max(0,w.stage-1);
 const talents=Object.fromEntries(['permanent_discount','frugal_build','free_house','double_build','instant_tech','window_shop','reroll_fan'].map(id=>[id,w.talent(id)])) as unknown as Talents;
 return buildingContext(s,stage,w.draftWindowId,phase,w.wallet,talents);
}
/** Presentation never draws offers or changes the native state. */
export function buildingViewState(w:World):BuildingState|null {
 const s=w.expedition,b=s?.building;if(!b)return null;
 return readBuildingContext(s,w.phase==='reward'?w.draftStage:Math.max(0,w.stage-1),w.draftWindowId,w.phase==='reward'?w.rewardRound==='building'?'building':'shop':w.phase==='menu'?'building':'front',w.wallet);
}
/** Native compatibility views are projections; scheduling and UI drafts read producer groups. */
export function syncBuildingViews(s:ExpeditionState,b=s.building) {
 if(!b)return;
 b.tech=s.tech;
 const old=new Map(s.facilities.map(f=>[f.id,f]));
 s.facilities=b.groups.flatMap(g=>g.ids.map(id=>({id,kind:g.kind,line:g.kind==='hatchery'?g.directions.includes('ground')?'zerg.evolution' as const:g.directions.includes('air')?'zerg.air' as const:'zerg.basic' as const:g.line,techLab:old.get(id)?.techLab??false})));
 s.nextFacility=b.nextFacility;
 const production:ExpeditionState['production']={};
 for(const line of linesFor(s.race)){
  const groups=b.groups.filter(g=>g.kind==='hatchery'?g.directions.includes(line==='zerg.air'?'air':'ground')||line==='zerg.basic':g.kind!=='crystal'&&g.line===line);
  const outputs=[...new Set(groups.flatMap(g=>g.outputs).filter(f=>PRODUCTION_LINES[line].families.includes(f)))].slice(0,2);
  production[line]={outputs,enabled:Object.fromEntries(outputs.map(f=>[f,groups.some(g=>activeGroupOutputs(g).includes(f))])),cursor:groups[0]?.cursor??0};
 }
 s.production=production;
}
export function syncBuildingWindow(s:ExpeditionState,b:BuildingState) {
 s.shopRevision=b.revision;s.developmentBought=b.bought;s.developmentDirection=b.direction;
 s.freeRefresh.building=b.baseRefreshUsed?0:1;s.bonusRefreshRemaining=b.bonusRefresh;s.refreshCount=b.paidRefresh;
 syncBuildingViews(s,b);
}
export function resetBuildingWindow(s:ExpeditionState,stage:number,window:number) {
 const b=buildingContext(s,stage,window,'building');if(!b)return;
 b.offers={};b.quotes={};
}
export function syncBuildingEffects(w:World) {
 const s=w.expedition;syncBuildingViews(s);
 for(const skills of Object.values(LINE_SKILLS))for(const [id] of skills)if(s.tech[id])w.upgrades.set(id,s.tech[id]);
 for(const u of w.allies())w.refreshStats(u);
}
export const productionGroups=(s:ExpeditionState):readonly ProductionGroup[]=>s.building?.groups??[];
export const selectedProductionFamilies=(s:ExpeditionState)=>new Set(productionGroups(s).flatMap(activeGroupOutputs));
export function beginBuildingPlacement(w:World):PlacementDraft|null {
 const b=worldBuildingContext(w);return b?placementDraft(b):null;
}
export function commitBuildingPlacement(w:World,draft:PlacementDraft) {
 if(!['menu','reward','battle'].includes(w.phase)||w.requiresPlayerDecision)return false;
 const b=worldBuildingContext(w);if(!b||!applyPlacement(b,draft).ok)return false;
 syncBuildingWindow(w.expedition,b);w.changed();return true;
}
export function updateBuildingGroupOutputs(w:World,id:string,outputs:FamilyId[]) {
 const b=worldBuildingContext(w);if(!b||!['menu','reward'].includes(w.phase)||!setGroupOutputs(b,id,outputs).ok)return false;
 syncBuildingWindow(w.expedition,b);w.changed();return true;
}
export function updateBuildingGroupEnabled(w:World,id:string,enabled:boolean) {
 const b=worldBuildingContext(w);if(!b||!['menu','reward','battle'].includes(w.phase)||!setGroupEnabled(b,id,enabled).ok)return false;
 syncBuildingWindow(w.expedition,b);w.changed();return true;
}
/** Trusted facility reward port. Future event/equipment transactions must call it after validating their receipt. */
export function grantProductionFacility(w:World,kind:FacilityKind) {
 const b=worldBuildingContext(w);if(!b)return null;
 const group=grantFacility(b,kind);if(!group)return null;
 b.revision++;syncBuildingWindow(w.expedition,b);syncBuildingEffects(w);w.changed();return group;
}
