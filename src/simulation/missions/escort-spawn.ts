import type {World} from '../world';
import type {Point} from '../types';
import {distance,clearLine} from '../movement/steering';
/** Edge-to-edge clearance is checked at actual birth, including a delayed queue. */
export const ESCORT_SPAWN_CLEARANCE=12;
export function escortSpawnClear(w:World,p:Point,r:number){
 return [...w.missions.bodies.values()].filter(b=>b.role==='worker'&&!b.resolved&&b.hp>0).every(b=>distance(b,p)>=ESCORT_SPAWN_CLEARANCE+b.unitRadius+r)
  &&w.allies().every(u=>distance(u,p)>=8+u.unitRadius+r);
}
export function escortSpawnPoint(w:World,origin:Point,angle:number,r:number,legal:(w:World,p:Point,r:number)=>boolean):Point|null{
 for(const span of [20,25,30])for(let i=0;i<48;i++){
  const a=angle+i*Math.PI/24,p={x:origin.x+Math.cos(a)*span,z:origin.z+Math.sin(a)*span};
  if(escortSpawnClear(w,p,r)&&legal(w,p,r)&&clearLine(origin,p,r,w.obstacles,w.terrain))return p;
 }
 return null;
}
