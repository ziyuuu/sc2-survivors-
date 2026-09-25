import type {World} from '../world';
import type {Entity,Point} from '../types';
import {campaign18EnemyPressure,type MainHiveCast} from '../../data/campaign18';
import {distance,clearLine} from '../movement/steering';

/** Experimental encounter timing: fixed before the run, independent of army strength. */
export const MAIN_HIVE_EVENTS:readonly {at:number;kind:MainHiveCast['kind']}[]=[
 ...[4,12,20,28,36].map(at=>({at,kind:'fan' as const})),
 ...[45,61,77,93].map(at=>({at,kind:'bile' as const})),
 ...[53,69,85].map(at=>({at,kind:'fan' as const})),
 ...[100,121,142].map(at=>({at,kind:'line' as const})),
 ...[107,128,146].map(at=>({at,kind:'bile' as const})),
 ...[114,135].map(at=>({at,kind:'fan' as const})),
].sort((a,b)=>a.at-b.at);
const bodies=(w:World)=>[...w.entities.values()].filter(u=>u.owner==='terran'&&u.hp>0);
const pointSegment=(p:Point,a:Point,b:Point)=>{const x=b.x-a.x,z=b.z-a.z,l=x*x+z*z,t=l?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.z-a.z)*z)/l)):0;return Math.hypot(p.x-a.x-x*t,p.z-a.z-z*t);};
function apply(w:World,u:Entity,damage:number){w.hit(u,damage,[],1,'zerg',0,1,w.hive?.id??0);}
/** Called only by fixed simulation. Warnings, impact points, missiles and cursor all enter the run DTO. */
export function tickMainHive(w:World,dt:number){
 const runtime=w.campaign18Runtime;if(!w.expedition||w.endless||w.stage!==18||!runtime||dt<=0)return;
 const remaining=MAIN_HIVE_EVENTS.findIndex(e=>e.at>=w.stageElapsed-1e-8),state=runtime.mainCombat??={nextEvent:remaining<0?MAIN_HIVE_EVENTS.length:remaining,serial:0,casts:[],missiles:[]},hive=w.hive;
 const clear=(a:Point,b:Point)=>clearLine(a,b,0,w.obstacles,w.terrain);
 if(hive&&hive.hp>0){
  const phase=w.stageElapsed<45?0:w.stageElapsed<100?1:2;if(phase!==runtime.mainPhase){runtime.mainPhase=phase;w.announce(phase===1?'主巢第二阶段 · 躲避腐蚀预警':'主巢最终阶段 · 直线与区域组合');}
  while(MAIN_HIVE_EVENTS[state.nextEvent]?.at<=w.stageElapsed+1e-8){const index=state.nextEvent++,event=MAIN_HIVE_EVENTS[index],targets=bodies(w).filter(u=>w.visibleTo(u,'zerg')&&clear(hive,u)&&(event.kind!=='bile'||!u.flying)).sort((a,b)=>distance(a,hive)-distance(b,hive)||a.id-b.id),target=targets[0];
   // Empty visibility uses a fixed rotating firing direction, never a hidden squad anchor.
   const angle=target?Math.atan2(target.x-hive.x,target.z-hive.z):index*Math.PI/4,point=target?{x:target.x,z:target.z}:{x:hive.x+Math.sin(angle)*18,z:hive.z+Math.cos(angle)*18},warningAt=w.time;
   const base=w.difficulty==='easy'?20:35,damage=base*campaign18EnemyPressure(w.difficulty,18).damage;
   state.casts.push({id:++state.serial,kind:event.kind,origin:{x:hive.x,z:hive.z},point,angle,warningAt,at:warningAt+1.5,radius:event.kind==='bile'?2.2:event.kind==='line'?.9:.25,range:28,damage});
  }
 }else state.casts=[];
 runtime.nextMainSkillAt=MAIN_HIVE_EVENTS[state.nextEvent]?.at??Infinity;
 const pending:MainHiveCast[]=[];
 for(const cast of state.casts){if(cast.at>w.time+1e-8){pending.push(cast);continue;}
  if(cast.kind==='fan'){const hitIds:number[]=[];for(let i=0;i<5;i++)state.missiles.push({id:++state.serial,cast:cast.id,...cast.origin,angle:cast.angle+(i-2)*.22,remaining:cast.range,speed:5,damage:cast.damage,hitIds});}
  else if(cast.kind==='bile'){for(const u of bodies(w))if(!u.flying&&distance(u,cast.point)<=cast.radius+u.unitRadius&&clear(cast.point,u))apply(w,u,cast.damage);if(hive)w.effect('explosion',hive,cast.point,cast.radius,.4);}
  else {const end={x:cast.origin.x+Math.sin(cast.angle)*cast.range,z:cast.origin.z+Math.cos(cast.angle)*cast.range};for(const u of bodies(w))if(pointSegment(u,cast.origin,end)<=cast.radius+u.unitRadius&&clear(cast.origin,u))apply(w,u,cast.damage);if(hive)w.effect('hero-line',hive,end,cast.radius,.3);}
 }
 state.casts=pending;
 state.missiles=state.missiles.filter(m=>{const before={x:m.x,z:m.z},step=Math.min(m.remaining,m.speed*dt);m.x+=Math.sin(m.angle)*step;m.z+=Math.cos(m.angle)*step;m.remaining-=step;if(!clear(before,m))return false;for(const u of bodies(w))if(!m.hitIds.includes(u.id)&&pointSegment(u,before,m)<=u.unitRadius+.25&&clear(before,u)){m.hitIds.push(u.id);apply(w,u,m.damage);}return m.remaining>1e-8;});
}
