import {OBSTACLES,TUNING,type Obstacle} from '../../data/game';
import type {Entity,Point} from '../types';
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function turn(a:number,b:number,max:number){return a+Math.max(-max,Math.min(max,angleDelta(a,b)));}
export function blocked(p:Point,r:number,obstacles=OBSTACLES){return obstacles.some(o=>Math.abs(p.x-o.x)<o.w/2+r&&Math.abs(p.z-o.z)<o.h/2+r);}
export function clearLine(a:Point,b:Point,r:number,obstacles=OBSTACLES){const n=Math.ceil(distance(a,b)/.7);for(let i=1;i<=n;i++){if(blocked({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n},r,obstacles))return false;}return true;}
/** Small static obstacle set: local corner steering, no per-unit map search. */
export function steerGoal(a:Point,b:Point,r:number,obstacles:Obstacle[]=OBSTACLES):Point {
 if(clearLine(a,b,r,obstacles))return b;
 let best:Point|undefined,score=Infinity;
 for(const o of obstacles)for(const sx of [-1,1])for(const sz of [-1,1]){
  const c={x:o.x+sx*(o.w/2+r+.5),z:o.z+sz*(o.h/2+r+.5)};
  if(clearLine(a,c,r,obstacles)) {const s=distance(a,c)+distance(c,b)+(clearLine(c,b,r,obstacles)?0:8);if(s<score){score=s;best=c;}}
 }
 return best??b;
}
export function translate(body:Point,delta:Point,r:number,flying=false,obstacles=OBSTACLES){
 const nx=Math.max(-TUNING.worldHalf+r,Math.min(TUNING.worldHalf-r,body.x+delta.x));
 const nz=Math.max(-TUNING.worldHalf+r,Math.min(TUNING.worldHalf-r,body.z+delta.z));
 if(flying||!blocked({x:nx,z:body.z},r,obstacles))body.x=nx;
 if(flying||!blocked({x:body.x,z:nz},r,obstacles))body.z=nz;
}
export function locomote(u:Entity,goal:Point,speed:number,separation:Point,dt:number,obstacles=OBSTACLES){
 const d=distance(u,goal);let dx=0,dz=0;
 if(d>.15){dx=(goal.x-u.x)/d*speed;dz=(goal.z-u.z)/d*speed;}
 dx+=separation.x;dz+=separation.z;
 const magnitude=Math.hypot(dx,dz),limited=Math.min(speed,magnitude);if(magnitude>speed&&magnitude>0){dx*=speed/magnitude;dz*=speed/magnitude;}
 if(Math.hypot(dx,dz)>.05){const heading=Math.atan2(dx,dz);const rate=u.unitType==='hellion'?2.8:u.unitType==='tank'?2.2:7;
  u.facing=turn(u.facing,heading,rate*dt);
  if(u.unitType==='hellion'||u.unitType==='tank'){const alignment=Math.max(0,Math.cos(angleDelta(u.facing,heading)));dx=Math.sin(u.facing)*limited*alignment;dz=Math.cos(u.facing)*limited*alignment;}
 }
 const acceleration=u.flying?5:15;
 u.velocity.x+=(dx-u.velocity.x)*Math.min(1,acceleration*dt);u.velocity.z+=(dz-u.velocity.z)*Math.min(1,acceleration*dt);
 const before={x:u.x,z:u.z};translate(u,{x:u.velocity.x*dt,z:u.velocity.z*dt},u.unitRadius,u.flying,obstacles);
 u.velocity.x=(u.x-before.x)/dt;u.velocity.z=(u.z-before.z)/dt;u.distanceWalked+=distance(before,u);
 u.action=Math.hypot(u.velocity.x,u.velocity.z)>.1?'move':'idle';
}
