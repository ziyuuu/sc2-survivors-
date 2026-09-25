import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {MapTerrain} from '../src/simulation/movement/map-terrain';import type {MapDefinition} from '../src/data/map-definition';
import {terrainFireClear} from '../src/simulation/combat/terrain-fire';
import {AIR_HEIGHT} from '../src/data/terrain';
function fixture():MapDefinition {const width=21,height=21,walkWidth=40,walkHeight=40,N=1600;return {version:1,source:{name:'synthetic traversal fixture',sha256:'fixture',worldUnitsPerSc2Unit:1},width,height,bounds:[0,0,20,20],origin:[0,20,0],start:{x:3,z:14},hive:{x:15,z:14},heights:Array(441).fill(0),syncHeights:Array(441).fill(0),levels:Array(441).fill(1),walkWidth,walkHeight,cellSize:.5,walk:Array.from({length:N},(_,i)=>i%40===16&&Math.floor(i/40)<26?0:1),opening:Array(N).fill(1),reveal:Array(N).fill(1),clearance:Array.from({length:N},(_,i)=>i%40===16&&Math.floor(i/40)<26?0:Math.min(Math.abs(i%40-16)*.5+.25,Math.max(0,Math.floor(i/40)-25)*.5+.25)+1),placements:[],ramps:[],stageAreas:Array.from({length:12},(_,i)=>(i+1)*20)};}
test('map scale is explicit and bilinear original heights have shared world coordinates',()=>{const d=fixture();d.heights=d.heights.map((_,i)=>i%d.width*.1);const t=new MapTerrain(d);assert.ok(Math.abs(t.height({x:3.25,z:14})-.325)<1e-6);assert.throws(()=>new MapTerrain({...d,source:{...d.source,worldUnitsPerSc2Unit:2}}),/scale/);});
test('bounded terrain fire agrees with dense sampling for high, low and air endpoints',()=>{
 const d=fixture();d.heights=d.heights.map((_,i)=>i%d.width>=9&&i%d.width<=11?4:0);
 const t=new MapTerrain(d);let seed=1739;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<300;i++){
  const a={x:random()*20,z:random()*20},b={x:random()*20,z:random()*20};
  for(const [airA,airB] of [[false,false],[true,false],[false,true],[true,true]] as const){
   assert.equal(t.lineOfFire(a,b,airA,airB),terrainFireClear(p=>t.height(p),a,b,airA,airB,AIR_HEIGHT));
  }
 }
});
test('map routes go around blocked cells and cache without mutating positions',()=>{const d=fixture(),t=new MapTerrain(d),a={...d.start},b=d.hive;assert.equal(t.walkLine(a,b,.2),false);const next=t.routeGoal(a,b,.2,50);assert.ok(Math.hypot(next.x-a.x,next.z-a.z)>1);assert.ok(t.walkLine(a,next,.2));assert.deepEqual(a,d.start);const count=t.routes.size;assert.deepEqual(t.routeGoal(a,b,.2,50),next);assert.equal(t.routes.size,count);});
test('locked sectors exclude complete body radius and expansion only opens cells',()=>{const d=fixture();d.opening=d.opening.map((_,i)=>i%40>=24?2:1);const t=new MapTerrain(d);assert.equal(t.canOccupy({x:13,z:10},.5),false);assert.equal(t.canOccupy({x:11.8,z:10},.5),false);t.setStage(2);assert.equal(t.canOccupy({x:13,z:10},.5),true);assert.equal(t.canOccupy({x:3,z:10},.5),true);});
test('original map dependency list locks content and never substitutes HTML or unknown remote paths',()=>{const lock=JSON.parse(fs.readFileSync('tools/map-lock.json','utf8')),deps=JSON.parse(fs.readFileSync('tools/map-dependencies.json','utf8'));assert.equal(lock.worldUnitsPerSc2Unit,1);assert.match(lock.sha256,/^[0-9a-f]{64}$/);assert.ok(deps.length>400);for(const d of deps){assert.match(d.sha256,/^[0-9a-f]{64}$/);assert.ok(d.bytes>24);assert.match(d.installFile,/^assets\/private\/(m3|dds)\/[^/]+\.(m3|dds)$/);}});

test('anchor paths use their actual .9 radius instead of sealing a valid narrow corridor at 1.0',()=>{
 const d=fixture();d.clearance=d.walk.map(v=>v?1.05:0);const t=new MapTerrain(d),a={...d.start},b=d.hive;
 const next=t.routeGoal(a,b,.9,50);assert.ok(Math.hypot(next.x-a.x,next.z-a.z)>.1);assert.ok(t.walkLine(a,next,.9));
});


