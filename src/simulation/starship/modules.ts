import type {World} from '../world';
import type {Entity,Point,Reward} from '../types';
import type {UnitType} from '../../data/sc2-units';
import {ELITES} from '../../data/elites';
import {familyRace} from '../../data/races';
import {newSupportMine,minePlacementLegal} from '../combat/tracking-mines';
import {selectEquipmentEffects,type ActiveEquipmentEffect} from './selection';
import {equippedItems,equipmentRandom} from './inventory';
import {deliverEquipmentMembers,tickEquipmentMemberEffects,type EquipmentMemberSource,type PendingEquipmentMember} from './members';
export {initializeEquipmentMembers,deliverEquipmentMembers,equipmentRosterMember} from './members';
export type {EquipmentMemberSource,PendingEquipmentMember} from './members';

export function activeEquipmentEffects(w:World){const s=w.starship;if(s.effectsRevision!==s.account.revision||s.effectsRace!==w.expedition.race){s.effectsRevision=s.account.revision;s.effectsRace=w.expedition.race;s.effects=selectEquipmentEffects(equippedItems(s.account,w.expedition.race));}return s.effects;}
export function equipmentValue(w:World,key:string,index=0){return activeEquipmentEffects(w).filter(e=>e.key===key).reduce((n,e)=>n+(e.values[index]??0),0);}
export function lockEquipmentSource(w:World,e:ActiveEquipmentEffect){for(const id of e.items)w.starship.account.run?.locked.add(id);}
const roll=(w:World)=>equipmentRandom(w.starship.account);
const coreType=(w:World):UnitType=>w.expedition.race==='terran'?'marine':w.expedition.race==='zerg'?'zergling':'zealot';
/** A visible enemy participating in a real friendly engagement. No extra arbitrary map-radius gate. */
export function equipmentEngagementTarget(w:World){return [...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])].filter(u=>u.owner==='zerg'&&u.hp>0&&w.visibleTo(u,'terran')&&w.allies().some(a=>a.hp>0&&(a.attackTarget===u.id||w.entities.get(u.id)?.attackTarget===a.id||w.canFireAt(a,u)))).sort((a,b)=>Math.hypot(a.x-w.anchor.x,a.z-w.anchor.z)-Math.hypot(b.x-w.anchor.x,b.z-w.anchor.z)||a.id-b.id)[0];}
export function tickEquipmentModules(w:World){deliverEquipmentMembers(w);tickEquipmentMemberEffects(w);for(const e of activeEquipmentEffects(w)){const key=e.source+':'+e.key,ready=w.starship.cycles.get(key);if(ready===undefined||w.time+1e-8<ready)continue;
  if(e.key==='reinforcement'){
   const pool=[...new Set(w.allies().filter(u=>!u.heroId&&!u.eliteId&&!u.temporary&&!u.summonKind&&u.race===w.expedition.race).map(u=>u.unitType as UnitType))];if(!pool.length)continue;const type=pool[Math.floor(roll(w)*pool.length)],point=w.freePosition(type,w.anchor,.8,8);if(!point)continue;
   w.starship.pendingMembers.push({source:e,type,rank:e.values[1],count:type==='zergling'?2:1,independent:true,seconds:e.values[2],heal:e.values[3]});if(equipmentValue(w,'reinforcement_elite')){const variants=Object.values(ELITES).filter(x=>x.family===type),elite=variants[Math.floor(roll(w)*variants.length)];if(elite)w.starship.pendingMembers.push({source:e,type,rank:equipmentValue(w,'reinforcement_elite'),count:type==='zergling'?2:1,independent:true,seconds:equipmentValue(w,'reinforcement_elite',1),eliteId:elite.id,origin:'reinforcement'});}deliverEquipmentMembers(w);w.starship.cycles.set(key,w.time+e.values[0]);
  }
  if(e.key==='periodic_trap'){let placed=false;for(let n=0;n<32;n++){const r=2+Math.floor(n/8),a=n*2.399963,p={x:w.anchor.x+Math.sin(a)*r,z:w.anchor.z+Math.cos(a)*r};if(minePlacementLegal(w,p)&&w.expedition.support.mines.every(m=>Math.hypot(m.point.x-p.x,m.point.z-p.z)>1)){w.expedition.support.mines.push(newSupportMine(w.nextId++,p));placed=true;break;}}if(placed)w.starship.cycles.set(key,w.time+e.values[0]);}
 }}
