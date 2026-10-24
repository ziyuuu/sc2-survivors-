import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readArchive} from '../src/persistence/archive';

const base='reports/local/v01-20261024';
const read=async(p:string)=>JSON.parse(await fs.readFile(base+'/'+p,'utf8'));
const hash=(s:string|Uint8Array)=>createHash('sha256').update(s).digest('hex');
const stats=(values:(number|null)[])=>{
 const a=values.filter((v):v is number=>v!==null&&Number.isFinite(v)).sort((a,b)=>a-b);
 assert.ok(a.length);
 const percentile=(q:number)=>a[Math.floor((a.length-1)*q)];
 return {n:a.length,mean:a.reduce((s,v)=>s+v,0)/a.length,p50:percentile(.5),p95:percentile(.95),p99:percentile(.99),min:a[0],max:a.at(-1),gt33:a.filter(v=>v>100/3).length,gt50:a.filter(v=>v>50).length,gt100:a.filter(v=>v>100).length,gt250:a.filter(v=>v>250).length};
};
const plan=await read('entry-comparison-plan.json');
const selected=process.argv.slice(2);
const runs=plan.runs.filter((r:any)=>!selected.length||selected.includes(r.run));
assert.equal(runs.length,selected.length||6);
const reports=await Promise.all(runs.map((r:any)=>read(r.run+'/report.json')));
const first=reports[0],rows:any[]=[];
for(const input of first.build.inputs.filter((r:any)=>(r.path??r.file).startsWith('src/'))){const file=input.path??input.file;assert.equal(hash(await fs.readFile(file)),input.sha256,file+' current diagnostic input');}
for(let i=0;i<runs.length;i++){
 const spec=runs[i],r=reports[i],c=r.cycles[0];
 assert.equal(r.pass,true,spec.run);assert.equal(r.profileClosed,true);assert.equal(r.errors.length,0);assert.equal(r.failedRequests.length,0);
 assert.equal(r.entryMode,spec.mode);assert.equal(r.cycles.length,1);assert.equal(c.stages.length,3);
 assert.equal(hash(await fs.readFile(base+'/'+spec.run+'/runner.mjs','utf8')),plan.comparisonRunnerSha256);
 assert.deepEqual(r.browserDetails,first.browserDetails);assert.deepEqual(r.system.gpu.devices,first.system.gpu.devices);
 assert.deepEqual(r.build.inputs,first.build.inputs);assert.deepEqual(r.build.artifacts,first.build.artifacts);
 if(spec.mode==='foreground'){assert.equal(c.foreground.worldUnchanged,true);assert.equal(c.foreground.initial,c.foreground.final);assert.equal(c.foreground.tick,0);assert.equal(c.foreground.time,0);assert.equal(c.foreground.after.complete,true);assert.equal(c.foreground.pending,0);assert.equal(c.foreground.errors.length,0);}
 const stages:any[]=[],archives:any[]=[];
 for(let j=0;j<3;j++){
  const s=c.stages[j],b=first.cycles[0].stages[j];
  assert.equal(s.initial,b.initial,`${spec.run} stage${j+1} initial`);assert.equal(s.final,b.final,`${spec.run} stage${j+1} final`);
  assert.equal(s.snapshots.length,b.snapshots.length);s.snapshots.forEach((snap:any,k:number)=>assert.equal(snap.state,b.snapshots[k].state,`${spec.run} stage${j+1} sample${k}`));
  assert.equal(s.checkpoint.failed,false);assert.equal(s.errors.length,0);
  assert.equal(s.frames.filter((f:any)=>f.assetsPending).length,0);assert.equal(s.frames.filter((f:any)=>f.renderSkipped).length,0);
  const battle=s.frames.filter((f:any)=>f.phase==='battle');
  const liveDiscard=Math.max(...battle.map((f:any)=>f.discarded))-s.frames[0].discarded;assert.equal(liveDiscard,0);
  const file=`${spec.run}/cycle0-stage${j+1}-archive.json`,raw=await fs.readFile(base+'/'+file,'utf8'),archive=readArchive(raw);
  assert.equal(archive.bundle.run?.state.phase,'reward');assert.equal(archive.bundle.run?.state.stage,j+1);assert.equal(archive.bundle.run?.state.time,(j+1)*60);
  assert.equal(archive.bundle.run?.state.runId,archive.bundle.equipment?.run?.id);
  archives.push({file,sha256:hash(raw),valid:true,stage:j+1,time:archive.bundle.run?.state.time,runId:archive.bundle.run?.state.runId});
  stages.push({stage:j+1,wallMs:s.ended-s.began,frames:stats(s.frames.map((f:any)=>f.interval)),cpu:stats(s.frames.map((f:any)=>f.cpu)),renderCpu:stats(s.frames.map((f:any)=>f.renderCpu)),preload:{ready:s.completePreload.ready,total:s.completePreload.total},maxLiveBacklog:Math.max(...battle.map((f:any)=>f.backlog)),terminalBacklog:s.counts.backlog,inBattleDiscarded:liveDiscard,boundaryDiscarded:s.discardedDelta,sameInitial:true,sameFinal:true,sameSnapshots:true,snapshotCount:s.snapshots.length,worldHash:hash(s.final)});
 }
 const row={...spec,homeReadyMs:c.homeReadyMs,startupReadyMs:c.startupReadyMs,combatReadyMs:c.combatReadyMs,foregroundMs:c.foreground?.ms??0,foregroundJobs:c.foreground?.jobs??[],foregroundReady:c.foreground?.after??null,waitConvention:'combatReadyMs includes gate-ready screenshot/click/wait overhead; foregroundMs measures the isolated preparation itself. Neither includes homeReadyMs.',intermissions:c.intermissions.map((m:any)=>({afterStage:m.afterStage,ms:m.ms})),frames:stats(c.stages.flatMap((s:any)=>s.frames.map((f:any)=>f.interval))),cpu:stats(c.stages.flatMap((s:any)=>s.frames.map((f:any)=>f.cpu))),wallMs:stages.reduce((n,s)=>n+s.wallMs,0),maxLiveBacklog:Math.max(...stages.map(s=>s.maxLiveBacklog)),stages,archives};
 rows.push(row);await fs.writeFile(base+'/'+spec.run+'/entry-summary.json',JSON.stringify(row,null,2)+'\n');
}
const modes=['staged','foreground'].map(mode=>{const group=rows.filter(r=>r.mode===mode);if(!group.length)return null;return {mode,runs:group.length,startupReadyMs:stats(group.map(r=>r.startupReadyMs)),combatReadyMs:stats(group.map(r=>r.combatReadyMs)),foregroundMs:stats(group.map(r=>r.foregroundMs)),gt100:stats(group.map(r=>r.frames.gt100)),gt250:stats(group.map(r=>r.frames.gt250)),worstFrameMs:stats(group.map(r=>r.frames.max)),frameP99Ms:stats(group.map(r=>r.frames.p99)),frameMeanMs:stats(group.map(r=>r.frames.mean)),wallMs:stats(group.map(r=>r.wallMs)),maxLiveBacklog:stats(group.map(r=>r.maxLiveBacklog))};}).filter(Boolean);
const result={scope:plan,complete:rows.length===6,pass:true,browser:first.browserDetails,gpu:first.system.gpu.devices,productionInputsMatch:true,runnerHashesMatch:true,nativeStatesMatch:true,archiveCount:rows.length*3,errors:0,inBattlePending:0,inBattleSkipped:0,inBattleDiscarded:0,rows,modes,limitations:['Timing isolation in a diagnostic harness, not production UX implementation or adoption.','Foreground mode executes the existing preparation jobs sequentially with cooperative zero-delay checkpoints; it does not test an independently optimized foreground loader.','Fresh browser profiles, not cleared OS/driver caches; six sequential runs on one Windows machine, one resolution and one controlled native route.','Same trace instrumentation in both modes; no natural campaign, human, mobile hardware or dense-scene performance acceptance.','Three repetitions describe this sample and do not establish statistical significance.']};
const file=selected.length?'entry-comparison-partial.json':'entry-comparison-result.json';await fs.writeFile(base+'/'+file,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({file,complete:result.complete,pass:true,archives:result.archiveCount,rows:rows.map(({stages,archives,foregroundJobs,foregroundReady,...r})=>r),modes},null,2));
