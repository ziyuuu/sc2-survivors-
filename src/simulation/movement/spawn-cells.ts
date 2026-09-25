import type {TerrainQuery} from '../../data/map-definition';
import type {Obstacle} from '../../data/game';
import type {Point} from '../types';
import {blocked,clearLine} from './steering';
/** Derived terrain cache. Shared by stage opening and save restoration. */
export function connectedSpawnCells(terrain:TerrainQuery|undefined,anchor:Point,half:number,obstacles:Obstacle[]):Point[]{
 if(terrain?.connectedLocations)return terrain.connectedLocations(anchor,.9,1.4);
 const cells=new Map<string,Point>(),limit=half-2;
 for(let x=-Math.floor(limit/2)*2;x<=limit;x+=2)for(let z=-Math.floor(limit/2)*2;z<=limit;z+=2)if(!blocked({x,z},1.4,obstacles)&&(!terrain||terrain.canOccupy({x,z},1.4)))cells.set(x+','+z,{x,z});
 const origin=[...cells.values()].sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))[0];if(!origin)return [];
 const queue=[origin],seen=new Set([origin.x+','+origin.z]);
 for(let i=0;i<queue.length;i++){const p=queue[i];for(const [dx,dz] of [[2,0],[-2,0],[0,2],[0,-2]]){const key=(p.x+dx)+','+(p.z+dz),n=cells.get(key);if(n&&!seen.has(key)&&clearLine(p,n,1.4,obstacles,terrain)){seen.add(key);queue.push(n);}}}
 return queue;
}