export function equipmentWorkerRescue(w:World,receipt:number,original:number,point:Point){const key='worker-rescue:'+receipt,run=w.starship.account.run;if(!run||run.receipts.has(key))return original;run.receipts.add(key);let count=original;
 for(const e of activeEquipmentEffects(w)){if(e.key==='worker_rescue'){count=Math.max(count,e.values[0]);lockEquipmentSource(w,e);}if(e.key==='egg_reinforcement'&&roll(w)<e.values[0]){w.starship.pendingMembers.push({source:e,type:coreType(w),rank:e.values[1],count:coreType(w)==='zergling'?2:1,independent:true,seconds:e.values[2]});}}
 if(equipmentValue(w,'rescue_double')&&roll(w)<equipmentValue(w,'rescue_double'))count*=2;const rescue=activeEquipmentEffects(w).find(e=>e.key==='rescue_elite');if(rescue){const pool=Object.values(ELITES).filter(e=>familyRace(e.family)===w.expedition.race),elite=pool[Math.floor(roll(w)*pool.length)];if(elite)w.starship.pendingMembers.push({source:rescue,type:elite.family,rank:rescue.values[0],count:1,independent:true,seconds:Infinity,eliteId:elite.id,origin:'rescue_elite'});}return count;
}
export function equipmentPickupFactor(w:World){const active=(w.starship.numbers.get('harvest-until')??0)>w.time,natural=!active&&equipmentValue(w,'pickup_double')>0&&roll(w)<equipmentValue(w,'pickup_double');if(natural&&equipmentValue(w,'harvest'))w.starship.numbers.set('harvest-until',w.time+equipmentValue(w,'harvest'));return (1+equipmentValue(w,'pickup_yield'))*(active||natural?2:1);}
export function equipmentStageReward(w:World){const run=w.starship.account.run,key='stage-resource:'+(w.endless?'endless:'+w.endless.round:w.stage);if(!run||run.receipts.has(key))return {minerals:0,gas:0};run.receipts.add(key);return {minerals:equipmentValue(w,'stage_resources'),gas:equipmentValue(w,'stage_resources',1)};}
export function beginEquipmentWindow(w:World){const run=w.starship.account.run,key='window:'+w.draftWindowId;if(!run||run.receipts.has(key))return;run.receipts.add(key);w.starship.window={id:w.draftWindowId,shop:equipmentValue(w,'shop_refresh'),development:equipmentValue(w,'development_refresh')};}
/** Prices and free marks belong to an actual generated shelf, never to a render/read call. */
export function prepareEquipmentShelf(w:World,offers:Reward[],eligible:(r:Reward)=>boolean=()=>true){const run=w.starship.account.run;if(!run||!offers.length)return offers;const key='shelf:'+offers.map(r=>r.offerId).join('|');if(run.receipts.has(key))return offers;run.receipts.add(key);
 for(const r of offers){const effect='expeditionEffect' in r?(r as import('../progression/expedition-drafts').ExpeditionReward).expeditionEffect:null,index=effect?.kind==='hero'?2:effect?.kind==='elite'?0:-1,identity=index>=0?equipmentValue(w,'purchase_identity_discount',index):0;r.minerals=Math.max(0,r.minerals-(identity||equipmentValue(w,'purchase_discount')));r.gas=Math.max(0,r.gas-(identity?equipmentValue(w,'purchase_identity_discount',index+1):equipmentValue(w,'purchase_discount',1)));}
 const chance=equipmentValue(w,'free_product'),pool=offers.filter(r=>(r.minerals>0||r.gas>0)&&eligible(r));if(chance&&pool.length&&roll(w)<chance){const r=pool[Math.floor(roll(w)*pool.length)];r.minerals=0;r.gas=0;}return offers;
}
export function equipmentRefreshPrice(w:World,native:number){const key=w.rewardRound==='building'?'development':'shop';if(w.starship.window.id===w.draftWindowId&&w.starship.window[key]>0)return 0;return w.rewardRound==='random'?Math.max(0,native*Math.max(1,equipmentValue(w,'refresh_multiplier'))-equipmentValue(w,'refresh_discount')):native;}
