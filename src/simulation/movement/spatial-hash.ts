import type {Body,Point} from '../types';
export class SpatialHash<T extends Body> {
 readonly cells=new Map<number,T[]>();readonly ownerCells={terran:new Map<number,T[]>(),zerg:new Map<number,T[]>()};visits=0;
 private pool:T[][]=[];
 constructor(readonly cellSize=4){}
 key(x:number,z:number){return (x+1024)*2048+z+1024;}
 private clear(map:Map<number,T[]>){for(const bucket of map.values()){bucket.length=0;this.pool.push(bucket);}map.clear();}
 private insert(map:Map<number,T[]>,key:number,b:T){let bucket=map.get(key);if(!bucket){bucket=this.pool.pop()??[];map.set(key,bucket);}bucket.push(b);}
 rebuild(bodies:Iterable<T>){this.clear(this.cells);this.clear(this.ownerCells.terran);this.clear(this.ownerCells.zerg);this.visits=0;for(const b of bodies){if(b.hp<=0)continue;const k=this.key(Math.floor(b.x/this.cellSize),Math.floor(b.z/this.cellSize));this.insert(this.cells,k,b);this.insert(this.ownerCells[b.owner],k,b);}}
 query(p:Point,r:number,visit:(b:T)=>void|boolean,owner?:'terran'|'zerg'){const cells=owner?this.ownerCells[owner]:this.cells,r2=r*r;for(let x=Math.floor((p.x-r)/this.cellSize);x<=Math.floor((p.x+r)/this.cellSize);x++)for(let z=Math.floor((p.z-r)/this.cellSize);z<=Math.floor((p.z+r)/this.cellSize);z++){const bucket=cells.get(this.key(x,z));if(bucket)for(const b of bucket){this.visits++;if((b.x-p.x)**2+(b.z-p.z)**2<=r2&&visit(b)===false)return;}}}
}
