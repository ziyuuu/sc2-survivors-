import fs from 'node:fs';

const path=process.argv[2]??'reports/local/m6-frame-trace-protoss/trace.json';
const trace=JSON.parse(fs.readFileSync(path,'utf8'));
const events=trace.traceEvents.filter(event=>event.ph==='X'&&event.dur);
const tasks=events.filter(event=>event.name==='GpuChannel::ExecuteDeferredRequest').sort((a,b)=>b.dur-a.dur).slice(0,5);
for(const task of tasks){
 const nested=events.filter(event=>event.pid===task.pid&&event.tid===task.tid&&event.ts>=task.ts&&event.ts+event.dur<=task.ts+task.dur&&event!==task&&event.dur>500)
  .sort((a,b)=>b.dur-a.dur).slice(0,25).map(event=>({name:event.name,cat:event.cat,ms:event.dur/1000,args:event.args}));
 console.log(JSON.stringify({taskMs:task.dur/1000,at:task.ts/1000,nested}));
}
