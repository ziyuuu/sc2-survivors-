import type {Entity,Body,Point} from '../types';
import type {TerrainQuery} from '../../data/map-definition';
import type {Obstacle} from '../../data/game';
import {distance,blocked,clearLine} from '../movement/steering';
/** Small friendly-only firing arcs. Assign near-side angles in lateral order to avoid crossing
 * traffic. Fire readiness is independent of arriving at a slot; siege bodies never use this. */
export class EngagementSlots {
 private cache=new Map<number,{until:number;target:Point;ids:string;goals:Map<number,Point>}>();
 goal(u:Entity,target:Body,allies:Entity[],anchor:Point,time:number,half:number,obstacles:Obstacle[],terrain?:TerrainQuery):Point {
  const peers=allies.filter(a=>a.unitType!=='medivac'&&a.mode!=='siege'&&a.modeTimer<=0&&(a.id===u.id||a.attackTarget===target.id));
  if(peers.length<2){if(distance(u,target)<=u.attackRange+u.unitRadius+target.unitRadius&&(!terrain||terrain.lineOfFire(u,target)))return u;return target;}
  let entry=this.cache.get(target.id);const ids=peers.map(a=>a.id).join(',');
  if(!entry||entry.until<=time||entry.ids!==ids||distance(entry.target,target)>1){
   const goals=new Map<number,Point>(),placed:{p:Point;r:number}[]=[],bearing=Math.atan2(anchor.x-target.x,anchor.z-target.z),sin=Math.sin(bearing),cos=Math.cos(bearing);
   for(const type of ['marine','hellion','tank']){
    const group=peers.filter(p=>p.unitType===type).sort((a,b)=>(a.x-target.x)*cos-(a.z-target.z)*sin-((b.x-target.x)*cos-(b.z-target.z)*sin)||a.id-b.id);
    group.forEach((a,i)=>{const angle=bearing+(i-(group.length-1)/2)*.30,range=a.attackRange*.82+a.unitRadius+target.unitRadius;
     let goal:Point|undefined;
     for(const offset of [0,.18,-.18,.36,-.36,.6,-.6,.9,-.9]){const theta=angle+offset,p={x:target.x+Math.sin(theta)*range,z:target.z+Math.cos(theta)*range};
      if(Math.abs(p.x)+a.unitRadius>=half||Math.abs(p.z)+a.unitRadius>=half||blocked(p,a.unitRadius,obstacles)||terrain&&(!terrain.canOccupy(p,a.unitRadius)||!terrain.lineOfFire(p,target))||!clearLine(a,p,a.unitRadius,obstacles,terrain)||placed.some(b=>distance(b.p,p)<b.r+a.unitRadius+.2))continue;
      goal=p;break;
     }
     // Across a cliff: route normally first. A firing arc must never invent a walkable shortcut.
     goal??=(distance(a,target)<=a.attackRange+a.unitRadius+target.unitRadius&&(!terrain||terrain.lineOfFire(a,target)))?{x:a.x,z:a.z}:{x:target.x,z:target.z};
     goals.set(a.id,goal);placed.push({p:goal,r:a.unitRadius});
    });
   }
   entry={until:time+.4,target:{x:target.x,z:target.z},ids,goals};this.cache.set(target.id,entry);
   if(this.cache.size>64)for(const [id,c] of this.cache)if(c.until<time-1)this.cache.delete(id);
  }
  return entry.goals.get(u.id)??target;
 }
}
