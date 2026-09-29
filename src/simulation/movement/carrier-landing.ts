import type {World} from '../world';
import type {Point,Pod} from '../types';
import {SC2_UNITS,type UnitType} from '../../data/sc2-units';
import {TUNING} from '../../data/game';
import {blocked,distance} from './steering';

export const CARRIER_RADIUS=1.25;
const active=(p:Pod)=>['falling','active','opening'].includes(p.status)&&p.hp>0;
/** Full circumferential clearance prevents a carrier from sealing a narrow passage. */
export function validCarrierLanding(w:World,type:UnitType,p:Point,ignoreId?:number,radius=CARRIER_RADIUS):boolean {
 const body=Math.max(.9,SC2_UNITS[type].flying?0:SC2_UNITS[type].unitRadius*TUNING.unitScale,...w.allies().filter(u=>!u.flying).map(u=>u.unitRadius));
 const clearance=radius+body*2+.15;
 if(Math.abs(p.x)+clearance>=w.mapHalf||Math.abs(p.z)+clearance>=w.mapHalf||blocked(p,clearance,w.obstacles)||w.terrain&&!w.terrain.canOccupy(p,clearance))return false;
 if(w.pods.some(q=>q.id!==ignoreId&&active(q)&&distance(p,q)<clearance+q.unitRadius)||[...w.fortifications.values()].some(f=>f.hp>0&&distance(p,f)<clearance+f.unitRadius))return false;
 const landing=w.expedition.support.unique.landing;if(landing&&landing.id!==ignoreId&&distance(p,landing.point)<clearance+1.6)return false;
 const structures=[w.hive,...w.expansionHives.values(),...w.economicTargets.values()];
 if(structures.some(b=>b&&b.hp>0&&b.attributes.includes('Structure')&&distance(p,b)<clearance+b.unitRadius))return false;
 const terrain=w.terrain;
 if(!terrain)return true;
 let prev:Point|undefined;
 for(let i=0;i<=24;i++){
  const a=i*Math.PI/12,q={x:p.x+Math.sin(a)*(radius+body+.15),z:p.z+Math.cos(a)*(radius+body+.15)};
  const foot={x:p.x+Math.sin(a)*radius,z:p.z+Math.cos(a)*radius};
  if(Math.abs(terrain.height(foot)-terrain.height(p))>.15||!terrain.canOccupy(q,body)||prev&&!terrain.canStep(prev,q,body))return false;prev=q;
 }
 // Candidate centers belong to the anchor's connected component. Check the actual large body too.
 const next=terrain.routeGoal(w.anchor,p,body,w.mapHalf);
 return distance(w.anchor,p)<body||distance(w.anchor,next)>.01;
}
export function findCarrierLanding(w:World,type:UnitType,preferred?:Point,ignoreId?:number):Point|null {
 if(preferred&&validCarrierLanding(w,type,preferred,ignoreId))return {...preferred};
 const min=w.endless?4:w.stage<=3?7:14,max=w.endless?11:w.stage<=3?13:32;
 const cells=w.spawnLocations.filter(p=>{const d=distance(p,w.anchor);return d>=min&&d<=max;}),n=cells.length;
 // Retry seconds advance the scan, including when no new entity IDs are allocated.
 const start=((Math.imul(w.nextId,2654435761)>>>0)+Math.floor(w.time)*192)%Math.max(1,n);
 for(let i=0;i<Math.min(n,192);i++){const p=cells[(start+i)%n];if(validCarrierLanding(w,type,p,ignoreId))return {...p};}
 return null;
}
export function carrierGuardPosition(w:World,p:Pod,type:UnitType,index:number):Point|null {
 const radius=SC2_UNITS[type].unitRadius*TUNING.unitScale,base=index/Math.max(1,p.guardTypes.length)*Math.PI*2;
 for(let attempt=0;attempt<16;attempt++){
  const a=base+attempt*Math.PI/8,r=Math.max(CARRIER_RADIUS+radius+.7,p.stage<=3?4:p.stage<=8?6:8),q={x:p.x+Math.sin(a)*r,z:p.z+Math.cos(a)*r};
  if(blocked(q,radius,w.obstacles)||w.terrain&&(!w.terrain.canOccupy(q,radius)||!w.terrain.walkLine(p,q,radius)))continue;
  if(w.pods.some(other=>other.id!==p.id&&active(other)&&distance(q,other)<radius+other.unitRadius))continue;
  return q;
 }
 return null;
}
