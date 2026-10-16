import {equipmentPresentation} from './presentation';
import type {World} from '../world';
import type {Entity,Point} from '../types';
import type {UnitType} from '../../data/sc2-units';
import type {ActiveEquipmentEffect} from './selection';
import {activeEquipmentEffects,equipmentValue} from './modules';
import {permanentEquipmentBody} from './eligibility';
import {equipmentRosterMember} from './members';
import {giveEquipmentBarrier,equipmentStageKey} from './defense';
import {createEquipmentProjections,retireEquipmentProjection} from './projections';
import {observeAmount} from '../observation';

export interface EquipmentRecovery {body:Entity;death:number;source:'native'|'phase'|'survivor'|'failed';backup?:ActiveEquipmentEffect;projections:number[];until:number;phaseWon?:Point;}
export interface EquipmentLifeRuntime {roster:Map<number,Entity>;version:number;snapshot?:{version:number;time:number;members:Entity[]};pending:Map<number,EquipmentRecovery>;rewindUsed:boolean;}
export function newEquipmentLife():EquipmentLifeRuntime{return {roster:new Map(),version:0,pending:new Map(),rewindUsed:false};}
export function equipmentCanRevive(w:World,u:Entity){return permanentEquipmentBody(w,u)&&!w.starship.members.get(u.id)?.cannotRevive;}
function nativeWaiting(w:World,u:Entity){if(w.zergHeroes.revivals.some(r=>r.until>w.time&&r.charges>0&&r.seats.some(s=>!s.claimed&&s.members.some(v=>v.id===u.id&&v.bornAt===u.bornAt))))return true;
 const pair=u.pairId?w.expedition.zerglingPairs.find(p=>p.id===u.pairId):undefined;return !!pair&&pair.regrowAt!==null&&pair.members.some(id=>id!==u.id&&(w.entities.get(id)?.hp??0)>0);
}
export function registerEquipmentRoster(w:World){if(!w.starship.enabled)return;const life=w.starship.life;for(const u of w.entities.values()){if(!permanentEquipmentBody(w,u)||u.hp<=0)continue;if(!life.roster.has(u.id)){
   // A delivered replacement of an unrecoverable ordinary seat changes its roster identity.
   const replaced=[...life.roster.values()].find(old=>old.hp<=0&&!life.pending.has(old.id)&&!old.heroId&&!u.heroId&&old.unitType===u.unitType&&equipmentRosterMember(w,old)&&equipmentRosterMember(w,u));if(replaced)life.roster.delete(replaced.id);life.version++;
  }life.roster.set(u.id,u);
 }
 if(equipmentValue(w,'rewind')&&life.roster.size&&[...life.roster.values()].every(u=>(w.entities.get(u.id)?.hp??0)>0))life.snapshot={version:life.version,time:w.time,members:[...life.roster.values()].map(u=>structuredClone(w.entities.get(u.id)!))};
}
function reserveSurvivor(w:World,u:Entity){if(u.heroId||u.eliteId)return undefined;const e=activeEquipmentEffects(w).find(e=>e.key==='rescue');if(!e)return undefined;const period=e.values[3]?equipmentStageKey(w):'run',key=e.source+':rescue:'+period,member=key+':'+(u.pairId??u.id);
 if(w.starship.numbers.has(member)||(w.starship.numbers.get(key)??0)>=e.values[0])return undefined;w.starship.numbers.set(member,1);w.starship.numbers.set(key,(w.starship.numbers.get(key)??0)+1);return structuredClone(e);
}
/** Actual death freezes backup eligibility once, after native revival registration. */
export function equipmentBodyDied(w:World,u:Entity){if(!w.starship.enabled||!equipmentCanRevive(w,u))return;const life=w.starship.life;life.roster.set(u.id,u);const previous=life.pending.get(u.id);if(previous&&previous.death===w.time)return;
 const backup=reserveSurvivor(w,u),body=structuredClone(u),record:EquipmentRecovery={body,death:w.time,source:'failed',backup,projections:[],until:w.time};
 if(nativeWaiting(w,u))record.source='native';else {const e=activeEquipmentEffects(w).find(e=>e.key==='phase');if(e){const copies=createEquipmentProjections(w,u,e.values[0],'phase',e.values[1],e.values[2],e.values[3],e.values[4]);if(copies.length===e.values[0]){record.source='phase';record.projections=copies.map(v=>v.id);record.until=w.time+e.values[1];}}if(record.source==='failed'&&backup)record.source='survivor';}
 if(record.source!=='failed')life.pending.set(u.id,record);
}
function landing(w:World,bodies:Entity[],origins:Point[]){const points:Point[]=[];for(let n=0;n<bodies.length;n++){const body=bodies[n];let point:Point|null=null;for(let i=0;i<20&&!point;i++){const angle=i*2.399,origin={x:origins[n].x+Math.sin(angle)*i*.4,z:origins[n].z+Math.cos(angle)*i*.4},p=w.freePosition(body.unitType,origin,0,8);if(p&&points.every((q,j)=>body.flying!==bodies[j].flying||Math.hypot(q.x-p.x,q.z-p.z)>body.unitRadius+bodies[j].unitRadius+.12))point=p;}if(!point)return null;points.push(point);}return points;}
function restore(w:World,snapshot:Entity,point:Point,hp:number,shield:number,rewind=false){const life=w.starship.life,current=life.roster.get(snapshot.id)??snapshot,u=structuredClone(snapshot);u.rank=current.rank;u.eliteId=current.eliteId;u.heroId=current.heroId;u.modelKey=current.modelKey;u.x=point.x;u.z=point.z;u.prev={...point};u.hp=Math.max(1,u.maxHp*hp);u.shield=(u.maxShield??0)*shield;u.deadAt=null;u.action='spawn';u.velocity={x:0,z:0};u.pendingTarget=null;u.attackTarget=null;u.windup=0;u.attackLock=0;u.carrierHangar=u.carrierHangar?{...u.carrierHangar,initialized:false,job:null}:undefined;
 if(rewind){const time=life.snapshot!.time;for(const key of ['nextShotAt','abilityReady','specialReady','barrierReady','nativeModeUntil','stoppedUntil'] as const){const value=snapshot[key];if(value!==undefined)u[key]=w.time+Math.max(0,value-time);}}
 w.entities.set(u.id,u);life.roster.set(u.id,u);w.starship.native.delete(u);w.refreshStats(u);u.hp=Math.max(1,u.maxHp*hp);u.shield=(u.maxShield??0)*shield;u.energy=Math.min(u.maxEnergy,snapshot.energy);if(u.heroId){const record=w.starship.nativeHeroes.get(u.id)?.record??w.heroes.get(u.heroId);if(record){record.entityId=u.id;record.rank=w.starship.nativeHeroes.get(u.id)?.source==='ark'?5:u.rank;record.awaitingSpawn=false;record.revivePaid=false;if(rewind){const ready=w.starship.numbers.get('rewind-hero-ready:'+u.heroId);if(ready!==undefined)record.skillReady=w.time+Math.max(0,ready-life.snapshot!.time);}}}
 if(u.pairId){const pair=w.expedition.zerglingPairs.find(p=>p.id===u.pairId);if(pair){pair.members=pair.members.filter(id=>id===u.id||(w.entities.get(id)?.hp??0)>0);if(!pair.members.includes(u.id))pair.members.push(u.id);pair.rank=u.rank;pair.eliteId=u.eliteId;pair.regrowAt=null;pair.birthPending=false;}}
 equipmentPresentation(w,rewind?'rewind':'recall-to',u);observeAmount(w,u,'revivals',1);w.visual('hero-revive',u);w.hash.invalidatePlanes();return u;
}
export function tickEquipmentLife(w:World){if(!w.starship.enabled)return;for(const [id,r] of w.starship.life.pending){const live=w.entities.get(id);if(live&&live.hp>0){w.starship.life.pending.delete(id);continue;}
  if(r.source==='native'){if(r.body.pairId){const pair=w.expedition.zerglingPairs.find(p=>p.id===r.body.pairId);if(pair&&pair.members.filter(id=>(w.entities.get(id)?.hp??0)>0).length===2){w.starship.life.pending.delete(id);w.starship.life.roster.delete(id);continue;}}if(nativeWaiting(w,r.body))continue;r.source=r.backup?'survivor':'failed';}
  if(r.source==='phase'){const survivors=r.projections.map(id=>w.entities.get(id)).filter((u):u is Entity=>!!u&&u.hp>0);if(!r.phaseWon&&survivors.length&&w.time+1e-8>=r.until){r.phaseWon={x:survivors[0].x,z:survivors[0].z};for(const projection of r.projections)retireEquipmentProjection(w,projection);}if(r.phaseWon){const points=landing(w,[r.body],[r.phaseWon]);if(!points)continue;restore(w,r.body,points[0],1,1);w.starship.life.pending.delete(id);continue;}if(!survivors.length)r.source=r.backup?'survivor':'failed';else continue;}
  if(r.source==='survivor'&&r.backup&&w.time+1e-8>=r.death+r.backup.values[1]){const points=landing(w,[r.body],[r.body]);if(!points)continue;const u=restore(w,r.body,points[0],r.backup.values[2],0);if(r.backup.values[4])giveEquipmentBarrier(w,u,'survivor',u.maxHp*r.backup.values[4],r.backup.values[5]);w.starship.life.pending.delete(id);continue;}
  if(r.source==='failed')w.starship.life.pending.delete(id);
 }
 registerEquipmentRoster(w);if(w.starship.life.snapshot)for(const [id,h] of w.heroes)if(w.starship.life.roster.size&&[...w.starship.life.roster.values()].every(u=>u.hp>0))w.starship.numbers.set('rewind-hero-ready:'+id,h.skillReady);
}
export function equipmentReservedSeats(w:World,type:UnitType){const ids=new Set<string>();for(const r of w.starship.life.pending.values()){if(r.source==='failed'||r.source==='native'||r.body.unitType!==type||r.body.heroId||!equipmentRosterMember(w,r.body))continue;if(r.body.pairId&&w.allies().some(u=>u.pairId===r.body.pairId))continue;ids.add(r.body.pairId??'body:'+r.body.id);}return ids.size;}
export function equipmentReservedPair(w:World,id:string){return [...w.starship.life.pending.values()].some(r=>r.source!=='failed'&&r.source!=='native'&&r.body.pairId===id);}
/** Called immediately before native defeat. Pending lawful recoveries hold the run open. */
export function equipmentSurvivesWipe(w:World){if(!w.starship.enabled)return false;tickEquipmentLife(w);if(w.starship.life.pending.size)return true;const life=w.starship.life;if([...life.roster.values()].some(u=>(w.entities.get(u.id)?.hp??0)>0))return true;
 if(!equipmentValue(w,'rewind')||life.rewindUsed||!life.snapshot||life.snapshot.version!==life.version)return false;
 const snapshots=life.snapshot.members.filter(u=>equipmentCanRevive(w,u));if(!snapshots.length)return false;const points=landing(w,snapshots,snapshots);if(!points)return true;
 life.rewindUsed=true;for(let i=0;i<snapshots.length;i++){const s=snapshots[i];restore(w,s,points[i],s.hp/s.maxHp,(s.maxShield??0)>0?(s.shield??0)/s.maxShield!:0,true);}w.changed();return true;
}
