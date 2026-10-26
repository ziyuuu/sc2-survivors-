import {ALL_FAMILIES,familyRace,RACES} from '../../src/data/races';
import {SC2_UNITS,HYDRALISK_MELEE} from '../../src/data/sc2-units';
import {HEROES} from '../../src/data/heroes';
import {ELITES} from '../../src/data/elites';
import {ENEMY_NAMES} from '../../src/data/enemies';
import {DEVELOPMENT} from '../../src/data/expedition-buildings';
import {EQUIPMENT_TEMPLATES} from '../../src/simulation/starship/catalog';
import {LAB_CASES} from '../../src/diagnostics/fun-lab-cases';
import {FUN_SHOP_IDS,funShopCatalogue} from '../../src/simulation/fun-shop/state';
import {MAP_THEMES} from '../../src/data/campaign-map';
import nativeCards from './native-cards.generated.json';
import developmentCases from './development.generated.json';
import equipmentCases from './equipment.generated.json';
import {equipmentPreviewCases} from './equipment-preview-spec';
import {FAMILY_MODES} from '../../src/simulation/combat/family-actions';
import type {CombatUnitType} from '../../src/data/sc2-units';
import {cardEffectSeconds} from './card-effect-fixture';
import {actorAttackBranches} from './actor-branches';
import {ENEMY_CASES,type EnemyFixture} from './enemy-catalogue';
import {PRESENTATION_CASES} from './presentation-repair-fixture';
export type Case={id:string;group:string;name:string;runner:string;source:string[];actor?:string;family?:string;race?:string;rank?:number;action?:string;target?:string;seconds?:number;data?:unknown;applicability?:{kind:'not-applicable';reason:string};fixture?:{mode?:string;targetEdgeDistance?:number;weapon?:string;selectedWeapon?:string;via?:'native-interceptor';cadence?:'hydralisk-close';enemy?:EnemyFixture}};
const simulation='src/simulation/world.ts',renderer='src/render/scene/battle-renderer.ts';
const actorRows:Case[]=[];
function actor(actor:string,name:string,family:string,race:string,source:string,hero=false){
 const pureHealer=!hero&&['medivac','science_vessel'].includes(family),type=SC2_UNITS[family as CombatUnitType].targetType,branches=actorAttackBranches(actor,family);
 const labels:Record<string,string>={spawn:'出生',idle:'待机',move:'移动',attack:'攻击',heal:'治疗',hit:'受击',death:'死亡',skill:'主动技能',ability:'手动能力','auto-ability':'自动技能',stim:'兴奋剂',refraction:'护盾储能与折射'};
 for(let rank=1;rank<=5;rank++){
  const base={group:hero?'英雄':actor.startsWith('elite.')?'精英':'普通单位',runner:'actor',actor,family,race,rank,source:[source,simulation,renderer,'src/render/loaders/animations.ts']};
  const primary=type==='air'?'air':'ground',noAttack=branches.length===0;
  for(const action of ['spawn','idle','move',pureHealer?'heal':'attack','hit','death',...(hero?['skill']:[])])actorRows.push({...base,id:`actor:${actor}:${rank}:${action}`,name:`${name} · ${rank}级 · ${labels[action]}`,action,target:primary,seconds:action==='skill'?16:action==='death'?7:action==='heal'?20:6,...(action==='attack'&&noAttack?{applicability:{kind:'not-applicable' as const,reason:family==='lurker'?'地表形态无武器；攻击见埋地形态。':'该精英坦克只允许架炮后开火；攻击见架炮形态。'},source:[...base.source,'src/data/expansion-units.ts','src/simulation/combat/terran-elite-runtime.ts']}:{})});
  if(!pureHealer){
   const seen=new Set<string>([primary]);
   for(const b of branches){
    if(!seen.has(b.plane)){actorRows.push({...base,id:`actor:${actor}:${rank}:attack-${b.plane}`,name:`${name} · ${rank}级 · 对${b.plane==='air'?'空':'地'}攻击`,action:'attack',target:b.plane,seconds:6,fixture:{selectedWeapon:b.selectedWeapon,weapon:b.weapon,via:b.via}});seen.add(b.plane);}
    else if(branches.filter(x=>x.plane===b.plane).indexOf(b)>0)actorRows.push({...base,id:`actor:${actor}:${rank}:attack-${b.plane}:${b.weapon}`,name:`${name} · ${rank}级 · ${b.plane==='air'?'对空':'对地'} ${b.weapon}`,action:'attack',target:b.plane,seconds:6,fixture:{targetEdgeDistance:(b.minimumRange+b.range)/2,weapon:b.weapon,selectedWeapon:b.selectedWeapon}});
   }
  }
  // The native near-distance cadence branch also applies to hero base bodies
  // and air targets. It does not imply a separate melee weapon or source clip.
  if(family==='hydralisk')for(const plane of new Set(branches.map(b=>b.plane)))actorRows.push({...base,id:`actor:${actor}:${rank}:attack-${plane}:close-range`,name:`${name} · ${rank}级 · 近距对${plane==='air'?'空':'地'}攻击`,action:'attack',target:plane,seconds:8,fixture:{targetEdgeDistance:HYDRALISK_MELEE.range*.5,cadence:'hydralisk-close'},source:[...base.source,'src/data/sc2-units.ts']});
  if(!hero){
   if(family in FAMILY_MODES&&actor!=='elite.tank.1')for(const [mode,label] of FAMILY_MODES[family as keyof typeof FAMILY_MODES])actorRows.push({...base,id:`actor:${actor}:${rank}:mode:${mode}`,name:`${name} · ${rank}级 · ${label}`,action:'mode',data:{mode},seconds:10,source:[...base.source,'src/simulation/combat/family-actions.ts','src/simulation/combat/expedition-combat.ts']});
   if(family in FAMILY_MODES&&actor!=='elite.tank.1')for(const [mode,label] of FAMILY_MODES[family as keyof typeof FAMILY_MODES]){
    if(mode===family)continue;
    const form={...base,fixture:{mode},source:[...base.source,'src/data/expansion-units.ts','src/simulation/combat/family-actions.ts','src/simulation/combat/expedition-combat.ts']};
    for(const action of ['spawn','idle','move','hit','death'])actorRows.push({...form,id:`actor:${actor}:${rank}:form:${mode}:${action}`,name:`${name} · ${rank}级 · ${label} · ${labels[action]}`,action,seconds:action==='death'?9:6,...(action==='spawn'?{applicability:{kind:'not-applicable' as const,reason:'此形态由原生变形进入，没有独立招募出生路径；进入过程见变形用例。'}}:action==='move'&&['siege','lurker_burrowed'].includes(mode)?{applicability:{kind:'not-applicable' as const,reason:'该部署形态不能移动；收起后移动见基础形态。'}}:{})});
    for(const b of actorAttackBranches(actor,family,mode))actorRows.push({...form,id:`actor:${actor}:${rank}:form:${mode}:attack-${b.plane}${b.weapon?':'+b.weapon:''}`,name:`${name} · ${rank}级 · ${label} · 对${b.plane==='air'?'空':'地'}攻击${b.weapon?' · '+b.weapon:''}`,action:'attack',target:b.plane,seconds:8,fixture:{mode,weapon:b.weapon,selectedWeapon:b.selectedWeapon,targetEdgeDistance:b.minimumRange>0?(b.minimumRange+b.range)/2:undefined}});
   }
   const action=actor==='elite.sentry.3'?'refraction':['banshee','stalker'].includes(family)?'ability':['queen','sentry','high_templar'].includes(family)?'auto-ability':['marine','marauder'].includes(family)?'stim':null;
   if(action)actorRows.push({...base,id:`actor:${actor}:${rank}:${action}`,name:`${name} · ${rank}级 · ${labels[action]}`,action,target:'ground',seconds:16,source:[...base.source,'src/simulation/combat/expedition-combat.ts']});
  }
 }
}
for(const family of ALL_FAMILIES)actor(family,SC2_UNITS[family].zh,family,familyRace(family),'src/data/races.ts');
for(const [id,h] of Object.entries(HEROES))actor('hero.'+id,h.name,h.baseFamily,h.race,'src/data/heroes.ts',true);
for(const [id,e] of Object.entries(ELITES))actor('elite.'+id,e.name,e.family,familyRace(e.family),'src/data/elites.ts');
export const DYNAMIC_CASES:Case[]=[...PRESENTATION_CASES,...actorRows,...nativeCards as Case[],
 ...nativeCards.map(c=>({...c,id:c.id+':effect',name:c.name+' · 生效场景',group:'卡牌后续效果',runner:'card-effect',seconds:cardEffectSeconds(c.data.effect)})) as Case[],
 ...ENEMY_CASES,
 ...LAB_CASES.map(c=>({id:'gameplay:'+c.id,group:c.group,name:c.name,runner:'fun',actor:c.id,seconds:65,source:['src/diagnostics/fun-lab-cases.ts']})),
 ...equipmentPreviewCases(equipmentCases as Case[]),
 ...developmentCases as Case[],
 // Each fun item and legal level already has a native purchase and follow-up
 // entry for every race. Do not add a second unimplemented placeholder runner.
 ...Object.entries(MAP_THEMES).map(([id,m])=>({id:'map:'+id,group:'地图',name:m.name,runner:'map',actor:id,seconds:8,source:['src/data/campaign-map.ts']}))
];
export {STATIC_CASES} from './static-catalogue';
export const CATALOGUE_SCOPE={families:ALL_FAMILIES.length,heroes:Object.keys(HEROES).length,elites:Object.keys(ELITES).length,equipment:Object.keys(EQUIPMENT_TEMPLATES).length,development:DEVELOPMENT.length,funItems:FUN_SHOP_IDS.length,gameplay:LAB_CASES.length,knownPending:['Exact native ordinary card pool and support cards','Native modes, secondary weapons, summons and child bodies','Ability condition/cancel branches and equipment bindings/set thresholds','Static page availability and state applicability cross-check','Complete per-entry rendered-cycle review'],complete:false};
