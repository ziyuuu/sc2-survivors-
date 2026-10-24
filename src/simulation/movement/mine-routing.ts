import type {TerrainQuery} from '../../data/map-definition';
import {RAMPS} from '../../data/terrain';
import type {Obstacle} from '../../data/game';
import type {Point} from '../types';
import {blocked,distance} from './steering';

/** Continuous intersection with the open expanded rectangle, matching blocked(). */
export function mineClearLine(a:Point,b:Point,r:number,obstacles:Obstacle[],terrain?:TerrainQuery){
 for(const o of obstacles){
  let enter=0,leave=1;
  for(const [origin,delta,low,high] of [[a.x,b.x-a.x,o.x-o.w/2-r,o.x+o.w/2+r],[a.z,b.z-a.z,o.z-o.h/2-r,o.z+o.h/2+r]]){
   if(delta===0){if(origin<=low||origin>=high){enter=1;leave=0;break;}}
   else {const t0=(low-origin)/delta,t1=(high-origin)/delta;enter=Math.max(enter,Math.min(t0,t1));leave=Math.min(leave,Math.max(t0,t1));}
  }
  if(enter<leave)return false;
 }
 return !terrain||terrain.walkLine(a,b,r);
}
type Graph={terrain?:TerrainQuery;stage:unknown;nodes:Point[];edges:{to:number;cost:number}[][]};
const graphs=new WeakMap<Obstacle[],Map<string,Graph>>();
function graphFor(r:number,obstacles:Obstacle[],terrain:TerrainQuery|undefined,half:number){
 let cache=graphs.get(obstacles);if(!cache)graphs.set(obstacles,cache=new Map());
 const key=r+':'+half,stage=terrain&&'stage' in terrain?terrain.stage:undefined,old=cache.get(key);
 if(old&&old.terrain===terrain&&old.stage===stage)return old;
 const nodes:Point[]=[];
 const add=(p:Point)=>{if(Math.abs(p.x)+r<half&&Math.abs(p.z)+r<half&&!blocked(p,r,obstacles)&&(!terrain||terrain.canOccupy(p,r)))nodes.push(p);};
 for(const o of obstacles)for(const margin of [.35,.02])for(const sx of [-1,1])for(const sz of [-1,1])add({x:o.x+sx*(o.w/2+r+margin),z:o.z+sz*(o.h/2+r+margin)});
 if(terrain&&!terrain.definition)for(const ramp of RAMPS)for(const sign of [-1,1]){const offset=sign*(ramp.length/2+1.2);add({x:ramp.x+(ramp.axis==='x'?offset:0),z:ramp.z+(ramp.axis==='z'?offset:0)});}
 const edges:Graph['edges']=nodes.map(()=>[]);
 for(let i=0;i<nodes.length;i++)for(let j=0;j<i;j++)if(mineClearLine(nodes[i],nodes[j],r,obstacles,terrain)){const cost=distance(nodes[i],nodes[j]);edges[i].push({to:j,cost});edges[j].push({to:i,cost});}
 const graph={terrain,stage,nodes,edges};cache.set(key,graph);return graph;
}
/** Mine-only visibility routing: terrain and live structure footprints both constrain every edge. */
export function mineRouteGoal(a:Point,b:Point,r:number,obstacles:Obstacle[],terrain:TerrainQuery|undefined,half:number):Point{
 if(mineClearLine(a,b,r,obstacles,terrain))return b;
 const {nodes,edges}=graphFor(r,obstacles,terrain,half);
 const search=(goal:Point)=>{
  if(mineClearLine(a,goal,r,obstacles,terrain))return goal;
  const costs=nodes.map(p=>mineClearLine(p,goal,r,obstacles,terrain)?distance(p,goal):Infinity),closed=new Uint8Array(nodes.length);
  for(let step=0;step<nodes.length;step++){let index=-1,best=Infinity;for(let i=0;i<nodes.length;i++)if(!closed[i]&&costs[i]<best){best=costs[i];index=i;}if(index<0)break;closed[index]=1;for(const edge of edges[index])costs[edge.to]=Math.min(costs[edge.to],best+edge.cost);}
  let next:Point=a,best=Infinity;
  for(let i=0;i<nodes.length;i++){const d=distance(a,nodes[i]),score=d+costs[i];if(d>1e-8&&score<best&&mineClearLine(a,nodes[i],r,obstacles,terrain)){best=score;next=nodes[i];}}
  return next;
 };
 const next=search(b);if(next!==a)return next;
 // Keep the map's existing terrain route for distant cliffs; detour around live
 // structures on the route to its next waypoint, never blindly walk through one.
 if(terrain?.definition){const waypoint=terrain.routeGoal(a,b,r,half);if(distance(a,waypoint)>1e-8)return search(waypoint);}
 return a;
}
