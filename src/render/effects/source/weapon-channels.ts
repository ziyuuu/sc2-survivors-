import type {World} from '../../../simulation/world';
import type {Entity,Point,VisualEvent} from '../../../simulation/types';
import {SOURCE_WEAPON_PATTERNS} from '../../../data/expansion-units';
import type {SourceEffectRequest,SourcePlacement} from './types';

type P={x:number;y:number;z:number};
type Emit=(model:string,key:string,age:number,placement:SourcePlacement,options?:Partial<SourceEffectRequest>)=>void;
type Event=(u:Entity,time:number,end:Point&{flying?:boolean})=>VisualEvent;
type Sweep={event:VisualEvent;points:Point[][];started:number};
const rate=1.4,birth=.333/rate;
// Effective LibertyMulti SiteMover: speed 4, max 8.1, accel/decel 40.
// ActorData starts movement after Birth and stops BSD only on MoverArrived.
export function thermalMotion(distance:number,seconds:number){
 const v=4,max=8.1,a=40,peak=Math.min(max,Math.sqrt(a*distance+v*v/2)),up=Math.max(0,(peak-v)/a),down=peak/a;
 const accelerate=(v+peak)*up/2,decelerate=peak*down/2,cruise=Math.max(0,(distance-accelerate-decelerate)/peak),duration=up+cruise+down,t=Math.max(0,Math.min(duration,seconds*rate));
 const travelled=t<up?v*t+a*t*t/2:t<up+cruise?accelerate+peak*(t-up):distance-a*(duration-t)**2/2;
 return {fraction:distance>0?Math.max(0,Math.min(1,travelled/distance)):1,duration:duration/rate};
}

/** Presentation clocks only. Damage points/timers remain owned by simulation. */
export class SourceWeaponChannels {
 private serial=0;private sweeps=new Map<string,Sweep>();
 private rays=new Map<number,{target:number;started:number;lastShot:number;key:string}>();
 reset(){this.serial=0;this.sweeps.clear();this.rays.clear();}
 resumeAt(w:World){this.reset();this.serial=w.visualEvents.at(-1)?.serial??0;}
 render(w:World,emit:Emit,event:Event,muzzle:(e:VisualEvent,side?:string)=>P){
  const ground=(p:Point)=>w.terrain?.height(p)??0;
  const add=(key:string,e:VisualEvent,points:Point[][],started:number)=>{if(!this.sweeps.has(key))this.sweeps.set(key,{event:structuredClone(e),points:structuredClone(points),started});};
  for(const e of w.visualEvents)if(e.serial>this.serial&&e.kind==='attack'&&e.unitType==='colossus'&&!e.heroId){
   const dx=Math.sin(e.facing),dz=Math.cos(e.facing),length=e.eliteId==='colossus.2'?2:1,p=SOURCE_WEAPON_PATTERNS.colossus;
   const points=[p.forwardOffsets,p.reverseOffsets].map(offsets=>offsets.map(o=>({x:e.end.x+dz*o[0]*length-dx*o[1]*length,z:e.end.z-dx*o[0]*length-dz*o[1]*length})));
   add(e.attackId??'event:'+e.serial,e,points,e.time);
  }
  this.serial=w.visualEvents.at(-1)?.serial??this.serial;
  // Restored saves have no event history: reconstruct only still-live native casts.
  for(const u of w.entities.values())if(u.unitType==='colossus'&&!u.heroId){
   const areas=w.expedition.weaponAreas.filter(a=>a.source===u.id),lines=w.protossElites.lines.filter(a=>a.kind==='thermal'&&a.source.id===u.id);
   const casts=areas.length?areas.map(a=>({points:a.points,started:a.next-a.nextIndex*a.period})):lines.map(a=>({points:a.points,started:a.next-a.index*a.period}));
   if(casts.length===2)add(`${u.id}:${u.shotSequence}`,event(u,u.lastShotAt,casts[0].points[0]),casts.map(a=>a.points),casts[0].started);
  }
  for(const [key,s]of this.sweeps){
   const u=w.entities.get(s.event.entityId),age=w.time-s.started,ends=s.points.map(p=>p.at(-1)!),starts=s.points.map(p=>p[0]),motion=starts.map((p,i)=>thermalMotion(Math.hypot(ends[i].x-p.x,ends[i].z-p.z),age-birth));
   if(!u?.hp||age>birth+Math.max(...motion.map(m=>m.duration))){this.sweeps.delete(key);continue;}
   for(let i=0;i<2;i++){
    const t=age<birth?0:motion[i].fraction,end={x:starts[i].x+(ends[i].x-starts[i].x)*t,y:0,z:starts[i].z+(ends[i].z-starts[i].z)*t};end.y=ground(end)+.12;
    const e=event(u,s.started,end),from=muzzle(e,i?'03':'02'),stopTime=s.started+birth+motion[i].duration;
    emit('ColossusAttackBeam','thermal:'+key+':'+i,age,{...from,facing:e.facing,end},{loop:true,hostedBeam:true,stopTime});
    emit('ColossusAttackBeamImpact','thermal-impact:'+key+':'+i,age,{...end,facing:e.facing},{loop:true,stopTime});
   }
  }
  const live=new Set<number>();
  for(const u of w.entities.values()){
   if(u.unitType!=='void_ray'||u.heroId||u.hp<=0||(u.shotSequence??0)<=0)continue;
   const target=u.attackTarget===null?undefined:w.body(u.attackTarget),gap=Math.max(.24,u.shotInterval+1/60),since=w.time-u.lastShotAt;
   if(!target?.hp||since<0||since>gap)continue;
   live.add(u.id);let r=this.rays.get(u.id);
   if(!r||r.target!==target.id||u.lastShotAt-r.lastShot>gap){r={target:target.id,started:u.lastShotAt,lastShot:u.lastShotAt,key:`void:${u.id}:${target.id}:${u.shotSequence}`};this.rays.set(u.id,r);}else r.lastShot=u.lastShotAt;
   const e=event(u,u.lastShotAt,target),from=muzzle(e),end={x:target.x,y:(target.flying?5.6:ground(target))+.6,z:target.z};
   const charge=u.eliteId==='void_ray.1'?Math.min(1,Math.max(0,(u.protossEliteCombat?.lastFire??0)-(u.protossEliteCombat?.lockAt??0))/5):0;
   const placement={...from,facing:e.facing,end},age=w.time-r.started;
   // Original Swarm actor chooses explicit normal/powered clips and destroys
   // after a .125 s stop timer, never a random Attack variant or a 2 s Death.
   emit('VoidRayAttackBeam',r.key+':beam',age,placement,{loop:true,hostedBeam:true,clip:charge>=1?'Attack 06':'Attack 02',stopAfter:.125});
   emit('VoidRayCenterBeam',r.key+':center',age,placement,{loop:true,hostedBeam:true,stopAfter:.125});
  }
  for(const id of this.rays.keys())if(!live.has(id))this.rays.delete(id);
 }
}
