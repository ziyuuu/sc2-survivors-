import {DOOMSDAY_CARD_BY_ID as C} from '../../data/terran-doomsday';
import {cloneCombatSource} from '../starship/runtime';
import {settleMechanicalPacket} from './doomsday-weapons';
import type {World} from '../world';
import type {Body,Entity} from '../types';
import type {DoomsdayPayload,DoomsdaySlash} from './doomsday-state';

const p=C['M-O02'].params;
export function doomsdaySwordTarget(w:World,u:Entity,target?:Body){
 return u.doomsday?.special==='M-O02'&&!!target&&!target.flying&&w.edgeDistance(u,target)<=p.swordRange;
}
/** Uses the live origin at impact and the facing frozen at windup. No retargeted fallback shot. */
export function inDoomsdaySword(w:World,u:Entity,target:Body,facing:number){
 if(target.hp<=0||target.heldBy||target.flying||target.owner===u.owner||!w.visibleTo(target,u.owner)||!w.targetAllowed(u,target)||w.edgeDistance(u,target)>p.swordRange||!w.hasAttackLine(u,target))return false;
 const dx=target.x-u.x,dz=target.z-u.z,d=Math.hypot(dx,dz);
 return d<=target.unitRadius||(dx*Math.sin(facing)+dz*Math.cos(facing))/d>=Math.cos(p.swordArc*Math.PI/360);
}
export function scheduleDoomsdaySword(w:World,u:Entity,payload:DoomsdayPayload,period:number,repeats:number){
 const queue=w.expedition.doomsday!.slashes??=[],slot=period/(repeats+1);
 for(let j=0;j<=repeats;j++){
  const startTick=w.tick+Math.floor(j*slot),duration=Math.max(3,Math.floor(slot*p.swordDuration)),hitTick=startTick+Math.max(1,Math.floor(duration*p.swordHitPhase)),fraction=j?C['M-B03'].params.damage:1;
  queue.push({id:w.nextId++,source:cloneCombatSource(w,u),payload:{...payload,damage:payload.damage*fraction,bonuses:payload.bonuses.map(b=>({...b,amount:b.amount*fraction})),shieldBonus:payload.shieldBonus*fraction,hits:1},startTick,hitTick,endTick:startTick+duration,facing:u.attackFacing,variant:((u.doomsday!.giant!.rounds+j)%2) as 0|1,repeat:j>0,settled:false});
 }
}
export function activeDoomsdaySword(w:World,u:Entity):DoomsdaySlash|undefined{
 return u.hp>0&&!u.heldBy?(w.expedition.doomsday?.slashes??[]).find(e=>e.source.id===u.id&&e.source.bornAt===u.bornAt&&e.startTick<=w.tick&&e.endTick>w.tick):undefined;
}
export function tickDoomsdaySwords(w:World){
 const a=w.expedition.doomsday;if(!a?.slashes?.length)return;
 a.slashes=a.slashes.filter(e=>{
  const live=w.entities.get(e.source.id);
  if(!live||live.hp<=0||live.bornAt!==e.source.bornAt||live.heldBy||live.modeTimer>0||live.nativeModeUntil||w.missions.fleet.ceasefire)return false;
  if(!e.settled&&w.tick>=e.hitTick){
   // The complete fan is settled in one fixed step. The flag is saved before any callbacks.
   e.settled=true;e.source.x=live.x;e.source.z=live.z;e.source.attackFacing=e.facing;
   const victims=[...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])].filter(b=>inDoomsdaySword(w,e.source,b,e.facing)).sort((x,y)=>x.id-y.id);
   for(const target of victims){const effective=settleMechanicalPacket(w,e.source,target,e.payload,0,!e.repeat);if(effective>0)w.visual('support-impact',e.source,target,e.id,undefined,{doomsdayEffect:'sword-hit'});}
  }
  return w.tick<e.endTick;
 });
}
