import fs from 'node:fs';
import fsp from 'node:fs/promises';
import readline from 'node:readline';
import assert from 'node:assert/strict';
const run=process.argv[2];assert.match(run,/^spike-thread-gc-[a-z0-9-]+$/);
const root='reports/local/v01-20261024/'+run;
const report=JSON.parse(await fsp.readFile(root+'/report.json','utf8'));assert.equal(report.profileClosed,true);
const stats=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?{n:a.length,min:a[0],mean:a.reduce((s,n)=>s+n,0)/a.length,p95:a[Math.floor((a.length-1)*.95)],max:a.at(-1)}:null;};
const cycles=[];
for(const cycle of report.cycles){
 const renderer=cycle.monitoredProcesses.filter(p=>p.type==='renderer').sort((a,b)=>b.cpuTime-a.cpuTime)[0]?.id,gpu=cycle.monitoredProcesses.find(p=>p.type==='GPU')?.id;
 const gaps=cycle.stages.flatMap(s=>s.frames.filter(f=>f.interval>100).map(f=>({stage:f.stage,time:f.time,at:f.at,interval:f.interval,cpu:f.cpu,renderCpu:f.renderCpu,wall:cycle.pageTimeOrigin+f.at,prior:s.frames[s.frames.indexOf(f)-1],longTasks:s.longTasks.filter(t=>t.at+t.ms>=f.at-f.interval&&t.at<=f.at),work:s.trace.filter(t=>t.at+t.ms>=f.at-f.interval&&t.at<=f.at+30),samples:[]})));
 const names={},durations=[],spacing=[];let prior=null,count=0;
 for await(const line of readline.createInterface({input:fs.createReadStream(root+'/cycle'+cycle.cycle+'-process-memory.jsonl'),crlfDelay:Infinity})){
  if(!line.trim())continue;const sample=JSON.parse(line),t=sample.threads;assert.ok(t);Object.assign(names,t.newNames);count++;durations.push(t.queryMs);if(prior)spacing.push(t.at-prior.at);prior=t;
  for(const gap of gaps)if(sample.at>=gap.wall-gap.interval-250&&sample.at<=gap.wall+250){
   const selected=t.rows.filter(r=>[renderer,gpu].includes(r[0])),stateCounts={};for(const row of selected){const key=row[0]+':'+row[2]+':'+row[3];stateCounts[key]=(stateCounts[key]??0)+1;}
   gap.samples.push({at:sample.at,relativeMs:sample.at-gap.wall,threadSnapshotAt:t.at,queryMs:t.queryMs,qpc:t.qpc,qpcFrequency:t.qpcFrequency,uptimeMs:t.uptimeMs,availablePhysical:sample.availablePhysical,counters:sample.counters,processes:sample.processes,threads:selected.map(r=>({pid:r[0],tid:r[1],name:names[r[0]+':'+r[1]],state:r[2],waitReason:r[3],priority:r[4],basePriority:r[5],cpuCycles:r[6]})),stateCounts});
  }
 }
 const events=[],meta=[],stacks=new Map();let origin;
 for await(const line of readline.createInterface({input:fs.createReadStream(root+'/trace-cycle'+cycle.cycle+'.json'),crlfDelay:Infinity})){
  if(!line.startsWith('{')||!line.includes('"ph":'))continue;const text=line.split('],"metadata":')[0],e=JSON.parse(text.endsWith(',')?text.slice(0,-1):text);
  if(e.ph==='M'){meta.push(e);continue;}if(e.name==='V01_SPIKE_TRACE_ORIGIN')origin=e;
  if(e.ph==='B'){const key=e.pid+':'+e.tid,s=stacks.get(key)??[];s.push(e);stacks.set(key,s);}else if(e.ph==='E'){const b=stacks.get(e.pid+':'+e.tid)?.pop();if(b)events.push({...b,ph:'X',dur:e.ts-b.ts});}else events.push(e);
 }
 assert.ok(origin);const offset=origin.ts/1000-(origin.args?.data?.startTime??cycle.traceOrigin),traceNames=new Map(meta.filter(e=>e.name==='thread_name').map(e=>[e.pid+':'+e.tid,e.args.name]));
 const normalize=e=>({at:e.ts/1000-offset,ms:(e.dur??0)/1000,pid:e.pid,tid:e.tid,thread:traceNames.get(e.pid+':'+e.tid),name:e.name,cat:e.cat,phase:e.ph,args:e.args});
 const gc=events.filter(e=>/GC|gc|Garbage|MemoryPressure|PurgeMemory/.test(e.name));
 for(const gap of gaps){
  const sentinel=cycle.sentinel.find(g=>Math.abs(g.at-gap.at)<.1);if(sentinel){gap.workerPauses=sentinel.worker.slice(1).map((r,i)=>({sentFrom:sentinel.worker[i][0],sentTo:r[0],sentGap:r[0]-sentinel.worker[i][0],deliveryMs:r[1]-r[0]})).filter(g=>g.sentGap>100||g.deliveryMs>100);gap.mainPauses=sentinel.main.slice(1).map((r,i)=>({from:sentinel.main[i][0],to:r[0],ms:r[0]-sentinel.main[i][0]})).filter(g=>g.ms>100);}
  gap.hostGaps=report.hostGaps.filter(g=>g.at>=gap.wall-gap.interval-100&&g.at<=gap.wall+100);
  const start=gap.prior?gap.prior.at+gap.prior.cpu:gap.at-gap.interval;
  gap.gcOverlap=gc.filter(e=>e.ts/1000-offset<gap.at&&(e.ts+(e.dur??0))/1000-offset>start).map(normalize);
  gap.nearTrace=events.filter(e=>e.ts/1000-offset<gap.at+30&&(e.ts+(e.dur??0))/1000-offset>start-30).map(normalize);
 }
 cycles.push({cycle:cycle.cycle,renderer,gpu,observerSamples:count,queryMs:stats(durations),sampleSpacingMs:stats(spacing),maxFrame:Math.max(...cycle.stages.flatMap(s=>s.frames.map(f=>f.interval??0))),traceCoverage:{start:events.reduce((n,e)=>Math.min(n,e.ts),Infinity)/1000-offset,end:events.reduce((n,e)=>Math.max(n,e.ts+(e.dur??0)),-Infinity)/1000-offset,events:events.length,gcEvents:gc.length,unclosedBeginEvents:[...stacks.values()].reduce((n,s)=>n+s.length,0)},gcLongest:gc.filter(e=>e.ph==='X').sort((a,b)=>(b.dur??0)-(a.dur??0)).slice(0,20).map(normalize),pressureSignals:gc.filter(e=>/MemoryPressure|PurgeMemory/.test(e.name)).map(normalize),gaps});
}
const result={run,pass:report.pass,noPressureInjection:true,cycles,limits:['Diagnostic overhead is recorded and these timings are separate from ordinary performance acceptance.','Thread states are sampled, not a continuous scheduling trace. Process page faults include soft and hard faults.','Historical untraced events remain separately classified.']};
await fsp.writeFile(root+'/thread-gc-analysis.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(cycles.map(c=>({cycle:c.cycle,renderer:c.renderer,gpu:c.gpu,max:c.maxFrame,query:c.queryMs,spacing:c.sampleSpacingMs,coverage:c.traceCoverage,gaps:c.gaps.map(g=>({stage:g.stage,time:g.time,ms:g.interval,cpu:g.cpu,samples:g.samples.length,gc:g.gcOverlap.map(e=>({name:e.name,at:e.at,ms:e.ms,thread:e.thread})),workerPauses:g.workerPauses,hostGaps:g.hostGaps}))})),null,2));
