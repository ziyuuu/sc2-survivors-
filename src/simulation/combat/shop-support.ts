import {takeArmedProc} from './armed-procs';
import {armedContact} from './armed-nodes';
import {ARMED_CARD_BY_ID} from '../../data/terran-armed-support';
import {armedItemModifiers} from './armed-fields';
import {armedRank} from '../progression/build-progress';
import {tickArmedSupport} from './armed-support';
import {armedManualNuke,commitArmedNuke,manualVolleyPending} from './armed-nukes';
import {consumeEquipmentReactor} from '../starship/support';
import {newArmedSupport,type ArmedSupportState} from './armed-support-state';
import {STRATEGIC_BASE_DAMAGE,SUPPORT_FIRST_READY_SECONDS} from '../../data/shop-support';
import {equipmentCardDamage} from '../starship/card-effects';
import {hitFrom} from '../observation';
import {newUniqueSupport,tickUnique,uniqueLegal,buyUnique,type UniqueSupportState} from './unique-support';
import {UNIQUE_SUPPORT,type UniqueSupportId} from '../../data/unique-support';
import type {World} from '../world';
import type {Body,Entity,Point} from '../types';
import {TRACKING_MINE,advanceTrackingMine,newSupportMine,minePlacementLegal,type SupportMine} from './tracking-mines';
export type SupportCard='mines'|'bombardment'|'mutation'|'strategic'|UniqueSupportId;
export interface ShopSupportState {armed?:ArmedSupportState;unique:UniqueSupportState;levels:Record<'mines'|'bombardment'|'mutation',number>;ammo:number;stageReceipt:string;minePending:number;mineRetryAt:number;mines:SupportMine[];bombardAt:number;impacts:{id:number;kind:'bombardment'|'strategic';point:Point;at:number;damage?:number}[];burns:{id:number;source:number;target:number;damage:number;next:number;until:number;armedCardId?:import('../progression/build-progress').ArmedId}[];}
export const newShopSupport=():ShopSupportState=>({armed:newArmedSupport(),unique:newUniqueSupport(),levels:{mines:0,bombardment:0,mutation:0},ammo:0,stageReceipt:'',minePending:0,mineRetryAt:0,mines:[],bombardAt:0,impacts:[],burns:[]});
export const mutationFamily=(race:string)=>race==='terran'?'marine':race==='zerg'?'hydralisk':'stalker';
export function supportLegal(w:World,kind:SupportCard){if(kind in UNIQUE_SUPPORT)return uniqueLegal(w,kind as UniqueSupportId);return kind==='strategic'||w.expedition.support.levels[kind as keyof ShopSupportState['levels']]<3&&(kind!=='mutation'||w.expedition.familySlots.includes(mutationFamily(w.expedition.race)));}
export function buySupport(w:World,kind:SupportCard){if(kind in UNIQUE_SUPPORT)return buyUnique(w,kind as UniqueSupportId);if(!supportLegal(w,kind))return false;const s=w.expedition.support;if(kind==='strategic')s.ammo++;else{s.levels[kind as keyof ShopSupportState['levels']]++;if(kind==='bombardment'&&s.levels.bombardment===1)s.bombardAt=w.time+SUPPORT_FIRST_READY_SECONDS;}return true;}
function open(w:World,p:Point){return Number.isFinite(p.x)&&Number.isFinite(p.z)&&(w.terrain?(w.terrain.isOpen?.(p)??w.terrain.canOccupy(p,0)):Math.abs(p.x)<=76&&Math.abs(p.z)<=76);}
export function previewStrategic(w:World,p:Point){return w.phase==='battle'&&!w.paused&&!w.requiresPlayerDecision&&w.expedition.support.ammo>0&&!w.expedition.support.impacts.some(i=>i.kind==='strategic')&&!manualVolleyPending(w)&&open(w,p);}
export function commitStrategic(w:World,p:Point){if(!previewStrategic(w,p))return false;if(armedManualNuke(w))return commitArmedNuke(w,'manual',p);const s=w.expedition.support,point={x:p.x,z:p.z};consumeEquipmentReactor(w);s.ammo--;s.impacts.push({id:w.nextId++,kind:'strategic',point,at:w.time+3,damage:equipmentCardDamage(w,STRATEGIC_BASE_DAMAGE)});visual(w,'hero-warning',point,8,3);w.changed();return true;}
export function recordMutation(w:World,u:Entity,target:Body,damage:number){const s=w.expedition.support,rank=s.levels.mutation;if(!rank||u.team!=='player'||u.heroId||u.summonKind||u.unitType!==mutationFamily(w.expedition.race)||target.hp<=0||damage<=0)return;
 if(w.expedition.race==='terran'&&w.expedition.support.armed?.ranks.G08&&(w.tick<(s.armed!.readyTick.G08??0)||w.random()>=ARMED_CARD_BY_ID.G08.params.chance[rank-1]))return;
 if(s.armed?.ranks.G08)s.armed.readyTick.G08=w.tick+Math.ceil(ARMED_CARD_BY_ID.G08.params.cd*60);
 const layers=s.burns.filter(b=>b.source===u.id&&b.target===target.id).sort((a,b)=>a.until-b.until||a.id-b.id),tickDamage=damage*(w.expedition.race==='terran'?ARMED_CARD_BY_ID.G08.params.factor[rank-1]:[0,.3,.45,.6][rank])/ARMED_CARD_BY_ID.G08.params.duration;
 // Refresh a full stack without postponing its pending tick at high attack speed.
 if(layers.length>=3){layers[0].damage=tickDamage;layers[0].until=w.time+3;return;}
 s.burns.push({id:w.nextId++,source:u.id,target:target.id,damage:tickDamage,next:w.time+1,until:w.time+3});
}
function victims(w:World):Body[]{return [...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])].filter(b=>b.owner==='zerg'&&b.hp>0);}
function areaHit(w:World,p:Point,damage:number,radius:number,observedSource:string){for(const b of victims(w))if(Math.hypot(p.x-b.x,p.z-b.z)<=radius+b.unitRadius){hitFrom(w,observedSource,b,damage,[],1,'terran',0);if(observedSource==='terran.mines')armedContact(w,'G01',b);}supportImpact(w,p,radius>3?'strategic':'support',observedSource.endsWith('.mines')&&w.expedition.race==='terran'?'mine':w.expedition.race==='terran'?'bombardTerran':w.expedition.race==='zerg'?'bombardZerg':'bombardProtoss');}
/** Saved simulation timers; no wall-clock scheduling and no damage in rendering. */
export function tickShopSupport(w:World){if(w.phase!=='battle'||w.paused||w.requiresPlayerDecision)return;tickArmedSupport(w);tickUnique(w);const s=w.expedition.support,key=`${w.runId}:${w.endless?'endless:'+w.endless.round:w.stage}`;
 if(s.stageReceipt!==key){s.stageReceipt=key;s.mines=[];s.minePending=w.expedition.support.armed?.ranks.G01?0:w.expedition.race==='terran'?(s.levels.mines?ARMED_CARD_BY_ID.G01.params.count[s.levels.mines-1]:0):[0,6,9,12][s.levels.mines];s.mineRetryAt=w.time;}
 if(s.armed?.ranks.G01&&w.tick>=(s.armed.readyTick.G01??0)&&s.mines.length<ARMED_CARD_BY_ID.G01.params.count[s.armed.ranks.G01-1]&&takeArmedProc(w,'G01')){s.minePending=ARMED_CARD_BY_ID.G01.params.count[s.armed.ranks.G01-1]-s.mines.length;s.armed.readyTick.G01=w.tick+ARMED_CARD_BY_ID.G01.params.cd*60;s.mineRetryAt=w.time;}
 if(s.minePending&&w.time>=s.mineRetryAt){s.mineRetryAt=w.time+1;const cells=w.terrain?.connectedLocations?.(w.anchor,.3,.4)??[];for(let i=0,count=s.minePending;i<count;i++){let point:Point|null=null;for(let attempt=0;attempt<24;attempt++){const p=cells.length?cells[Math.floor(w.random()*cells.length)]:{x:(w.random()*2-1)*(w.mapHalf-2),z:(w.random()*2-1)*(w.mapHalf-2)};if(open(w,p)&&(w.expedition.race!=='terran'||minePlacementLegal(w,p))&&(!w.terrain||w.terrain.canOccupy(p,.3))&&s.mines.every(m=>Math.hypot(p.x-m.point.x,p.z-m.point.z)>1)){point={...p};break;}}if(point){const mine=newSupportMine(w.nextId++,point);if(w.expedition.race==='terran'&&armedRank(w.expedition.support,'N04')){const item=armedItemModifiers(w);mine.discovery=ARMED_CARD_BY_ID.N04.params.mineDetect*item.radius;mine.blast=ARMED_CARD_BY_ID.N04.params.mineRadius*item.radius;item.commit();}s.mines.push(mine);s.minePending--;}}}
 if(!s.mines.length&&!s.levels.bombardment&&!s.impacts.length&&!s.burns.length)return;
 const enemies=[...w.entities.values()].filter(e=>e.owner==='zerg'&&e.hp>0&&w.visibleTo(e,'terran'));
 for(const mine of [...s.mines])if(w.expedition.race==='terran'?advanceTrackingMine(w,mine,enemies,{...TRACKING_MINE,discovery:mine.discovery??TRACKING_MINE.discovery}):enemies.some(e=>!e.flying&&Math.hypot(e.x-mine.point.x,e.z-mine.point.z)<=1.2)){s.mines=s.mines.filter(m=>m.id!==mine.id);areaHit(w,mine.point,equipmentCardDamage(w,TRACKING_MINE.damage),mine.blast??TRACKING_MINE.blast,w.expedition.race+'.mines');}
 if(s.levels.bombardment&&w.time+1e-8>=s.bombardAt&&enemies.length){const target=enemies[Math.floor(w.random()*enemies.length)],point={x:target.x,z:target.z};s.impacts.push({id:w.nextId++,kind:'bombardment',point,at:w.time+.75,damage:equipmentCardDamage(w,180)});s.bombardAt=w.time+[0,20,15,10][s.levels.bombardment];visual(w,'hero-warning',point,2.5,.75);}
 const due=s.impacts.filter(i=>i.at<=w.time+1e-8);s.impacts=s.impacts.filter(i=>i.at>w.time+1e-8);for(const i of due)areaHit(w,i.point,i.damage??(i.kind==='strategic'?3000:180),i.kind==='strategic'?8:2.5,w.expedition.race+'.'+i.kind);
 for(const b of s.burns){const target=w.entities.get(b.target);if(!target||target.hp<=0)continue;while(b.next<=w.time+1e-8&&b.next<=b.until+1e-8){hitFrom(w,b.armedCardId?'armed.'+b.armedCardId:w.expedition.race+'.mutation',target,b.damage,[],1,'terran',0,0,b.source);if(w.expedition.race==='terran')w.effect('flame',target,target,.3,.2);else w.visual(w.expedition.race==='zerg'?'bile-impact':'support-pulse',{...target,id:0});b.next+=1;}}
 s.burns=s.burns.filter(b=>b.until>w.time+1e-8&&(w.entities.get(b.target)?.hp??0)>0);
}

function visual(w:World,kind:'hero-warning'|'explosion',point:Point,radius:number,seconds:number){w.effects.push({id:w.nextId++,kind,...point,end:{...point},radius,until:w.time+seconds,owner:'terran',source:0});}

function supportImpact(w:World,p:Point,kind:'strategic'|'support',supportSound:string){
 w.visual(kind==='strategic'?'strategic-impact':'support-impact',{x:p.x,z:p.z,id:0,owner:'terran',hp:0,maxHp:0,armor:0,unitRadius:0,flying:false,attributes:[]},p,undefined,undefined,{supportSound});
}
