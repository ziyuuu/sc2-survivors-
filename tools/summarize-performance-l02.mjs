import fs from 'node:fs/promises';
const root='reports/local/performance-l02-20261020';
const read=async file=>JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
const rows=[];
for(const name of await fs.readdir(root)){
 if(!/^(web|offline)-(baseline|candidate)-r\d+-\d+$/.test(name))continue;
 const r=await read(`${root}/${name}/report.json`).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
 if(!r)continue;
 const stages=r.stages.map(s=>{
  const d=s.data,p=d.probe??{},spans=d.spans??[],firstDecode=spans.filter(x=>x.label==='embeddedDecode').sort((a,b)=>a.start-b.start)[0];
  const end=d.at,start=['cold-ready','reload-ready'].includes(s.label)?[...spans].reverse().find(x=>x.label==='requiredEntrance')?.start:0;
  const range=spans.filter(x=>x.start>=(start??0)&&x.start<end),labels=[...new Set(range.map(x=>x.label))];
  const longTasks=(p.longTasks??[]).filter(t=>t.at>=(start??0)&&t.at<end);
  const heap=(p.heap??[]).filter(t=>t.at>=(start??0)&&t.at<end);
  return {label:s.label,wallMs:s.wallMs,phase:d.readiness?.phase,world:d.world,modelCount:d.models?.keys.length,warmed:d.models?.screenWarmed,programs:d.models?.programs,
   nativeYield:d.scheduling?.nativeYield,parseGapMs:firstDecode?firstDecode.start-d.loadedAt:null,
   parseLongTasks:(p.longTasks??[]).filter(t=>t.at>=d.loadedAt&&t.at<(firstDecode?.start??d.loadedAt)),
   parseFrames:(p.frames??[]).filter(t=>t.at>=d.loadedAt&&t.at<(firstDecode?.start??d.loadedAt)),
   removedBatches:p.packRemoved?.length,removedTotal:p.packRemoved?.reduce((s,b)=>s+b.count,0),
   firstMenuDecodeMs:firstDecode?.ms,longTasks:longTasks.length,maxLongTaskMs:Math.max(0,...longTasks.map(t=>t.ms)),
   peakSampledJsHeap:Math.max(0,...heap.map(t=>t.used)),endJsHeap:d.memory?.used,
   spanSummary:Object.fromEntries(labels.map(l=>{const a=range.filter(s=>s.label===l);return[l,{count:a.length,sumMs:a.reduce((s,x)=>s+x.ms,0),maxMs:Math.max(...a.map(x=>x.ms)),failed:a.filter(x=>!x.ok).length}]})),
   navigation:d.navigation?.[0],dom:s.dom};
 });
 rows.push({name,complete:r.complete??false,failure:r.failure??null,errors:r.errors.length,failedRequests:r.failedRequests.length,httpRequests:r.network.length,hardware:r.hardware,stages});
}
await fs.writeFile(root+'/loading-summary.json',JSON.stringify({scope:'Nested asynchronous spans overlap. Sum is per method, never total CPU/GPU duration. Sampled JS heap is not process RAM or VRAM. Fresh profiles do not flush OS caches.',rows},null,2));
console.log(JSON.stringify(rows.map(r=>({name:r.name,complete:r.complete,failure:r.failure?.slice(0,160),errors:r.errors,failedRequests:r.failedRequests,stages:r.stages.filter(s=>/home|ready/.test(s.label)).map(({label,wallMs,parseGapMs,removedBatches,removedTotal,firstMenuDecodeMs,maxLongTaskMs,peakSampledJsHeap,endJsHeap,nativeYield,parseLongTasks})=>({label,wallMs,parseGapMs,removedBatches,removedTotal,firstMenuDecodeMs,maxLongTaskMs,peakSampledJsHeap,endJsHeap,nativeYield,parseLongTasks}))})),null,2));
