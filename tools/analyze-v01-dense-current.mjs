import fs from 'node:fs/promises';
import {SourceMapConsumer} from 'source-map-js';
const run=process.argv[2],base='reports/local/v01-20261024',root=base+'/'+run;
const report=JSON.parse(await fs.readFile(root+'/report.json')),{profile}=JSON.parse(await fs.readFile(root+'/cpu-dense.json'));
const mapFile=report.build.artifacts.find(a=>a.file.endsWith('.js.map')).file;
const map=new SourceMapConsumer(JSON.parse(await fs.readFile(report.build.out+'/'+mapFile)));
const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map(),self=new Map(),inclusive=new Map();
for(const n of nodes.values())for(const child of n.children??[])parents.set(child,n.id);
let sampledMs=0;for(let i=0;i<(profile.samples??[]).length;i++){const id=profile.samples[i],ms=(profile.timeDeltas?.[i]??0)/1000;sampledMs+=ms;self.set(id,(self.get(id)??0)+ms);for(let p=id;p!==undefined;p=parents.get(p))inclusive.set(p,(inclusive.get(p)??0)+ms);}
const source=n=>n.callFrame.url?.endsWith('.js')?map.originalPositionFor({line:n.callFrame.lineNumber+1,column:n.callFrame.columnNumber}):null;
const row=id=>{const n=nodes.get(id),chain=[];for(let p=parents.get(id);p!==undefined&&chain.length<7;p=parents.get(p)){const pnode=nodes.get(p);chain.push({fn:pnode.callFrame.functionName||'(anonymous)',source:source(pnode)});}return {id,fn:n.callFrame.functionName||'(anonymous)',generated:n.callFrame,source:source(n),selfMs:self.get(id)??0,inclusiveMs:inclusive.get(id)??0,callers:chain};};
const rows=[...nodes.keys()].map(row),files={};for(const r of rows){const key=r.source?.source??r.fn;files[key]=(files[key]??0)+r.selfMs;}
const result={run,sampledMs,profileElapsedMs:(profile.endTime-profile.startTime)/1000,method:'Separate sampled main-thread wall-time positions, not CPU cycles or measured GPU timings. Original source locations from matching hidden source map. No profiling during three baseline metrics.',baseline:report.groups.flatMap(g=>g.runs.map(r=>({wallMs:r.wallMs,frames:r.frames.length,interval:r.summary.interval.mean,fps:1000/r.summary.interval.mean,cpu:r.summary.cpu.mean,render:r.summary.renderCpu.mean,backlog:Math.max(...r.frames.map(f=>f.backlog)),allies:[Math.min(...r.frames.map(f=>f.allies)),Math.max(...r.frames.map(f=>f.allies))],enemies:[Math.min(...r.frames.map(f=>f.enemies)),Math.max(...r.frames.map(f=>f.enemies))]}))),files:Object.entries(files).sort((a,b)=>b[1]-a[1]),self:rows.slice().sort((a,b)=>b.selfMs-a.selfMs),inclusive:rows.slice().sort((a,b)=>b.inclusiveMs-a.inclusiveMs)};
await fs.writeFile(root+'/cpu-analysis-mapped.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,self:result.self.slice(0,25),inclusive:result.inclusive.slice(0,15),files:result.files.slice(0,20)},null,2));
