import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const out='reports/local/fixed-performance-20261006',read=async p=>JSON.parse(await fs.readFile(out+'/'+p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const reference={p95:16.9,p99:20,over20Percent:1};
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const row=r=>({id:r.id,fixture:r.fixture,sha256:r.sha256,frames:r.frames,first10:r.first10,maxDebt:r.maxDebt,combatSeconds:r.combatSeconds,discardedAtFirstSample:r.samples[0].discarded,discardedGrowthDuringSamples:r.after.discardedSimulationBacklogSeconds-r.samples[0].discarded,entitiesBefore:r.before.entities,entitiesAfter:r.after.entities,frameReferenceWithin:r.frames.p95<=reference.p95&&r.frames.p99<=reference.p99&&r.frames.over20Percent<=reference.over20Percent});
const pairs=[];
for(const [name,before,after] of [['three-race','baseline-production','candidate-production'],['300-target','density300-baseline-production','density300-final-production']]){
 const a=await read(before+'/results.json'),b=await read(after+'/results.json');
 assert.equal(a.passed,true);assert.equal(b.passed,true);assert.equal(a.dev,false);assert.equal(b.dev,false);assert.equal(a.seconds,b.seconds);assert.equal(a.repeat,b.repeat);assert.equal(a.chrome,b.chrome);assert.deepEqual(a.host,b.host);assert.equal(a.runs.length,b.runs.length);
 for(let i=0;i<a.runs.length;i++){assert.equal(a.runs[i].id,b.runs[i].id);assert.equal(a.runs[i].sha256,b.runs[i].sha256);assert.deepEqual(a.runs[i].gpu,b.runs[i].gpu);assert.deepEqual(a.runs[i].errors,[]);assert.deepEqual(b.runs[i].errors,[]);for(const run of [a.runs[i],b.runs[i]]){assert.equal(sha(await fs.readFile(run.fixture)),run.sha256);assert.equal(run.before.phase,'battle');assert.equal(run.after.phase,'battle');assert.ok(run.combatSeconds>0);assert.ok(run.first10.count>0);assert.ok(run.samples.every(s=>s.phase==='battle'&&s.discarded===run.samples[0].discarded));}}
 const oldMean=median(a.runs.map(r=>r.frames.mean)),newMean=median(b.runs.map(r=>r.frames.mean));
 pairs.push({name,seconds:a.seconds,repeat:a.repeat,host:a.host,chrome:a.chrome,gpu:a.runs[0].gpu,beforeBuild:a.release.appBuildId,afterBuild:b.release.appBuildId,before:a.runs.map(row),after:b.runs.map(row),medianRunMeanMs:{before:oldMean,after:newMean,reductionPercent:(oldMean-newMean)/oldMean*100},allCandidateFrameReferencesWithin:b.runs.every(r=>row(r).frameReferenceWithin)});
}
const replay=await read('replay.json');assert.equal(replay.passed,true);assert.equal(replay.runs.length,9);assert.ok(replay.runs.every(r=>r.ticks===1800&&r.checks.length===30));
assert.equal(sha(await fs.readFile(out+'/baseline-replay.mjs')),replay.baselineBundleSha256);for(const run of replay.runs)assert.equal(sha(await fs.readFile(run.file)),run.sha256);
const history={};for(const label of ['density300-candidate-production','density300-baseline-recheck','density300-aura-only']){const r=await read(label+'/results.json');history[label]={build:r.release.appBuildId,runs:r.runs.map(row)};}
const result={at:new Date().toISOString(),engineeringPassed:true,method:'Sequential 30-second production samples on one machine, three repeats per fixture. These are fixed diagnostic targets, not a natural campaign. Run means are descriptive; no statistical significance or universal speedup claimed. Reference frame thresholds do not evaluate the 180-second natural debt gate.',reference,pairs,history,renderChangesReverted:true,replay:{groups:9,ticksPerGroup:1800,fullStateCheckpoints:279,baselineBundleSha256:replay.baselineBundleSha256},naturalPerformanceGateClosed:false,P6V01Resolved:false};
await fs.writeFile(out+'/comparison.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
