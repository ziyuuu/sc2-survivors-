import type {World} from '../world';
import type {Body,Entity,Point} from '../types';
import {blocked,distance} from './steering';

export interface EnemyRoute {map:string;points:Point[];index:number;lastVisible:Point|null;checkAt:number;lastPosition:Point;stalled:number}
const centers=new WeakMap<World,{cells:Point[];center:Point}>();
/** Fixed patrol destinations come from public terrain, never the hidden squad anchor. */
export function enemyRouteGoal(w:World,u:Entity,target?:Body):Point {
 let r=u.enemyRoute;
 if(!r||r.map!==w.battlefield.mapId){
  const cells=w.spawnLocations;let cached=centers.get(w);
  if(!cached||cached.cells!==cells){const sum=cells.reduce((a,p)=>({x:a.x+p.x,z:a.z+p.z}),{x:0,z:0});cached={cells,center:cells.length?{x:sum.x/cells.length,z:sum.z/cells.length}:{x:u.x,z:u.z}};centers.set(w,cached);}
  const points:Point[]=[];let seed=Math.imul(u.id,2654435761)>>>0;
  for(let leg=0;leg<3;leg++){
   let best:Point|undefined,score=Infinity;const angle=(u.id*.61803398875+leg/3)*Math.PI*2,desired={x:cached.center.x+Math.sin(angle)*10,z:cached.center.z+Math.cos(angle)*10};
   for(let n=0;n<48&&cells.length;n++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const p=cells[seed%cells.length];
    if(points.some(q=>distance(p,q)<4)||blocked(p,u.unitRadius,w.obstacles)||w.terrain&&!w.terrain.canOccupy(p,u.unitRadius))continue;
    const value=distance(p,desired);if(value<score){best=p;score=value;}
   }
   if(best)points.push({...best});
  }
  r=u.enemyRoute={map:w.battlefield.mapId,points:points.length?points:[{x:u.x,z:u.z}],index:0,lastVisible:null,checkAt:w.time+1,lastPosition:{x:u.x,z:u.z},stalled:0};
 }
 if(target){r.lastVisible={x:target.x,z:target.z};return target;}
 const pod=u.guardianPod===null?undefined:w.pods.find(p=>p.id===u.guardianPod&&['active','opening'].includes(p.status));
 if(pod)return pod;
 if(w.time>=r.checkAt){r.stalled=distance(u,r.lastPosition)<.1?r.stalled+1:0;r.lastPosition={x:u.x,z:u.z};r.checkAt=w.time+1;}
 if(r.lastVisible){if(distance(u,r.lastVisible)>.6&&r.stalled<2)return r.lastVisible;r.lastVisible=null;}
 if(distance(u,r.points[r.index])<.8||r.stalled>=2){r.index=(r.index+1)%r.points.length;r.stalled=0;}
 return r.points[r.index];
}
