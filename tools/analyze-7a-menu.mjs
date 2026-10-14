import fs from 'node:fs/promises';
const label=process.argv[2],root='reports/local/7a-20261013/';if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid run');
const result=JSON.parse(await fs.readFile(root+label+'/result.json','utf8')),run=result.runs[0],raw=JSON.parse(await fs.readFile(root+label+'/'+run.raw,'utf8'));
const from=run.menuMs+(run.origin??0),to=run.startAt,tasks=raw.longTasks.filter(t=>t.at>=from&&t.at<to),names=['gl.getProgramInfoLog','gl.getShaderInfoLog','renderer.initTexture','animation.prepare'],summary={};
for(const name of names){const rows=(raw.spans??[]).filter(s=>s.kind==='sync'&&s.name===name&&s.start>=from&&s.start<to);summary[name]={calls:rows.length,ms:rows.reduce((n,r)=>n+r.end-r.start,0),maxMs:Math.max(0,...rows.map(r=>r.end-r.start))};}
const report={run:label,menuWindow:{from,to,ms:to-from},longTasks:tasks,leafSpans:summary,interactionRoundTrips:run.menuProbe,method:'Page-performance clock: actionable menu through start request. Sync API spans locate blocking work but are not physical GPU execution times. Automation click round trips include selector, protocol and event handling.'};
await fs.writeFile(root+label+'/menu-attribution.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,longTasks:{count:tasks.length,totalMs:tasks.reduce((n,t)=>n+t.ms,0),maxMs:Math.max(0,...tasks.map(t=>t.ms))},interactionRoundTrips:undefined}));
