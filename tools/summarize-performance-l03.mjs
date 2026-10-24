import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import os from 'node:os';
const root='reports/local/performance-l03-20261020',read=async f=>JSON.parse(await fs.readFile(root+'/'+f,'utf8'));
const runs={};for(const name of ['web-baseline-2','web-candidate-r1-1','offline-baseline-2','offline-candidate-r1-1']){const r=await read(name+'/report.json');assert.ok(r.pass,name);runs[name]=r;}
const pairs=await read('paired-1/report.json'),pack=await read('pack-proof-1/report.json');assert.ok(pairs.pass&&pack.pass);
const median=xs=>{const s=[...xs].sort((a,b)=>a-b),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2;};
const output={host:{cpu:os.cpus()[0]?.model,ram:os.totalmem(),node:process.version},paired:{scope:pairs.scope,cold:pairs.pairs[0],warm:{pairs:pairs.pairs.length-1,beforeSyncMedian:median(pairs.pairs.slice(1).map(p=>p.before.synchronousMs)),afterSyncMedian:median(pairs.pairs.slice(1).map(p=>p.after.synchronousMs)),beforeTotalMedian:median(pairs.pairs.slice(1).map(p=>p.before.totalMs)),afterTotalMedian:median(pairs.pairs.slice(1).map(p=>p.after.totalMs)),beforeFrames:pairs.pairs.slice(1).map(p=>p.before.frames),afterFrames:pairs.pairs.slice(1).map(p=>p.after.frames)},identicalImageSha256:pairs.imageSha256},pack:pack.manifest,runs:{},pairs:[]};
for(const [name,r]of Object.entries(runs)){
 output.runs[name]={pass:r.pass,hardware:r.hardware,errors:r.errors,failedRequests:r.failedRequests,network:r.network.length,screens:r.screens.length,checks:r.checks.length,capture:{synchronousMedian:median(r.components.captures.map(c=>c.synchronousMs)),totalMedian:median(r.components.captures.map(c=>c.totalMs)),writes:r.components.writes,identicalWithin:r.components.captureIdentical,sha256:r.components.captureSha256},overview:{final:r.components.entries.at(-1),revisitExact:r.components.revisits.every(x=>x.same)},scrollMax:Math.max(...r.components.scroll),stages:r.stages.map(s=>({label:s.label,ms:s.ms,heap:s.data.heap,map:s.data.map,models:s.data.models,decoded:s.data.decoded,embedded:s.data.embedded,previews:s.data.previews}))};
}
for(const kind of ['web','offline']){
 const before=runs[kind+'-baseline-2'],after=runs[kind+'-candidate-r1-1'];assert.deepEqual(after.components.overviewFirst,before.components.overviewFirst,kind+' overviews');
 output.runs[kind+'-candidate-r1-1'].capture.matchesSeparateBaseline=after.components.captureSha256===before.components.captureSha256;assert.ok(Math.max(...after.components.scroll)<=64);assert.ok(after.components.entries.every(e=>e.entries<=8));
 for(let i=0;i<before.stages.length;i++){const b=before.stages[i],a=after.stages[i];assert.equal(a.label,b.label);
  const norm=w=>({...w,runId:'normalized-new-run-uuid'});assert.deepEqual(norm(a.data.world),norm(b.data.world),kind+' '+a.label+' World summary');
  assert.deepEqual(a.data.models.keys,b.data.models.keys,kind+' '+a.label+' model keys');
  output.pairs.push({kind,label:a.label,worldSummaryExact:true,modelKeysExact:true,gpuCountsExact:JSON.stringify(a.data.models.memory)===JSON.stringify(b.data.models.memory)});
 }
}
output.limits={worldComparison:'phase/time/tick/recipe/RNG summary; not exhaustive World serialization across the two builds. Offline final real context restoration additionally checks entities/economy/stats/expedition/statuses/specials/account exactly.',firstLoadTiming:'Functional runs, not an isolated loading benchmark. Baseline Web first load and one early map overlap small builds/checks; no total-load speed claim.',heap:'Explicit GC retained JS only. Image RGBA dimensions are an estimate; Blob logical/shared chunk bytes are content accounting, not process or VRAM allocations.',longRun:'11 controlled Web new runs and 3 offline runs; no infinite-session or natural-campaign proof.',stableOverallMemoryGain:false,FPSAccepted:false};
await fs.writeFile(root+'/summary.json',JSON.stringify(output,null,2));console.log(JSON.stringify({warm:output.paired.warm,worldAndModelPairs:output.pairs.length,runs:Object.keys(runs),pack:output.pack}));
