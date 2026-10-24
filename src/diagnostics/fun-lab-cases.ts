import type {World} from '../simulation/world';
import type {UnitType} from '../data/sc2-units';
import {newEquipmentAccount} from '../simulation/starship/inventory';
import {FlatTerrain} from '../simulation/movement/flat-terrain';
import {SPECIAL_STAGE_KINDS,SPECIAL_STAGE_NAMES,SPECIAL_STAGE_RULES,type SpecialStageKind} from '../simulation/special-stages/state';
import {beginSpecialStage} from '../simulation/special-stages/runtime';
import {MISSION_KINDS,type MissionKind} from '../simulation/missions/state';
import {MISSION_NAMES,spawnMission} from '../simulation/missions/runtime';
import {ENCOUNTER_KINDS,ENCOUNTER_NAMES,type EncounterKind} from '../simulation/encounters/state';
import {spawnEncounter} from '../simulation/encounters/runtime';
import {FUN_KINDS,FUN_NAMES,type FunKind} from '../simulation/encounters/expanded-state';
import {spawnFunEncounter} from '../simulation/encounters/expanded';
import {FIELD_PICKUPS,FIELD_PICKUP_NAMES,HORDE_KINDS,HORDE_NAMES,HORDE_RULES,type FieldPickupKind,type HordeKind} from '../simulation/field-events/state';
import {spawnFieldPickup} from '../simulation/field-events/pickups';
import {startReplacementHorde} from '../simulation/field-events/hordes';
import {FUN_SHOP_IDS,funShopCatalogue,funShopCandidates,funShopSummary,type FunShopId} from '../simulation/fun-shop/state';
import {CARD_RARITIES,teamCardKey} from '../simulation/progression/team-cards';
import type {ExpeditionReward} from '../simulation/progression/expedition-drafts';

export type LabCase={id:string;group:string;name:string;description:string};
export const LAB_CASES:LabCase[]=[
 ...SPECIAL_STAGE_KINDS.map(kind=>({id:'special:'+kind,group:'特殊关卡',name:SPECIAL_STAGE_NAMES[kind],description:SPECIAL_STAGE_RULES[kind]})),
 ...MISSION_KINDS.map(kind=>({id:'mission:'+kind,group:'随机任务',name:MISSION_NAMES[kind],description:'靠近任务目标，按原有提示完成任务。'})),
 ...ENCOUNTER_KINDS.map(kind=>({id:'encounter:'+kind,group:'特殊遭遇',name:ENCOUNTER_NAMES[kind],description:'靠近观察并按正常方式交互。'})),
 ...FUN_KINDS.map(kind=>({id:'fun:'+kind,group:'特殊遭遇',name:FUN_NAMES[kind],description:kind==='cruelQueen'?'虫后会吞食持续到来的普通敌人；满足条件后可挑战。':kind==='corruptedProtoss'?'守军在据点附近巡逻，8米内或主动攻击后交战；同时20、累计40，少于10名后5秒补员，清零优先结束。':kind==='infectedTerrans'?'靠近感染者，观察12秒倒计时、膨胀与自爆；此项使用无医疗阵容。':'靠近目标，使用原有攻击或交互操作。'})),
 {id:'fun:infectedTerrans:heal',group:'特殊遭遇',name:'感染人类 · 医疗净化',description:'靠近感染者，使用医疗运输机观察治疗、净化与转化。'},
 ...FIELD_PICKUPS.map(kind=>({id:'pickup:'+kind,group:'地图拾取物',name:FIELD_PICKUP_NAMES[kind],description:'走近地面道具自动拾取，观察实际效果；核弹仍需手动释放。'})),
 ...HORDE_KINDS.map(kind=>({id:'horde:'+kind,group:'替代虫群',name:HORDE_NAMES[kind],description:'第'+HORDE_RULES[kind].stage+'关解锁；20秒最多'+HORDE_RULES[kind].total+'只，每2秒一批，保留正常攻击、死亡和掉落。'})),
 ...FUN_SHOP_IDS.map(kind=>({id:'shop:'+kind,group:'商店商品',name:funShopCatalogue().find(c=>c.item===kind)!.name.split(' · ')[0],description:funShopSummary(kind,kind==='tavern'||kind==='bait'?3:1)})),
 {id:'wings:elytra',group:'地图拾取物',name:'飞行鞘翅',description:'靠近拾取，让狂热者升空；接近地面敌人观察落地攻击。'}
];
export const LAB_ROSTERS:Record<string,{name:string;units:UnitType[]}>= {
 standard:{name:'标准四人小队',units:['marine','marauder','reaper','hellion']},
 thor:{name:'四名雷神',units:['thor','thor','thor','thor']},
 queen:{name:'四名虫后',units:['queen','queen','queen','queen']},
 zealot:{name:'四名狂热者',units:['zealot','zealot','zealot','zealot']}
};
/** Count admitted impacts, including shields, without double-counting a
 * single shield-break/health pair or treating healing pulses as damage. */
