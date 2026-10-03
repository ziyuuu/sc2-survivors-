import type {World} from '../world';
import type {Entity,Point} from '../types';
import {blocked,clearLine,distance,steerGoal,translate} from '../movement/steering';

export const TRACKING_MINE={discovery:4,emergeSeconds:.25,speed:6,trigger:1.2,damage:120,blast:2,radius:.3} as const;
/** Saved gameplay state. Routes and render poses are derived, never serialized. */
export interface SupportMine {id:number;point:Point;phase:'buried'|'emerging'|'chasing';targetId:number|null;emergeAt:number;facing:number;}
export function newSupportMine(id:number,point:Point):SupportMine{return {id,point:{...point},phase:'buried',targetId:null,emergeAt:0,facing:0};}
/** Returns true exactly once: the caller removes the mine before applying damage. */
export function advanceTrackingMine(w:World,mine:SupportMine,enemies:Entity[]):boolean{
 const c=TRACKING_MINE;
 const obstacles=mineObstacles(w);
 const contact=(target:Entity)=>distance(mine.point,target)<=c.trigger&&clearLine(mine.point,target,c.radius,obstacles,w.terrain);
 const nextStep=(target:Entity):Point|null=>{
  // Prefer extra corner clearance, but retain legal narrow routes at the actual footprint.
  for(const radius of [c.radius+.1,c.radius]){
   const goal=steerGoal(mine.point,target,radius,obstacles,w.terrain,w.mapHalf),d=distance(mine.point,goal);
   if(d<=1e-8)continue;
   const step=Math.min(c.speed/60,d),p={x:mine.point.x+(goal.x-mine.point.x)*step/d,z:mine.point.z+(goal.z-mine.point.z)*step/d};
   if(Math.abs(p.x)+c.radius<w.mapHalf&&Math.abs(p.z)+c.radius<w.mapHalf&&!blocked(p,c.radius,obstacles)&&clearLine(mine.point,p,c.radius,obstacles,w.terrain)&&(!w.terrain||w.terrain.canStep(mine.point,p,c.radius)))return p;
  }
  return null;
 };
 let target=enemies.find(e=>e.id===mine.targetId&&!e.flying);
 if(!target){mine.targetId=null;target=enemies.filter(e=>!e.flying&&distance(e,mine.point)<=c.discovery).sort((a,b)=>distance(a,mine.point)-distance(b,mine.point)||a.id-b.id).find(e=>contact(e)||nextStep(e)!==null);if(target)mine.targetId=target.id;}
 if(!target)return false;
 if(mine.phase==='buried'){mine.phase='emerging';mine.emergeAt=w.time+c.emergeSeconds;}
 if(mine.phase==='emerging'){if(w.time+1e-8<mine.emergeAt)return false;mine.phase='chasing';}
 if(contact(target))return true;
 const next=nextStep(target);
 // A route becoming invalid releases its target; next tick can select another legal enemy.
 if(!next){mine.targetId=null;return false;}
 mine.facing=Math.atan2(next.x-mine.point.x,next.z-mine.point.z);
 translate(mine.point,{x:next.x-mine.point.x,z:next.z-mine.point.z},c.radius,false,obstacles,w.mapHalf,w.terrain);
 return contact(target);
}
export function validSupportMine(m:SupportMine){return !!m&&Number.isSafeInteger(m.id)&&m.id>0&&!!m.point&&Number.isFinite(m.point.x)&&Number.isFinite(m.point.z)&&['buried','emerging','chasing'].includes(m.phase)&&(m.targetId===null||Number.isSafeInteger(m.targetId)&&m.targetId>0)&&Number.isFinite(m.emergeAt)&&m.emergeAt>=0&&Number.isFinite(m.facing);}

function mineObstacles(w:World){
 const bodies=[...w.fortifications.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[]),...w.pods.filter(p=>['falling','active','opening'].includes(p.status)),...[...w.economicTargets.values()].filter(b=>b.status==='active')].filter(b=>b.hp>0&&!b.flying);
 return bodies.length?[...w.obstacles,...bodies.map(b=>({x:b.x,z:b.z,w:b.unitRadius*2,h:b.unitRadius*2}))]:w.obstacles;
}
export function minePlacementLegal(w:World,p:Point){const r=TRACKING_MINE.radius;return Math.abs(p.x)+r<w.mapHalf&&Math.abs(p.z)+r<w.mapHalf&&!blocked(p,r,mineObstacles(w))&&(!w.terrain||w.terrain.canOccupy(p,r));}
