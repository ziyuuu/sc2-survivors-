import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/performance-s09-20261020',read=async p=>JSON.parse(await fs.readFile(p)),a=await read(root+'/baseline-1/report.json'),b=await read(root+'/candidate-1/report.json'),report={pass:false,initial:[],scenarios:[],runs:[a,b].map(r=>({mode:r.mode,pass:r.pass,errors:r.errors,requests:r.requests,build:r.build.outputs,device:r.device}))};
assert.ok(a.pass&&b.pass);assert.equal(a.checkpoints.length,12);assert.equal(b.checkpoints.length,12);
for(const x of a.checkpoints.filter(c=>c.name.endsWith('-initial'))){const y=b.checkpoints.find(c=>c.name===x.name),before=await read(root+'/baseline-1/'+x.stateFile),after=await read(root+'/candidate-1/'+y.stateFile);assert.deepEqual(after,before);report.initial.push({name:x.name,exact:true,sha256:createHash('sha256').update(JSON.stringify(before)).digest('hex')});}
for(const x of a.scenarios){const y=b.scenarios.find(s=>s.name===x.name);assert.equal(x.end.source.shots,0);assert.ok(y.end.source.shots>0);
 if(x.name!=='temporary'){assert.ok(y.end.source.hp>0);for(let i=1;i<y.end.shots.length;i++)assert.ok(y.end.shots[i].time-y.end.shots[i-1].time>=5-1e-8);}
 else {assert.equal(y.end.source.shots,1);assert.ok(y.end.source.hp<=0);}
 assert.equal(x.end.source.range,y.end.source.range);assert.equal(y.end.source.range,.25);
 report.scenarios.push({name:x.name,before:x.end,after:y.end,approach:y.approach});
}
report.pass=true;await fs.writeFile(root+'/summary.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:true,initial:report.initial.length,shots:report.scenarios.map(s=>({name:s.name,before:s.before.source.shots,after:s.after.source.shots}))}));
