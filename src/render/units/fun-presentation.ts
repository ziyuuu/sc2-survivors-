import type {World} from '../../simulation/world';
import type {Entity} from '../../simulation/types';
import {FUN_NYDUS} from '../../simulation/encounters/expanded-state';
/** Presentation reads the saved simulation clock. Rendering never advances an encounter. */
export function nydusPose(w:World,u:Entity){
 const n=w.funShop.nydus;if(n?.id===u.id){const seconds=w.time-n.phaseAt;
  if(n.phase==='birth')return {action:'spawn' as const,clip:'Birth',seconds,once:true};
  if(n.phase==='retreat')return {action:'spawn' as const,clip:'Birth',seconds:Math.max(0,FUN_NYDUS.birthTicks/60-seconds),once:true};
  return {action:n.phase==='open'?'skill' as const:'attack' as const,clip:n.phase==='open'?'Stand Work Start':'Pickup',seconds,once:true};
 }
 const m=w.encounters.expanded.short;if(m?.kind!=='devourer'||u.fun?.id!==m.id||u.fun.role!=='actor')return;
 if(m.phase==='rescue'&&m.age<FUN_NYDUS.birthTicks)return {action:'spawn' as const,clip:'Birth',seconds:m.age/60,once:true};
 if(m.phase==='emerging')return {action:'spawn' as const,clip:'Birth',seconds:m.clock/60,once:true};
 if(m.phase==='departing')return {action:'spawn' as const,clip:'Birth',seconds:Math.max(0,(FUN_NYDUS.birthTicks-m.clock)/60),once:true};
 if(m.phase==='swallowing'){
  if(m.clock<FUN_NYDUS.openTicks)return {action:'skill' as const,clip:'Stand Work Start',seconds:m.clock/60,once:true};
  return {action:'attack' as const,clip:'Pickup',seconds:((m.clock-FUN_NYDUS.openTicks)%FUN_NYDUS.pickupTicks)/60,once:true};
 }
 if(m.phase==='rescue'&&m.guardCue!==undefined)return {action:'heal' as const,clip:'Spell',seconds:(m.clock-m.guardCue)/60,once:true};
 if(m.phase==='rescue'&&m.age<FUN_NYDUS.birthTicks+FUN_NYDUS.closeTicks)return {action:'unsieging' as const,clip:'Stand Work End',seconds:(m.age-FUN_NYDUS.birthTicks)/60,once:true};
 return {action:'idle' as const,clip:'Stand',seconds:m.clock/60,once:false};
}
export function heldPose(w:World,u:Entity){
 const n=w.funShop.nydus;if(n?.phase==='swallow'&&n.targets[n.cursor]===u.id&&u.hp>0&&u.owner==='zerg'&&!u.flying&&!u.enemyTier&&!u.mission&&!u.fun&&!u.encounter&&Math.hypot(u.x-n.x,u.z-n.z)<=4+u.unitRadius){const t=Math.min(1,Math.max(0,(w.time-n.phaseAt)*60/FUN_NYDUS.pickupTicks)),ease=t*t*(3-2*t);return {x:u.x+(n.x-u.x)*ease,z:u.z+(n.z-u.z)*ease,lift:Math.sin(t*Math.PI)*1.2,scale:Math.max(.05,1-ease)};}
 if(!u.heldBy){if(!u.funTransit)return undefined;const t=Math.max(0,Math.min(1,(w.time-u.funTransit.at)/(u.funTransit.until-u.funTransit.at))),ease=t*t*(3-2*t);return {x:u.funTransit.from.x+(u.x-u.funTransit.from.x)*ease,z:u.funTransit.from.z+(u.z-u.funTransit.from.z)*ease,lift:(1-t)*1.8+Math.sin(t*Math.PI)*.6,scale:Math.max(.1,t)};}
 const m=w.encounters.expanded.short;if(!m||m.id!==u.heldBy)return null;
 if(m.phase==='rescue'&&m.age<FUN_NYDUS.pickupTicks){const t=m.age/FUN_NYDUS.pickupTicks,ease=t*t*(3-2*t);return {x:u.x+(m.point.x-u.x)*ease,z:u.z+(m.point.z-u.z)*ease,lift:Math.sin(t*Math.PI)*2.4,scale:Math.max(.03,1-t*t)};}
 if(m.phase==='emerging')return {x:u.x,z:u.z,lift:0,scale:1};
 if(m.phase!=='swallowing')return null;
 const i=m.held.findIndex(s=>s.ids.includes(u.id)),elapsed=m.clock-FUN_NYDUS.openTicks-i*FUN_NYDUS.pickupTicks;
 if(i<0||elapsed>=FUN_NYDUS.pickupTicks)return null;
 const t=Math.max(0,elapsed/FUN_NYDUS.pickupTicks),ease=t*t*(3-2*t);
 return {x:u.x+(m.point.x-u.x)*ease,z:u.z+(m.point.z-u.z)*ease,lift:Math.sin(t*Math.PI)*1.7,scale:Math.max(.03,1-t*t)};
}
