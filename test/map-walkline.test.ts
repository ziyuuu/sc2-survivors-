import test from 'node:test';
import assert from 'node:assert/strict';
import {MapTerrain} from '../src/simulation/movement/map-terrain';
import type {MapDefinition} from '../src/data/map-definition';
import type {Point} from '../src/simulation/types';

// Frozen pre-optimization implementation, including arithmetic and short circuits.
function reference(t:MapTerrain,a:Point,b:Point,r:number){const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.4));let old=a;for(let j=1;j<=n;j++){const p={x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n};if(!t.canStep(old,p,r))return false;old=p;}return true;}
function fixture(kind:'flat'|'ramp'|'cliff'|'rough'):MapDefinition{
 const width=25,height=25,walkWidth=48,walkHeight=48,cellSize=.5;
 const heights=Array.from({length:width*height},(_,i)=>{const x=i%width,z=Math.floor(i/width);return kind==='flat'?0:kind==='ramp'?Math.max(0,Math.min(3,(x-7)*.5)):kind==='cliff'?(x>=12?3:0):Math.sin(x*.7)*.22+Math.cos(z*.31)*.15;});
 return {version:1,source:{name:kind,sha256:'walkline-equivalence',worldUnitsPerSc2Unit:1},width,height,bounds:[0,0,24,24],origin:[12,12,0],start:{x:0,z:0},hive:{x:10,z:10},heights,syncHeights:[],levels:[],walkWidth,walkHeight,cellSize,
  walk:Array.from({length:walkWidth*walkHeight},(_,i)=>kind==='rough'&&i%walkWidth===27&&Math.floor(i/walkWidth)<34?0:1),
  opening:Array.from({length:walkWidth*walkHeight},(_,i)=>i%walkWidth<32?1:3),reveal:Array(walkWidth*walkHeight).fill(1),
  clearance:Array.from({length:walkWidth*walkHeight},(_,i)=>kind==='rough'?.2+(i%7)*.3:4),placements:[],ramps:[],stageAreas:Array(12).fill(576)};
}
const radii=[0,.01,.05,.25,.375,.5,.75,.9,1.25] as const;
test('walkLine matches the old algorithm for 43,200 seeded paths over four terrains and opening stages',()=>{
 let state=941271;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 let checked=0;
 for(const kind of ['flat','ramp','cliff','rough'] as const)for(const stage of [1,3]){const t=new MapTerrain(fixture(kind));t.setStage(stage);
  for(const radius of radii)for(let i=0;i<600;i++){const a={x:random()*28-14,z:random()*28-14},b=i%3?{x:a.x+random()*12-6,z:a.z+random()*12-6}:{x:random()*28-14,z:random()*28-14};assert.equal(t.walkLine(a,b,radius),reference(t,a,b,radius),`${kind}, stage=${stage}, r=${radius}, ${JSON.stringify({a,b})}`);checked++;}
 }assert.equal(checked,43200);
});
test('walkLine preserves zero-length, sample-count, cell, slope-threshold and NaN boundaries',()=>{
 const t=new MapTerrain(fixture('flat'));
 for(const radius of radii)for(const d of [0,Number.EPSILON,.4-Number.EPSILON,.4,.4+Number.EPSILON,.8-Number.EPSILON,.8,.8+Number.EPSILON,4,4.000000000000001])for(const a of [{x:0,z:0},{x:.5,z:.5},{x:11.999999999999,z:0},{x:-12,z:0}]){const b={x:a.x+d,z:a.z+d*.25};assert.equal(t.walkLine(a,b,radius),reference(t,a,b,radius));}
 for(const threshold of [.4*1.15+.035-Number.EPSILON,.4*1.15+.035,.4*1.15+.035+Number.EPSILON,NaN]){t.height=p=>p.x===0?0:threshold;assert.equal(t.walkLine({x:0,z:0},{x:.4,z:0},0),reference(t,{x:0,z:0},{x:.4,z:0},0));}
});
test('walkLine keeps identical occupancy probes and exits before height reads on blocked samples',()=>{
 const a={x:0,z:0},b={x:2,z:0},r=.375;
 for(const blockedAt of [0,1,3,5]){
  const inspect=(old:boolean)=>{const t=new MapTerrain(fixture('flat')),occupancy:Point[]=[],heights:Point[]=[],events:string[]=[];let index=0;
   t.canOccupy=(p,radius)=>{assert.equal(radius,r);occupancy.push({...p});events.push('occupy');return ++index!==blockedAt;};
   t.height=p=>{heights.push({...p});events.push('height');return 0;};
   const result=old?reference(t,a,b,r):t.walkLine(a,b,r);return {result,occupancy,heights,events};
  };
  const old=inspect(true),next=inspect(false);assert.equal(next.result,old.result);assert.deepEqual(next.occupancy,old.occupancy);assert.equal(next.events[0],'occupy');
  if(blockedAt===1)assert.equal(next.heights.length,0);
  else {const segments=blockedAt?blockedAt-1:5;assert.equal(old.heights.length,segments*2);assert.equal(next.heights.length,segments+1);assert.deepEqual(next.heights,[a,...old.occupancy.slice(0,segments)]);}
  if(blockedAt)assert.equal(next.events.at(-1),'occupy');
 }
});
