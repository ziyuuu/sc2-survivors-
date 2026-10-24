import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const run=process.argv[2]??'background-program-trace-r1',root='reports/local/v01-20261024/'+run,report=JSON.parse(await fs.readFile(root+'/report.json','utf8'));
const summary={run,scope:'Diagnostic CPU/GPU attribution only; tracing and profiling overhead excludes this run from ordinary performance comparisons.',stages:[],minimumFreeBytes:Math.min(...report.memorySamples.map(s=>s.freeBytes)),lastJobLabelLimitation:report.lastJobLabelLimitation};let offset;
const hash=s=>createHash('sha256').update(s).digest('hex');
for(let i=0;i<report.cycles[0].stages.length;i++){
 const s=report.cycles[0].stages[i],events=JSON.parse(await fs.readFile(root+`/trace-stage${i+1}.json`,'utf8')).traceEvents,names=new Map(events.filter(e=>e.ph==='M'&&e.name==='thread_name').map(e=>[e.pid+':'+e.tid,e.args.name]));
 const marker=events.find(e=>e.name==='V01_BACKGROUND_TRACE_ORIGIN');if(marker)offset=marker.ts/1000-report.traceOrigin;if(!Number.isFinite(offset))throw Error('Missing trace clock origin');
 const row=e=>({name:e.name,thread:names.get(e.pid+':'+e.tid),at:e.ts/1000-offset,ms:e.dur/1000});
 const durations=events.filter(e=>e.ph==='X'&&e.dur>0),compiles=durations.filter(e=>e.name==='D3DCompile').map(e=>{const source=e.args?.source??'';return {...row(e),sourceSha256:hash(source),sourceBytes:Buffer.byteLength(source),uintSkin:/uint4 _skinIndex/.test(source),floatSkin:/float4 _skinIndex\s*:/.test(source),input:source.match(/struct VS_INPUT\s*\{[\s\S]*?\};/)?.[0]};});
 const reads=(s.programDiagnostics??[]).map(e=>({...e,cacheKeySha256:hash(e.cacheKey??'')}));
 const frames=s.frames.filter(f=>f.interval>100).map(f=>{const end=f.at,start=end-f.interval,overlap=e=>e.at<end&&e.at+e.ms>start;return {at:end,interval:f.interval,time:f.time,backlog:f.backlog,background:f.background,compiles:compiles.filter(overlap),programReads:reads.filter(overlap),gl:s.trace.filter(e=>e.key.startsWith('gl.')&&overlap(e)),longTasks:s.longTasks.filter(overlap),tasks:durations.map(row).filter(e=>e.ms>10&&overlap(e)).sort((a,b)=>b.ms-a.ms).slice(0,20)};});
 const {profile}=JSON.parse(await fs.readFile(root+`/cpu-stage${i+1}.json`,'utf8')),nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();for(const n of nodes.values())for(const id of n.children??[])parents.set(id,n.id);
 const chain=id=>{const out=[];while(id!==undefined&&out.length<12){const n=nodes.get(id);out.push(n.callFrame);id=parents.get(id);}return out;};let at=profile.startTime/1000-offset;const samples=profile.samples.map((id,j)=>{const ms=profile.timeDeltas[j]/1000;at+=ms;return {at,ms,id};});
 for(const f of frames){const weights=new Map();for(const p of samples)if(p.at>=f.at-f.interval&&p.at<=f.at)weights.set(p.id,(weights.get(p.id)??0)+p.ms);f.cpuSamples=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([id,ms])=>({ms,stack:chain(id)}));}
 summary.stages.push({stage:i+1,events:events.length,markerOffsetMs:offset,traceClockRange:[Math.min(...samples.map(p=>p.at)),Math.max(...samples.map(p=>p.at))],nativeRange:[s.began,s.ended],programReads:reads,compiles,frames});
}
await fs.writeFile(root+'/program-analysis.json',JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({run,minimumFreeBytes:summary.minimumFreeBytes,stages:summary.stages.map(s=>({stage:s.stage,frames:s.frames.map(f=>({at:f.at,ms:f.interval,time:f.time,programReads:f.programReads.map(r=>({ms:r.ms,draw:r.draw,backgroundBusy:r.backgroundBusy,renderContext:r.renderContext})),compiles:f.compiles.map(c=>({...c,input:undefined})),cpu:f.cpuSamples.slice(0,3)})),reads:s.programReads.map(r=>({at:r.at,ms:r.ms,draw:r.draw,backgroundBusy:r.backgroundBusy,renderContext:r.renderContext})),compiles:s.compiles.length}))},null,2));
