import fs from 'node:fs/promises';
const root='reports/local/7a-20261013/',names=['shader-series-r1','shader-series-r2'],triples=[],rows=[];
for(const name of names){
 const series=JSON.parse(await fs.readFile(root+name+'/result.json','utf8'));
 if(!series.passed)throw Error('Incomplete series '+name);
 for(let i=0;i<series.runs.length;i+=3){const group=series.runs.slice(i,i+3).map(r=>({...r.result.runs[0],condition:r.condition,path:r.run}));triples.push(group);rows.push(...group);}
}
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const summary=values=>({n:values.length,min:Math.min(...values),median:median(values),max:Math.max(...values),values});
const report={at:new Date().toISOString(),method:'Five adjacent alternating triples, same immutable diagnostic build. Headless native first-ten-second run; no World changes. Not a final release timing or FPS acceptance.',groups:{},candidates:{}};
for(const condition of ['full','link','parallel-depth']){
 const samples=rows.filter(r=>r.condition===condition);
 report.groups[condition]=Object.fromEntries(['menuMs','entryMs','totalMs','peakJSHeap','peakBackingStorage'].map(k=>[k,summary(samples.map(r=>r[k]))]));
 report.groups[condition].first10={p95:summary(samples.map(r=>r.first10.p95)),mean:summary(samples.map(r=>r.first10.mean)),longFrames: samples.map(r=>({path:r.path,frames:r.first10}))};
}
for(const candidate of ['link','parallel-depth']){
 const pairs=triples.map(group=>{const a=group.find(r=>r.condition==='full'),b=group.find(r=>r.condition===candidate);return {a:a.path,b:b.path,entrySavedMs:a.entryMs-b.entryMs,totalSavedMs:a.totalMs-b.totalMs,totalSavedPercent:100*(a.totalMs-b.totalMs)/a.totalMs,first10P95IncreaseMs:b.first10.p95-a.first10.p95,first10MeanIncreaseMs:b.first10.mean-a.first10.mean,heapDifference:b.peakJSHeap-a.peakJSHeap};});
 report.candidates[candidate]={pairs,medianTotalSavedMs:median(pairs.map(p=>p.totalSavedMs)),medianTotalSavedPercent:median(pairs.map(p=>p.totalSavedPercent)),decision:'Not adopted: repeated first-ten-second frame-time regression; retain raw results, even though loading improves.'};
}
await fs.writeFile(root+'shader-comparison.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
