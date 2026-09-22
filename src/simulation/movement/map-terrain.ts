import {terrainFireClear} from '../combat/terrain-fire';
import type {Point,Body} from '../types';
import type {MapDefinition,TerrainQuery} from '../../data/map-definition';
import {AIR_HEIGHT} from '../../data/terrain';
const FOOTPRINT=[[1,0],[-1,0],[0,1],[0,-1],[.707,.707],[-.707,.707],[.707,-.707],[-.707,-.707]] as const;
const NEIGHBOURS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]] as const;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Original map coordinates and collision data, shared with rendering. Cached routes are simulation data. */
export class MapTerrain implements TerrainQuery {
 stage=1;readonly routes=new Map<string,Point[]>();private grids=new Map<number,Uint8Array>();private maxRoutes=512;private failedRoutes=new Set<string>();private graphs=new Map<number,{edges:Uint8Array;components:Int32Array}>();private cellHeights:Float64Array|undefined;
 constructor(readonly definition:MapDefinition){if(definition.version!==1||definition.source.worldUnitsPerSc2Unit!==1)throw Error('Unsupported map scale');}
 setStage(stage:number){if(this.stage===stage)return;this.stage=stage;this.routes.clear();this.grids.clear();this.failedRoutes.clear();this.graphs.clear();this.openingPrefix=undefined;}
 private openingPrefix?:Uint32Array;
 private openingSum(){
  if(this.openingPrefix)return this.openingPrefix;
  const d=this.definition,stride=d.walkWidth+1,prefix=new Uint32Array(stride*(d.walkHeight+1));
  for(let y=0;y<d.walkHeight;y++){let row=0;for(let x=0;x<d.walkWidth;x++){const at=y*d.walkWidth+x;row+=!d.opening[at]||d.opening[at]>this.stage?1:0;prefix[(y+1)*stride+x+1]=prefix[y*stride+x+1]+row;}}
  return this.openingPrefix=prefix;
 }
 private local(p:Point){return {x:p.x+this.definition.origin[0],y:this.definition.origin[1]-p.z};}
 private cell(p:Point){return this.cellAt(p.x,p.z);}
 private cellAt(px:number,pz:number){const d=this.definition,x=Math.floor((px+d.origin[0])/d.cellSize),y=Math.floor((d.origin[1]-pz)/d.cellSize);return x>=0&&y>=0&&x<d.walkWidth&&y<d.walkHeight?y*d.walkWidth+x:-1;}
 private center(i:number){const d=this.definition;return {x:(i%d.walkWidth+.5)*d.cellSize-d.origin[0],z:d.origin[1]-(Math.floor(i/d.walkWidth)+.5)*d.cellSize};}
 height(p:Point){const d=this.definition,x=Math.max(0,Math.min(d.width-1.00001,p.x+d.origin[0])),y=Math.max(0,Math.min(d.height-1.00001,d.origin[1]-p.z)),ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i=iy*d.width+ix;return (d.heights[i]*(1-fx)+d.heights[i+1]*fx)*(1-fy)+(d.heights[i+d.width]*(1-fx)+d.heights[i+d.width+1]*fx)*fy;}
 isOpen(p:Point){const i=this.cell(p);return i>=0&&this.definition.opening[i]>0&&this.definition.opening[i]<=this.stage;}
 region(p:Point){const q=this.local(p);return Math.floor(q.x/4)+Math.floor(q.y/4)*Math.ceil(this.definition.width/4);}
 flatHeight(a:Point,b:Point,r=0){if(distance(a,b)>4)return -1;const h=this.height(a);return this.canOccupy(a,r)&&this.canOccupy(b,r)&&Math.abs(h-this.height(b))<.005&&this.walkLine(a,b,r)?h:-1;}
 canOccupy(p:Point,r:number){const i=this.cell(p),d=this.definition;if(i<0||!d.opening[i]||d.opening[i]>this.stage||!d.walk[i]||d.clearance[i]<r+.12)return false;
  // Interior footprints cannot touch a closed sector: O(1) summed-area broad phase.
  // Near a boundary retain the exact eight original probes (do not reject legal corners).
  if(r<=.01)return true;
  const minX=Math.floor((p.x+d.origin[0]-r)/d.cellSize),maxX=Math.floor((p.x+d.origin[0]+r)/d.cellSize),
   minY=Math.floor((d.origin[1]-p.z-r)/d.cellSize),maxY=Math.floor((d.origin[1]-p.z+r)/d.cellSize);
  if(minX>=0&&minY>=0&&maxX<d.walkWidth&&maxY<d.walkHeight){const prefix=this.openingSum(),stride=d.walkWidth+1;
   if(prefix[(maxY+1)*stride+maxX+1]-prefix[minY*stride+maxX+1]-prefix[(maxY+1)*stride+minX]+prefix[minY*stride+minX]===0)return true;
  }

  if(r>.01)for(const [x,z] of FOOTPRINT){const j=this.cellAt(p.x+x*r,p.z+z*r);if(j<0||!d.opening[j]||d.opening[j]>this.stage)return false;}return true;}

