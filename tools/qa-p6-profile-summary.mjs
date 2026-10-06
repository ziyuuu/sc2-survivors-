import fs from 'node:fs/promises';
const directory=process.argv[2]??'reports/local/p6-20261006/perf-terran-profile';
const cpu=JSON.parse(await fs.readFile(directory+'/terran-1-cpu.json','utf8')),nodes=new Map(cpu.nodes.map(n=>[n.id,n])),self=new Map(),parents=new Map(),inclusive=new Map();
for(const n of cpu.nodes)for(const child of n.children??[])parents.set(child,n.id);
for(let i=0;i<cpu.samples.length;i++){let id=cpu.samples[i],micros=cpu.timeDeltas[i];self.set(id,(self.get(id)??0)+micros);while(id!==undefined){inclusive.set(id,(inclusive.get(id)??0)+micros);id=parents.get(id);}}
const top=map=>[...map].sort((a,b)=>b[1]-a[1]).slice(0,45).map(([id,us])=>({name:nodes.get(id).callFrame.functionName,url:nodes.get(id).callFrame.url.split('?')[0],line:nodes.get(id).callFrame.lineNumber+1,ms:Math.round(us/100)/10}));
const report={self:top(self),inclusive:top(inclusive)};await fs.writeFile(directory+'/profile-summary.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
