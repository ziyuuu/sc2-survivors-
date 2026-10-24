import fs from 'node:fs';
import fsp from 'node:fs/promises';
import readline from 'node:readline';
import assert from 'node:assert/strict';
const run=process.argv[2];assert.match(run,/^spike-thread-state-[a-z0-9-]+$/);const root='reports/local/v01-20261024/'+run;
const report=JSON.parse(await fsp.readFile(root+'/report.json','utf8'));assert.equal(report.profileClosed,true,'Analyze only after capture closes.');
const stats=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?{n:a.length,min:a[0],mean:a.reduce((s,n)=>s+n,0)/a.length,p95:a[Math.floor((a.length-1)*.95)],max:a.at(-1)}:null;};
const cycles=[];
for(const cycle of report.cycles){
 const renderer=cycle.monitoredProcesses.filter(p=>p.type==='renderer').sort((a,b)=>b.cpuTime-a.cpuTime)[0]?.id,gpu=cycle.monitoredProcesses.find(p=>p.type==='GPU')?.id;
 const gaps=cycle.stages.flatMap(s=>s.frames.filter(f=>f.interval>100).map(f=>({stage:f.stage,time:f.time,at:f.at,interval:f.interval,cpu:f.cpu,renderCpu:f.renderCpu,wall:cycle.pageTimeOrigin+f.at,prior:s.frames[s.frames.indexOf(f)-1],longTasks:s.longTasks.filter(t=>t.at+t.ms>=f.at-f.interval&&t.at<=f.at),work:s.trace.filter(t=>t.at+t.ms>=f.at-f.interval&&t.at<=f.at+30),samples:[]})));
 const names={},durations=[],spacing=[],clockDifferences=[];let prior=null,count=0;
 for await(const line of readline.createInterface({input:fs.createReadStream(root+'/cycle'+cycle.cycle+'-process-memory.jsonl'),crlfDelay:Infinity})){
  if(!line.trim())continue;const sample=JSON.parse(line),t=sample.threads;assert.ok(t);Object.assign(names,t.newNames);count++;durations.push(t.queryMs);
  if(prior){spacing.push(t.at-prior.at);const qpcMs=(t.qpc-prior.qpc)/t.qpcFrequency*1000,uptimeMs=t.uptimeMs-prior.uptimeMs;if(Math.abs(qpcMs-uptimeMs)>50)clockDifferences.push({at:t.at,qpcMs,uptimeMs});}
  prior=t;
  for(const gap of gaps)if(sample.at>=gap.wall-gap.interval-300&&sample.at<=gap.wall+300){
   const important=t.rows.filter(r=>(r[0]===renderer&&/CrRendererMain|DedicatedWorker|Compositor/i.test(names[r[0]+':'+r[1]]??''))||(r[0]===gpu&&/CrGpuMain|VizCompositor|GpuMemory/i.test(names[r[0]+':'+r[1]]??'')));
   const states={};for(const row of t.rows)if([renderer,gpu].includes(row[0])){const key=row[0]+':'+row[2]+':'+row[3];states[key]=(states[key]??0)+1;}
   gap.samples.push({at:sample.at,relativeMs:sample.at-gap.wall,queryMs:t.queryMs,availablePhysical:sample.availablePhysical,counters:sample.counters,processes:sample.processes.filter(p=>[renderer,gpu].includes(p.pid)),threads:important.map(r=>({pid:r[0],tid:r[1],name:names[r[0]+':'+r[1]],state:r[2],waitReason:r[3],priority:r[4],basePriority:r[5],cpuCycles:r[6]})),stateCounts:states});
  }
 }
 for(const gap of gaps){const sentinel=cycle.sentinel.find(g=>Math.abs(g.at-gap.at)<.1);if(sentinel){gap.workerPauses=sentinel.worker.slice(1).map((r,i)=>({sentFrom:sentinel.worker[i][0],sentTo:r[0],sentGap:r[0]-sentinel.worker[i][0],deliveryMs:r[1]-r[0]})).filter(g=>g.sentGap>100||g.deliveryMs>100);gap.mainPauses=sentinel.main.slice(1).map((r,i)=>({from:sentinel.main[i][0],to:r[0],ms:r[0]-sentinel.main[i][0]})).filter(g=>g.ms>100);}gap.hostGaps=report.hostGaps.filter(g=>g.at>=gap.wall-gap.interval-100&&g.at<=gap.wall+100);}
 cycles.push({cycle:cycle.cycle,renderer,gpu,observerSamples:count,queryMs:stats(durations),sampleSpacingMs:stats(spacing),qpcUptimeDifferencesOver50Ms:clockDifferences,frameMax:Math.max(...cycle.stages.flatMap(s=>s.frames.map(f=>f.interval??0))),over300:gaps.filter(g=>g.interval>300).length,threadNames:Object.fromEntries(Object.entries(names).filter(([key])=>key.startsWith(renderer+':')||key.startsWith(gpu+':'))),gaps});
}
const result={run,pass:report.pass,cycles,limits:['Read-only 100ms native thread-state snapshots are diagnostic samples, not a continuous kernel scheduling trace. Wait reasons are raw Windows values only when state=5.','System page-in counters include other processes; process pageFaults combine hard and soft faults. Neither alone proves disk paging caused a frame gap.','Recorded query duration and sample spacing expose observer overhead. QPC versus uptime comparisons have clock granularity limits.','Historical 410/502.7ms gaps still require direct or defensible equivalent causal evidence.']};
await fsp.writeFile(root+'/thread-analysis.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(cycles.map(c=>({cycle:c.cycle,renderer:c.renderer,gpu:c.gpu,max:c.frameMax,over300:c.over300,query:c.queryMs,spacing:c.sampleSpacingMs,gaps:c.gaps.map(g=>({stage:g.stage,time:g.time,ms:g.interval,cpu:g.cpu,samples:g.samples.length,workerPauses:g.workerPauses,hostGaps:g.hostGaps}))})),null,2));
