import type {World} from '../world';
import type {Point} from '../types';
import {crossingWallBetween} from './crossing-layout';
export const CROSSING_FOG={width:40,height:108,left:-20,top:-54,radius:12} as const;
export function crossingFogCell(p:Point){const x=Math.floor(p.x+20),z=Math.floor(p.z+54);return x<0||x>=40||z<0||z>=108?-1:z*40+x;}
export function crossingExplored(w:World,p:Point){return w.specialStages.active?.kind!=='crossing'||!!w.specialStages.active.crossingFog?.cells.has(crossingFogCell(p));}
/** Remember explored ground. Walls block sight; touching a wall reveals its face, not the far corridor. */
export function revealCrossingFog(w:World){
 const a=w.specialStages.active;if(a?.kind!=='crossing')return;const fog=a.crossingFog??(a.crossingFog={cells:new Set(),revision:0});let changed=false;
 for(const u of w.allies()){
  const r=CROSSING_FOG.radius;
  for(let z=Math.max(-54,Math.floor(u.z-r));z<Math.min(54,u.z+r);z++)for(let x=Math.max(-20,Math.floor(u.x-r));x<Math.min(20,u.x+r);x++){
   const p={x:x+.5,z:z+.5},cell=crossingFogCell(p);if(fog.cells.has(cell)||(p.x-u.x)**2+(p.z-u.z)**2>r*r)continue;
   // Stop just before the tile center so an opaque boundary tile can become visible.
   const d=Math.hypot(p.x-u.x,p.z-u.z),end={x:p.x-(p.x-u.x)/Math.max(1,d)*.7,z:p.z-(p.z-u.z)/Math.max(1,d)*.7};
   if(!crossingWallBetween(u,end)){fog.cells.add(cell);changed=true;}
  }
 }
 if(changed)fog.revision++;
}
