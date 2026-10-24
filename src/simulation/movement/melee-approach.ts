import type {World} from '../world';
import type {Body,Entity,Point} from '../types';
import {clearLine,distance} from './steering';
import {equipmentIgnoreContact} from '../starship/controls';

interface Route {target:number;goal:Point;terrain:World['terrain'];stage:number;until:number;points:Point[];}
// Derived movement intent only. New bodies/restored runs have no inherited route.
const routes=new WeakMap<Entity,Route>();
const STEP=.5,PADDING=4,LIMIT=2048;
const NEIGHBORS=[[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]] as const;
/** Reach a melee contact slot around a group of allies, without walking through them. */
export function meleeApproachGoal(w:World,u:Entity,target:Body,goal:Point):Point {
 const bodies:Body[]=[...w.entities.values(),...w.pods.filter(p=>p.status==='active'||p.status==='opening'),...w.fortifications.values()].filter(b=>b.id!==u.id&&b.hp>0&&!b.flying&&b.owner===u.owner&&!equipmentIgnoreContact(w,u,b)&&(!w.terrain||w.terrain.sameContactLayer(u,b)));
 const clear=(a:Point,b:Point)=>{
  if(Math.abs(b.x)+u.unitRadius>w.mapHalf||Math.abs(b.z)+u.unitRadius>w.mapHalf)return false;
  if(!clearLine(a,b,u.unitRadius,w.obstacles,w.terrain))return false;
  const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  for(const other of bodies){
   const radius=u.unitRadius+other.unitRadius+.18,ox=a.x-other.x,oz=a.z-other.z;
   // Contact resolution may leave the source inside the planning margin.
   // Permit moving away from that contact, never across its center.
   if(length>0&&ox*ox+oz*oz<radius*radius&&ox*dx+oz*dz>=0)continue;
   const t=length?Math.max(0,Math.min(1,-(ox*dx+oz*dz)/length)):0;
   if((ox+dx*t)**2+(oz+dz*t)**2<radius*radius)return false;
  }
  return true;
 };
 if(clear(u,goal)){routes.delete(u);return goal;}
 let route=routes.get(u);
 if(route&&(route.target!==target.id||route.terrain!==w.terrain||route.stage!==w.stage||distance(route.goal,goal)>.5||route.until<=w.time)){routes.delete(u);route=undefined;}
 if(route){
  while(route.points.length&&distance(u,route.points[0])<.12)route.points.shift();
  if(!route.points.length)return u;
  if(clear(u,route.points[0]))return route.points[0];
  routes.delete(u);
 }
 const reach=u.unitRadius+target.unitRadius+u.attackRange*.85,contact=distance(goal,target)<=reach+.3;
 const goals=[goal];
 // The formation slot can itself be boxed in by a larger firing line.
 // Search other actual melee contact positions, keeping the weapon range unchanged.
 if(contact){const bearing=Math.atan2(u.x-target.x,u.z-target.z);for(let i=0;i<16;i++){const a=bearing+i*Math.PI/8;goals.push({x:target.x+Math.sin(a)*reach,z:target.z+Math.cos(a)*reach});}}
 const legalGoals=goals.filter(p=>clear(p,p)&&(!contact||distance(p,target)<=u.unitRadius+target.unitRadius+u.attackRange&&clearLine(p,target,0,w.obstacles)&&(!w.terrain||w.terrain.lineOfFire(p,target,false,target.flying,true))));
 const center=contact?target:goal,padding=PADDING+(contact?reach:0);
 const minX=Math.max(-w.mapHalf+u.unitRadius,Math.min(u.x,center.x)-padding),minZ=Math.max(-w.mapHalf+u.unitRadius,Math.min(u.z,center.z)-padding);
 const width=Math.ceil((Math.min(w.mapHalf-u.unitRadius,Math.max(u.x,center.x)+padding)-minX)/STEP)+1;
 const height=Math.ceil((Math.min(w.mapHalf-u.unitRadius,Math.max(u.z,center.z)+padding)-minZ)/STEP)+1,size=width*height;
 const points:Point[]=[],cost=new Float64Array(size).fill(Infinity),parent=new Int32Array(size).fill(-1),closed=new Uint8Array(size),open:{id:number;score:number}[]=[];
 const point=(id:number)=>({x:minX+(id%width)*STEP,z:minZ+Math.floor(id/width)*STEP});
 const push=(id:number,g:number)=>{cost[id]=g;const entry={id,score:g+Math.max(0,distance(point(id),center)-(contact?reach:0))};let i=open.length;open.push(entry);while(i){const p=(i-1)>>1;if(open[p].score<=entry.score)break;open[i]=open[p];i=p;}open[i]=entry;};
 const pop=()=>{const first=open[0],last=open.pop()!;if(open.length){let i=0;while(i*2+1<open.length){let c=i*2+1;if(c+1<open.length&&open[c+1].score<open[c].score)c++;if(open[c].score>=last.score)break;open[i]=open[c];i=c;}open[i]=last;}return first.id;};
 // Connect the exact starting position to nearby grid nodes; no relocation or snapping.
 const sx=Math.round((u.x-minX)/STEP),sz=Math.round((u.z-minZ)/STEP);
 for(let z=Math.max(0,sz-1);z<=Math.min(height-1,sz+1);z++)for(let x=Math.max(0,sx-1);x<=Math.min(width-1,sx+1);x++){const id=z*width+x,p=point(id);if(clear(u,p))push(id,distance(u,p));}
 let found=-1,visited=0,endGoal:Point|undefined;
 while(legalGoals.length&&open.length&&visited<LIMIT){
  const id=pop();if(closed[id])continue;closed[id]=1;visited++;const p=point(id);
  endGoal=legalGoals.find(g=>distance(p,g)<=STEP*1.5&&clear(p,g));if(endGoal){found=id;break;}
  for(const [dx,dz] of NEIGHBORS){
   const x=id%width+dx,z=Math.floor(id/width)+dz;if(x<0||x>=width||z<0||z>=height)continue;const next=z*width+x;if(closed[next])continue;
   const q=point(next),g=cost[id]+distance(p,q);if(g>=cost[next]||!clear(p,q))continue;parent[next]=id;push(next,g);
  }
 }
 if(found>=0&&endGoal){for(let id=found;id>=0;id=parent[id])points.push(point(id));points.reverse();points.push({...endGoal});
  // Remove grid stair steps only where the full segment remains traversable.
  let from:Point=u;for(let i=0;i<points.length;i++){let end=i;while(end+1<points.length&&clear(from,points[end+1]))end++;if(end>i)points.splice(i,end-i);from=points[i];}
 }
 route={target:target.id,goal:{...goal},terrain:w.terrain,stage:w.stage,until:w.time+.4,points};routes.set(u,route);
 return points[0]??u;
}
