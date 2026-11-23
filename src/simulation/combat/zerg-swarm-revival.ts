import {swarmFormal,swarmRank,swarmRoll,tier} from './zerg-swarm-state';
import {spawnSwarmEvent,swarmClonePart} from './zerg-swarm-spawn';
import {pairFor} from '../zerg-brood';
import type {World} from '../world';
import type {Entity} from '../types';
import type {FamilyId} from '../../data/races';
import {cancelEquipmentRecovery} from '../starship/lifecycle';

function seatKey(w:World,u:Entity){
 const slot=w.expedition.familySlots.indexOf(u.unitType as FamilyId),seat=pairFor(w,u)?.slot??u.slot;
 return slot+':'+seat;
}
export function swarmAfterFormalDeath(w:World,u:Entity){
 const s=w.expedition.zergSwarm!,g=swarmRank(s,'G04'),n=swarmRank(s,'N03');
 if(!g&&!n)return;
 const seat=seatKey(w,u),clock=s.seatClocks[seat]??={revive:0,split:0};
 if(clock.revive>w.time||Object.values(s.revivals).some(r=>r.seat===seat))return;
 const chance=Math.min(.75,(g?tier(g,[.2,.3,.4]):0)+(n?tier(n,[.15,.25,.35]):0));
 if(swarmRoll(s,'revival')>=chance)return;
 s.revivals[u.id]={at:w.time+3,seat,health:Math.max(g?tier(g,[.4,.55,.7]):0,n?tier(n,[.5,.6,.7]):0),
  energy:u.energy,body:structuredClone(u)};
}
export function swarmReservedSeats(w:World,family:FamilyId){
 const s=w.expedition.zergSwarm;if(!s)return 0;
 let n=0;
 for(const r of Object.values(s.revivals)){
  const u=r.body;if(u.unitType!==family||w.entities.get(u.id)?.hp||w.starship.life.pending.has(u.id)||w.zergHeroes.revivals.some(window=>window.charges&&window.until>w.time&&window.seats.some(seat=>!seat.claimed&&seat.deadAt!==null&&seat.members.some(body=>body.id===u.id))))continue;
  if(u.pairId&&w.allies().some(a=>a.pairId===u.pairId))continue;n++;
 }
 return n;
}
export function swarmReservesPair(w:World,pair:string){
 return Object.values(w.expedition.zergSwarm?.revivals??{}).some(r=>r.body.pairId===pair);
}
export function swarmReservesSlot(w:World,unit:string,slot:number){
 return Object.values(w.expedition.zergSwarm?.revivals??{}).some(r=>r.body.unitType===unit&&r.body.slot===slot);
}
export function onSwarmFormalRevived(w:World,u:Entity){
 const s=w.expedition.zergSwarm,n=swarmRank(s,'N03');if(!s||!swarmFormal(w,u))return;
 if(s.revivals[u.id]){
  cancelEquipmentRecovery(w,u.id);
  for(const window of w.zergHeroes.revivals)for(const seat of window.seats)
   if(!seat.claimed&&seat.deadAt!==null&&seat.members.some(body=>body.id===u.id&&body.bornAt===u.bornAt))seat.claimed=true;
 }
 delete s.revivals[u.id];
 if(!n)return;
 const seat=seatKey(w,u),clock=s.seatClocks[seat]??={revive:0,split:0};
 if(clock.split>w.time)return;
 clock.split=w.time+45;
 const until=w.time+tier(n,[8,10,12]);
 s.shared['rage:'+u.id]=until;
 for(const child of spawnSwarmEvent(w,'revival-split',[swarmClonePart(u,n,8+2*n)],u))s.shared['rage:'+child.id]=until;
}
export function tickSwarmRevival(w:World){
 const s=w.expedition.zergSwarm!;
 for(const [id,r] of Object.entries(s.revivals)){
  const existing=w.entities.get(+id),body=r.body;
  if(existing&&existing.hp>0){delete s.revivals[+id];continue;}
  if(!swarmFormal(w,body)){delete s.revivals[+id];continue;}
  if(w.time+1e-8<r.at)continue;
  const pair=body.pairId&&w.expedition.zerglingPairs.find(p=>p.id===body.pairId);
  if(pair&&pair.members.filter(i=>(w.entities.get(i)?.hp??0)>0).length>=2){delete s.revivals[+id];continue;}
  const point=w.freePosition(body.unitType,body,0,6)??w.freePosition(body.unitType,w.anchor,0,6);if(!point)continue;
  const u={...body,...point,prev:{...point},deadAt:null,action:'spawn' as const,velocity:{x:0,z:0},
   pendingTarget:null,attackTarget:null,windup:0,attackLock:0,aimStartedAt:null,thinkAt:w.time,
   weaponCooldown:Math.max(0,body.weaponCooldown-(w.time-(body.deadAt??r.at-3))),repositionUntil:w.time};
  if(u.zergSix){u.zergSix={...u.zergSix,cast:undefined,displacement:undefined,burrow:undefined,burrowAt:undefined};}
  w.entities.set(u.id,u);w.refreshStats(u,true);
  u.hp=Math.max(1,u.maxHp*r.health);u.shield=0;u.talentShield=0;u.energy=Math.min(r.energy,u.maxEnergy);
  if(pair){pair.members=pair.members.filter(i=>i!==u.id&&(w.entities.get(i)?.hp??0)>0).concat(u.id);pair.regrowAt=null;pair.birthPending=false;}
  w.starship.life.roster.set(u.id,u);w.hash.invalidatePlanes();
  s.seatClocks[r.seat].revive=w.time+45;
  onSwarmFormalRevived(w,u);w.visual('hero-revive',u);w.changed();
 }
}
