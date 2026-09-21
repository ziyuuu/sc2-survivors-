import type {TerrainQuery} from '../../data/map-definition';
import {RAMPS,type CharTerrain} from '../../data/terrain';
import {OBSTACLES,TUNING,type Obstacle} from '../../data/game';
import type {Entity,Point} from '../types';
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function turn(a:number,b:number,max:number){return a+Math.max(-max,Math.min(max,angleDelta(a,b)));}
export function blocked(p:Point,r:number,obstacles=OBSTACLES){return obstacles.some(o=>Math.abs(p.x-o.x)<o.w/2+r&&Math.abs(p.z-o.z)<o.h/2+r);}
export function clearLine(a:Point,b:Point,r:number,obstacles=OBSTACLES,terrain?:TerrainQuery){if(terrain&&!terrain.walkLine(a,b,r))return false;const n=Math.ceil(distance(a,b)/.7);for(let i=1;i<=n;i++){if(blocked({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n},r,obstacles))return false;}return true;}
type RouteGraph={terrain?:TerrainQuery;nodes:Point[];edges:{to:number;cost:number}[][]};
const graphs=new WeakMap<Obstacle[],Map<string,RouteGraph>>();
/** Small static visibility graph. Corners and ramp portals are cached per body radius/map extent.
 * This avoids repeatedly selecting the same locally attractive dead-end corner. */
