import type {World} from '../world';
import type {Point} from '../types';
import {TUNING} from '../../data/game';
import {angleDelta,blocked,clearLine,distance,steerGoal} from './steering';

export interface DirectionRouteCache {direction:Point;goal:Point;until:number;terrain:World['terrain'];stage:number;speed:number;}
/** Continuous input has a short-lived route, never a saved click destination. */
export function routeDirection(w:World,input:Point,cache:DirectionRouteCache|null,dt:number):{direction:Point;cache:DirectionRouteCache|null}{
 const magnitude=Math.hypot(input.x,input.z),strength=Math.min(1,magnitude);
 if(magnitude<=.01||!Number.isFinite(magnitude))return {direction:{x:0,z:0},cache:null};
 const intent={x:input.x/magnitude,z:input.z/magnitude},speed=TUNING.anchorSpeed*(w.time<w.dashUntil?1.65:1),radius=.8;
 const target={x:w.anchor.x+intent.x*speed*.5*strength,z:w.anchor.z+intent.z*speed*.5*strength};
 if(clearLine(w.anchor,target,radius,w.obstacles,w.terrain)&&Math.abs(target.x)+radius<w.mapHalf&&Math.abs(target.z)+radius<w.mapHalf)return {direction:{x:intent.x*strength,z:intent.z*strength},cache:null};
 const changed=cache&&Math.abs(angleDelta(Math.atan2(intent.x,intent.z),Math.atan2(cache.direction.x,cache.direction.z)))>Math.PI/6;
 if(!cache||changed||w.time>=cache.until||cache.terrain!==w.terrain||cache.stage!==w.terrainStage||cache.speed!==speed||distance(w.anchor,cache.goal)<.15){
  const candidates:Point[]=[target];
  for(const r of [.5,1,1.5,2,3])for(let i=0;i<16;i++)candidates.push({x:target.x+Math.sin(i*Math.PI/8)*r,z:target.z+Math.cos(i*Math.PI/8)*r});
  let goal:Point|null=null;
  for(const candidate of candidates){
   const dx=candidate.x-w.anchor.x,dz=candidate.z-w.anchor.z,d=Math.hypot(dx,dz);
   if(d<.15||dx*intent.x+dz*intent.z<d*.25||Math.abs(candidate.x)+radius>=w.mapHalf||Math.abs(candidate.z)+radius>=w.mapHalf||blocked(candidate,radius,w.obstacles)||w.terrain&&!w.terrain.canOccupy(candidate,radius))continue;
   const next=steerGoal(w.anchor,candidate,radius,w.obstacles,w.terrain,w.mapHalf);
   if(distance(w.anchor,next)>.05){goal=next;break;}
  }
  cache=goal?{direction:intent,goal,until:w.time+.25,terrain:w.terrain,stage:w.terrainStage,speed}:null;
 }
 if(!cache)return {direction:{x:0,z:0},cache:null};
 const dx=cache.goal.x-w.anchor.x,dz=cache.goal.z-w.anchor.z,d=Math.hypot(dx,dz),scale=Math.min(strength,d/(speed*dt));
 return {direction:d>.01?{x:dx/d*scale,z:dz/d*scale}:{x:0,z:0},cache};
}
