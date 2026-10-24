import type {World} from '../world';
import type {FunRecord} from '../encounters/expanded-state';
import {distance} from '../movement/steering';

function engaged(w:World,m:FunRecord){
 if(m.kind==='cruelQueen')return !!m.attackRequested;
 if(m.kind!=='corruptedProtoss')return true;
 // A dormant site may coexist with later events. Actual fighting, including bugs,
 // still occupies the pressure slot; retreat does not reset wounds or receipts.
 return m.actors.some(id=>{const u=w.entities.get(id);return !!u&&u.hp>0&&(!u.fun?.returning&&(u.action==='attack'||u.pendingTarget!==null||u.attackTarget!==null&&(w.entities.get(u.attackTarget)?.hp??0)>0)||w.time-(u.lastDamagedAt??-Infinity)<2);})||!!m.attackRequested&&distance(w.anchor,m.point)<18;
}
export function majorEventBusy(w:World){
 return !!w.missions.active||w.missions.fleet.ceasefire||!!w.encounters.active||!!w.fieldEvents.horde||[w.encounters.expanded.short,w.encounters.expanded.queen].some(m=>m&&engaged(w,m))||w.fieldEvents.pacing.baitElites.some(id=>(w.entities.get(id)?.hp??0)>0);
}
function activeKeys(w:World){
 return [w.missions.active?.id,w.encounters.active?.id,w.encounters.expanded.short?.id,w.encounters.expanded.queen?.id,w.fieldEvents.horde?'horde:'+w.fieldEvents.horde.started:undefined,...w.fieldEvents.pacing.baitElites.filter(id=>(w.entities.get(id)?.hp??0)>0).map(id=>'bait-elite:'+id)].filter((id):id is string=>id!==undefined);
}
/** Observe completion across ordinary stage boundaries, using normal-world time. */
export function observeEventWindow(w:World){
 const p=w.fieldEvents.pacing,keys=activeKeys(w),busy=majorEventBusy(w);
 if(p.observed.some(id=>!keys.includes(id))||p.pressure&&!busy)p.restUntil=Math.max(p.restUntil,w.time+15);
 p.observed=keys;p.pressure=busy;p.baitElites=p.baitElites.filter(id=>(w.entities.get(id)?.hp??0)>0);
}
export function eventWindowSafe(w:World){
 observeEventWindow(w);
 return w.phase==='battle'&&!w.paused&&!w.requiresPlayerDecision&&!w.specialStages.active&&!w.endless&&w.stage>=4&&w.stage<=18&&w.stageElapsed>=20&&w.duration-w.stageElapsed>=20&&w.time+1e-8>=w.fieldEvents.pacing.restUntil&&!majorEventBusy(w)&&!Array.from(w.entities.values()).some(u=>u.hp>0&&!u.fun&&(u.enemyTier==='boss'||u.enemyTier==='lord'))&&w.allies().some(u=>!u.temporary);
}
export function noteEventAdmission(w:World,key:string){
 const p=w.fieldEvents.pacing;p.lastKey=key;p.restUntil=Math.max(p.restUntil,w.time+15);p.observed=activeKeys(w);p.pressure=majorEventBusy(w);
}
