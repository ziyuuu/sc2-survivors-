import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root='reports/local/performance-d04-complete-20261021';
const runs=process.argv.slice(2);
const hash=b=>createHash('sha256').update(b).digest('hex');
const quantile=(a,p)=>a.length?a[Math.min(a.length-1,Math.floor((a.length-1)*p))]:null;
const stats=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return {n:a.length,p50:quantile(a,.5),p95:quantile(a,.95),p99:quantile(a,.99),max:a.at(-1)??null,mean:a.length?a.reduce((s,v)=>s+v,0)/a.length:null,over50:a.filter(v=>v>50).length,over100:a.filter(v=>v>100).length,over250:a.filter(v=>v>250).length};};
const results=[];
for(const run of runs){
 const file=path.join(root,run,'report.json'),bytes=await fs.readFile(file),report=JSON.parse(bytes);
 const row={run,variant:report.variant,race:report.race,pass:report.pass??false,failure:report.failure??null,report:{file,sha256:hash(bytes)},main:report.build.outputs.find(f=>f.file.endsWith('/main.js')),errors:report.errors,cleanup:report.cleanup,cycles:[]};
 for(const cycle of report.cycles??[]){
  row.cycles.push({cycle:cycle.cycle,cache:cycle.cache,homeReadyMs:cycle.homeReadyMs,startupReadyMs:cycle.startupReadyMs,preloadDeadline:cycle.preloadDeadline,intermissions:cycle.intermissions.map(i=>({afterStage:i.afterStage,ms:i.ms})),stages:cycle.stages.map(stage=>({stage:stage.counts.stage,gameTime:stage.counts.time,wallMs:stage.ended-stage.began,interval:stats(stage.frames.map(f=>f.interval)),renderCpu:stats(stage.frames.map(f=>f.renderCpu)),frameCpu:stats(stage.frames.map(f=>f.cpu)),pendingFrames:stage.frames.filter(f=>f.assetsPending).length,skippedFrames:stage.frames.filter(f=>f.renderSkipped).length,discardedDelta:stage.discardedDelta,models:stage.readyModels.length,completePreload:stage.completePreload,failedJobs:stage.background?.failed??[],longTasks:stats(stage.longTasks.map(t=>t.ms)),trace:stage.trace?.filter(t=>t.ms>50).sort((a,b)=>b.ms-a.ms).slice(0,20)}))});
 }
 results.push(row);
}
const out={scope:'Observed native-frame windows; no FPS guarantee, no attribution of unrelated CPU/GPU overlap. Failed/interfered runs remain separate.',runs:results};
await fs.writeFile(path.join(root,'measurements.json'),JSON.stringify(out,null,2)+'\n');
for(const r of results)console.log(JSON.stringify({run:r.run,pass:r.pass,cycles:r.cycles.map(c=>({cache:c.cache,startupMs:c.startupReadyMs,stages:c.stages.map(s=>({stage:s.stage,ready:s.completePreload?.ready,total:s.completePreload?.total,models:s.models,interval:s.interval,discarded:s.discardedDelta,pending:s.pendingFrames,skipped:s.skippedFrames}))}))}));
