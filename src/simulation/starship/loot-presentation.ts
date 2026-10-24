import type {World} from '../world';
import type {Point} from '../types';
import type {TerrainQuery} from '../../data/map-definition';
import type {EquipmentItem} from './types';
import {BACKPACK_CAPACITY,itemsAt} from './inventory';
import {blocked,clearLine,distance,steerGoal} from '../movement/steering';

export const EQUIPMENT_PICKUP_RADIUS=2.5;
export const EQUIPMENT_LOOT_EVENT_LIFETIME=4;
export interface EquipmentGroundMark extends Point {at:number;terrain:TerrainQuery|undefined}
/** Transient receipts for independent render, sound and UI consumers. Never grant items here. */
export interface EquipmentLootEvent extends Point {
 serial:number;at:number;kind:'drop'|'pickup'|'full';item?:EquipmentItem;
 run:string;terrain:TerrainQuery|undefined;target:Point;backpack:number;
}
export interface EquipmentLootRuntime {
 serial:number;events:EquipmentLootEvent[];ground:Map<string,EquipmentGroundMark>;fullNotified:boolean;
 landing?:{terrain:TerrainQuery|undefined;stage:number;points:Point[]};
}
export const newEquipmentLootRuntime=():EquipmentLootRuntime=>({serial:0,events:[],ground:new Map(),fullNotified:false});

export function equipmentPickupPathClear(w:World,to:Point){
 const from=w.anchor;if(w.terrain&&!w.terrain.walkLine(from,to,0))return false;
 // Exact segment/rectangle overlap: short pickup paths must not skip thin blockers between samples.
 return !w.obstacles.some(o=>{
  let lo=0,hi=1;
  for(const [a,b,min,max] of [[from.x,to.x,o.x-o.w/2,o.x+o.w/2],[from.z,to.z,o.z-o.h/2,o.z+o.h/2]]){
   const d=b-a;if(Math.abs(d)<1e-10){if(a<min||a>max)return false;continue;}
   const t0=(min-a)/d,t1=(max-a)/d;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>hi)return false;
  }
  return true;
 });
}

export function pruneEquipmentLoot(w:World){
 const s=w.starship.loot;s.events=s.events.filter(e=>w.time-e.at<=EQUIPMENT_LOOT_EVENT_LIFETIME);
 for(const id of s.ground.keys())if(w.starship.account.locations[id]?.kind!=='ground')s.ground.delete(id);
}
/** Drop on reachable ground even if the killed enemy was flying over a cliff or water. */
export function equipmentLandingPoint(w:World,origin:Point):Point {
 const legal=(p:Point)=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)+.2<w.mapHalf&&Math.abs(p.z)+.2<w.mapHalf&&!blocked(p,.2,w.obstacles)&&(!w.terrain||w.terrain.canOccupy(p,.2));
 const s=w.starship.loot;
 if(!s.landing||s.landing.terrain!==w.terrain||s.landing.stage!==w.stage)s.landing={terrain:w.terrain,stage:w.stage,points:w.terrain?.connectedLocations?.(w.anchor,.9,.9)??[]};
 const connected=s.landing.points.filter(legal);
 const reachable=(p:Point)=>clearLine(w.anchor,p,0,w.obstacles,w.terrain)||connected.some(q=>distance(q,p)<6&&clearLine(q,p,0,w.obstacles,w.terrain))||!w.terrain?.connectedLocations&&distance(steerGoal(w.anchor,p,.2,w.obstacles,w.terrain,w.mapHalf),w.anchor)>.1;
 if(legal(origin)&&reachable(origin))return {x:origin.x,z:origin.z};
 // Prefer a nearby legal point, retaining the actual receipt if an air enemy died off the map.
 for(let radius=.5;radius<=6;radius+=.5)for(let n=0;n<24;n++){
  const angle=n*Math.PI/12,p={x:origin.x+Math.cos(angle)*radius,z:origin.z+Math.sin(angle)*radius};
  if(legal(p)&&reachable(p))return p;
 }
 const closest=connected.sort((a,b)=>distance(a,origin)-distance(b,origin))[0];
 if(closest)return {...closest};
 // The player anchor is the guaranteed reachable fallback, including terrain-free sandboxes.
 return {x:w.anchor.x,z:w.anchor.z};
}
function emit(w:World,kind:EquipmentLootEvent['kind'],point:Point,item?:EquipmentItem){
 const run=w.starship.account.run;if(!run||run.ended)return;
 pruneEquipmentLoot(w);const s=w.starship.loot;
 s.events.push({serial:++s.serial,at:w.time,kind,x:point.x,z:point.z,item:item?structuredClone(item):undefined,run:run.id,terrain:w.terrain,target:{x:w.anchor.x,z:w.anchor.z},backpack:itemsAt(w.starship.account,'backpack').length});
}
/** Call after a successful ground grant; duplicate calls cannot replay a landing. */
export function registerEquipmentDrop(w:World,item:EquipmentItem){
 const a=w.starship.account,loc=a.locations[item.id],run=a.run;
 if(!w.starship.enabled||!run||run.ended||loc?.kind!=='ground'||loc.run!==run.id||w.starship.loot.ground.has(item.id))return false;
 if(loc.droppedStage===undefined){loc.droppedStage=w.draftWindowId;a.revision++;}
 const point=equipmentLandingPoint(w,{x:loc.x??w.anchor.x,z:loc.z??w.anchor.z});
 if(point.x!==loc.x||point.z!==loc.z){loc.x=point.x;loc.z=point.z;a.revision++;}
 w.starship.loot.ground.set(item.id,{...point,at:w.time,terrain:w.terrain});emit(w,'drop',point,item);return true;
}
export function recordEquipmentPickup(w:World,item:EquipmentItem,from:Point){emit(w,'pickup',from,item);}
export function recordEquipmentBackpackFull(w:World,from:Point){
 if(w.starship.loot.fullNotified)return false;w.starship.loot.fullNotified=true;emit(w,'full',from);return true;
}
/** Read-only adapter shared by the battle view and the independently built inventory UI. */
export function equipmentGroundDrops(w:World){
 const a=w.starship.account,run=a.run;
 if(!w.starship.enabled||!run||run.ended)return [];
 return itemsAt(a,'ground').flatMap(item=>{
  const loc=a.locations[item.id],mark=w.starship.loot.ground.get(item.id);
  if(loc.kind!=='ground'||loc.run!==run.id||!Number.isFinite(loc.x)||!Number.isFinite(loc.z)||mark&&mark.terrain!==w.terrain)return [];
  return [{item,x:loc.x!,z:loc.z!,at:mark?.at??-Infinity}];
 });
}
export function equipmentBackpackState(w:World){return {count:itemsAt(w.starship.account,'backpack').length,capacity:BACKPACK_CAPACITY};}
