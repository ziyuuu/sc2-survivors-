import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='reports/local/v01-20261024';
let code=await fs.readFile(base+'/spike-repeat-r1.mjs','utf8');
const replace=(before,after)=>{assert.equal(code.split(before).length,2,before);code=code.replace(before,after);};
replace('timer,memoryMonitor,memoryMonitorExit,monitorPrefix;', 'timer,memoryMonitor,memoryMonitorExit,monitorPrefix,traceCdp,tracing=false,traceFile;');
replace("async function shot(name){", [
"async function stopSparseTrace(){if(!tracing)return;tracing=false;let timeout;const completed=new Promise((resolve,reject)=>{traceCdp.once('Tracing.tracingComplete',event=>{clearTimeout(timeout);resolve(event);});timeout=setTimeout(()=>reject(Error('Sparse trace stop timeout')),60000);});",
"try{await traceCdp.send('Tracing.end');const {stream}=await completed;const output=await fs.open(traceFile,'wx');try{for(;;){const chunk=await traceCdp.send('IO.read',{handle:stream,size:1024*1024});await output.write(chunk.base64Encoded?Buffer.from(chunk.data,'base64'):chunk.data);if(chunk.eof)break;}}finally{await output.close();await traceCdp.send('IO.close',{handle:stream});}}finally{clearTimeout(timeout);}}",
"async function shot(name){"
].join('\n'));
replace("report.system=await bc.send('SystemInfo.getInfo');", "report.system=await bc.send('SystemInfo.getInfo');traceCdp=await context.newCDPSession(page);report.selectedTraceCategories=['memory','memory-infra','v8','disabled-by-default-v8.gc','blink_gc','blink.user_timing'];");
replace("'tools/v01-watch-process-memory.ps1'", "'tools/v01-watch-process-threads.ps1'");
replace("await page.locator('[data-action=flow-continue]:visible').click();", "traceFile=root+'/trace-cycle'+cycle+'.json';await traceCdp.send('Tracing.start',{traceConfig:{recordMode:'recordContinuously',traceBufferSizeInKb:65536,includedCategories:report.selectedTraceCategories},transferMode:'ReturnAsStream'});tracing=true;row.traceOrigin=await page.evaluate(()=>{performance.mark('V01_SPIKE_TRACE_ORIGIN');return performance.now();});await page.locator('[data-action=flow-continue]:visible').click();");
replace("  row.textureMemory=await page.evaluate", "  await stopSparseTrace();row.textureMemory=await page.evaluate");
replace("finally{clearInterval(timer);", "finally{if(tracing)await stopSparseTrace().catch(error=>report.traceStopFailure=String(error));clearInterval(timer);");
replace('report.pass=true;', "report.normalPressureNotifications=true;report.pass=true;");
code=code.replace('no browser tracing or CPU profiler; host heartbeat', 'sparse GC/memory tracing and read-only 100ms thread-state snapshots; no CPU profiler and no pressure injection; host heartbeat');
await fs.writeFile(base+'/spike-thread-gc-r1.mjs',code,{flag:'wx'});
await fs.writeFile(base+'/spike-thread-gc-plan.json',JSON.stringify({scope:'Two native first-three-stage diagnostic cycles, separate from ordinary performance acceptance.',source:'Frozen stage-window-r2 production baseline; held image-sharing candidate is not used.',observations:['Independent main/worker/host heartbeats','Sparse real GC/memory timeline, no CPU profiler','Read-only native thread states and process memory counters at nominal 100ms intervals'],constraints:['No pressure injection, system setting changes, administrator capture, or production changes.','Native stage-three withdrawal and terminal save before re-entry.','Actual observer overhead and sample spacing are recorded; do not mix with ordinary comparison.','A fresh similar spike does not uniquely establish the historical untraced events.']},null,2)+'\n',{flag:'wx'});
console.log('Prepared bounded normal-notification thread/GC diagnostic.');
