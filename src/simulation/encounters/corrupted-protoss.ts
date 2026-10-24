import type {World} from '../world';
import type {Body,Entity,Point} from '../types';
import type {FunRecord} from './expanded-state';
import {distance,clearLine,blocked} from '../movement/steering';
import type {MissionBody} from '../missions/state';

export const CORRUPT={alive:20,total:40,reinforceBelow:10,delay:300,siteRadius:3.4,activate:8,leash:18} as const;
const empty:MissionBody[]=[];
export function corruptSiteBodies(w:World){const m=w.encounters.expanded.short;return m?.kind==='corruptedProtoss'&&m.corrupt?[m.corrupt.site]:empty;}
export function corruptRecord(w:World,u:Entity){const m=w.encounters.expanded.short;return u.fun?.kind==='corruptedProtoss'&&m?.id===u.fun.id&&m.corrupt?m:undefined;}
export function createCorruptSite(w:World,m:FunRecord){
 const site:MissionBody={id:w.nextId++,...m.point,hp:1,maxHp:1,armor:0,unitRadius:CORRUPT.siteRadius,flying:false,owner:'zerg',team:'enemy',attributes:['Mechanical','Structure'],missionId:m.id,role:'base',model:'gateway',invulnerable:true,resolved:false,age:0,progress:0,facing:0};
 m.corrupt={spawned:0,site};
}
/** Original gateway is 4.8 m wide; its enclosing footprint stays reserved. */
export function corruptPoints(w:World,point:Point,count:number,radius:number,legal:(p:Point,r:number)=>boolean){
 const points:Point[]=[];
 for(let i=0;i<144&&points.length<count;i++){
  const angle=i*2.399963,r=4.4+Math.floor(i/24)*.3,p={x:point.x+Math.sin(angle)*r,z:point.z+Math.cos(angle)*r};
  if(r<CORRUPT.siteRadius+radius+.2||!legal(p,radius)||!clearLine(point,p,radius,w.obstacles,w.terrain)||points.some(q=>distance(q,p)<radius*2+.2))continue;
  points.push(p);
 }
 return points;
}
export function provokeCorrupt(w:World,m:FunRecord){
 if(m.attackRequested)return;m.attackRequested=true;
 for(const id of m.actors){const u=w.entities.get(id);if(u)u.thinkAt=0;}
 for(const u of w.allies())u.thinkAt=0;
}
export function tickCorruptUnit(w:World,u:Entity){
 const m=corruptRecord(w,u);if(!m)return;const f=u.fun!;
 if(!m.attackRequested&&m.corrupt!.proximityTick!==w.tick){m.corrupt!.proximityTick=w.tick;if((distance(w.anchor,m.point)<=CORRUPT.activate||w.allies().some(b=>b.fun?.id!==m.id&&distance(b,m.point)<=CORRUPT.activate))&&clearLine(w.anchor,m.point,.4,w.obstacles,w.terrain))provokeCorrupt(w,m);}
 if(distance(u,m.point)>=CORRUPT.leash-u.unitRadius)f.returning=true;
 if(f.returning){u.attackTarget=null;u.pendingTarget=null;u.windup=0;u.attackLock=0;if(distance(u,m.point)<=6)f.returning=false;}
}
/** This new solid site cannot be penetrated by crowd corrections at its edge. */
export function resolveCorruptSite(w:World){
 const m=w.encounters.expanded.short;if(!m?.corrupt)return;const site=m.corrupt.site;
 for(const u of w.entities.values()){
  if(u.hp<=0||u.flying||u.heldBy)continue;const d=distance(u,site),radius=site.unitRadius+u.unitRadius+.001;if(d>=radius)continue;
  const angle=d>.001?Math.atan2(u.x-site.x,u.z-site.z):u.id*2.399963,p={x:site.x+Math.sin(angle)*radius,z:site.z+Math.cos(angle)*radius};
  if(!blocked(p,u.unitRadius,w.obstacles)&&(!w.terrain||w.terrain.canStep(u,p,u.unitRadius))){u.x=p.x;u.z=p.z;}else if(distance(u.prev,site)>=radius){u.x=u.prev.x;u.z=u.prev.z;}
 }
}
/** Attack eligibility is separate from damage relations: an explicit player hit can provoke. */
export function corruptTargetAllowed(w:World,u:Entity,b:Body){
 const m=w.encounters.expanded.short;if(!m?.corrupt)return true;
 if(b.id===m.corrupt.site.id)return false;
 if(u.fun?.id===m.id){
  if(u.fun.returning||distance(u,m.point)>=CORRUPT.leash-u.unitRadius||distance(b,m.point)>CORRUPT.leash-u.unitRadius)return false;
  if((b.owner==='terran'||(b as Entity).fun?.faction==='friend')&&!m.attackRequested)return false;
 }
 if(u.owner==='terran'&&(b as Entity).fun?.id===m.id&&!m.attackRequested)return false;
 return true;
}
/** Keep normal firing, movement and collision routines; only the destination is local. */
export function corruptRouteGoal(w:World,u:Entity,target?:Body):Point|undefined {
 const m=corruptRecord(w,u);if(!m)return;const f=u.fun!;
 const around=(goal:Point)=>{
  const dx=goal.x-u.x,dz=goal.z-u.z,length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((m.point.x-u.x)*dx+(m.point.z-u.z)*dz)/length)):0;
  const radius=CORRUPT.siteRadius+u.unitRadius+.3;
  if(distance({x:u.x+t*dx,z:u.z+t*dz},m.point)>=radius)return goal;
  const a=Math.atan2(u.x-m.point.x,u.z-m.point.z),b=Math.atan2(goal.x-m.point.x,goal.z-m.point.z),delta=Math.atan2(Math.sin(b-a),Math.cos(b-a));
  for(const side of [Math.sign(delta)||1,-(Math.sign(delta)||1)]){const angle=a+side*.35,r=Math.max(radius+.3,Math.min(6,distance(u,m.point))),p={x:m.point.x+Math.sin(angle)*r,z:m.point.z+Math.cos(angle)*r};if(clearLine(u,p,u.unitRadius,w.obstacles,w.terrain))return p;}
  return {x:u.x,z:u.z};
 };
 if(target&&!f.returning&&corruptTargetAllowed(w,u,target))return around(target);
 const routes=m.route;if(!routes.length)return {x:u.x,z:u.z};
 if(f.patrolIndex===undefined)f.patrolIndex=m.actors.indexOf(u.id)%routes.length;
 if(f.returning){let best=routes[0];for(const p of routes)if(distance(u,p)<distance(u,best))best=p;return around(best);}
 const index=f.patrolIndex%routes.length,point=routes[index];
 if(distance(u,point)<.8)f.patrolIndex=(index+1)%routes.length;
 return around(routes[f.patrolIndex%routes.length]);
}
