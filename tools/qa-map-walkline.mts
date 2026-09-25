import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {MapTerrain} from '../src/simulation/movement/map-terrain';
import type {MapDefinition} from '../src/data/map-definition';
import type {Point} from '../src/simulation/types';

// Exact pre-optimization implementation. This benchmark never changes live World rules.
function reference(this:MapTerrain,a:Point,b:Point,r:number){const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.4));let old=a;for(let j=1;j<=n;j++){const p={x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n};if(!this.canStep(old,p,r))return false;old=p;}return true;}
type Query={a:Point;b:Point;r:number};
let seed=42971;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const groups:{map:string;stage:number;before:MapTerrain;after:MapTerrain;queries:Query[]}[]=[];
for(const map of ['map-runtime','acropolis-runtime'])for(const stage of [1,12]){
 const d=JSON.parse(fs.readFileSync(`assets/private/maps/${map}.json`,'utf8')) as MapDefinition;
 const before=new MapTerrain(d),after=new MapTerrain(d);before.setStage(stage);after.setStage(stage);before.walkLine=reference;
 const cells=d.walk.map((v,i)=>v&&d.opening[i]>0&&d.opening[i]<=stage?i:-1).filter(i=>i>=0),queries:Query[]=[];
 for(let i=0;i<2048;i++){const cell=cells[Math.floor(random()*cells.length)],a={x:(cell%d.walkWidth+random())*d.cellSize-d.origin[0],z:d.origin[1]-(Math.floor(cell/d.walkWidth)+random())*d.cellSize},length=[0,.4,1.6,6,16,40][i%6],angle=random()*Math.PI*2;
  queries.push({a,b:{x:a.x+Math.cos(angle)*length,z:a.z+Math.sin(angle)*length},r:[0,.25,.375,.5,.75,.9,1.25][i%7]});
 }groups.push({map:d.source.name,stage,before,after,queries});
}
const run=(mode:'before'|'after',passes:number)=>{let accepted=0;for(let pass=0;pass<passes;pass++)for(const group of groups)for(const q of group.queries)if(group[mode].walkLine(q.a,q.b,q.r))accepted++;return accepted;};
for(const group of groups)for(const q of group.queries)assert.equal(group.after.walkLine(q.a,q.b,q.r),group.before.walkLine(q.a,q.b,q.r));
for(let i=0;i<4;i++){run('before',3);run('after',3);}
const timings={before:[] as number[],after:[] as number[]},passes=12;
for(let round=0;round<9;round++)for(const mode of round%2?['after','before'] as const:['before','after'] as const){const start=performance.now();run(mode,passes);timings[mode].push(performance.now()-start);}
const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const calls={before:{height:0,occupancy:0},after:{height:0,occupancy:0}};
for(const group of groups)for(const mode of ['before','after'] as const){const t=group[mode],height=t.height.bind(t),occupancy=t.canOccupy.bind(t);t.height=p=>{calls[mode].height++;return height(p);};t.canOccupy=(p,r)=>{calls[mode].occupancy++;return occupancy(p,r);};}
const beforeAccepted=run('before',1),afterAccepted=run('after',1);assert.equal(beforeAccepted,afterAccepted);assert.equal(calls.before.occupancy,calls.after.occupancy);
const beforeMedian=median(timings.before),afterMedian=median(timings.after),queries=groups.reduce((n,g)=>n+g.queries.length,0);
const report={at:new Date().toISOString(),method:'Node local microbenchmark on original Kairos and Acropolis terrain, stages 1/12; 8192 fixed-seed paths, seven radii, six lengths; nine alternating timed batches of twelve passes after warmup. Exact old walkLine reference. Timings exclude instrumentation; separate pass counts height/occupancy calls. This is not a new 300-enemy browser frame measurement.',seed:42971,queries,accepted:afterAccepted,timedQueriesPerBatch:queries*passes,calls,timingsMs:timings,medianMs:{before:beforeMedian,after:afterMedian},changePercent:(afterMedian/beforeMedian-1)*100,heightCallReductionPercent:(1-calls.after.height/calls.before.height)*100};
fs.mkdirSync('reports/local',{recursive:true});fs.writeFileSync('reports/local/qa-map-walkline.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
