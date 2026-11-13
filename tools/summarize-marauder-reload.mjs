import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [baselineFile,candidateFile,outFile]=process.argv.slice(2);
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const [baseline,candidate]=await Promise.all([read(baselineFile),read(candidateFile)]);
assert(baseline.build.startsWith('9207d6f97edf'));
assert.equal(baseline.resourceRelease,candidate.resourceRelease);
const round=n=>Math.round(n*10)/10;
const mib=bytes=>round(bytes/2**20);
function summarize(run){
 assert(run.completed);assert.equal(run.account,'fresh');assert.deepEqual(run.errors,[]);
 assert.equal(run.rows.length,55);assert.equal(run.mode,baseline.mode);
 const stages=[];
 for(let stage=1;stage<=18;stage++){
  const records=run.rows.filter(r=>r.stage===stage&&r.kind!=='endless');
  assert.deepEqual(records.map(r=>r.kind),['after','before','intermission']);
  const frames=run.eliteTiming.stageFrames[stage];assert(frames.frames>0);
  stages.push({stage,trackedMiB:records.map(r=>mib(r.memory.trackedBytes)),processPrivateMiB:records.map(r=>r.privateBytes?mib(r.privateBytes):null),
   battleFrames:frames.frames,maxFrameMs:round(frames.maxMs)});
 }
 for(const r of run.rows){assert.equal(r.seed,529);assert.equal(r.texture,'medium');assert.equal(r.difficulty,'easy');assert.deepEqual(r.errors,[]);}
 const last=run.rows.at(-1);assert.equal(last.kind,'endless');
 assert(run.eliteTiming.jobs.every(j=>j.ok));
 const loads=run.eliteTiming.jobs.filter(j=>j.reload).map(j=>({key:j.key,stage:j.stage,phase:j.phase,gate:j.gate,loadMs:round(j.duration),maxFrameMs:round(j.interval.max)}));
 return {build:run.build,stages,endlessMiB:mib(last.memory.trackedBytes),trackedPeakMiB:mib(Math.max(...run.rows.map(r=>r.memory.peakTrackedBytes))),
  processSamples:run.rows.filter(r=>r.privateBytes>0).length,processSamplePeakMiB:mib(Math.max(...run.rows.map(r=>r.privateBytes??0))),
  pressure:run.switches,reloads:loads,targetWindows:run.eliteTiming.targetWindows,targetEvents:run.eliteTiming.marauderEvents.map(({callers,...event})=>({...event,callers:callers?.map(s=>s.trim().split(' (')[0])})),
  targetDrawn:run.eliteTiming.stages.filter(s=>s.drawn.includes('elite.marauder.3')).map(s=>s.stage)};
}
const data={resourceRelease:baseline.resourceRelease,mode:baseline.mode,baseline:summarize(baseline),candidate:summarize(candidate)};
await fs.writeFile(outFile,JSON.stringify(data,null,2)+'\n');
