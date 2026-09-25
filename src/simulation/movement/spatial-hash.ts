import type {Body,Point} from '../types';
export class SpatialHash<T extends Body> {
 readonly cells=new Map<number,T[]>();readonly ownerCells={terran:new Map<number,T[]>(),zerg:new Map<number,T[]>()};private planeCells={ground:new Map<number,T[]>(),air:new Map<number,T[]>()};visits=0;
 private pool:T[][]=[];private planeDirty=false;
 constructor(readonly cellSize=4){}
 key(x:number,z:number){return (x+1024)*2048+z+1024;}
 private clear(map:Map<number,T[]>){for(const bucket of map.values()){bucket.length=0;this.pool.push(bucket);}map.clear();}
 private insert(map:Map<number,T[]>,key:number,b:T){let bucket=map.get(key);if(!bucket){bucket=this.pool.pop()??[];map.set(key,bucket);}bucket.push(b);}
 rebuild(bodies:Iterable<T>){this.clear(this.cells);this.clear(this.ownerCells.terran);this.clear(this.ownerCells.zerg);this.clear(this.planeCells.ground);this.clear(this.planeCells.air);this.planeDirty=false;this.visits=0;for(const b of bodies){if(b.hp<=0)continue;const k=this.key(Math.floor(b.x/this.cellSize),Math.floor(b.z/this.cellSize));this.insert(this.cells,k,b);this.insert(this.ownerCells[b.owner],k,b);this.insert(this.planeCells[b.flying?'air':'ground'],k,b);}}
 /** Mode changes can switch planes between rebuilds; read current flags until next rebuild. */
 invalidatePlanes(){this.planeDirty=true;}
 query(p:Point,r:number,visit:(b:T)=>void|boolean,owner?:'terran'|'zerg'){
  this.queryCells(owner?this.ownerCells[owner]:this.cells,p,r,visit);
 }
 /** Preserve within-cell order while skipping the other collision plane for separation. */
 queryPlane(p:Point,r:number,flying:boolean,visit:(b:T)=>void|boolean){
  if(this.planeDirty)this.queryCells(this.cells,p,r,b=>b.flying===flying?visit(b):undefined);
  else this.queryCells(this.planeCells[flying?'air':'ground'],p,r,visit);
 }
 private queryCells(cells:Map<number,T[]>,p:Point,r:number,visit:(b:T)=>void|boolean){const r2=r*r;
  const minX=Math.floor((p.x-r)/this.cellSize),maxX=Math.floor((p.x+r)/this.cellSize),minZ=Math.floor((p.z-r)/this.cellSize),maxZ=Math.floor((p.z+r)/this.cellSize);
  for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){
   const bucket=cells.get(this.key(x,z));if(!bucket)continue;
   for(let i=0;i<bucket.length;i++){const b=bucket[i];this.visits++;const dx=b.x-p.x,dz=b.z-p.z;if(dx*dx+dz*dz<=r2&&visit(b)===false)return;}
  }
 }
}
