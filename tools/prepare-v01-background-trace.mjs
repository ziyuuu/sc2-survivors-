import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='reports/local/v01-20261024';
let code=await fs.readFile(base+'/entry-comparison.mjs','utf8');
const replace=(a,b)=>{assert.equal(code.split(a).length,2,a);code=code.replace(a,b);};
replace('let phase=\'boot\',page,context,timer;', 'let phase=\'boot\',page,context,timer,traceCdp;');
replace("report.system=await bc.send('SystemInfo.getInfo');", "report.system=await bc.send('SystemInfo.getInfo');traceCdp=await context.newCDPSession(page);await traceCdp.send('Profiler.enable');await traceCdp.send('Profiler.setSamplingInterval',{interval:1000});");
replace('await shot(`cycle${cycle}-ready`);', `await shot(\`cycle\${cycle}-ready\`);await traceCdp.send('Profiler.start');await traceCdp.send('Tracing.start',{categories:'toplevel,devtools.timeline,blink.user_timing,cc,gpu,viz,renderer.scheduler',transferMode:'ReturnAsStream'});`);
replace('row.stages.push(result);', `row.stages.push(result);
   const cpu=await traceCdp.send('Profiler.stop');await fs.writeFile(root+'/cpu-stage'+stage+'.json',JSON.stringify(cpu));
   const completed=new Promise(resolve=>traceCdp.once('Tracing.tracingComplete',resolve));await traceCdp.send('Tracing.end');const {stream}=await completed;
   const file=await fs.open(root+'/trace-stage'+stage+'.json','wx');try{for(;;){const chunk=await traceCdp.send('IO.read',{handle:stream,size:1024*1024});await file.write(chunk.base64Encoded?Buffer.from(chunk.data,'base64'):chunk.data);if(chunk.eof)break;}}finally{await file.close();await traceCdp.send('IO.close',{handle:stream});}
   if(stage<stageLimit){await traceCdp.send('Profiler.start');await traceCdp.send('Tracing.start',{categories:'toplevel,devtools.timeline,blink.user_timing,cc,gpu,viz,renderer.scheduler',transferMode:'ReturnAsStream'});}
  `);
replace('Single visible page, serial measurement.', 'Single visible page, serial diagnostic. CPU sampling and Chromium GPU timeline tracing enabled: timing is diagnostic only and must not be pooled with unprofiled performance trials.');
await fs.writeFile(base+'/background-trace.mjs',code,{flag:'wx'});
console.log(base+'/background-trace.mjs');