 canStep(a:Point,b:Point,r:number){return this.canOccupy(b,r)&&Math.abs(this.height(a)-this.height(b))<=distance(a,b)*1.15+.035;}
 walkLine(a:Point,b:Point,r:number){const n=Math.max(1,Math.ceil(distance(a,b)/.4));let old=a;for(let j=1;j<=n;j++){const p={x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n};if(!this.canStep(old,p,r))return false;old=p;}return true;}
 sameContactLayer(a:Point,b:Point){return Math.abs(this.height(a)-this.height(b))<.8;}
 lineOfFire(a:Point,b:Point,airA=false,airB=false,melee=false){return melee?this.walkLine(a,b,0):terrainFireClear(p=>this.height(p),a,b,airA,airB,AIR_HEIGHT);}
 bodyHeight(b:Pick<Body,'x'|'z'|'flying'>){return b.flying?AIR_HEIGHT:this.height(b);}
 /** Radius-aware A* with shared cached routes. Direct unobstructed movement never runs a search. */
 routeGoal(a:Point,b:Point,r:number,_half:number):Point {
  if(this.walkLine(a,b,r))return b;
  let from=this.cell(a);const rawTo=this.cell(b),d=this.definition;if(from<0||rawTo<0)return a;
  // Use the actual footprint; rounding the .9 anchor to 1.0 sealed valid passages.
  const grid=this.valid(r);let to=rawTo;
  if(!grid[to]||!this.walkLine(this.center(to),b,r)){
   let closest=Infinity;to=-1;
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=rawTo%d.walkWidth+dx,y=Math.floor(rawTo/d.walkWidth)+dy,j=y*d.walkWidth+x;
    if(x<0||y<0||x>=d.walkWidth||y>=d.walkHeight||!grid[j])continue;const q=this.center(j),v=distance(q,b);if(v<closest&&this.walkLine(q,b,r)){closest=v;to=j;}}
   if(to<0)return a;
  }
  const components=this.graph(r).components;
  // Actual legal sub-cell positions can straddle a raster corner whose centre belongs
  // to a different island. Reconnect through a physically walkable nearby centre;
  // the returned route still moves continuously and cannot cross a cliff or wall.
  if(!grid[from]||components[from]!==components[to]||!this.walkLine(a,this.center(from),r)){
   const rawFrom=from;let best=Infinity;from=-1;
   // Search nearby rings only on this exceptional sub-cell recovery path.
   // Thin legal strips along raster edges may be several cells from a usable centre.
   for(let ring=1;ring<=8&&from<0;ring++)for(let dy=-ring;dy<=ring;dy++)for(let dx=-ring;dx<=ring;dx++){if(ring>1&&Math.abs(dx)<ring&&Math.abs(dy)<ring)continue;const x=rawFrom%d.walkWidth+dx,y=Math.floor(rawFrom/d.walkWidth)+dy,j=y*d.walkWidth+x;if(x<0||y<0||x>=d.walkWidth||y>=d.walkHeight||!grid[j]||components[j]!==components[to])continue;const q=this.center(j),v=distance(a,q);if(v<best&&this.walkLine(a,q,r)){best=v;from=j;}}
   if(from<0)return a;
  }
  const exact=`${this.stage}:${from}:${to}:${r}`,key=this.stage+':'+Math.floor(from/d.walkWidth/6)+':'+Math.floor(from%d.walkWidth/6)+':'+to+':'+r;
  // Terrain and footprint graphs are static within a stage. A failed search for these
  // exact cells cannot become successful just because another simulation tick ran.
  // Do not share negative results across a bucket: a nearby body may be across a wall.
  if(this.failedRoutes.has(exact))return a;
  if(components[from]&&components[from]!==components[to])return a;
  const remember=(cacheKey:string,route:Point[])=>{if(this.routes.size>=this.maxRoutes)this.routes.delete(this.routes.keys().next().value!);this.routes.set(cacheKey,route);return route;};
  const search=(cacheKey:string)=>{const route=this.path(from,to,r);if(!route.length){if(this.failedRoutes.size>=2048)this.failedRoutes.delete(this.failedRoutes.values().next().value!);this.failedRoutes.add(exact);}return remember(cacheKey,route.length?[this.center(from),...route]:route);};
  let path=this.routes.get(key),fresh=false;
  if(!path){path=search(key);fresh=true;}
  const visible=(route:Point[])=>{for(let j=route.length-1;j>=0;j--)if(distance(a,route[j])>.1&&this.walkLine(a,route[j],r))return route[j];return null;};
  let goal=visible(path);
  // Repair an unusable shared route using an exact-start cache, without oscillating
  // the shared entry between units standing on opposite sides of the same wall.
  if(!goal&&!fresh){const fallbackKey='exact:'+exact;goal=visible(this.routes.get(fallbackKey)??search(fallbackKey));}

