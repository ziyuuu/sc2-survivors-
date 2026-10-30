import {identityReserved} from '../missions/rewards';
import {canReceiveRecovery} from '../combat/support-targets';
import {equipmentRecoveryPresentation} from './presentation';
import {equipmentPresentation} from './presentation';
import type {World} from '../world';
import type {Entity,Point} from '../types';
import type {CombatUnitType,UnitType} from '../../data/sc2-units';
import {ELITES,type EliteId} from '../../data/elites';
import {HEROES,type HeroId} from '../../data/heroes';
import {familyRace,type Race} from '../../data/races';
import {PRODUCTION_LINES} from '../../data/expedition-buildings';
import {pairFor,rosterMembers,joinPair} from '../zerg-brood';
import {observeRecovery} from '../observation';
import {deployExpeditionHero} from '../combat/expedition-heroes';
import {equipmentRandom} from './inventory';
import {activeEquipmentEffects,equipmentValue,lockEquipmentSource} from './modules';
import type {ActiveEquipmentEffect} from './selection';
import {bindingDirection,directionMatches,equipmentCanGrow,equipmentRecruitRank,permanentEquipmentBody} from './eligibility';

export interface EquipmentMemberSource {source:string;items:readonly string[];independent:boolean;cannotGrow?:boolean;cannotRevive?:boolean;origin?:string;bound?:boolean}
export interface PendingEquipmentMember {source:ActiveEquipmentEffect;type:CombatUnitType;rank:number;count:number;independent:boolean;seconds?:number;heal?:number;elite?:boolean;eliteId?:EliteId;cannotGrow?:boolean;cannotRevive?:boolean;origin?:string;bound?:boolean;receipt?:string;burstSeconds?:number}
const roll=(w:World)=>equipmentRandom(w.starship.account);
const coreType=(w:World):UnitType=>w.expedition.race==='terran'?'marine':w.expedition.race==='zerg'?'zergling':'zealot';
const choose=<T>(w:World,pool:T[]):T|undefined=>pool.length?pool[Math.floor(roll(w)*pool.length)]:undefined;
function variants(type:CombatUnitType){return Object.values(ELITES).filter(e=>e.family===type);}
export function refreshEquipmentMember(w:World,u:Entity,change:()=>void,fill=false){const group=(pairFor(w,u)?.members??[u.id]).map(id=>w.entities.get(id)).filter((v):v is Entity=>!!v&&v.hp>0),pools=group.map(body=>({body,hp:body.maxHp>0?body.hp/body.maxHp:0,shield:(body.maxShield??0)>0?(body.shield??0)/body.maxShield!:0,energy:body.energy,ready:body.specialReady}));const identity=[u.unitType,u.eliteId,u.heroId,u.rank];change();w.refreshStats(u,fill);if(identity.slice(0,3).some((v,i)=>v!==[u.unitType,u.eliteId,u.heroId][i]))equipmentPresentation(w,'evolve',u);else if(identity[3]!==u.rank)equipmentPresentation(w,'growth',u);if(!fill)for(const {body,hp,shield,energy,ready} of pools){body.hp=body.maxHp*hp;body.shield=(body.maxShield??0)*shield;body.energy=Math.min(body.maxEnergy,energy);body.specialReady=ready;}}
export function convertEquipmentElite(w:World,u:Entity,id:EliteId,rank:number,fill=false){if(identityReserved(w,'elite',id)||u.heroId||u.temporary||ELITES[id].family!==u.unitType)return false;refreshEquipmentMember(w,u,()=>{u.eliteId=id;u.modelKey=ELITES[id].model;u.rank=rank;},fill);return true;}
function queue(w:World,p:PendingEquipmentMember){w.starship.pendingMembers.push(p);}
export function equipmentBoundBody(w:World,e:ActiveEquipmentEffect,u:Entity){if(e.binding?.hero)return u.heroId===e.binding.hero&&w.heroes.get(e.binding.hero)?.entityId===u.id;if(!e.binding?.elite||u.eliteId!==e.binding.elite)return false;const bound=w.starship.boundMembers.get(e.source);return bound!==undefined?bound===u.id:[...w.entities.values()].filter(x=>x.hp>0&&x.eliteId===e.binding!.elite&&permanentEquipmentBody(w,x)).sort((a,b)=>a.id-b.id)[0]?.id===u.id;}
export function equipmentReservedHeroSeats(w:World){const ids=new Set(activeEquipmentEffects(w).filter(e=>e.key==='opening_hero').map(e=>e.binding?.hero).filter((id):id is HeroId=>!!id));for(const id of w.heroes.keys())ids.delete(id);return ids.size+(activeEquipmentEffects(w).some(e=>e.key==='bounty_hero')&&(!w.starship.bounty||!w.heroes.has(w.starship.bounty.hero))?1:0);}
function grantHero(w:World,e:ActiveEquipmentEffect){const id=e.binding?.hero;if(!id)return;const key=e.source+':hero';if(w.starship.account.run?.receipts.has(key))return;let record=w.heroes.get(id);if(!record){if(w.heroes.size>=3)return;record={id,rank:e.values[0],entityId:null,skillReady:w.time,revivePaid:false,awaitingSpawn:true};w.heroes.set(id,record);deployExpeditionHero(w,record,false);}else if(record.rank<e.values[0]){record.rank=e.values[0];const u=w.heroEntity(id);if(u&&u.hp>0)refreshEquipmentMember(w,u,()=>{u.rank=record!.rank;});}w.starship.account.run?.receipts.add(key);lockEquipmentSource(w,e);}
function directionPool(w:World,e:ActiveEquipmentEffect,room=false){return w.expedition.familySlots.filter(type=>directionMatches(e.binding,type)&&w.isFamilyAvailable(type)&&(!room||w.familySeatCount(type)<w.familyMemberCap(type)&&w.availableCapacity(type)>0));}
export function initializeEquipmentMembers(w:World){const effects=activeEquipmentEffects(w),training=effects.find(e=>e.key==='opening_rank'),team=effects.find(e=>e.key==='opening_count'),call=effects.find(e=>e.key==='opening_elite');
 const rank=training?.values[0]??1,initial=rosterMembers(w,w.allies().filter(u=>!u.heroId&&!u.eliteId&&!u.temporary&&!u.summonKind));
 for(const u of initial){const elite=call&&choose(w,variants(u.unitType));if(elite)convertEquipmentElite(w,u,elite.id,Math.max(rank,u.rank),true);else {u.rank=Math.max(rank,u.rank);w.refreshStats(u,true);}}
 if(initial.length)for(const e of [training,team,call])if(e)lockEquipmentSource(w,e);
 if(team){const type=coreType(w),count=Math.max(0,team.values[0]-initial.filter(u=>u.unitType===type).length);if(count)queue(w,{source:team,type,rank,count,independent:false,elite:!!call,origin:'opening'});}
 const foreignRaces=(['terran','zerg','protoss'] as Race[]).filter(r=>r!==w.expedition.race),firstRace=choose(w,foreignRaces)!;
 for(const e of effects){
  const fixed=(type:CombatUnitType,count:number,level=1,extra:Partial<PendingEquipmentMember>={})=>queue(w,{source:e,type,rank:level,count,independent:true,origin:e.key,...extra});
  if(e.key==='opening_zerglings')fixed('zergling',e.values[0],rank);
  if(e.key==='opening_roaches')fixed('roach',e.values[0],rank);
  if(e.key==='opening_hydralisk')fixed('hydralisk',e.values[0]);
  if(e.key==='opening_ultralisk')fixed('ultralisk',e.values[0],1,{elite:!!equipmentValue(w,'ultralisk_elite')});
  if(e.key==='opening_pack')fixed('zergling',e.values[0],equipmentValue(w,'pack_rank')||1);
  if(e.key==='opening_fleet')fixed(w.expedition.race==='terran'?'viking':w.expedition.race==='zerg'?'mutalisk':'phoenix',1,1,{elite:effects.some(x=>x.source===e.source&&x.key==='fleet_elite')});
  if(e.key==='foreign_elites'||e.key==='foreign_elites_second'){const race=e.key==='foreign_elites'?firstRace:foreignRaces.find(r=>r!==firstRace)!,elite=choose(w,Object.values(ELITES).filter(x=>familyRace(x.family)===race));if(elite)fixed(elite.family,1,e.values[0],{eliteId:elite.id,cannotGrow:true,cannotRevive:true});}
  if(e.key==='opening_elite_bound'&&e.binding?.elite){const level=Math.max(e.values[0],...effects.filter(x=>x.source===e.source&&x.key==='opening_elite_rank').map(x=>x.values[0]));fixed(ELITES[e.binding.elite].family,1,level,{eliteId:e.binding.elite,bound:true});}
  if(e.key==='opening_direction_elites'||e.key==='opening_hero_proxy'&&!effects.some(x=>x.source===e.source&&x.key==='replace_hero_proxy')){const direction=e.binding&&bindingDirection(e.binding),pool=direction?Object.values(ELITES).filter(x=>PRODUCTION_LINES[direction].families.includes(x.family)):[];for(let n=0;n<e.values[0]&&pool.length;n++){const at=Math.floor(roll(w)*pool.length),elite=pool.splice(at,1)[0];fixed(elite.family,1,e.key==='opening_hero_proxy'?1:e.values[1],{eliteId:elite.id});}}
  if(e.key==='opening_direction'){const pool=directionPool(w,e);if(pool.length)for(let n=0;n<e.values[0];n++)queue(w,{source:e,type:pool[n%pool.length],rank:e.values[1],count:1,independent:false,origin:e.key});}
  if(e.key==='lost_templar')fixed('high_templar',1,e.values[0],{eliteId:'high_templar.1',cannotGrow:true});
  if(e.key==='lost_adept')fixed('adept',1,e.values[0],{eliteId:'adept.3',cannotGrow:true});
 }
 for(const e of effects.filter(e=>e.key==='opening_hero'))grantHero(w,e);
 equipmentStageMembers(w);deliverEquipmentMembers(w);evolveEquipmentMembers(w);
}
export function equipmentStageMembers(w:World){for(const e of activeEquipmentEffects(w)){if(e.key!=='stage_yamato')continue;const receipt=e.source+':stage:'+(w.endless?'endless:'+w.endless.round:w.stage),run=w.starship.account.run;if(!run||run.receipts.has(receipt))continue;run.receipts.add(receipt);queue(w,{source:e,type:'yamato_battlecruiser',rank:e.values[1],count:1,independent:true,origin:e.key,receipt});}}
export function deliverEquipmentMembers(w:World){if(w.specialStages.active)return;for(const pending of w.starship.pendingMembers){while(pending.count>0){if(!pending.independent&&(!w.expedition.familySlots.includes(pending.type as UnitType)||w.familySeatCount(pending.type as UnitType)>=w.familyMemberCap(pending.type as UnitType)||w.availableCapacity(pending.type as UnitType)<=0))break;const point=w.freePosition(pending.type,w.anchor,.8,10);if(!point)break;
  const previous=new Set(w.entities.keys()),u=pending.independent?w.addUnit(pending.type,'terran',point.x,point.z,pending.rank):w.addFamilyMember(pending.type as UnitType,point,pending.rank),elite=pending.eliteId??(pending.elite?choose(w,variants(pending.type))?.id:undefined);
  const members=w.allies().filter(member=>!previous.has(member.id));if(pending.bound)w.starship.boundMembers.set(pending.source.source,u.id);
  for(const member of members){w.starship.members.set(member.id,{source:pending.source.source,items:pending.source.items,independent:pending.independent,cannotGrow:pending.cannotGrow,cannotRevive:pending.cannotRevive,origin:pending.origin,bound:pending.bound});if(pending.seconds){member.temporary=true;member.temporaryUntil=w.time+pending.seconds;}if(pending.burstSeconds)w.starship.numbers.set('drop-speed:'+member.id,w.time+pending.burstSeconds);if(elite){member.eliteId=elite;member.modelKey=ELITES[elite].model;}w.refreshStats(member,true);equipmentPresentation(w,'reinforcement',member,undefined,pending.origin);}
  if(pending.bound)w.starship.boundMembers.set(pending.source.source,u.id);
  pending.count--;lockEquipmentSource(w,pending.source);
  if(pending.heal){for(const patient of w.allies())if(canReceiveRecovery(patient)&&Math.hypot(patient.x-u.x,patient.z-u.z)<=4+patient.unitRadius){const gain=Math.min(patient.maxHp-patient.hp,patient.maxHp*pending.heal*(1+w.starship.totals.defense/1000));patient.hp+=gain;w.stats.healed+=gain;observeRecovery(w,u,patient,gain);equipmentRecoveryPresentation(w,patient,gain);}pending.heal=0;}
 }}w.starship.pendingMembers=w.starship.pendingMembers.filter(p=>p.count>0);for(const e of activeEquipmentEffects(w).filter(e=>e.key==='opening_hero'))grantHero(w,e);}
