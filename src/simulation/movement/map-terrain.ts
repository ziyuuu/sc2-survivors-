import {terrainFireClear} from '../combat/terrain-fire';
import type {Point,Body} from '../types';
import type {MapDefinition,TerrainQuery} from '../../data/map-definition';
import {AIR_HEIGHT} from '../../data/terrain';
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Original map coordinates and collision data, shared with rendering. Cached routes are simulation data. */
export class MapTerrain implements TerrainQuery {
 stage=1;readonly routes=new Map<string,Point[]>();private grids=new Map<number,Uint8Array>();private maxRoutes=512;
 constructor(readonly definition:MapDefinition){if(definition.version!==1||definition.source.worldUnitsPerSc2Unit!==1)throw Error('Unsupported map scale');}
 setStage(stage:number){if(this.stage===stage)return;this.stage=stage;this.routes.clear();this.grids.clear();}
 private local(p:Point){return {x:p.x+this.definition.origin[0],y:this.definition.origin[1]-p.z};}
 private cell(p:Point){const d=this.definition,q=this.local(p),x=Math.floor(q.x/d.cellSize),y=Math.floor(q.y/d.cellSize);return x>=0&&y>=0&&x<d.walkWidth&&y<d.walkHeight?y*d.walkWidth+x:-1;}
 private center(i:number){const d=this.definition;return {x:(i%d.walkWidth+.5)*d.cellSize-d.origin[0],z:d.origin[1]-(Math.floor(i/d.walkWidth)+.5)*d.cellSize};}
 height(p:Point){const d=this.definition,q=this.local(p),x=Math.max(0,Math.min(d.width-1.00001,q.x)),y=Math.max(0,Math.min(d.height-1.00001,q.y)),ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i=iy*d.width+ix;return (d.heights[i]*(1-fx)+d.heights[i+1]*fx)*(1-fy)+(d.heights[i+d.width]*(1-fx)+d.heights[i+d.width+1]*fx)*fy;}
 isOpen(p:Point){const i=this.cell(p);return i>=0&&this.definition.opening[i]>0&&this.definition.opening[i]<=this.stage;}
 region(p:Point){const q=this.local(p);return Math.floor(q.x/4)+Math.floor(q.y/4)*Math.ceil(this.definition.width/4);}
 flatHeight(a:Point,b:Point,r=0){if(distance(a,b)>4)return -1;const h=this.height(a);return this.canOccupy(a,r)&&this.canOccupy(b,r)&&Math.abs(h-this.height(b))<.005&&this.walkLine(a,b,r)?h:-1;}
 canOccupy(p:Point,r:number){const i=this.cell(p);if(i<0||!this.isOpen(p)||!this.definition.walk[i]||this.definition.clearance[i]<r+.12)return false;
  // Radius must fit the stage boundary as well as the permanent collision layer.
  if(r>.01)for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1],[.707,.707],[-.707,.707],[.707,-.707],[-.707,-.707]])if(!this.isOpen({x:p.x+x*r,z:p.z+z*r}))return false;return true;}
 canStep(a:Point,b:Point,r:number){return this.canOccupy(b,r)&&Math.abs(this.height(a)-this.height(b))<=distance(a,b)*1.15+.035;}
 walkLine(a:Point,b:Point,r:number){const n=Math.max(1,Math.ceil(distance(a,b)/.4));let old=a;for(let j=1;j<=n;j++){const p={x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n};if(!this.canStep(old,p,r))return false;old=p;}return true;}
 sameContactLayer(a:Point,b:Point){return Math.abs(this.height(a)-this.height(b))<.8;}
 lineOfFire(a:Point,b:Point,airA=false,airB=false,melee=false){return melee?this.walkLine(a,b,0):terrainFireClear(p=>this.height(p),a,b,airA,airB,AIR_HEIGHT);}
 bodyHeight(b:Pick<Body,'x'|'z'|'flying'>){return b.flying?AIR_HEIGHT:this.height(b);}
 /** Radius-aware A* with shared cached routes. Direct unobstructed movement never runs a search. */
 routeGoal(a:Point,b:Point,r:number,_half:number):Point {
  if(this.walkLine(a,b,r))return b;
  const from=this.cell(a),rawTo=this.cell(b),d=this.definition;if(from<0||rawTo<0)return a;
  // Use the actual footprint; rounding the .9 anchor to 1.0 sealed valid passages.
  const grid=this.valid(r);let to=rawTo;
  if(!grid[to]||!this.walkLine(this.center(to),b,r)){
   let closest=Infinity;to=-1;
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=rawTo%d.walkWidth+dx,y=Math.floor(rawTo/d.walkWidth)+dy,j=y*d.walkWidth+x;
    if(x<0||y<0||x>=d.walkWidth||y>=d.walkHeight||!grid[j])continue;const q=this.center(j),v=distance(q,b);if(v<closest&&this.walkLine(q,b,r)){closest=v;to=j;}}
   if(to<0)return a;
  }
  const key=this.stage+':'+Math.floor(from/d.walkWidth/6)+':'+Math.floor(from%d.walkWidth/6)+':'+to+':'+r;
  let path=this.routes.get(key),fresh=false;
  const remember=(route:Point[])=>{if(this.routes.size>=this.maxRoutes)this.routes.delete(this.routes.keys().next().value!);this.routes.set(key,route);return route;};
  if(!path){path=remember(this.path(from,to,r));fresh=true;}
  const visible=(route:Point[])=>{for(let j=route.length-1;j>=0;j--)if(distance(a,route[j])>.1&&this.walkLine(a,route[j],r))return route[j];return null;};
  let goal=visible(path);
  // A shared 3-unit start bucket can straddle a wall. Never inherit an unusable
  // neighbour's cached route or cache its failed search as this unit's answer.
  if(!goal&&!fresh)goal=visible(remember(this.path(from,to,r)));
  return goal??a;
 }

 private valid(r:number){let grid=this.grids.get(r);if(!grid){grid=new Uint8Array(this.definition.walk.length);for(let i=0;i<grid.length;i++)grid[i]=this.canOccupy(this.center(i),r)?1:0;this.grids.set(r,grid);}return grid;}
 connectedLocations(origin:Point,r:number,space:number){const d=this.definition,W=d.walkWidth,valid=this.valid(r),start=this.cell(origin),seen=new Uint8Array(valid.length),queue=[start],result:Point[]=[];seen[start]=1;for(let n=0;n<queue.length;n++){const i=queue[n],x=i%W,y=Math.floor(i/W),p=this.center(i);if(x%4===0&&y%4===0&&this.canOccupy(p,space))result.push(p);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=ny*W+nx;if(nx<0||ny<0||nx>=W||ny>=d.walkHeight||seen[j]||!valid[j]||!this.canStep(p,this.center(j),r))continue;seen[j]=1;queue.push(j);}}return result;}
 private path(start:number,end:number,r:number):Point[]{const d=this.definition,W=d.walkWidth,N=d.walk.length;const prev=new Int32Array(N).fill(-1),g=new Float64Array(N).fill(Infinity),closed=new Uint8Array(N),valid=this.valid(r);const heap:{i:number;f:number}[]=[];const push=(i:number,f:number)=>{let n=heap.length;heap.push({i,f});while(n){const parent=(n-1)>>1;if(heap[parent].f<=f)break;heap[n]=heap[parent];n=parent;}heap[n]={i,f};};const pop=()=>{const first=heap[0],last=heap.pop()!;if(heap.length){let n=0;while(n*2+1<heap.length){let c=n*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[n]=heap[c];n=c;}heap[n]=last;}return first;};
  const goal=this.center(end);g[start]=0;push(start,distance(this.center(start),goal));let visits=0;
  while(heap.length&&visits<N){const {i}=pop();if(closed[i])continue;closed[i]=1;visits++;if(i===end){const path:Point[]=[];for(let n=end;n!==start&&n>=0;n=prev[n])path.push(this.center(n));return path.reverse();}const x=i%W,y=Math.floor(i/W),p=this.center(i);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=d.walkHeight)continue;const j=ny*W+nx,q=this.center(j);if(closed[j]||!valid[j]||Math.abs(this.height(p)-this.height(q))>Math.hypot(dx,dy)*d.cellSize*1.15+.035||dx&&dy&&(!valid[y*W+nx]||!valid[ny*W+x]))continue;const cost=g[i]+Math.hypot(dx,dy)*d.cellSize;if(cost>=g[j])continue;g[j]=cost;prev[j]=i;push(j,cost+distance(q,goal));}
  }return [];
 }
}
