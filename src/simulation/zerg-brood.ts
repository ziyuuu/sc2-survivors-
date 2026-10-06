import {observeAmount} from './observation';
import type {World} from './world';
import type {Entity,Point,Pod} from './types';
import type {EliteId} from '../data/elites';
import type {DeliveryPassenger} from './expedition-state';
import {reservedZergPair} from './combat/zerg-hero-revival';

export interface ZerglingPair {id:string;slot:number;members:number[];rank:number;eliteId?:EliteId;regrowAt:number|null;birthPending:boolean;}
export const permanentLing=(u:Entity)=>u.team==='player'&&u.unitType==='zergling'&&!u.heroId&&!u.temporary&&!u.summonKind;
export function pairFor(w:World,u:Entity){return u.pairId?w.expedition.zerglingPairs.find(p=>p.id===u.pairId):undefined;}
export function pairBodies(w:World,p:ZerglingPair){return p.members.map(id=>w.entities.get(id)).filter((u):u is Entity=>!!u&&u.hp>0);}
export function joinPair(w:World,u:Entity,id=`birth:${u.id}`){
 let p=w.expedition.zerglingPairs.find(p=>p.id===id);
 if(!p){const used=new Set(w.expedition.zerglingPairs.filter(p=>pairBodies(w,p).length||reservedZergPair(w,p.id)||w.expedition.ledger.some(j=>j.passengers.some(c=>c.pairId===p.id&&c.status==='waiting'))).map(p=>p.slot));let slot=0;while(used.has(slot))slot++;for(const q of w.expedition.zerglingPairs)if(q.slot===slot)delete w.zergElites.frenzy[q.id];w.expedition.zerglingPairs=w.expedition.zerglingPairs.filter(q=>q.slot!==slot);p={id,slot,members:[],rank:u.rank,regrowAt:null,birthPending:false};w.expedition.zerglingPairs.push(p);}
 if(p.members.length>=2)throw Error('Twin seat already filled');p.members.push(u.id);u.pairId=id;u.rank=p.rank;u.eliteId=p.eliteId;return p;
}
/** One representative per roster seat; living bodies remain independent combat entities. */
export function rosterMembers(w:World,bodies:Entity[]){const seen=new Set<string>();return bodies.filter(u=>{if(!u.pairId)return true;if(seen.has(u.pairId))return false;seen.add(u.pairId);return true;});}
export function syncPair(w:World,u:Entity){const p=pairFor(w,u);if(!p)return [];
 p.rank=u.rank;p.eliteId=u.eliteId;const others=pairBodies(w,p).filter(b=>b.id!==u.id);
 for(const b of others){b.rank=u.rank;b.eliteId=u.eliteId;b.modelKey=u.modelKey;b.tacticalTier=u.tacticalTier;b.tacticalDirection=u.tacticalDirection;b.freeConscript=u.freeConscript;}return others;
}
export function createPair(w:World,position:Point,rank=1){const first=w.addUnit('zergling','terran',position.x,position.z,rank),pair=joinPair(w,first);const second=w.freePosition('zergling',first,.65,3);
 if(second){const u=w.addUnit('zergling','terran',second.x,second.z,rank);joinPair(w,u,pair.id);}else pair.birthPending=true;return first;
}
export function notePairDeath(w:World,u:Entity){const p=pairFor(w,u),survivor=p&&pairBodies(w,p)[0];if(p&&survivor){
 if(p.regrowAt===null)p.regrowAt=w.tick+900;
 // A seat's prepaid evolution remains owned by its living twin.
 const plan=w.expedition.tacticalPlans.zergling;if(plan?.targetEntityId===u.id){plan.targetEntityId=survivor.id;plan.targetGeneration=survivor.bornAt;for(const j of w.expedition.ledger)if(j.family==='zergling')for(const c of j.passengers)if(c.status==='waiting'&&c.purpose==='tacticalProgress'&&c.targetEntityId===u.id){c.targetEntityId=survivor.id;c.targetGeneration=survivor.bornAt;}}
}}
export function tickBroods(w:World){
 if(w.phase!=='battle'||w.paused||w.requiresPlayerDecision)return;
 for(const p of [...w.expedition.zerglingPairs]){
  const alive=pairBodies(w,p),pending=w.expedition.ledger.some(j=>j.passengers.some(c=>c.pairId===p.id&&c.status==='waiting'));
  if(!alive.length){p.regrowAt=null;if(!pending){p.members=[];p.birthPending=false;}continue;}
  if(alive.length===2){p.regrowAt=null;p.birthPending=false;continue;}
  if(pending)continue;
  if(!p.birthPending&&p.regrowAt===null)p.regrowAt=w.tick+900;
  if(!p.birthPending&&w.tick<p.regrowAt!)continue;
  const anchor=alive[0],position=w.freePosition('zergling',anchor,.65,3);if(!position)continue;
  const u=w.addUnit('zergling','terran',position.x,position.z,p.rank);p.members=p.members.filter(id=>(w.entities.get(id)?.hp??0)>0);joinPair(w,u,p.id);
  u.eliteId=anchor.eliteId;u.modelKey=anchor.modelKey;u.tacticalTier=anchor.tacticalTier;u.tacticalDirection=anchor.tacticalDirection;u.freeConscript=anchor.freeConscript;w.refreshStats(u,true);if(u.eliteId==='zergling.3'&&!p.birthPending)u.hp=u.maxHp*.6;if(!p.birthPending)observeAmount(w,u,'revivals',1);p.regrowAt=null;p.birthPending=false;w.changed();
 }
}
export function passengerReservation(p:DeliveryPassenger,w:World){
 if(p.purpose==='tacticalProgress')return 0;if(p.pairHalf!==1)return 1;if(p.purpose!=='body')return 0;
 // A first twin may die while its companion is still aboard. The paid survivor
 // continues reserving the seat until it exits; injection cannot take that seat.
 const pair=w.expedition.zerglingPairs.find(q=>q.id===p.pairId);
 return pair&&pairBodies(w,pair).length||w.expedition.ledger.some(j=>j.passengers.some(c=>c.pairId===p.pairId&&c.pairHalf===0&&c.status==='waiting'))?0:1;
}
export function pendingBodies(w:World,family:string){return w.expedition.ledger.filter(j=>j.family===family).reduce((n,j)=>n+j.passengers.filter(p=>p.status==='waiting'&&p.purpose==='body').reduce((v,p)=>v+passengerReservation(p,w),0),0);}
/** Atomic, deterministic addition to the existing paid delivery ledger. */
export function injectCarrier(w:World,queen:Entity,pod:Pod){
 if(w.phase!=='battle'||w.paused||w.requiresPlayerDecision||queen.team!=='player'||queen.race!=='zerg'||queen.unitType!=='queen'||queen.heroId||queen.temporary||queen.hp<=0||(queen.stoppedUntil??0)>w.time||(queen.injectReady??0)>w.time||w.expedition.race!=='zerg'||pod.hp<=0||!['active','opening'].includes(pod.status)||pod.injectedBy!==undefined||Math.hypot(queen.x-pod.x,queen.z-pod.z)>6)return false;
 const job=w.expedition.ledger.find(j=>j.id===pod.jobId);if(!job||!job.passengers.some(c=>c.status==='waiting'&&c.purpose==='body'))return false;
 const room=Math.max(0,w.rosterCap-w.familySeatCount(pod.unitType)-pendingBodies(w,pod.unitType));const seats=Math.min(2,room,w.availableCapacity(pod.unitType));if(!seats)return false;
 const width=pod.unitType==='zergling'?2:1,base=job.passengers.length;
 for(let seat=0;seat<seats;seat++)for(let half=0;half<width;half++){
  job.passengers.push({paid:{minerals:0,gas:0},status:'waiting',entityId:null,purpose:'body',source:'queen-inject',...(width===2?{pairId:`inject:${pod.id}:${base+seat}`,pairHalf:half as 0|1}:{})});pod.passengers.push({status:'waiting',entityId:null});
 }
 pod.injectedBy=queen.id;pod.injectedSeats=seats;pod.injectedAt=w.time;queen.injectReady=w.time+45;queen.lastSkillAt=w.time;w.visual('queen-inject',queen,pod);w.changed();return true;
}
export function tickQueenInjection(w:World){for(const queen of w.allies())if(queen.unitType==='queen'&&!queen.heroId&&(queen.injectReady??0)<=w.time)for(const pod of w.pods)if(injectCarrier(w,queen,pod))break;}