function routeGraph(r:number,obstacles:Obstacle[],terrain:TerrainQuery|undefined,half:number){
 let cache=graphs.get(obstacles);if(!cache)graphs.set(obstacles,cache=new Map());const key=r+':'+half;
 let graph=cache.get(key);if(graph&&graph.terrain===terrain)return graph;
 const nodes:Point[]=[];
 const add=(p:Point)=>{if(Math.abs(p.x)+r<half&&Math.abs(p.z)+r<half&&!blocked(p,r,obstacles)&&(!terrain||terrain.canOccupy(p,r)))nodes.push(p);};
 for(const o of obstacles)for(const sx of [-1,1])for(const sz of [-1,1])add({x:o.x+sx*(o.w/2+r+.35),z:o.z+sz*(o.h/2+r+.35)});
 if(terrain)for(const ramp of RAMPS)for(const sign of [-1,1]){const offset=sign*(ramp.length/2+1.2);add({x:ramp.x+(ramp.axis==='x'?offset:0),z:ramp.z+(ramp.axis==='z'?offset:0)});}
 const edges:RouteGraph['edges']=nodes.map(()=>[]);
 for(let i=0;i<nodes.length;i++)for(let j=0;j<i;j++)if(clearLine(nodes[i],nodes[j],r,obstacles,terrain)){const cost=distance(nodes[i],nodes[j]);edges[i].push({to:j,cost});edges[j].push({to:i,cost});}
 graph={terrain,nodes,edges};cache.set(key,graph);return graph;
}
export function steerGoal(a:Point,b:Point,r:number,obstacles:Obstacle[]=OBSTACLES,terrain?:TerrainQuery,half=TUNING.worldHalf):Point {
 if(clearLine(a,b,r,obstacles,terrain))return b;
 if(terrain?.definition)return terrain.routeGoal(a,b,r,half);
 const {nodes,edges}=routeGraph(r,obstacles,terrain,half),costs=nodes.map(p=>clearLine(p,b,r,obstacles,terrain)?distance(p,b):Infinity),closed=new Uint8Array(nodes.length);
 // Reverse shortest paths from this destination. Only the small cached static graph is searched.
 for(let step=0;step<nodes.length;step++){let index=-1,best=Infinity;for(let i=0;i<nodes.length;i++)if(!closed[i]&&costs[i]<best){best=costs[i];index=i;}if(index<0)break;closed[index]=1;for(const edge of edges[index])costs[edge.to]=Math.min(costs[edge.to],best+edge.cost);}
 let next:Point=a,best=Infinity;
 for(let i=0;i<nodes.length;i++){const d=distance(a,nodes[i]),score=d+costs[i];if(d>.12&&score<best&&clearLine(a,nodes[i],r,obstacles,terrain)){best=score;next=nodes[i];}}
 return next;
}
export function translate(body:Point,delta:Point,r:number,flying=false,obstacles=OBSTACLES,worldHalf=TUNING.worldHalf,terrain?:TerrainQuery){
 const nx=Math.max(-worldHalf+r,Math.min(worldHalf-r,body.x+delta.x));
 const nz=Math.max(-worldHalf+r,Math.min(worldHalf-r,body.z+delta.z));
 if(flying||!blocked({x:nx,z:body.z},r,obstacles)&&(!terrain||terrain.canStep(body,{x:nx,z:body.z},r)))body.x=nx;
 if(flying||!blocked({x:body.x,z:nz},r,obstacles)&&(!terrain||terrain.canStep(body,{x:body.x,z:nz},r)))body.z=nz;
}
export function locomote(u:Entity,goal:Point,speed:number,separation:Point,dt:number,obstacles=OBSTACLES,worldHalf=TUNING.worldHalf,terrain?:TerrainQuery){
 const d=distance(u,goal);let dx=0,dz=0;
 const vehicle=u.unitType==='hellion'||u.unitType==='tank',rate=u.unitType==='hellion'?4.8:u.unitType==='tank'?3.6:7;
 const braking=vehicle?24:u.flying?12:30,acceleration=u.flying?10:vehicle?18:24;
 // Cruise until braking is necessary. The old distance * rate envelope crawled for metres.
 const arrival=Math.min(speed,Math.sqrt(2*braking*Math.max(0,d-.08)));
 if(d>.08){dx=(goal.x-u.x)/d*arrival;dz=(goal.z-u.z)/d*arrival;}
 dx+=separation.x;dz+=separation.z;
 const magnitude=Math.hypot(dx,dz);let limited=Math.min(speed,magnitude);
 if(magnitude>.05){const heading=Math.atan2(dx,dz);u.facing=turn(u.facing,heading,rate*dt);
  if(vehicle){const error=Math.abs(angleDelta(u.facing,heading)),alignment=Math.max(0,Math.cos(error));
   // Brake for sharp turns before translating; finite turning still matters without an orbit.
   if(error>.12)limited=Math.min(limited,Math.max(.08,d)*rate*.75/Math.max(.25,Math.sin(error)));
   limited*=alignment*alignment;dx=Math.sin(u.facing)*limited;dz=Math.cos(u.facing)*limited;
  }else {dx*=limited/magnitude;dz*=limited/magnitude;}
 }
 const deltaX=dx-u.velocity.x,deltaZ=dz-u.velocity.z,delta=Math.hypot(deltaX,deltaZ),maxDelta=(limited<Math.hypot(u.velocity.x,u.velocity.z)?braking:acceleration)*dt;
 const blend=delta>0?Math.min(1,maxDelta/delta):1;u.velocity.x+=deltaX*blend;u.velocity.z+=deltaZ*blend;
 // Clip only this step's forward travel at the arrival shell; never relocate the unit.
 const step=Math.hypot(u.velocity.x,u.velocity.z)*dt,remaining=Math.max(0,d-.08);
 if(step>remaining&&step>0&&separation.x===0&&separation.z===0&&(goal.x-u.x)*u.velocity.x+(goal.z-u.z)*u.velocity.z>0){const factor=remaining/step;u.velocity.x*=factor;u.velocity.z*=factor;}

 const before={x:u.x,z:u.z};translate(u,{x:u.velocity.x*dt,z:u.velocity.z*dt},u.unitRadius,u.flying,obstacles,worldHalf,terrain);
 u.velocity.x=(u.x-before.x)/dt;u.velocity.z=(u.z-before.z)/dt;u.distanceWalked+=distance(before,u);
 u.action=Math.hypot(u.velocity.x,u.velocity.z)>.1?'move':'idle';
}
