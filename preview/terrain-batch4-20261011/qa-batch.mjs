import fs from 'node:fs/promises';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
const phase=process.argv[2]??'matrices',root='reports/local/terrain-batch4-20261011',base='preview/terrain-batch4-20261011',jobs=[];
const add=(name,script,args)=>jobs.push({name,args:[base+'/'+script,...args]});
for(const [side,build]of [['before','baseline-r5'],['after','candidate-r10']]){
 if(phase==='matrices'){
  add(side+'-final-stage','qa-environment.mjs',[build,side+'-final-stage','matrix']);
  add(side+'-final-maps','qa-matrix.mjs',['--build',build,'--label',side+'-final-maps','--suite','maps','--settle-ticks','300','--reuse-context']);
  add(side+'-final-edge','qa-matrix.mjs',['--build',build,'--label',side+'-final-edge','--suite','edge','--groups','thor,ultralisk,carrier','--reuse-context']);
 }
 if(phase==='motion'){
  add(side+'-final-sequence','qa-sequence.mjs',[build,side+'-final-sequence']);
  add(side+'-final-dense','qa-environment.mjs',[build,side+'-final-dense','dense']);
 }
 if(phase==='cost')add(side+'-final-cost','qa.mjs',['--build',build,'--label',side+'-final-cost','--suite','cost']);
}
if(phase==='industrial'){
 add('before-final-industrial','qa-industrial.mjs',['baseline-r5','before-final-industrial']);
 add('after-final-industrial','qa-industrial.mjs',['candidate-r10','after-final-industrial']);
}
if(phase==='recording')add('after-final-realtime','qa-lighting.mjs',['candidate-r10','after-final-realtime','realtime']);
if(phase==='formal'){
 for(const [name,flags]of [['formal-web-r1',[]],['formal-offline-r1',['--offline']],['formal-missing-r1',['--missing']]])jobs.push({name,args:['--import','tsx','tools/qa-terrain-formal.mts',root+'/'+name,...flags]});
 jobs.push({name:'controls-r1',args:['--import','tsx','tools/qa-terrain-controls.mts',root+'/controls-r1']});
}
assert.ok(jobs.length,'Unknown phase');const file=root+'/batch-'+phase+'.json';
await fs.access(file).then(()=>{throw Error('Batch evidence exists');},e=>{if(e.code!=='ENOENT')throw e;});
const report={phase,startedAt:new Date().toISOString(),method:'One browser test process at a time; stop on the first failure. Every job keeps its immutable build and runner.',jobs:[]};
for(const job of jobs){
 const row={...job,startedAt:new Date().toISOString()};report.jobs.push(row);await fs.writeFile(file,JSON.stringify(report,null,2));console.log('START '+job.name);
 const log=await fs.open(root+'/'+job.name+'.log','wx');
 try{row.exitCode=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,job.args,{windowsHide:true,stdio:['ignore',log.fd,log.fd]});child.once('error',reject);child.once('exit',resolve);});}finally{await log.close();}
 row.finishedAt=new Date().toISOString();await fs.writeFile(file,JSON.stringify(report,null,2));console.log('END '+job.name+' '+row.exitCode);
 if(row.exitCode!==0){process.exitCode=1;break;}
}
report.passed=report.jobs.length===jobs.length&&report.jobs.every(j=>j.exitCode===0);report.finishedAt=new Date().toISOString();await fs.writeFile(file,JSON.stringify(report,null,2));
