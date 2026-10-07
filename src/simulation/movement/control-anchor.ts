import type {Point} from '../types';
import type {TerrainQuery} from '../../data/map-definition';
/** No body radius, prop occupancy or elevation-step test. Only opened map bounds. */
export function translateControlAnchor(anchor:Point,delta:Point,half:number,terrain?:Pick<TerrainQuery,'isOpen'>){
 if(![anchor.x,anchor.z,delta.x,delta.z,half].every(Number.isFinite)||half<=0)return;
 const to={x:Math.max(-half,Math.min(half,anchor.x+delta.x)),z:Math.max(-half,Math.min(half,anchor.z+delta.z))};
 const clear=(a:Point,b:Point)=>{if(!terrain?.isOpen)return true;const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.2));for(let i=1;i<=count;i++)if(!terrain.isOpen({x:a.x+(b.x-a.x)*i/count,z:a.z+(b.z-a.z)*i/count}))return false;return true;};
 if(clear(anchor,to)){anchor.x=to.x;anchor.z=to.z;return;}
 const x={x:to.x,z:anchor.z};if(clear(anchor,x))anchor.x=x.x;
 const z={x:anchor.x,z:to.z};if(clear(anchor,z))anchor.z=z.z;
}