test('disconnected radius graphs reject different start cells without repeated whole-map searches',()=>{const d=fixture();d.walk=d.walk.map((_,i)=>i%40===16?0:1);const t=new MapTerrain(d),base=(t as any).path.bind(t);let searches=0;(t as any).path=(...args:any[])=>{searches++;return base(...args);};for(let i=0;i<120;i++){const start={x:2+(i%8)*.5,z:14};assert.deepEqual(t.routeGoal(start,d.hive,.2,50),start);}assert.equal(searches,0);t.routeGoal(d.start,{x:15.6,z:14},.2,50);assert.equal(searches,0);});
test('a failed shared bucket cannot poison a reachable neighbour across a wall',()=>{const d=fixture();d.walk=d.walk.map((_,i)=>i%40===16||i%40===22&&Math.floor(i/40)<30?0:1);const t=new MapTerrain(d),left={x:7.75,z:14},right={x:8.75,z:14};assert.deepEqual(t.routeGoal(left,d.hive,.1,50),left);assert.equal(t.walkLine(right,d.hive,.1),false);const goal=t.routeGoal(right,d.hive,.1,50);assert.ok(Math.hypot(goal.x-right.x,goal.z-right.z)>.1);assert.ok(t.walkLine(right,goal,.1));});
test('map expansion invalidates failed routes and opens a newly legal passage',()=>{const d=fixture();d.walk=d.walk.map((_,i)=>i%40===16&&Math.floor(i/40)!==28?0:1);d.opening[28*40+16]=2;const t=new MapTerrain(d);assert.deepEqual(t.routeGoal(d.start,d.hive,.1,50),d.start);t.setStage(2);const goal=t.routeGoal(d.start,d.hive,.1,50);assert.ok(Math.hypot(goal.x-d.start.x,goal.z-d.start.z)>.1);assert.ok(t.walkLine(d.start,goal,.1));});
test('successive A* searches keep fresh routes across starts, radii, stage changes and stamp rollover',()=>{
 const d=fixture();d.opening=d.opening.map((_,i)=>i%40>24?2:1);
 const reused=new MapTerrain(d),fresh=new MapTerrain(d),pairs=[[12*40+5,12*40+31],[29*40+30,3*40+2],[8*40+17,23*40+15],[2*40+2,2*40+2]];
 for(const stage of [1,2,1])for(const radius of [.1,.9]){reused.setStage(stage);fresh.setStage(stage);
  for(const [from,to] of [...pairs,...pairs].reverse())assert.deepEqual((reused as any).path(from,to,radius),(fresh as any).path(from,to,radius));
 }
 (reused as any).searchGeneration=0xfffffffe;
 for(const [from,to] of pairs.slice(0,2))assert.deepEqual((reused as any).path(from,to,.1),(fresh as any).path(from,to,.1));
});

test('legal sub-cell actors reconnect when their raster centre sits on the other height island',()=>{const d=fixture();d.walk=Array(d.walk.length).fill(1);d.clearance=Array(d.walk.length).fill(2);const t=new MapTerrain(d),base=t.canOccupy.bind(t);t.height=p=>p.x>=8.15?2:0;t.canOccupy=(p,r)=>base(p,r)&&!(p.x>4.8&&p.x<5.6&&p.z<16);const a={x:8.08,z:14},b={x:3,z:14};assert.ok(t.canOccupy(a,.05));assert.equal(t.walkLine(a,b,.05),false);const next=t.routeGoal(a,b,.05,50);assert.ok(Math.hypot(next.x-a.x,next.z-a.z)>.1);assert.ok(t.walkLine(a,next,.05));assert.deepEqual(a,{x:8.08,z:14});});


test('a legal narrow strip can reconnect beyond adjacent raster centres without teleporting',()=>{const d=fixture();d.walk=Array(d.walk.length).fill(1);d.clearance=Array(d.walk.length).fill(2);const t=new MapTerrain(d),base=t.canOccupy.bind(t);t.canOccupy=(p,r)=>base(p,r)&&!(p.x>5&&p.x<9&&p.z<16&&Math.abs(p.z-14)>.24);const a={x:7,z:14},b={x:3,z:12};assert.ok(t.canOccupy(a,.05));assert.equal(t.walkLine(a,b,.05),false);const next=t.routeGoal(a,b,.05,50);assert.ok(Math.hypot(next.x-a.x,next.z-a.z)>.1);assert.ok(t.walkLine(a,next,.05));assert.deepEqual(a,{x:7,z:14});});

test('opening summed-area fast path matches exact footprint probes across boundaries and expansion',()=>{
 const d=fixture();d.opening=d.opening.map((_,i)=>i%40<12?1:i%40<28?4:8);const t=new MapTerrain(d);
 const probe=(x:number,z:number,r:number,stage:number)=>{const cell=(x:number,z:number)=>{const a=Math.floor((x+d.origin[0])/d.cellSize),b=Math.floor((d.origin[1]-z)/d.cellSize);return a>=0&&b>=0&&a<d.walkWidth&&b<d.walkHeight?b*d.walkWidth+a:-1;};const i=cell(x,z);if(i<0||!d.opening[i]||d.opening[i]>stage||!d.walk[i]||d.clearance[i]<r+.12)return false;return r<=.01||[[1,0],[-1,0],[0,1],[0,-1],[.707,.707],[-.707,.707],[.707,-.707],[-.707,-.707]].every(([a,b])=>{const j=cell(x+a*r,z+b*r);return j>=0&&d.opening[j]>0&&d.opening[j]<=stage;});};
 let seed=1;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const stage of [1,4,8,1]){t.setStage(stage);for(let i=0;i<5000;i++){const p={x:rng()*22-1,z:rng()*22-1},r=rng()*2;assert.equal(t.canOccupy(p,r),probe(p.x,p.z,r,stage));}}
});