export function inheritEquipmentMember(w:World,u:Entity,from:Entity){const member=w.starship.members.get(from.id);if(member)w.starship.members.set(u.id,{...member});}
export function equipmentRosterMember(w:World,u:Entity){return !w.starship.members.get(u.id)?.independent;}
export function evolveEquipmentMembers(w:World){const effects=activeEquipmentEffects(w),ravager=effects.find(e=>e.key==='ravager_evolution');if(ravager)for(const u of w.allies()){const member=w.starship.members.get(u.id);if(u.unitType!=='roach'||u.heroId||u.eliteId||u.temporary||member?.origin!=='opening_roaches'||member.source!==ravager.source)continue;refreshEquipmentMember(w,u,()=>{u.unitType='ravager';u.modelKey=undefined;u.nativeMode=undefined;u.activeWeapon=undefined;u.bileCooldown=ravager.values[0];});w.starship.numbers.set('equipment-ravager:'+u.id,1);lockEquipmentSource(w,ravager);}
 const training=effects.find(e=>e.key==='training_evolution');if(training){const key=training.source+':converted';let count=w.starship.numbers.get(key)??0;for(const u of rosterMembers(w,w.allies())){if(count>=training.values[1])break;if(!equipmentCanGrow(w,u)||u.heroId||u.eliteId||u.rank<training.values[0])continue;const elite=choose(w,variants(u.unitType));if(!elite)continue;if(convertEquipmentElite(w,u,elite.id,1)){count++;lockEquipmentSource(w,training);}}w.starship.numbers.set(key,count);}}
