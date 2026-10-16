import {equipmentRecoveryPresentation} from './presentation';
import type {World} from '../world';
import type {Entity,Point} from '../types';
import {activeEquipmentEffects,equipmentValue} from './modules';
import {permanentEquipmentBody} from './eligibility';
import {refreshEquipmentMember} from './members';
import {equipmentRecoveryFactor} from './runtime';
import {observeRecovery} from '../observation';
import {translate} from '../movement/steering';

export interface EquipmentBarrier {source:string;amount:number;until:number}
export const equipmentStageKey=(w:World)=>w.endless?'endless:'+w.endless.round:'stage:'+w.stage;
const ordinary=(w:World,u:Entity)=>permanentEquipmentBody(w,u)&&!u.heroId&&!u.eliteId;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export function giveEquipmentBarrier(w:World,u:Entity,source:string,amount:number,seconds=Infinity){const list=w.starship.barriers.get(u.id)??[],old=list.find(b=>b.source===source),changed=!old||old.amount<amount;if(old){old.amount=Math.max(old.amount,amount);old.until=w.time+seconds;}else list.push({source,amount,until:w.time+seconds});w.starship.barriers.set(u.id,list);if(changed)w.visual('barrier-start',u);}
export function absorbEquipmentBarrier(w:World,u:Entity,damage:number){let remaining=damage;for(const b of w.starship.barriers.get(u.id)??[]){if(b.until<=w.time)continue;const amount=Math.min(remaining,b.amount);b.amount-=amount;remaining-=amount;if(b.amount<=0){w.visual('shield-break',u);if(b.source==='out-of-combat'&&equipmentValue(w,'shield_rebuild'))w.starship.numbers.set('shield-broken:'+u.id,w.time);}}return remaining;}
/** Only the already mitigated life packet is shared; recipients do not pay defence a second time. */
export function equipmentShareDamage(w:World,u:Entity,damage:number,sourceId?:number){const fraction=equipmentValue(w,'share_damage');if(!fraction||!permanentEquipmentBody(w,u)||u.heroId||damage<=0)return damage;
 const partners=w.allies().filter(v=>v.id!==u.id&&v.unitType===u.unitType&&permanentEquipmentBody(w,v)&&!v.heroId&&distance(u,v)<=equipmentValue(w,'share_damage',1));if(!partners.length)return damage;
 const transfer=damage*fraction;for(const partner of partners)w.hit(partner,transfer/partners.length,[],1,'zerg',0,1,sourceId,false,true);return damage-transfer;
}
export function equipmentProtect(w:World,u:Entity){if(!permanentEquipmentBody(w,u))return;const stage=equipmentStageKey(w),rage=equipmentValue(w,'last_stand'),active=(w.starship.numbers.get('rage-until:'+u.id)??0)>w.time;
 if(active){u.hp=Math.max(1,u.hp);return;}
 if(rage&&u.hp/u.maxHp<rage&&!w.starship.numbers.has('rage-used:'+stage+':'+u.id)){w.starship.numbers.set('rage-used:'+stage+':'+u.id,1);w.starship.numbers.set('rage-until:'+u.id,w.time+equipmentValue(w,'last_stand',1));u.hp=Math.max(1,u.hp);w.visual('barrier-start',u);return;}
 if(u.hp>0||!ordinary(w,u))return;const e=activeEquipmentEffects(w).find(e=>e.key==='insurance');if(!e||u.rank<e.values[0])return;const key='insurance:'+stage+':'+u.id;if(w.starship.numbers.has(key))return;
 w.starship.numbers.set(key,1);if(e.values[1])refreshEquipmentMember(w,u,()=>{u.rank=Math.max(1,u.rank-e.values[1]);});u.hp=u.maxHp*e.values[2];if(e.values[3])giveEquipmentBarrier(w,u,'insurance',u.maxHp*e.values[3],e.values[4]);w.visual('support-pulse',u);
}
export function equipmentWeaponLeech(w:World,u:Entity,actual:number){if(actual<=0||u.hp<=0||(w.starship.numbers.get('rage-until:'+u.id)??0)<=w.time)return;const gain=Math.min(u.maxHp-u.hp,actual*equipmentValue(w,'last_stand',2)*equipmentRecoveryFactor(w,u));if(gain>0){u.hp+=gain;w.stats.healed+=gain;observeRecovery(w,u,u,gain);equipmentRecoveryPresentation(w,u,gain);}}
export function equipmentDamageTaken(w:World,u:Entity,actual:number){if(actual<=0||!permanentEquipmentBody(w,u))return;for(const e of activeEquipmentEffects(w).filter(e=>e.key==='iron_counter'||e.key==='wall_counter')){const prefix=e.key+':'+u.id,progress=(w.starship.numbers.get(prefix)??0)+actual;w.starship.numbers.set(prefix,progress);if(w.time<(w.starship.numbers.get(prefix+':ready')??0)||progress<u.maxHp*e.values[0])continue;
 w.starship.numbers.set(prefix,0);w.starship.numbers.set(prefix+':ready',w.time+(e.key==='iron_counter'?e.values[5]:e.values[2]));
 for(const enemy of [...w.entities.values()]){if(enemy.owner!=='zerg'||enemy.hp<=0||distance(enemy,u)>e.values[1]+enemy.unitRadius)continue;if(e.key==='iron_counter')w.hit(enemy,u.maxHp*e.values[2],[],1,'terran',.5,0,u.id);else if(!enemy.enemyTier&&!enemy.heroId&&!enemy.attributes.includes('Structure')){const d=Math.max(.01,distance(enemy,u));translate(enemy,{x:(enemy.x-u.x)/d,z:(enemy.z-u.z)/d},enemy.unitRadius,enemy.flying,w.obstacles,w.mapHalf,w.terrain);}}
 if(e.key==='iron_counter')giveEquipmentBarrier(w,u,'iron-counter',u.maxHp*e.values[3],e.values[4]);w.visual('support-pulse',u);
 }}
export function tickEquipmentDefense(w:World){const dt=Math.max(0,w.time-(w.starship.numbers.get('defense-tick')??w.time));w.starship.numbers.set('defense-tick',w.time);for(const [id,barriers] of w.starship.barriers){const live=barriers.filter(b=>b.until>w.time&&b.amount>0);if(live.length)w.starship.barriers.set(id,live);else w.starship.barriers.delete(id);}
 const e=activeEquipmentEffects(w).find(e=>e.key==='out_of_combat_shield');if(!e)return;for(const u of w.allies()){if(!permanentEquipmentBody(w,u))continue;const hostile=u.attackTarget!==null&&!!w.body(u.attackTarget)?.hp||u.pendingTarget!==null,quiet=w.time-Math.max(u.lastDamagedAt??-Infinity,w.starship.numbers.get('last-dealt:'+u.id)??-Infinity)>=e.values[0]&&!hostile;
  if(u.race==='protoss'){if(quiet||equipmentValue(w,'shield_rebuild')){const gain=Math.min(u.maxHp-u.hp,u.maxHp*e.values[2]*dt*equipmentRecoveryFactor(w,u));u.hp+=gain;w.stats.healed+=gain;observeRecovery(w,u,u,gain);equipmentRecoveryPresentation(w,u,gain);}continue;}
  const broken=w.starship.numbers.get('shield-broken:'+u.id),rebuild=equipmentValue(w,'shield_rebuild');if(quiet||rebuild&&broken!==undefined&&w.time-broken>=rebuild){giveEquipmentBarrier(w,u,'out-of-combat',u.maxHp*e.values[1]);w.starship.numbers.delete('shield-broken:'+u.id);}
 }
}
