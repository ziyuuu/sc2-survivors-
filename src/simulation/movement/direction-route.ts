import type {World} from '../world';
import type {Point} from '../types';
export interface DirectionRouteCache {direction:Point;goal:Point;until:number;terrain:World['terrain'];stage:number;speed:number;}
/** Continuous controls move an intangible command point. Actual bodies still route. */
export function routeDirection(_w:World,input:Point,_cache:DirectionRouteCache|null,_dt:number):{direction:Point;cache:DirectionRouteCache|null}{
 const magnitude=Math.hypot(input.x,input.z);
 if(magnitude<=.01||!Number.isFinite(magnitude))return {direction:{x:0,z:0},cache:null};
 const strength=Math.min(1,magnitude);
 return {direction:{x:input.x/magnitude*strength,z:input.z/magnitude*strength},cache:null};
}
