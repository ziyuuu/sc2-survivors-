import fs from 'node:fs';
import fsp from 'node:fs/promises';
import readline from 'node:readline';
import assert from 'node:assert/strict';
const run=process.argv[2];assert.match(run,/^spike-kernel-[a-z0-9-]+$/);
const root='reports/local/v01-20261024/'+run,r=JSON.parse(await fsp.readFile(root+'/report.json','utf8'));
const fields=s=>{const out=[];let value='',quoted=false;for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){out.push(value.trim());value='';}else value+=c;}out.push(value.trim());return out;};
const headers={},events={},processes=new Set([r.kernelProcessInfo,...r.cycles.map(c=>c.kernelProcessInfo)].filter(Boolean).flatMap(info=>info.processInfo.map(p=>p.id))),names={},faults={},near=[];
let inHeader=true,startMs=null,reliable=null,reliableSwitch=null,min=Infinity,max=-Infinity;
const gaps=r.cycles.flatMap((c,index)=>c.stages.flatMap(s=>s.frames.filter(f=>f.interval>100).map(f=>({cycle:index,stage:f.stage,time:f.time,at:f.at,interval:f.interval,cpu:f.cpu,pageOrigin:(c.kernelPageClock??r.kernelPageClock).timeOrigin}))));
for(const [index,c]of r.cycles.entries())if(c.targetCapture?.kind==='paired-main-worker-pause')gaps.push({...c.targetCapture,cycle:index,pageOrigin:(c.kernelPageClock??r.kernelPageClock).timeOrigin,measurement:'Worker send interval with independently delayed main frame; distinct from a recorded frame interval.'});
for await(const line of readline.createInterface({input:fs.createReadStream(root+'/kernel-dump.csv'),crlfDelay:Infinity})){
 if(line==='BeginHeader')continue;if(line==='EndHeader'){inHeader=false;continue;}
 if(inHeader){const row=fields(line);headers[row[0]]=row;continue;}
 if(line.startsWith('OS Version:')){const stamp=line.match(/Trace Start: (\d+)/)?.[1];assert.ok(stamp);const ticks=BigInt(stamp)-116444736000000000n;startMs=Number(ticks/10000n)+Number(ticks%10000n)/10000;continue;}
 const a=fields(line),kind=a[0],at=Number(a[1]);if(kind==='FirstReliableEventTimeStamp'){reliable=at;continue;}if(kind==='FirstReliableCSwitchEventTimeStamp'){reliableSwitch=at;continue;}
 if(!Number.isFinite(at))continue;events[kind]=(events[kind]??0)+1;if(['CSwitch','ReadyThread','HardFault'].includes(kind)){min=Math.min(min,at);max=Math.max(max,at);}
 const pid=Number(a[2]?.match(/\(\s*(-?\d+)\)/)?.[1]);
 if(kind==='ThreadName'&&processes.has(pid))names[a[3]]={pid,name:a[4]};
 if(kind==='HardFault'&&processes.has(pid)){const key=pid+':'+a[3],v=faults[key]??={pid,tid:Number(a[3]),count:0,bytes:0,elapsedUs:0,maxUs:0};v.count++;v.bytes+=Number(a[6])||0;v.elapsedUs+=Number(a[7])||0;v.maxUs=Math.max(v.maxUs,Number(a[7])||0);faults[key]=v;}
 if(startMs!==null&&(['CSwitch','ReadyThread','HardFault','DiskRead','DiskWrite','ProcessFreeze'].includes(kind)||/DPC|ISR|Interrupt/.test(kind))&&gaps.some(g=>{const end=(g.pageOrigin+g.at-startMs)*1000;return at>=end-g.interval*1000-250000&&at<=end+100000;}))near.push(Object.fromEntries((headers[kind]??a.map((_,i)=>'field'+i)).map((key,i)=>[key,a[i]])));
}
assert.ok(startMs!==null&&reliable!==null);
const stats=await fsp.readFile(root+'/kernel-statistics.txt','utf8');
const result={run,diagnosticPassed:r.pass,targetReproduced:r.targetReproduced??false,traceStartEpochMs:startMs,firstReliableUs:reliable,firstReliableSwitchUs:reliableSwitch,lastSchedulingUs:max,retainedSchedulingSeconds:(max-reliableSwitch)/1e6,lostBuffers:Number(stats.match(/Total # Lost Buffers\s*:\s*(\d+)/)?.[1]),lostEvents:Number(stats.match(/Total # Lost Events\s*:\s*(\d+)/)?.[1]),gaps:gaps.map(g=>{const endUs=(g.pageOrigin+g.at-startMs)*1000,startUs=endUs-g.interval*1000;return {...g,startUs,endUs,fullyCovered:startUs>=reliableSwitch&&endUs<=max};}),events,threadNames:names,targetHardFaults:Object.values(faults),nearbyEvents:near.length,limits:['Circular-buffer overwrite is separate from ETW lost-event counters. Only gaps wholly inside the retained scheduling range can be analyzed.','All recorded timings include diagnostic instrumentation.','A new captured stall cannot uniquely prove the cause of the two historical untraced events.']};
await fsp.writeFile(root+'/kernel-analysis.json',JSON.stringify(result,null,2)+'\n');await fsp.writeFile(root+'/kernel-near-events.json',JSON.stringify(near,null,2)+'\n');
console.log(JSON.stringify({run,targetReproduced:result.targetReproduced,lostEvents:result.lostEvents,retainedSeconds:result.retainedSchedulingSeconds,gaps:result.gaps,nearbyEvents:near.length},null,2));
