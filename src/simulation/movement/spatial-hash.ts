import type {Body,Point} from '../types';
export class SpatialHash<T extends Body> {
 readonly cells=new Map<number,T[]>(); visits=0;
 constructor(readonly cellSize=4){}
 key(x:number,z:number){return (x+1024)*2048+z+1024;}
 rebuild(bodies:Iterable<T>){this.cells.clear();this.visits=0;for(const b of bodies){if(b.hp<=0)continue;const k=this.key(Math.floor(b.x/this.cellSize),Math.floor(b.z/this.cellSize));let bucket=this.cells.get(k);if(!bucket){bucket=[];this.cells.set(k,bucket);}bucket.push(b);}}
 query(p:Point,r:number,visit:(b:T)=>void){for(let x=Math.floor((p.x-r)/this.cellSize);x<=Math.floor((p.x+r)/this.cellSize);x++)for(let z=Math.floor((p.z-r)/this.cellSize);z<=Math.floor((p.z+r)/this.cellSize);z++){const bucket=this.cells.get(this.key(x,z));if(bucket)for(const b of bucket){this.visits++;if((b.x-p.x)**2+(b.z-p.z)**2<=r*r)visit(b);}}}
}
