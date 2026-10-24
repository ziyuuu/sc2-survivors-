import type {World} from '../world';
import type {Entity} from '../types';

/** Scene-local attacks stay with their field. Command cooldowns travel with the
 * participating squad, so crossing a portal cannot reset an already used skill. */
export function specialCommandState(w:World){return {
 dashReady:w.dashReady,dashUntil:w.dashUntil,airliftReady:w.airliftReady,
 detectionReady:w.expedition.detectionReady,bombardAt:w.expedition.support.bombardAt,
 unique:w.expedition.support.unique,
};}
export function resumeSpecialCommands(w:World,s:ReturnType<typeof specialCommandState>,elapsed:number,participants:ReadonlySet<number>){
 const clock=(n:number)=>Number.isFinite(n)?Math.max(0,n-elapsed):n;
 w.dashReady=clock(s.dashReady);w.dashUntil=clock(s.dashUntil);w.airliftReady=clock(s.airliftReady);
 w.expedition.detectionReady=clock(s.detectionReady);w.expedition.support.bombardAt=clock(s.bombardAt);
 const target=w.expedition.support.unique,source=s.unique;
 for(const key of ['ready','activeUntil','consumeReady','missilesReady','bunkerReady','retryAt'] as const)target[key]=clock(source[key]);
 target.activeRank=source.activeRank;target.kills=source.kills;
 for(const id of participants){
  for(const key of ['cycles','echoCounts','counterReady'] as const){if(source[key][id]===undefined)delete target[key][id];else target[key][id]=key==='counterReady'?clock(source[key][id]):source[key][id];}
  const reserve=source.reserves[id];if(reserve)target.reserves[id]={...reserve,until:clock(reserve.until)};else delete target.reserves[id];
 }
}

/** Actor timestamps are seconds, not durations or identity generations. Keep
 * elapsed ages (including negative times) for firing/charge/regen decisions. */
export function rebaseSpecialActor(value:unknown,seconds:number){
 const deadlines=/^(until|next|ready|.*Until|.*Ready|.*ReadyAt|.*StartedAt|.*ExpiresAt|.*Next)$/;
 const timestamps=new Set(['death','deadAt','lastDamagedAt','nextShotAt','lastShotAt','lastSkillAt','thinkAt','siegeSince','aimStartedAt','warmupStart','lastFire','started','lockAt','burrowAt','redirectAt','budgetAt','tentacleAt']);
 const seen=new Set<object>();
 const visit=(v:unknown)=>{if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);if(Array.isArray(v)){v.forEach(visit);return;}if(v instanceof Map||v instanceof Set)return;
  for(const [key,n] of Object.entries(v)){
   if(typeof n==='number'&&Number.isFinite(n)){
    if(timestamps.has(key))(v as Record<string,unknown>)[key]=n-seconds;
    else if(n!==0&&deadlines.test(key))(v as Record<string,unknown>)[key]=Math.max(0,n-seconds);
   }else if(typeof n==='object')visit(n);
  }
 };visit(value);
}

export function restoreSpecialBody(target:Entity,source:Entity,position:{x:number;z:number},elapsed:number){
 rebaseSpecialActor(source,elapsed);Object.assign(target,source,{x:position.x,z:position.z,prev:{x:position.x,z:position.z},attackTarget:null,pendingTarget:null,windup:0,velocity:{x:0,z:0}});
}
