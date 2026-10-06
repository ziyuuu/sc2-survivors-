import {observeAmount} from '../observation';
import type {World} from '../world';
import type {Entity,Point} from '../types';
import type {UnitType} from '../../data/sc2-units';
import type {EliteId} from '../../data/elites';
import {ZERG_HERO_RULES as R} from '../../data/zerg-heroes';
import {permanentBiological,zergHeal} from './zerg-hero-passives';
import {rosterMembers,pairBodies} from '../zerg-brood';
export interface RevivalSeat {key:string;family:UnitType;pairId?:string;members:Entity[];rank:number;claimed:boolean;deadAt:number|null}
export interface RevivalWindow {id:number;source:number;until:number;next:number;charges:number;seats:RevivalSeat[]}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const eligible=(u:Entity)=>permanentBiological(u)&&!u.heroId;
export function canRegisterZergRevivalSeat(w:World,source:Entity,u:Entity){if(!eligible(u)||!w.expedition.familySlots.includes(u.unitType as UnitType)||w.edgeDistance(source,u)>R.niadra.revivalRange||!w.hasAttackLine(source,u))return false;if(!u.pairId)return true;const p=w.expedition.zerglingPairs.find(p=>p.id===u.pairId),bodies=p?pairBodies(w,p):[];return bodies.length===2&&bodies.every(a=>w.edgeDistance(source,a)<=R.niadra.revivalRange&&w.hasAttackLine(source,a));}
const active=(w:World,r:RevivalWindow)=>r.until>w.time&&r.charges>0;
const wholeSeatDead=(w:World,s:RevivalSeat)=>s.members.every(u=>(w.entities.get(u.id)?.hp??0)<=0)&&(!s.pairId||![...w.entities.values()].some(u=>u.pairId===s.pairId&&u.hp>0));
const waiting=(w:World,r:RevivalWindow,s:RevivalSeat)=>active(w,r)&&!s.claimed&&s.deadAt!==null&&w.expedition.familySlots.includes(s.family)&&wholeSeatDead(w,s);
export function zergRevivalSeats(w:World,family:UnitType){return new Set(w.zergHeroes.revivals.flatMap(r=>r.seats.filter(s=>s.family===family&&waiting(w,r,s)).map(s=>s.key))).size;}
export function reservedZergElite(w:World,id:EliteId){return w.zergHeroes.revivals.some(r=>r.seats.some(s=>waiting(w,r,s)&&s.members.some(u=>u.eliteId===id)));}
export function reservedZergPair(w:World,id:string){return w.zergHeroes.revivals.some(r=>r.seats.some(s=>s.pairId===id&&waiting(w,r,s)));}
/** Freeze current permanent identities; wounded bodies and alive full-HP seats are both eligible. */
export function registerZergRevival(w:World,source:Entity,serial:number,rank:number){const n=Math.max(0,Math.min(4,rank-1));
 const bodies=w.allies().filter(u=>canRegisterZergRevivalSeat(w,source,u)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id);
 const seats:RevivalSeat[]=rosterMembers(w,bodies).slice(0,R.niadra.revivalSeats).map(u=>{const pair=u.pairId?w.expedition.zerglingPairs.find(p=>p.id===u.pairId):undefined,members=pair?pairBodies(w,pair):[u];return {key:u.pairId??'body:'+u.id,family:u.unitType as UnitType,pairId:u.pairId,members:members.map(a=>({...structuredClone(a),hp:0})),rank,claimed:false,deadAt:null};});
 const wounded=w.allies().filter(u=>u.id!==source.id&&permanentBiological(u)&&u.hp<u.maxHp&&w.edgeDistance(source,u)<=R.niadra.revivalRange&&w.hasAttackLine(source,u)).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp||a.id-b.id).slice(0,R.niadra.targets);
 if(!seats.length&&!wounded.length)return false;w.zergHeroes.revivals=w.zergHeroes.revivals.filter(r=>r.until>w.time);if(seats.length)w.zergHeroes.revivals.push({id:serial,source:source.id,until:w.time+R.niadra.revivalSeconds,next:w.time+1,charges:R.niadra.charges[n],seats});
 for(const a of wounded)zergHeal(w,source,a,a.maxHp*R.niadra.immediate[n],true);
 for(const s of seats)for(const a of s.members){const live=w.entities.get(a.id);if(live)w.visual('hero-revival-mark',source,live,serial);}return true;
}
export function zergRevivalDeath(w:World,e:Entity){for(const r of w.zergHeroes.revivals)if(active(w,r))for(const s of r.seats)if(!s.claimed){const i=s.members.findIndex(a=>a.id===e.id&&a.bornAt===e.bornAt);if(i<0&&(!s.pairId||s.pairId!==e.pairId))continue;if(i>=0)s.members[i]=structuredClone(e);if(wholeSeatDead(w,s))s.deadAt=w.time;}}
/** One seat per second, two legal points atomically for a twin seat. No position means no spent receipt. */
export function tickZergRevival(w:World){for(const r of w.zergHeroes.revivals){if(!active(w,r)||w.time+1e-8<r.next)continue;r.next=w.time+1;
  const seat=r.seats.filter(s=>waiting(w,r,s)).sort((a,b)=>(a.deadAt??0)-(b.deadAt??0)||a.members[0].id-b.members[0].id)[0];if(!seat)continue;
  const points:Point[]=[];for(const body of seat.members){let point:Point|null=null;for(let i=0;i<12&&!point;i++){const a=i*2.399,origin={x:body.x+Math.sin(a)*(.6+i*.15),z:body.z+Math.cos(a)*(.6+i*.15)},p=w.freePosition(seat.family,origin,0,2);if(p&&points.every(q=>distance(p,q)>body.unitRadius*2+.05))point=p;}if(!point)break;points.push(point);}if(points.length!==seat.members.length)continue;
  seat.claimed=true;r.charges--;const n=Math.max(0,Math.min(4,seat.rank-1));for(const [i,body] of seat.members.entries()){const u=structuredClone(body);u.x=points[i].x;u.z=points[i].z;u.prev={...points[i]};u.deadAt=null;u.hp=Math.max(1,u.maxHp*R.niadra.revive[n]);u.velocity={x:0,z:0};u.action='spawn';u.pendingTarget=null;u.attackTarget=null;u.windup=0;u.attackLock=0;u.repositionUntil=w.time+.2;w.entities.set(u.id,u);w.refreshStats(u);u.hp=Math.max(1,u.maxHp*R.niadra.revive[n]);const source=w.entities.get(r.source);observeAmount(w,'niadra','revivals',1);w.visual('hero-revive',source??u,u,r.id);}
  if(seat.pairId){const pair=w.expedition.zerglingPairs.find(p=>p.id===seat.pairId);if(pair){pair.members=seat.members.map(u=>u.id);pair.rank=seat.members[0].rank;pair.eliteId=seat.members[0].eliteId;pair.regrowAt=null;pair.birthPending=false;}}
  w.hash.invalidatePlanes();w.changed();
 }w.zergHeroes.revivals=w.zergHeroes.revivals.filter(r=>active(w,r));}
