import type {Entity,Body,Point} from '../types';
import type {TerrainQuery} from '../../data/map-definition';
import type {Obstacle} from '../../data/game';
import {distance,blocked} from '../movement/steering';
/** Weapon-based contact rings; movement follows normal traversal, never a raycast shortcut. */
export class EngagementSlots {
 private cache=new Map<number,{until:number;target:Point;ids:string;goals:Map<number,Point>;blocked:Set<number>}>();
 unavailable(unitId:number,targetId:number,time:number){const e=this.cache.get(targetId);return !!e&&e.until>time&&e.blocked.has(unitId);}
 goal(u:Entity,target:Body,allies:Entity[],anchor:Point,time:number,half:number,obstacles:Obstacle[],terrain?:TerrainQuery):Point {
  const peers=allies.filter(a=>a.hp>0&&a.weaponDamage>0&&a.mode!=='siege'&&a.nativeMode!=='lurker_burrowed'&&a.modeTimer<=0&&(a.id===u.id||a.attackTarget===target.id));
  const ids=peers.map(a=>`${a.id}:${a.attackRange}:${a.flying}`).join(',');let entry=this.cache.get(target.id);
  if(!entry||entry.until<=time||entry.ids!==ids||distance(entry.target,target)>Math.min(.3,Math.max(.015,u.attackRange*.15))){
   const goals=new Map<number,Point>(),unavailable=new Set<number>(),placed:{p:Point;r:number;flying:boolean}[]=[];
   const firing=(a:Entity)=>distance(a,target)<=a.attackRange+a.unitRadius+target.unitRadius&&(!terrain||terrain.lineOfFire(a,target,a.flying,target.flying,a.attackRange<1.5));
   for(const a of peers)if(firing(a)){goals.set(a.id,{x:a.x,z:a.z});placed.push({p:{x:a.x,z:a.z},r:a.unitRadius,flying:a.flying});}
   for(const a of peers.filter(a=>!goals.has(a.id)).sort((a,b)=>a.attackRange-b.attackRange||a.id-b.id)){
    const bearing=Math.atan2(a.x-target.x,a.z-target.z),radius=a.unitRadius+target.unitRadius+Math.max(.005,a.attackRange*.85-.08);
    let goal:Point|undefined;
    for(const offset of [0,.3,-.3,.6,-.6,.9,-.9,1.25,-1.25,1.6,-1.6,2,-2,2.5,-2.5,Math.PI]){
     const theta=bearing+offset,p={x:target.x+Math.sin(theta)*radius,z:target.z+Math.cos(theta)*radius};
     if(Math.abs(p.x)+a.unitRadius>=half||Math.abs(p.z)+a.unitRadius>=half||terrain?.isOpen&&!terrain.isOpen(p)||!a.flying&&(blocked(p,a.unitRadius,obstacles)||terrain&&!terrain.canOccupy(p,a.unitRadius))||terrain&&!terrain.lineOfFire(p,target,a.flying,target.flying,a.attackRange<1.5)||placed.some(b=>b.flying===a.flying&&distance(b.p,p)<b.r+a.unitRadius+.04))continue;
     goal=p;break;
    }
    // Blocked contact rings never send bodies into the target center.
    if(!goal){unavailable.add(a.id);goal={x:a.x,z:a.z};}goals.set(a.id,goal);placed.push({p:goal,r:a.unitRadius,flying:a.flying});
   }
   entry={until:time+.4,target:{x:target.x,z:target.z},ids,goals,blocked:unavailable};this.cache.set(target.id,entry);
   if(this.cache.size>64)for(const [id,c] of this.cache)if(c.until<time)this.cache.delete(id);
  }
  return entry.goals.get(u.id)??u;
 }
}
