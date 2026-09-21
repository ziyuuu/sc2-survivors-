import {RAMPS,type CharTerrain} from '../../data/terrain';
import {OBSTACLES,TUNING,type Obstacle} from '../../data/game';
import type {Entity,Point} from '../types';
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function turn(a:number,b:number,max:number){return a+Math.max(-max,Math.min(max,angleDelta(a,b)));}
export function blocked(p:Point,r:number,obstacles=OBSTACLES){return obstacles.some(o=>Math.abs(p.x-o.x)<o.w/2+r&&Math.abs(p.z-o.z)<o.h/2+r);}
export function clearLine(a:Point,b:Point,r:number,obstacles=OBSTACLES,terrain?:CharTerrain){if(terrain&&!terrain.walkLine(a,b,r))return false;const n=Math.ceil(distance(a,b)/.7);for(let i=1;i<=n;i++){if(blocked({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n},r,obstacles))return false;}return true;}
type RouteGraph={terrain?:CharTerrain;nodes:Point[];edges:{to:number;cost:number}[][]};
const graphs=new WeakMap<Obstacle[],Map<string,RouteGraph>>();
/** Small static visibility graph. Corners and ramp portals are cached per body radius/map extent.
 * This avoids repeatedly selecting the same locally attractive dead-end corner. */
function routeGraph(r:number,obstacles:Obstacle[],terrain:CharTerrain|undefined,half:number){
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
export function steerGoal(a:Point,b:Point,r:number,obstacles:Obstacle[]=OBSTACLES,terrain?:CharTerrain,half=TUNING.worldHalf):Point {
 if(clearLine(a,b,r,obstacles,terrain))return b;
 const {nodes,edges}=routeGraph(r,obstacles,terrain,half),costs=nodes.map(p=>clearLine(p,b,r,obstacles,terrain)?distance(p,b):Infinity),closed=new Uint8Array(nodes.length);
 // Reverse shortest paths from this destination. Only the small cached static graph is searched.
 for(let step=0;step<nodes.length;step++){let index=-1,best=Infinity;for(let i=0;i<nodes.length;i++)if(!closed[i]&&costs[i]<best){best=costs[i];index=i;}if(index<0)break;closed[index]=1;for(const edge of edges[index])costs[edge.to]=Math.min(costs[edge.to],best+edge.cost);}
 let next:Point=a,best=Infinity;
 for(let i=0;i<nodes.length;i++){const d=distance(a,nodes[i]),score=d+costs[i];if(d>.12&&score<best&&clearLine(a,nodes[i],r,obstacles,terrain)){best=score;next=nodes[i];}}
 return next;
}
export function translate(body:Point,delta:Point,r:number,flying=false,obstacles=OBSTACLES,worldHalf=TUNING.worldHalf,terrain?:CharTerrain){
 const nx=Math.max(-worldHalf+r,Math.min(worldHalf-r,body.x+delta.x));
 const nz=Math.max(-worldHalf+r,Math.min(worldHalf-r,body.z+delta.z));
 if(flying||!blocked({x:nx,z:body.z},r,obstacles)&&(!terrain||terrain.canStep(body,{x:nx,z:body.z},r)))body.x=nx;
 if(flying||!blocked({x:body.x,z:nz},r,obstacles)&&(!terrain||terrain.canStep(body,{x:body.x,z:nz},r)))body.z=nz;
}
export function locomote(u:Entity,goal:Point,speed:number,separation:Point,dt:number,obstacles=OBSTACLES,worldHalf=TUNING.worldHalf,terrain?:CharTerrain){
 const d=distance(u,goal);let dx=0,dz=0;
 // Arrival speed must fit the remaining distance AND a vehicle's finite turn radius.
 const vehicle=u.unitType==='hellion'||u.unitType==='tank',rate=u.unitType==='hellion'?2.8:u.unitType==='tank'?2.2:7;
 const arrival=Math.min(speed,Math.max(0,d-.1)*(vehicle?rate*.65:4));
 if(d>.1){dx=(goal.x-u.x)/d*arrival;dz=(goal.z-u.z)/d*arrival;}
 dx+=separation.x;dz+=separation.z;
 const magnitude=Math.hypot(dx,dz),limited=Math.min(speed,magnitude);if(magnitude>speed&&magnitude>0){dx*=speed/magnitude;dz*=speed/magnitude;}
 if(Math.hypot(dx,dz)>.05){const heading=Math.atan2(dx,dz);
  u.facing=turn(u.facing,heading,rate*dt);
  if(vehicle){const alignment=Math.max(0,Math.cos(angleDelta(u.facing,heading)));dx=Math.sin(u.facing)*limited*alignment;dz=Math.cos(u.facing)*limited*alignment;}
 }
 const acceleration=u.flying?5:15;
 u.velocity.x+=(dx-u.velocity.x)*Math.min(1,acceleration*dt);u.velocity.z+=(dz-u.velocity.z)*Math.min(1,acceleration*dt);
 const before={x:u.x,z:u.z};translate(u,{x:u.velocity.x*dt,z:u.velocity.z*dt},u.unitRadius,u.flying,obstacles,worldHalf,terrain);
 u.velocity.x=(u.x-before.x)/dt;u.velocity.z=(u.z-before.z)/dt;u.distanceWalked+=distance(before,u);
 u.action=Math.hypot(u.velocity.x,u.velocity.z)>.1?'move':'idle';
}
