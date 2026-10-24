import fs from 'node:fs/promises';import {createReadStream} from 'node:fs';import {createInterface} from 'node:readline';import assert from 'node:assert/strict';
const run=process.argv[2],root='reports/local/v01-20261024/'+run;
const report=JSON.parse(await fs.readFile(root+'/report.json','utf8')),events=[],durations=[],stacks=new Map();let totalEvents=0;
for await(const line of createInterface({input:createReadStream(root+'/trace-stage2.json'),crlfDelay:Infinity})){
 if(!line.startsWith('{')||!line.includes('"ph":'))continue;
 const object=line.split('],"metadata":')[0];const e=JSON.parse(object.endsWith(',')?object.slice(0,-1):object);totalEvents++;
 if(e.ph==='M'||e.name==='V01_SPIKE_TRACE_ORIGIN'||e.name.startsWith('V01_SPIKE_GAP:'))events.push(e);
 if(e.ph==='X'&&e.dur>=1000)durations.push(e);
 const key=e.pid+':'+e.tid;if(e.ph==='B'){const s=stacks.get(key)??[];s.push(e);stacks.set(key,s);}else if(e.ph==='E'){const b=stacks.get(key)?.pop();if(b&&e.ts-b.ts>=1000)durations.push({...b,ph:'X',dur:e.ts-b.ts});}
}
const threads=new Map(events.filter(e=>e.ph==='M'&&e.name==='thread_name').map(e=>[e.pid+':'+e.tid,e.args.name]));
const processNames=new Map(events.filter(e=>e.ph==='M'&&e.name==='process_name').map(e=>[e.pid,e.args.name]));
const origin=events.find(e=>e.name==='V01_SPIKE_TRACE_ORIGIN')??events.find(e=>e.name.startsWith('V01_SPIKE_GAP:')&&e.args?.data?.startTime!==undefined);assert.ok(origin,'Trace origin marker');const offset=origin.ts/1000-(origin.args?.data?.startTime??report.traceOrigin);
const row=e=>({name:e.name,cat:e.cat,thread:threads.get(e.pid+':'+e.tid),process:processNames.get(e.pid),pid:e.pid,tid:e.tid,at:e.ts/1000-offset,ms:e.dur/1000,args:e.args});
const cpuText=await fs.readFile(root+'/cpu-stage2.json','utf8').catch(error=>{if(error.code!=='ENOENT')throw error;return null;}),profile=cpuText?JSON.parse(cpuText).profile:{nodes:[],samples:[],timeDeltas:[],startTime:0},nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();for(const n of nodes.values())for(const id of n.children??[])parents.set(id,n.id);
let sampledAt=profile.startTime;const samples=profile.samples.map((id,i)=>{sampledAt+=profile.timeDeltas[i];return {id,at:sampledAt/1000-offset,ms:profile.timeDeltas[i]/1000};});
const sampleRows=(start,end)=>{const weights=new Map();for(const s of samples)if(s.at>=start&&s.at<=end)weights.set(s.id,(weights.get(s.id)??0)+s.ms);return [...weights].map(([id,ms])=>{const chain=[];for(let p=parents.get(id);p!==undefined&&chain.length<8;p=parents.get(p))chain.push(nodes.get(p).callFrame);return {...nodes.get(id).callFrame,ms,callers:chain};}).sort((a,b)=>b.ms-a.ms).slice(0,15);};
const stage=report.cycles[0].stages[1],gaps=[];
for(const [index,f]of stage.frames.entries())if(f.interval>100){
 const previous=stage.frames[index-1],start=f.at-f.interval,end=f.at,quietStart=previous?previous.at+previous.cpu:start;
 const matching=durations.filter(e=>e.ts/1000-offset<end+50&&(e.ts+e.dur)/1000-offset>start-50&&e.dur>=1000);
 const overlap=e=>Math.max(0,Math.min(end,(e.ts+e.dur)/1000-offset)-Math.max(quietStart,e.ts/1000-offset));
 const longest=matching.sort((a,b)=>overlap(b)-overlap(a)||b.dur-a.dur).slice(0,60);
 gaps.push({index,frame:f,previous,quietStart,emptyBetweenCallbacks:end-quietStart,backgroundJobs:stage.background.events.filter(e=>e.start<end&&e.end>start),work:stage.trace.filter(e=>e.at<end+50&&e.at+(e.ms??0)>start-50),longTasks:stage.longTasks.filter(e=>e.at<end&&e.at+e.ms>start),timeline:longest.map(e=>({...row(e),quietOverlap:overlap(e)})),cpu:sampleRows(quietStart,end)});
}
const groups=new Map();for(const e of durations){const key=threads.get(e.pid+':'+e.tid)+'|'+e.name,g=groups.get(key)??{key,n:0,ms:0,max:0};g.n++;g.ms+=e.dur/1000;g.max=Math.max(g.max,e.dur/1000);groups.set(key,g);}
const result={run,scope:'Diagnostic trace only; overhead and circular capture coverage are separate from ordinary performance. Streaming reader retains duration events >=1ms and metadata; raw trace is unchanged. Event coincidence needs causal isolation before optimization.',cpuProfile:!!cpuText,capture:durations.length?{start:durations.reduce((n,e)=>Math.min(n,e.ts),Infinity)/1000-offset,end:durations.reduce((n,e)=>Math.max(n,e.ts+e.dur),-Infinity)/1000-offset,stoppedFor:report.traceStoppedFor}:null,events:totalEvents,origin:{offset,at:report.traceOrigin,event:origin},threads:[...threads],groups:[...groups.values()].sort((a,b)=>b.max-a.max).slice(0,100),gaps,top:durations.filter(e=>e.dur>=50000).sort((a,b)=>b.dur-a.dur).slice(0,60).map(row)};
await fs.writeFile(root+'/spike-analysis.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({run,events:totalEvents,gaps:gaps.map(g=>({frame:g.frame,previous:g.previous,emptyBetweenCallbacks:g.emptyBetweenCallbacks,backgroundJobs:g.backgroundJobs,timeline:g.timeline.slice(0,14),cpu:g.cpu.slice(0,5)})),top:result.top.slice(0,12)},null,2));
