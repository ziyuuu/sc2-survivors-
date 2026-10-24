import fs from 'node:fs/promises';
const run=process.argv[2]??'background-gpu-trace-r1',root='reports/local/v01-20261024/'+run;
const trace=JSON.parse(await fs.readFile(root+'/trace-stage1.json')),events=trace.traceEvents;
const meta=events.filter(e=>e.ph==='M'),names=new Map(meta.filter(e=>e.name==='thread_name').map(e=>[e.pid+':'+e.tid,e.args.name]));
const durations=events.filter(e=>e.ph==='X'&&e.dur),groups=new Map();
for(const e of durations){const key=names.get(e.pid+':'+e.tid)+'|'+e.name,g=groups.get(key)??{key,n:0,ms:0,max:0};g.n++;g.ms+=e.dur/1000;g.max=Math.max(g.max,e.dur/1000);groups.set(key,g);}
const row=e=>({name:e.name,thread:names.get(e.pid+':'+e.tid),pid:e.pid,tid:e.tid,at:e.ts/1000,ms:e.dur/1000,args:e.args});
const top=durations.filter(e=>!['ThreadControllerImpl::RunTask','RunTask'].includes(e.name)).sort((a,b)=>b.dur-a.dur).slice(0,80);
const gpu=durations.filter(e=>/Gpu|GPU/.test(names.get(e.pid+':'+e.tid)??'')&&e.dur>50000).sort((a,b)=>b.dur-a.dur).slice(0,40).map(e=>({...row(e),nested:durations.filter(n=>n!==e&&n.pid===e.pid&&n.tid===e.tid&&n.ts>=e.ts&&n.ts+n.dur<=e.ts+e.dur&&n.dur>1000).sort((a,b)=>b.dur-a.dur).slice(0,8).map(row)}));
const {profile}=JSON.parse(await fs.readFile(root+'/cpu-stage1.json')),nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map(),weights=new Map();
for(const n of nodes.values())for(const id of n.children??[])parents.set(id,n.id);
for(let i=0;i<profile.samples.length;i++){const id=profile.samples[i];weights.set(id,(weights.get(id)??0)+profile.timeDeltas[i]/1000);}
const cpu=[...nodes.values()].map(n=>{const chain=[];for(let id=parents.get(n.id);id!==undefined&&chain.length<6;id=parents.get(id))chain.push(nodes.get(id).callFrame.functionName);return {...n.callFrame,ms:weights.get(n.id)??0,callers:chain};}).sort((a,b)=>b.ms-a.ms).slice(0,50);
const report={run,scope:'Instrumented CPU/GPU timeline attribution only; not an unprofiled performance trial.',events:events.length,threads:[...names],groups:[...groups.values()].sort((a,b)=>b.max-a.max).slice(0,100),top:top.map(row),gpu,cpu};
await fs.writeFile(root+'/trace-analysis.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({events:report.events,threads:report.threads,top:report.top.slice(0,20),gpu:report.gpu.slice(0,8),cpu:report.cpu.slice(0,12)},null,2));
