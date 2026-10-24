import fs from 'node:fs';
import fsp from 'node:fs/promises';
import readline from 'node:readline';
import assert from 'node:assert/strict';
const run=process.argv[2];assert.match(run,/^spike-kernel-[a-z0-9-]+$/);
const root='reports/local/v01-20261024/'+run,r=JSON.parse(await fsp.readFile(root+'/report.json','utf8')),a=JSON.parse(await fsp.readFile(root+'/kernel-analysis.json','utf8')),stop=JSON.parse(await fsp.readFile(root+'/kernel-stop.json','utf8'));
assert.equal(r.profileClosed,true);const start=a.firstReliableSwitchUs,end=Math.min(a.lastSchedulingUs,(stop.at-a.traceStartEpochMs)*1000),targets=new Set(r.cycles.flatMap(c=>c.kernelProcessInfo.processInfo.map(p=>p.id)));
const fields=s=>{const out=[];let value='',quoted=false;for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){out.push(value.trim());value='';}else value+=c;}out.push(value.trim());return out;};
const pid=s=>Number(s?.match(/\(\s*(-?\d+)\)/)?.[1]),ready=new Map(),delays=[],faults=[],interrupts=[],stats={CSwitch:0,ReadyThread:0};
for await(const line of readline.createInterface({input:fs.createReadStream(root+'/kernel-dump.csv'),crlfDelay:Infinity})){
 if(!/^\s*(CSwitch|ReadyThread|HardFault|InMemoryStoreFault|DPC|DPCTmr|Interrupt),/.test(line))continue;const f=fields(line),kind=f[0],at=Number(f[1]);if(!Number.isFinite(at)||at<start||at>end)continue;
 if(kind==='ReadyThread'){stats.ReadyThread++;if(targets.has(pid(f[4]))&&!ready.has(Number(f[5])))ready.set(Number(f[5]),{at,pid:pid(f[4]),from:'ReadyThread',cpu:Number(f[8]),adjust:f[6],increment:Number(f[7])});}
 if(kind==='CSwitch'){
  stats.CSwitch++;const tid=Number(f[3]),pending=ready.get(tid);if(pending){const us=at-pending.at;if(us>=0)delays.push({...pending,tid,us,resumedAt:at,resumedCpu:Number(f[16]),priority:Number(f[4])});ready.delete(tid);}
  const oldTid=Number(f[9]);if(targets.has(pid(f[8]))&&f[12]==='Ready')ready.set(oldTid,{at,pid:pid(f[8]),from:'preempted',cpu:Number(f[16]),oldWaitReason:f[13]});
 }
 if(['DPC','DPCTmr','Interrupt'].includes(kind))interrupts.push({kind,at,us:Number(f[2]),cpu:Number(f[3]),routine:f.at(-1)});
 if(['HardFault','InMemoryStoreFault'].includes(kind)&&targets.has(pid(f[2])))faults.push({kind,at,pid:pid(f[2]),tid:Number(f[3]),bytes:Number(f[6]),us:Number(f[7]),file:f[9]});
}
const statsFor=rows=>({count:rows.length,maxUs:rows.reduce((n,r)=>Math.max(n,r.us),0),sumUs:rows.reduce((n,r)=>n+r.us,0)});
const result={run,scope:'Only the retained reliable scheduling interval before trace-stop initiation; no target paired pause reproduced in this run.',range:{startUs:start,endUs:end,seconds:(end-start)/1e6},rawStats:stats,readyDelays:statsFor(delays),longestReady:delays.sort((a,b)=>b.us-a.us).slice(0,25),interrupts:statsFor(interrupts),longestInterrupts:interrupts.sort((a,b)=>b.us-a.us).slice(0,15),faults:statsFor(faults),longestFaults:faults.sort((a,b)=>b.us-a.us).slice(0,15),limits:['Ready-to-run durations require both events inside retained data. Boundary-spanning waits are not measured.','No observed long delay in this quiet interval does not rule out scheduling, driver or paging causes of earlier uncaptured pauses.','Trace includes an image-metadata parser warning for a different process; raw output is retained.','No game source or system setting changed.']};
await fsp.writeFile(root+'/kernel-retained-summary.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,longestReady:result.longestReady.slice(0,5),longestInterrupts:result.longestInterrupts.slice(0,3),longestFaults:result.longestFaults.slice(0,4)},null,2));