export function equipmentPaidDelivery(w:World,u:Entity,paid:boolean,normal:boolean,companion:boolean){if(companion||!normal||!paid||u.heroId||u.eliteId)return;const effect=activeEquipmentEffects(w).find(e=>e.key==='paid_elite'),eligible=w.expedition.race==='terran'?['marine','marauder','reaper']:w.expedition.race==='zerg'?['zergling','baneling','roach','queen']:['zealot','adept','stalker','sentry'];if(effect&&eligible.includes(u.unitType)&&roll(w)<effect.values[0]){const elite=choose(w,variants(u.unitType));if(elite&&convertEquipmentElite(w,u,elite.id,1))lockEquipmentSource(w,effect);}evolveEquipmentMembers(w);}
export function equipmentRescuedMember(w:World,u:Entity){if(!equipmentCanGrow(w,u)||u.heroId||u.eliteId)return;const effect=activeEquipmentEffects(w).find(e=>e.key==='rescue_rank');if(effect&&u.rank<w.soldierCap(u.unitType as UnitType)&&roll(w)<effect.values[0]){refreshEquipmentMember(w,u,()=>{u.rank++;});lockEquipmentSource(w,effect);}evolveEquipmentMembers(w);}
export function tickEquipmentMemberEffects(w:World){evolveEquipmentMembers(w);for(const e of activeEquipmentEffects(w)){const key=e.source+':'+e.key,ready=w.starship.cycles.get(key);if(ready===undefined||w.time+1e-8<ready)continue;
 if(e.key==='elite_training'){const u=w.allies().filter(u=>u.eliteId&&equipmentCanGrow(w,u)&&u.rank<e.values[1]).sort((a,b)=>a.rank-b.rank||a.id-b.id)[0];if(u){refreshEquipmentMember(w,u,()=>{u.rank++;});lockEquipmentSource(w,e);}w.starship.cycles.set(key,ready+e.values[0]);}
 if(e.key==='direction_reinforcement'){const family=choose(w,directionPool(w,e,true));if(!family)continue;queue(w,{source:e,type:family,rank:e.values[1],count:1,independent:false,origin:e.key});if(e.values[3])queue(w,{source:e,type:family,rank:1,count:e.values[3]*(family==='zergling'?2:1),independent:true,seconds:e.values[4],origin:e.key});deliverEquipmentMembers(w);w.starship.cycles.set(key,w.time+e.values[0]);}
 if(e.key==='fleet_reinforcement'){const fleet=w.allies().find(u=>w.starship.members.get(u.id)?.source===e.source&&w.starship.members.get(u.id)?.origin==='opening_fleet');if(!fleet||fleet.attackTarget===null||!w.body(fleet.attackTarget)?.hp)continue;queue(w,{source:e,type:fleet.unitType,rank:e.values[2],count:e.values[1],independent:true,seconds:e.values[3],origin:e.key});deliverEquipmentMembers(w);w.starship.cycles.set(key,w.time+e.values[0]);}
 }}
