import {APPROACH_CHARGE} from '../../data/player-unit-adaptations';
import {unitData} from '../combat/expedition-combat';
import type {World} from '../world';
import type {Body,Entity,Point} from '../types';
import {clearLine,distance,translate} from './steering';

export const manualMovement=(w:World)=>Math.hypot(w.input.x,w.input.z)>.01||w.order?.kind==='move'&&!w.order.arrived;
export const meleeAttacker=(u:Entity)=>u.weaponDamage>0&&u.attackRange<1.5;
/** Size and current weapon reach both matter: long-range large bodies never charge. */
export function approachChargeProfile(u:Entity){
 if(u.team!=='player'||u.flying||u.weaponDamage<=0||u.mode==='siege'||u.nativeMode==='lurker_burrowed'||u.summonKind||u.temporaryKind==='hero-baneling'||u.temporaryKind==='shop-gland')return;
 if(u.unitType==='baneling')return APPROACH_CHARGE.baneling;
 const d=unitData(u);if(d.unitRadius>=APPROACH_CHARGE.minimumSourceRadius&&u.attackRange<=APPROACH_CHARGE.shortRange)return APPROACH_CHARGE.standard;
}
/** Only living combat bodies can be crossed. Pods, structures and terrain still block. */
export function approachIgnoresContact(w:World,a:Body,b:Body){
 if(!('velocity' in a)||!('velocity' in b)||a.attributes.includes('Structure')||b.attributes.includes('Structure'))return false;
 return [a as Entity,b as Entity].some(u=>u.team==='player'&&u.hp>0&&((u.approachCharge?.until??0)>w.time||!!u.chargeState&&u.chargeState.until>w.time));
}
function clearEndpoint(w:World,u:Entity,p:Point){
 let clear=true;w.hash.query(p,u.unitRadius+3,b=>{if(b.id!==u.id&&b.hp>0&&!b.flying&&distance(p,b)<u.unitRadius+b.unitRadius+.03)clear=false;});return clear;
}
function clearStructures(w:World,u:Entity,p:Point){
 const dx=p.x-u.x,dz=p.z-u.z,length=dx*dx+dz*dz;let clear=true;
 w.hash.query(u,Math.sqrt(length)+u.unitRadius+4,b=>{if(b.id===u.id||b.hp<=0||b.flying||'velocity' in b&&!b.attributes.includes('Structure'))return;const t=length?Math.max(0,Math.min(1,((b.x-u.x)*dx+(b.z-u.z)*dz)/length)):0;if(Math.hypot(u.x+dx*t-b.x,u.z+dz*t-b.z)<u.unitRadius+b.unitRadius+.03)clear=false;});return clear;
}
export function tickApproachCharge(w:World,u:Entity,target:Body|undefined,dt:number,speed=u.moveSpeed){
 const profile=approachChargeProfile(u),cancel=()=>{u.approachCharge=undefined;return false;};
 if(!profile||dt<=0||u.hp<=0||manualMovement(w)||u.nativeModeUntil||u.modeTimer>0||u.windup>0||(u.recoveryUntil??0)>w.time||(u.stoppedUntil??0)>w.time||u.heldBy||u.zergEliteCombat?.dash)return cancel();
 // The researched Zealot retains its native charge timing and elite landing effect.
 if(u.unitType==='zealot'&&w.expedition.tech.charge)return cancel();
 let state=u.approachCharge;
 if(state){target=w.body(state.targetId);if(w.time>=state.until||!target||!w.targetAllowed(u,target)||w.edgeDistance(u,target)<=Math.max(.03,u.attackRange*.85))return cancel();}
 else {
  if(!target||w.time<(u.approachChargeReadyAt??0)||!w.targetAllowed(u,target))return false;
  const remaining=w.edgeDistance(u,target)-Math.max(.03,u.attackRange*.85);
  if(remaining<=.3||remaining>APPROACH_CHARGE.standard.maxDistance+Math.max(3,u.attackRange))return false;
  const d=distance(u,target),dx=(target.x-u.x)/d,dz=(target.z-u.z)/d;
  let travel=Math.min(remaining,profile.maxDistance,speed*profile.speed*profile.seconds),goal:Point|undefined;
  // Never deliberately finish inside a unit. A moving obstacle is handled by the normal contact solver.
  for(;travel>.3;travel-=.1){const p={x:u.x+dx*travel,z:u.z+dz*travel};if(Math.abs(p.x)+u.unitRadius>=w.mapHalf||Math.abs(p.z)+u.unitRadius>=w.mapHalf||!clearLine(u,p,u.unitRadius,w.obstacles,w.terrain)||!clearStructures(w,u,p))continue;if(clearEndpoint(w,u,p)){goal=p;break;}}
  if(!goal)return false;
  state=u.approachCharge={targetId:target.id,until:w.time+profile.seconds,goal,traveled:0};u.approachChargeReadyAt=w.time+profile.cooldown;
 }
 if(!clearLine(u,state.goal,u.unitRadius,w.obstacles,w.terrain)||!clearStructures(w,u,state.goal))return cancel();
 const remaining=distance(u,state.goal);if(remaining<=.01||state.traveled>=profile.maxDistance)return cancel();
 const step=Math.min(remaining,profile.maxDistance-state.traveled,speed*profile.speed*dt),before={x:u.x,z:u.z},dx=(state.goal.x-u.x)/remaining,dz=(state.goal.z-u.z)/remaining;
 u.prev={...before};translate(u,{x:dx*step,z:dz*step},u.unitRadius,false,w.obstacles,w.mapHalf,w.terrain);const moved=distance(before,u);state.traveled+=moved;u.velocity={x:(u.x-before.x)/dt,z:(u.z-before.z)/dt};u.distanceWalked+=moved;u.facing=Math.atan2(dx,dz);u.action='move';
 if(moved<step*.5||distance(u,state.goal)<.01)u.approachCharge=undefined;
 return true;
}
