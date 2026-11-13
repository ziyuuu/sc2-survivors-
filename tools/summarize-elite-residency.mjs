import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const [baseFile,candidateFile,outFile]=process.argv.slice(2);
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const [base,candidate]=await Promise.all([read(baseFile),read(candidateFile)]);
const mb=n=>+(n/2**20).toFixed(1),round=n=>n==null?null:+n.toFixed(1);
const distribution=values=>{
 const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
 const at=q=>round(sorted[Math.ceil(sorted.length*q)-1]);
 return {n:sorted.length,median:at(.5),p95:at(.95),max:at(1)};
};
assert(base.build.startsWith('f99f8f9bdbdc'));
assert.equal(base.resourceRelease,candidate.resourceRelease);
assert.equal(base.mode,candidate.mode);
for(const r of [base,candidate]){
 assert(r.completed);assert.deepEqual(r.errors,[]);assert.equal(r.rows.length,55);
 assert(r.rows.every(x=>x.seed===529&&x.difficulty==='easy'&&x.texture==='medium'&&!x.errors.length));
 assert.equal(r.rows.at(-1).kind,'endless');
 assert(r.eliteTiming.jobs.every(j=>j.ok));
}
function ownership(row){
 const amounts={body:0,death:0,shared:0,unattributed:0},groups={};
 for(const [entry,bytes] of Object.entries(row.inventory.eliteSources)){
  const [,owners]=entry.split(' ');
  const category=owners==='unattributed'?'unattributed':owners.includes('|')?'shared':owners.endsWith('.death')?'death':'body';
  amounts[category]+=bytes;
  groups[owners]=(groups[owners]??0)+bytes;
 }
 return {totalMiB:mb(Object.values(amounts).reduce((s,b)=>s+b,0)),...Object.fromEntries(Object.entries(amounts).map(([k,v])=>[k+'MiB',mb(v)])),
  groups:Object.entries(groups).sort((a,b)=>b[1]-a[1]).map(([keys,b])=>[keys,mb(b)]),
  instances:row.inventory.keys.filter(k=>k.instances>0).map(k=>[k.key,k.instances]),corpsePins:row.inventory.keys.filter(k=>k.corpse).map(k=>k.key),
  requiredIdle:row.inventory.keys.filter(k=>k.required&&!k.instances&&!k.corpse).map(k=>k.key)};
}
function rowMetrics(row){
 return {stage:row.stage,kind:row.kind,time:round(row.time),trackedMiB:mb(row.memory.trackedBytes),textureMiB:mb(row.memory.textureEstimate),
  atlasMiB:mb(row.memory.atlasBytes),encodedMiB:mb(row.memory.encodedBytes),pcmMiB:mb(row.memory.pcmBytes),processPrivateMiB:row.privateBytes==null?null:mb(row.privateBytes),
  pressure:row.pressure,allies:row.allies,variants:row.variants,retired:row.retired,elite:ownership(row)};
}
function buildSummary(r){
 const reload=r.eliteTiming.jobs.filter(j=>j.reload);
 return {build:r.build,resource:r.resourceRelease,samples:r.rows.length,errors:r.errors,peakMiB:mb(Math.max(...r.rows.map(x=>x.memory.peakTrackedBytes))),
  processPrivateMaxMiB:mb(Math.max(...r.rows.map(x=>x.privateBytes??0))),pressure:r.switches.map(s=>({stage:s.stage,time:round(s.time),on:s.pressure,MiB:mb(s.bytes)})),
  drawn:r.eliteTiming.stages,allEliteLoads:r.eliteTiming.jobs.length,allBattleFrameMs:r.eliteTiming.ordinaryBattle,
  reloads:reload.map(j=>({key:j.key,stage:j.stage,phase:j.phase,gate:j.gate,method:j.method,durationMs:round(j.duration),startMs:round(j.start),endMs:round(j.end),
   overlapFrames:j.interval,firstBattleSecond:j.firstBattle})),reloadDurationMs:distribution(reload.map(j=>j.duration))};
}
const checkpoints=candidate.rows.map((c,i)=>{const b=base.rows[i];assert.equal(c.stage,b.stage);assert.equal(c.kind,b.kind);return {baseline:rowMetrics(b),candidate:rowMetrics(c)};});
const result={method:{mode:base.mode,seed:529,texture:'medium',race:'terran',difficulty:'easy',viewport:'1200x800',unit:'MiB',scope:'one serial desktop Chrome campaign per build, separate fresh accounts'},baseline:buildSummary(base),candidate:buildSummary(candidate),checkpoints};
await fs.mkdir(path.dirname(outFile),{recursive:true});await fs.writeFile(outFile,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify([result.baseline,result.candidate].map(x=>({build:x.build,samples:x.samples,peakMiB:x.peakMiB,reloads:x.reloadDurationMs}))));