  return goal??a;
 }

 private valid(r:number){let grid=this.grids.get(r);if(!grid){grid=new Uint8Array(this.definition.walk.length);for(let i=0;i<grid.length;i++)grid[i]=this.canOccupy(this.center(i),r)?1:0;this.grids.set(r,grid);}return grid;}
 connectedLocations(origin:Point,r:number,space:number){const d=this.definition,W=d.walkWidth,valid=this.valid(r),start=this.cell(origin),seen=new Uint8Array(valid.length),queue=[start],result:Point[]=[];seen[start]=1;for(let n=0;n<queue.length;n++){const i=queue[n],x=i%W,y=Math.floor(i/W),p=this.center(i);if(x%4===0&&y%4===0&&this.canOccupy(p,space))result.push(p);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=ny*W+nx;if(nx<0||ny<0||nx>=W||ny>=d.walkHeight||seen[j]||!valid[j]||!this.canStep(p,this.center(j),r))continue;seen[j]=1;queue.push(j);}}return result;}
 /** Cache the static radius-aware graph once per opened map. This also rejects disconnected
  * destinations without repeatedly flooding the whole map as bodies change start cells. */
 private graph(r:number){let graph=this.graphs.get(r);if(graph)return graph;
  const d=this.definition,W=d.walkWidth,valid=this.valid(r),N=valid.length,edges=new Uint8Array(N),components=new Int32Array(N);
  const heights=this.cellHeights??(this.cellHeights=Float64Array.from({length:N},(_,i)=>this.height(this.center(i))));
  for(let i=0;i<N;i++){if(!valid[i])continue;const x=i%W,y=Math.floor(i/W);
   for(let k=0;k<NEIGHBOURS.length;k++){const [dx,dy]=NEIGHBOURS[k],nx=x+dx,ny=y+dy,j=ny*W+nx;
    if(nx<0||ny<0||nx>=W||ny>=d.walkHeight||!valid[j]||Math.abs(heights[i]-heights[j])>Math.hypot(dx,dy)*d.cellSize*1.15+.035||dx&&dy&&(!valid[y*W+nx]||!valid[ny*W+x]))continue;edges[i]|=1<<k;}
  }
  const queue=new Int32Array(N);let component=0;
  for(let i=0;i<N;i++){if(!valid[i]||components[i])continue;component++;let head=0,tail=1;queue[0]=i;components[i]=component;
   while(head<tail){const current=queue[head++],mask=edges[current];for(let k=0;k<NEIGHBOURS.length;k++)if(mask&(1<<k)){const [dx,dy]=NEIGHBOURS[k],j=current+dy*W+dx;if(!components[j]){components[j]=component;queue[tail++]=j;}}}
  }
  graph={edges,components};this.graphs.set(r,graph);return graph;
 }
 private path(start:number,end:number,r:number):Point[]{const d=this.definition,W=d.walkWidth,N=d.walk.length;const prev=new Int32Array(N).fill(-1),g=new Float64Array(N).fill(Infinity),closed=new Uint8Array(N),valid=this.valid(r),edges=this.graph(r).edges;const heap:{i:number;f:number}[]=[];const push=(i:number,f:number)=>{let n=heap.length;heap.push({i,f});while(n){const parent=(n-1)>>1;if(heap[parent].f<=f)break;heap[n]=heap[parent];n=parent;}heap[n]={i,f};};const pop=()=>{const first=heap[0],last=heap.pop()!;if(heap.length){let n=0;while(n*2+1<heap.length){let c=n*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[n]=heap[c];n=c;}heap[n]=last;}return first;};
  const goal=this.center(end);g[start]=0;push(start,distance(this.center(start),goal));let visits=0;
  while(heap.length&&visits<N){const {i}=pop();if(closed[i])continue;closed[i]=1;visits++;if(i===end){const path:Point[]=[];for(let n=end;n!==start&&n>=0;n=prev[n])path.push(this.center(n));return path.reverse();}const x=i%W,y=Math.floor(i/W),p=this.center(i);
   for(let k=0;k<NEIGHBOURS.length;k++){const [dx,dy]=NEIGHBOURS[k],nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=d.walkHeight)continue;const j=ny*W+nx,q=this.center(j);if(closed[j])continue;
    // An actor can occupy a legal sub-cell offset even when that cell's centre is invalid.
    if(valid[i]){if(!(edges[i]&(1<<k)))continue;}else if(!valid[j]||Math.abs(this.height(p)-this.height(q))>Math.hypot(dx,dy)*d.cellSize*1.15+.035||dx&&dy&&(!valid[y*W+nx]||!valid[ny*W+x]))continue;
    const cost=g[i]+Math.hypot(dx,dy)*d.cellSize;if(cost>=g[j])continue;g[j]=cost;prev[j]=i;push(j,cost+distance(q,goal));}
  }return [];
 }
}
