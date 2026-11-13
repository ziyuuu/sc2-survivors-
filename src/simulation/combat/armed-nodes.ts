import {armedTargetAllowed} from './armed-targets';
import {hasArmedProc,takeArmedProc} from './armed-procs';
import {ARMED_CARD_BY_ID as C} from '../../data/terran-armed-support';
import {armedRank,type ArmedId} from '../progression/build-progress';
import {tauntArmed} from './armed-fortifications';
import {steerGoal,translate} from '../movement/steering';
import type {World} from '../world';
import type {Body,Entity,Point} from '../types';
import type {ArmedDeployment,ArmedField,ArmedVolley} from './armed-support-state';

export interface ArmedNodeState{
 mark?:{target:number;generation:number;point:Point;direction:Point;untilTick:number};
 control?:{point:Point;exit:Point;untilTick:number;sourceId:number};
 links?:{transport:number;fire:number;node:'N06'|'N07'|'N08';tick:number}[];
 missilePair?:{transport:number};
 handoffs?:{castId:number;newId:number;generation:number;createdTick:number}[];
 batches?:Record<number,{count:number;oldIds:number[]}>;
}
const gap=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
function direction(from:Point,to:Point){const len=gap(from,to)||1;return {x:(to.x-from.x)/len,z:(to.z-from.z)/len};}
const state=(w:World)=>w.expedition.support.armed!.nodes??={};
function available(w:World,id:ArmedId){const a=w.expedition.support.armed!;return armedRank(w.expedition.support,id)>0&&(w.tick>=(a.readyTick[id]??0)||(a.nodeReserves[id]??0)>0);}
function spend(w:World,id:ArmedId,seconds:number){const a=w.expedition.support.armed!;if(w.tick<(a.readyTick[id]??0))a.nodeReserves[id]!--;a.readyTick[id]=w.tick+seconds*60;}
export function armedContact(w:World,source:'G01'|'G02'|'W05',target:Body){if(!armedRank(w.expedition.support,'N07')||target.hp<=0)return;const e=w.entities.get(target.id);if(!e)return;state(w).mark={target:e.id,generation:e.bornAt,point:{x:e.x,z:e.z},direction:direction(w.anchor,e),untilTick:w.tick+C.N07.params.mark*60};}
export function armedControl(w:World,source:Body,point:Point,untilTick:number){if(!armedRank(w.expedition.support,'N08'))return;const f=direction(w.anchor,point);state(w).control={point:{x:point.x,z:point.z},exit:{x:point.x-f.x*2.5,z:point.z-f.z*2.5},untilTick,sourceId:source.id};}
export function armedLockFire(w:World,v:ArmedVolley,center:Point,node:'N06'|'N07'){
 const first=v.shots[0],old={...first.point},limit=v.cardId==='B04'?5:v.cardId==='B01'?12:v.shots.length,indices=Array.from({length:Math.min(limit,v.shots.length)},(_,i)=>i);
 for(const i of indices){const shot=v.shots[i];shot.point={x:shot.point.x+center.x-old.x,z:shot.point.z+center.z-old.z};if(node==='N06')shot.suppressTicks=Math.ceil(C.N06.params.suppress*60);}
 v.calibrated=node;
}
export function tickArmedCoordination(w:World,ready:(id:ArmedId)=>boolean,dispatch:(id:ArmedId)=>number|null){
 if(!available(w,'N06'))return;const a=w.expedition.support.armed!,transport=(['W01','B05','P02'] as const).find(id=>ready(id)&&hasArmedProc(w,id)),fire=(['W04','B04'] as const).find(id=>ready(id)&&hasArmedProc(w,id));
 if(!transport)return;
 if(fire){const fireId=dispatch(fire);if(!fireId)return;takeArmedProc(w,fire);const transportId=dispatch(transport);if(!transportId)return;takeArmedProc(w,transport);const d=a.deployments.find(d=>d.castId===transportId)!;const guard=[...w.entities.values()].filter(e=>armedTargetAllowed(w,e)&&!e.flying&&w.visibleTo(e,'terran')&&gap(e,d.point)<=C.N06.params.front).sort((a,b)=>gap(a,d.point)-gap(b,d.point)||a.id-b.id)[0];if(!guard)return;const v=a.volleys.find(v=>v.id===fireId)!;armedLockFire(w,v,guard,'N06');(state(w).links??=[]).push({transport:transportId,fire:fireId,node:'N06',tick:w.tick});spend(w,'N06',C.N06.params.cd);
 }else if(armedRank(w.expedition.support,'B07')&&hasArmedProc(w,'B07')&&w.expedition.support.unique.missilesReady<=w.time&&[...w.entities.values()].some(e=>armedTargetAllowed(w,e)&&w.visibleTo(e,'terran')&&gap(e,w.anchor)<=14)){const id=dispatch(transport);if(id){takeArmedProc(w,transport);state(w).missilePair={transport:id};}}
}
export function armedMissileCoordination(w:World,packets:{point:Point;target:number;suppressTicks?:number}[]){const n=state(w),pending=n.missilePair;if(!pending)return;delete n.missilePair;const a=w.expedition.support.armed!,ds=a.deployments.filter(d=>d.castId===pending.transport&&d.phase==='falling');if(!ds.length||!available(w,'N06'))return;const guard=[...w.entities.values()].filter(e=>armedTargetAllowed(w,e)&&w.visibleTo(e,'terran')&&gap(e,ds[0].point)<=C.N06.params.front).sort((a,b)=>gap(a,ds[0].point)-gap(b,ds[0].point)||a.id-b.id)[0];if(!guard)return;
 for(const p of packets){p.point={x:guard.x,z:guard.z};p.target=guard.id;p.suppressTicks=C.N06.params.suppress*60;}
 for(const d of ds){const delay=Math.max(0,w.tick+37-d.landTick);d.landTick+=delay;d.openTick+=delay;for(const p of d.passengers)p.exitTick+=delay;}
 (n.links??=[]).push({transport:pending.transport,fire:0,node:'N06',tick:w.tick});spend(w,'N06',C.N06.params.cd);
}
export function tickArmedCalibration(w:World){if(!available(w,'N07'))return;const n=state(w),mark=n.mark;if(!mark||mark.untilTick<=w.tick)return;const original=w.entities.get(mark.target);if(!original||original.hp<=0||original.bornAt!==mark.generation||!w.visibleTo(original,'terran'))return;
 const target=[...w.entities.values()].filter(e=>armedTargetAllowed(w,e)&&e.attackRange>1&&w.visibleTo(e,'terran')&&gap(e,mark.point)<=C.N07.params.behind&&(e.x-mark.point.x)*mark.direction.x+(e.z-mark.point.z)*mark.direction.z>0).sort((a,b)=>gap(a,mark.point)-gap(b,mark.point)||a.id-b.id)[0];if(!target)return;
 const a=w.expedition.support.armed!,v=a.volleys.find(v=>['W04','B01','B04'].includes(v.cardId)&&!v.calibrated&&v.nextIndex===0);if(!v)return;armedLockFire(w,v,target,'N07');(n.links??=[]).push({transport:mark.target,fire:v.id,node:'N07',tick:w.tick});delete n.mark;spend(w,'N07',C.N07.params.cd);
}
export function armedBlockade(w:World,id:'G04'|'P03'|'G05',fields:ArmedField[]=[],deployments:ArmedDeployment[]=[]){const n=state(w),c=n.control;if(!c||c.untilTick<=w.tick||!available(w,'N08'))return false;const controller=w.body(c.sourceId),trap=w.expedition.support.armed!.fields?.find(f=>f.id===c.sourceId&&f.cardId==='B02'&&w.tick<f.endTick);if(!controller?.hp&&!trap)return false;
 if(id==='G04')for(const f of fields){f.width=C.G04.params.width*C.N08.params.oilWidth/C.G04.params.width;f.point={...c.exit};}
 if(id==='P03'){const candidates=[...w.entities.values()].filter(e=>armedTargetAllowed(w,e)&&!e.flying&&w.visibleTo(e,'terran')).sort((a,b)=>gap(a,c.exit)-gap(b,c.exit)||a.id-b.id);if(!candidates.length)return false;for(const [i,f]of fields.entries()){const e=candidates[i%candidates.length];f.target={id:e.id,generation:e.bornAt};f.point={x:e.x,z:e.z};f.radius*=C.N08.params.radiusFactor;}}
 if(id==='G05')for(const d of deployments){d.blockadeExit={...c.exit};}
 spend(w,'N08',C.N08.params.cd);return true;
}
export function armedQueueHandoff(w:World,u:Entity){if(!armedRank(w.expedition.support,'N09')||!u.armed||!['W02','G03','B05'].includes(u.armed.cardId))return;(state(w).handoffs??=[]).push({castId:u.armed.castId,newId:u.id,generation:u.bornAt,createdTick:w.tick});}
export function tickArmedHandoffs(w:World){if(!armedRank(w.expedition.support,'N09'))return;const a=w.expedition.support.armed!,n=state(w),p=C.N09.params;n.batches??={};const forts=[...w.fortifications.values()].filter(f=>f.hp>0&&f.supportUntil!>w.time&&['G02','P05'].includes(f.supportOrigin?.cardId??''));
 for(const h of n.handoffs??[]){const u=w.entities.get(h.newId);if(!u||u.hp<=0||u.bornAt!==h.generation)continue;const b=n.batches[h.castId],fort=forts.filter(f=>gap(u,f)<=p.radius).sort((a,b)=>gap(u,a)-gap(u,b)||a.id-b.id)[0];if(!fort||b&&b.count>=p.count||!b&&!available(w,'N09'))continue;
  const old=w.allies().filter(old=>old.id!==u.id&&old.armed?.castId!==h.castId&&!old.temporary&&!old.heroId&&old.hp<old.maxHp&&gap(old,fort)<=p.radius&&!b?.oldIds.includes(old.id)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id)[0];if(!old)continue;const threat=[...w.entities.values()].filter(e=>e.owner==='zerg'&&e.hp>0).sort((a,b)=>gap(a,fort)-gap(b,fort)||a.id-b.id)[0],f=threat?direction(threat,old):direction(fort,w.anchor),goal={x:old.x+f.x*p.withdraw,z:old.z+f.z*p.withdraw};if(w.terrain&&!w.terrain.canOccupy(goal,old.unitRadius))continue;
  if(!b){spend(w,'N09',p.cd);n.batches[h.castId]={count:0,oldIds:[]};}n.batches[h.castId].count++;n.batches[h.castId].oldIds.push(old.id);const s=a.unitStatus[old.id]??={};s.withdraw={goal,untilTick:w.tick+p.duration*60,generation:old.bornAt};s.damageReduction={factor:1-p.reduction,untilTick:w.tick+p.duration*60};tauntArmed(w,u,p.radius,p.taunt);h.createdTick=-1;
 }
 n.handoffs=(n.handoffs??[]).filter(h=>h.createdTick>=0&&w.tick-h.createdTick<600&&w.entities.get(h.newId)?.hp);
}
export function armedIncoming(w:World,u:Entity){const r=w.expedition.support.armed?.unitStatus[u.id]?.damageReduction;return r&&w.tick<r.untilTick?r.factor:1;}
export function armedSuppressed(w:World,u:Entity){return (w.expedition.support.armed?.unitStatus[u.id]?.suppressUntil??0)>w.tick;}
/** Use the same terrain router, collision pass and committed movement state as ordinary units. */
export function armedMovement(w:World,u:Entity,dt:number){const a=w.expedition.support.armed,s=a?.unitStatus[u.id],withdraw=s?.withdraw,blockade=u.armed?.blockadeExit,goal=withdraw&&withdraw.generation===u.bornAt&&w.tick<withdraw.untilTick?withdraw.goal:blockade&&u.temporaryUntil!-w.time<=1.5?blockade:undefined;if(!goal||u.hp<=0||u.windup>0||u.mode==='siege'||(u.stoppedUntil??0)>w.time)return false;
 u.weaponCooldown=Math.max(0,u.weaponCooldown-dt);u.attackLock=Math.max(0,u.attackLock-dt);u.prev={x:u.x,z:u.z};const next=steerGoal(u,goal,u.unitRadius,w.obstacles,w.terrain,w.mapHalf),length=gap(u,next),distance=Math.min(length,u.moveSpeed*dt);if(distance>.01){const dx=(next.x-u.x)/length*distance,dz=(next.z-u.z)/length*distance;translate(u,{x:dx,z:dz},u.unitRadius,u.flying,w.obstacles,w.mapHalf,w.terrain);u.velocity={x:(u.x-u.prev.x)/dt,z:(u.z-u.prev.z)/dt};u.facing=Math.atan2(dx,dz);u.action='move';}else{u.velocity={x:0,z:0};u.action='idle';}return true;
}
