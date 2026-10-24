import type {Obstacle} from '../../data/game';
import type {Point} from '../types';
/** Three sequential left/right forks. Each connector returns both routes to the next choice. */
export const CROSSING_FORKS=[30,0,-30] as const;
export const CROSSING_WAVE={count:64,roaches:16,radius:10} as const;
export const CROSSING_WALLS:readonly Obstacle[]=[
 ...CROSSING_FORKS.map(z=>({x:0,z,w:8,h:16})),
 ...[15,-15].flatMap(z=>[-13,13].map(x=>({x,z,w:14,h:3}))),
];
/** Segment against inflated rectangles: movement, aiming and alert sight share the walls. */
export function crossingWallBetween(a:Point,b:Point,r=0){
 return CROSSING_WALLS.some(o=>{
  let lo=0,hi=1;
  for(const [start,delta,min,max] of [[a.x,b.x-a.x,o.x-o.w/2-r,o.x+o.w/2+r],[a.z,b.z-a.z,o.z-o.h/2-r,o.z+o.h/2+r]]){
   if(Math.abs(delta)<1e-10){if(start<=min||start>=max)return false;continue;}
   const x=(min-start)/delta,y=(max-start)/delta;lo=Math.max(lo,Math.min(x,y));hi=Math.min(hi,Math.max(x,y));if(lo>=hi)return false;
  }
  return lo<hi;
 });
}