export function labHitEvents(w:World,afterSerial:number){
 const hits=new Set<string>();let serial=afterSerial;
 for(const e of w.visualEvents){if(e.serial<=afterSerial)continue;serial=Math.max(serial,e.serial);
  if(w.entities.get(e.entityId)?.team!=='player')continue;
  if(e.kind==='shield-hit'||e.kind==='shield-break'||e.kind==='hit'&&e.weaponHit!==undefined)hits.add(`${e.time}:${e.entityId}:${e.hitSourceId??'none'}`);
 }
 return {serial,hits:hits.size};
}
function placeSquad(w:World,point:{x:number;z:number}){
 Object.assign(w.anchor,point);for(const [i,u]of w.allies().entries()){u.x=point.x+(i%3-1)*1.7;u.z=point.z+Math.floor(i/3)*1.6;u.prev={x:u.x,z:u.z};}
 w.trail=[{x:point.x,z:point.z}];w.hash.invalidatePlanes();
}
/** Practice fixtures choose legal content directly; they do not claim natural acquisition. */
export function prepareLabCase(w:World,id:string,roster='standard'){
 if(!LAB_CASES.some(c=>c.id===id))throw Error('未知试玩内容');
 w.resetRun('hard');Object.assign(w.starship.account,newEquipmentAccount(529));
 if(!w.start())throw Error('试玩战局创建失败');
 // Only the practice field has no ordinary stage deadline. Keep elapsed
 // time monotonic so periodic purchases still receive every real check.
 Object.defineProperty(w,'duration',{configurable:true,get:()=>Infinity});
 w.terrain=new FlatTerrain();w.obstacles=[];w.stage=id.startsWith('special:')?4:12;Object.assign(w.anchor,{x:0,z:0});w.prepareStage();
 w.entities.clear();w.pods=[];w.hive=null;w.expansionHives.clear();Object.assign(w,{waves:[],specialPlan:[],eventPlan:[]});w.nextWave=Infinity;w.nextExpansionAt=Infinity;
 w.missions.enabled=false;w.encounters.enabled=false;w.fieldEvents.nextPickup=Infinity;w.fieldEvents.nextHorde=Infinity;w.specialStages.portalChecked=w.stage;
 Object.assign(w.fieldEvents.pacing,{stage:w.stage,rolled:true,pending:false});
 w.wallet={minerals:20000,gas:10000};
 // A legal endgame card loadout makes practice objectives achievable with ordinary combat.
 if(id!=='special:dodge')for(const rarity of CARD_RARITIES)for(const group of ['firepower','defense'] as const)w.expedition.cardTotals[teamCardKey(group,rarity)]=3;
 const types=id==='special:dodge'?(LAB_ROSTERS[roster]??LAB_ROSTERS.standard).units:id==='wings:elytra'?['zealot','zealot','zealot','zealot'] as UnitType[]:id==='mission:escort'?['marine','marine','marine','marine','hellion','hellion','hellion','hellion','medivac','medivac','science_vessel','science_vessel'] as UnitType[]:['marine','marine','marine','marine','marauder','marauder','marauder','thor','thor','medivac','medivac','science_vessel'] as UnitType[];
 for(const type of types.filter(t=>id!=='fun:infectedTerrans'||!['medivac','science_vessel'].includes(t)))w.addUnit(type,'terran',0,0,id==='special:dodge'?1:5);
 placeSquad(w,{x:0,z:0});
 const [group,kind]=id.split(':');let ok=true;
 if(group==='special')ok=beginSpecialStage(w,kind as SpecialStageKind,'fixture');
 if(group==='mission'){
  if(kind==='repair')w.workers=4;
  ok=spawnMission(w,kind as MissionKind);const m=w.missions.active;
  const target=m?.bodyIds.map(id=>w.missions.bodies.get(id)).find(b=>b&&b.role!=='base');if(target)placeSquad(w,{x:target.x,z:target.z+6});
 }
 if(group==='encounter'){
  ok=spawnEncounter(w,kind as EncounterKind);
 }
 if(group==='fun'){if(id==='fun:infectedTerrans'){const healer=w.addUnit('medivac','terran',0,0,3);ok=spawnFunEncounter(w,kind as FunKind);w.entities.delete(healer.id);}else ok=spawnFunEncounter(w,kind as FunKind);}
 if(group==='pickup'){
  if(kind==='medical')for(const u of w.allies())u.hp=u.maxHp*.55;
  if(kind==='root'||kind==='firepower'||kind==='armor')labEnemies(w,8);
  ok=spawnFieldPickup(w,kind as FieldPickupKind,{x:0,z:-5});
 }
 if(group==='horde')ok=startReplacementHorde(w,kind as HordeKind);
 if(group==='wings'){w.encounters.expanded.elytra.push({id:'lab-elytra',point:{x:0,z:-5},stage:w.stage});labEnemies(w,6);}
 if(group==='shop'){
  w.endStage();w.skipReward();labShopShelf(w,kind as FunShopId);
 }
 if(!ok)throw Error('当前阵容未满足该内容的生产规则：'+id);
 w.input={x:0,z:0};w.cancelOrder();w.changed();return LAB_CASES.find(c=>c.id===id)!;
}
export function labShopShelf(w:World,id:FunShopId){
 if(w.phase!=='reward')return false;
 w.rewards=funShopCandidates(w.funShop.levels).filter(c=>c.item===id).map(c=>({
  id:c.id,offerId:'fun-lab-shop:'+w.nextId++,name:c.name,description:c.description,icon:c.icon,rarity:c.rarity,kind:'buff',value:c.item,...c.price,baseMinerals:c.price.minerals,baseGas:c.price.gas,discount:0,sold:false,
  expeditionWindow:w.draftWindowId,expeditionRound:'random',expeditionEffect:{kind:'funShop',item:id,level:c.level,expected:c.expected}
 } as ExpeditionReward));w.changed();return true;
}
export function labEnemies(w:World,count=16){
 const room=Math.max(0,300-w.enemyCount()),n=Math.min(count,room);
 for(let i=0;i<n;i++){const a=i*2.399963,r=11+Math.floor(i/12)*1.3,p={x:w.anchor.x+Math.sin(a)*r,z:w.anchor.z+Math.cos(a)*r};if(w.terrain?.canOccupy(p,.4)===false)continue;w.addUnit(i%4?'zergling':'roach','zerg',p.x,p.z);}
 w.hash.invalidatePlanes();w.changed();
}
export function runLabShop(w:World,id:FunShopId){
 if(!w.funShop.levels[id])return false;
 if(id==='dice')return w.reroll();
 w.phase='battle';w.paused=false;w.rewards=[];w.rewardClaimed=true;w.stageStartedAt=w.time-25;Object.assign(w,{waves:[],specialPlan:[]});w.nextExpansionAt=Infinity;w.pods=[];
 if(id==='tavern'){w.missions.enabled=true;w.encounters.enabled=true;Object.assign(w.fieldEvents.pacing,{stage:w.stage,rolled:false,pending:false,started:false,choice:null,next:20});}
 if(id==='eye'){const u=w.addUnit('lurker','zerg',8,0);u.nativeMode=u.desiredNativeMode='lurker_burrowed';w.refreshStats(u);u.cloaked=true;}
 else if(['gland','nydus','pandora'].includes(id))labEnemies(w,24);
 w.changed();return true;
}
