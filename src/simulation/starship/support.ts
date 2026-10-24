import {equipmentBurnZone,equipmentPresentation} from './presentation';
import type {World} from '../world';
import type {Body,Point} from '../types';
import type {UnitType} from '../../data/sc2-units';
import {ELITES} from '../../data/elites';
import {familyRace} from '../../data/races';
import {equipmentRandom} from './inventory';
import {activeEquipmentEffects,equipmentValue,equipmentEngagementTarget,lockEquipmentSource} from './modules';
import {deliverEquipmentMembers,type PendingEquipmentMember} from './members';
import type {ActiveEquipmentEffect} from './selection';
import {scheduleTalentSupportRound,talentSupportHasTargets} from '../combat/talent-support';

export interface EquipmentSupportStrike extends Point {at:number;radius:number;damage:number;slow:number;slowSeconds:number;source?:string;burn?:{damage:number;seconds:number};members?:PendingEquipmentMember[]}
export interface EquipmentBurnZone extends Point {source:string;radius:number;damage:number;next:number;until:number}
export interface EquipmentSupportSequence {effect:ActiveEquipmentEffect;next:number;remaining:number;point:Point}
const source=(p:Point):Body=>({...p,id:0,owner:'terran',hp:0,maxHp:0,armor:0,unitRadius:0,flying:false,attributes:[]});
function warn(w:World,p:Point,radius:number,seconds:number){w.effect('hero-warning',source(p),p,radius,seconds);}
const core=(w:World):UnitType=>w.expedition.race==='terran'?'marine':w.expedition.race==='zerg'?'zergling':'zealot';
function extraElite(w:World,e:ActiveEquipmentEffect,rank:number,seconds:number,burstSeconds?:number):PendingEquipmentMember|undefined{const pool=Object.values(ELITES).filter(elite=>familyRace(elite.family)===w.expedition.race),elite=pool[Math.floor(equipmentRandom(w.starship.account)*pool.length)];return elite?{source:e,type:elite.family,rank,count:1,independent:true,seconds,eliteId:elite.id,origin:e.key,burstSeconds}:undefined;}
function launch(w:World,e:ActiveEquipmentEffect,target:Point){const v=e.values;
 if(e.key==='bombardment'){w.starship.strikes.push({at:w.time+v[1],x:target.x,z:target.z,radius:v[2],damage:v[3],slow:v[4]??0,slowSeconds:v[5]??0,source:e.source});warn(w,target,v[2],v[1]);}
 if(e.key==='incendiary'){const length=Math.hypot(target.x-w.anchor.x,target.z-w.anchor.z)||1,axis={x:(target.x-w.anchor.x)/length,z:(target.z-w.anchor.z)/length};for(let n=0;n<v[7];n++){const point={x:target.x+axis.x*n*v[8],z:target.z+axis.z*n*v[8]};w.starship.strikes.push({...point,at:w.time+v[1],radius:v[2],damage:v[3],slow:0,slowSeconds:0,source:e.source,burn:{damage:v[4],seconds:v[5]}});warn(w,point,v[2],v[1]);}w.wallet.gas+=v[6];}
 if(e.key==='drop_pod'){const burst=equipmentValue(w,'drop_elite',2),type=core(w),members:PendingEquipmentMember[]=[{source:e,type,rank:v[5],count:v[4]*(type==='zergling'?2:1),independent:true,seconds:v[6],origin:e.key,burstSeconds:burst||undefined}];if(equipmentValue(w,'drop_elite')){const elite=extraElite(w,e,equipmentValue(w,'drop_elite'),v[6],burst);if(elite)members.push(elite);}w.starship.strikes.push({...target,at:w.time+v[1],radius:v[2],damage:v[3],slow:0,slowSeconds:0,source:e.source,members});warn(w,target,v[2],v[1]);}
}
export function equipmentReactorAmmo(w:World){return w.starship.numbers.get('reactor-stock')??0;}
export function consumeEquipmentReactor(w:World){const stock=equipmentReactorAmmo(w);if(stock>0)w.starship.numbers.set('reactor-stock',stock-1);}
function reactor(w:World,e:ActiveEquipmentEffect){const key=e.source+':reactor',last=w.starship.numbers.get(key+':last')??0,stock=equipmentReactorAmmo(w),elapsed=w.starship.numbers.get(key+':elapsed')??0;w.starship.numbers.set(key+':last',w.time);if(stock>=e.values[1])return;let progress=elapsed+Math.max(0,w.time-last),count=stock;while(progress+1e-8>=e.values[0]&&count<e.values[1]){count++;progress-=e.values[0];w.expedition.support.ammo++;lockEquipmentSource(w,e);}w.starship.numbers.set('reactor-stock',count);w.starship.numbers.set(key+':elapsed',Math.min(e.values[0],progress));}
export function tickEquipmentSupport(w:World){for(const e of activeEquipmentEffects(w)){if(e.key==='reactor'){reactor(w,e);continue;}const key=e.source+':'+e.key,ready=w.starship.cycles.get(key);if(w.missions.fleet.ceasefire||ready===undefined||w.time+1e-8<ready)continue;
  if(['bombardment','incendiary','drop_pod'].includes(e.key)){const target=equipmentEngagementTarget(w);if(!target)continue;launch(w,e,target);if(e.key==='bombardment'){w.wallet.minerals+=e.values[6]??0;w.wallet.gas+=e.values[7]??0;if((e.values[8]??1)>1)w.starship.supportSequences.push({effect:e,next:w.time+(e.values[9]??1),remaining:e.values[8]-1,point:{x:target.x,z:target.z}});}w.starship.cycles.set(key,w.time+e.values[0]);}
  if(e.key==='joint_support'&&talentSupportHasTargets(w)){w.starship.supportSequences.push({effect:e,next:w.time,remaining:e.values[1],point:{...w.anchor}});w.starship.cycles.set(key,w.time+e.values[0]);}
 }
 for(const sequence of w.starship.supportSequences)while(!w.missions.fleet.ceasefire&&sequence.remaining>0&&sequence.next<=w.time+1e-8){if(sequence.effect.key==='joint_support')scheduleTalentSupportRound(w,sequence.effect.values[2]);else launch(w,sequence.effect,equipmentEngagementTarget(w)??sequence.point);sequence.remaining--;sequence.next+=sequence.effect.key==='joint_support'?1:sequence.effect.values[9]??1;}
 w.starship.supportSequences=w.starship.supportSequences.filter(s=>s.remaining>0);
 const previousCommitted=w.missions.fleet.committed;w.missions.fleet.committed=true;try {
 const pending:EquipmentSupportStrike[]=[];for(const strike of w.starship.strikes){if(w.time+1e-8<strike.at){pending.push(strike);continue;}for(const target of [...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])])if(target.owner==='zerg'&&target.hp>0&&Math.hypot(target.x-strike.x,target.z-strike.z)<=strike.radius+target.unitRadius){w.hit(target,strike.damage,[],1,'terran');const unit=w.entities.get(target.id);if(strike.slow&&unit&&unit.hp>0){unit.slowFactor=Math.max(unit.slowUntil&&unit.slowUntil>w.time?unit.slowFactor??0:0,strike.slow);unit.slowUntil=Math.max(unit.slowUntil??0,w.time+strike.slowSeconds);}}w.visual('support-impact',source(strike));if(strike.burn)w.starship.burnZones.push(equipmentBurnZone(w,{source:strike.source!,x:strike.x,z:strike.z,radius:strike.radius,damage:strike.burn.damage,next:w.time+1,until:w.time+strike.burn.seconds}));if(strike.members){w.starship.pendingMembers.push(...strike.members);deliverEquipmentMembers(w);}}w.starship.strikes=pending;
 // One source's overlapping fire fields pay the strongest due tick once per target.
 const due=w.starship.burnZones.filter(z=>z.next<=w.time+1e-8&&z.next<=z.until+1e-8),groups=new Set(due.map(z=>z.source));for(const sourceId of groups)for(const target of w.entities.values())if(target.owner==='zerg'&&target.hp>0){const damage=Math.max(0,...due.filter(z=>z.source===sourceId&&Math.hypot(target.x-z.x,target.z-z.z)<=z.radius+target.unitRadius).map(z=>z.damage));if(damage)w.hit(target,damage,[],1,'terran');}for(const zone of due)zone.next+=1;w.starship.burnZones=w.starship.burnZones.filter(z=>z.next<=z.until+1e-8);
 }finally{w.missions.fleet.committed=previousCommitted;}
}
