import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='reports/local/7a-20261013/',first=JSON.parse(await fs.readFile(root+'schedule-series-r1/result.json','utf8')),second=JSON.parse(await fs.readFile(root+'schedule-series-r2/result.json','utf8'));
assert.equal(first.passed,true);assert.equal(second.passed,true);
const unpack=record=>({name:record.name,path:record.run,...record.result.runs[0]}),groups=[];
for(let i=0;i<first.runs.length;i+=3)groups.push(first.runs.slice(i,i+3).map(unpack));
for(let i=0;i<second.runs.length;i+=2)groups.push(second.runs.slice(i,i+2).map(unpack));
const median=v=>[...v].sort((a,b)=>a-b)[Math.floor(v.length/2)],summary=v=>({n:v.length,min:Math.min(...v),median:median(v),max:Math.max(...v),values:v});
const report={at:new Date().toISOString(),method:'Three alternating triples, followed by two reversed pairs for the mixed early-menu candidate. All include the same eighteen menu clicks. CPU-only GPU deferral has three pairs. No timing instrumentation or profiling in these runs.',groups:{},candidates:{}};
for(const name of ['control','early','cpu']){
 const rows=groups.flat().filter(r=>r.name===name);report.groups[name]=Object.fromEntries(['menuMs','entryMs','totalMs','peakJSHeap','peakBackingStorage'].map(key=>[key,summary(rows.map(r=>r[key]))]));
 report.groups[name].first10={p95:summary(rows.map(r=>r.first10.p95)),mean:summary(rows.map(r=>r.first10.mean))};
 report.groups[name].menuProbe={median:rows.map(r=>median(r.menuProbe.map(p=>p.automationMs))),max:rows.map(r=>Math.max(...r.menuProbe.map(p=>p.automationMs)))};
}
for(const candidate of ['early','cpu']){
 const pairs=groups.filter(g=>g.some(r=>r.name===candidate)).map(g=>{const a=g.find(r=>r.name==='control'),b=g.find(r=>r.name===candidate);return {a:a.path,b:b.path,totalSavedMs:a.totalMs-b.totalMs,totalSavedPercent:100*(a.totalMs-b.totalMs)/a.totalMs,entrySavedMs:a.entryMs-b.entryMs,heapDifference:b.peakJSHeap-a.peakJSHeap,first10P95Difference:b.first10.p95-a.first10.p95,first10MeanDifference:b.first10.mean-a.first10.mean};});
 report.candidates[candidate]={pairs,medianSavedMs:median(pairs.map(p=>p.totalSavedMs)),medianSavedPercent:median(pairs.map(p=>p.totalSavedPercent))};
}
await fs.writeFile(root+'scheduling-comparison.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
