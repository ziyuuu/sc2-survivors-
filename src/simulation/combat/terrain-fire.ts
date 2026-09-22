import type {Point} from '../types';
/** Endpoint high ground is legal in either direction: there is no fog-of-war.
 * This is an RTS clearance query, not a ballistic ray into the shooter's plateau.
 * Ridges higher than both endpoints still block; melee uses walkLine separately.
 */
export function terrainFireClear(height:(p:Point)=>number,a:Point,b:Point,airA=false,airB=false,airHeight=5.6){
 if(airA&&airB)return true;
 const ceiling=Math.max(airA?airHeight:height(a)+.75,airB?airHeight:height(b)+.75);
 const steps=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.25));
 for(let i=1;i<steps;i++){const t=i/steps;if(height({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t})>ceiling+.03)return false;}
 return true;
}
