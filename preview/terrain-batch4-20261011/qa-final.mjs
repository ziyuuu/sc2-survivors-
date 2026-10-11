// Final asset-only correction: retain unaffected evidence; run changed Char views and final release checks.
import fs from 'node:fs/promises';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
const root='reports/local/terrain-batch4-20261011',base='preview/terrain-batch4-20261011',file=root+'/final-checks-r2.json';
await fs.access(file).then(()=>{throw Error('Evidence exists');},e=>{if(e.code!=='ENOENT')throw e;});
const jobs=[
 ['after-fixed-char-stage',[base+'/qa-environment.mjs','candidate-r11','after-fixed-char-stage','matrix','char']],
 ['after-fixed-char-maps',[base+'/qa-matrix.mjs','--build','candidate-r11','--label','after-fixed-char-maps','--suite','maps','--settle-ticks','300','--reuse-context','--themes','char']],
 ['after-fixed-char-dense',[base+'/qa-environment.mjs','candidate-r11','after-fixed-char-dense','dense','char']],
 ['environment-lifecycle-r4',[base+'/qa-environment.mjs','candidate-r11','environment-lifecycle-r4','lifecycle']],
 ['formal-web-r2',['--import','tsx','tools/qa-terrain-formal.mts',root+'/formal-web-r2']],
 ['formal-offline-r2',['--import','tsx','tools/qa-terrain-formal.mts',root+'/formal-offline-r2','--offline']],
 ['formal-missing-r2',['--import','tsx','tools/qa-terrain-formal.mts',root+'/formal-missing-r2','--missing']],
 ['controls-r2',['--import','tsx','tools/qa-terrain-controls.mts',root+'/controls-r2']],
 ['after-final-realtime',[base+'/qa-lighting.mjs','candidate-r11','after-final-realtime','realtime']],
 ['before-final-cost',[base+'/qa.mjs','--build','baseline-r5','--label','before-final-cost','--suite','cost']],
 ['after-final-cost',[base+'/qa.mjs','--build','candidate-r11','--label','after-final-cost','--suite','cost']],
];
const report={startedAt:new Date().toISOString(),method:'One browser process at a time; exact final assets, no evidence overwrite. Unaffected earlier captures require the separate asset-only delta proof.',jobs:[]};
for(const [name,args]of jobs){const row={name,args,startedAt:new Date().toISOString()};report.jobs.push(row);await fs.writeFile(file,JSON.stringify(report,null,2));console.log('START '+name);const log=await fs.open(root+'/'+name+'.log','wx');try{row.exitCode=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{windowsHide:true,stdio:['ignore',log.fd,log.fd]});child.once('error',reject);child.once('exit',resolve);});}finally{await log.close();}row.finishedAt=new Date().toISOString();await fs.writeFile(file,JSON.stringify(report,null,2));console.log('END '+name+' '+row.exitCode);if(row.exitCode!==0){process.exitCode=1;break;}}
report.finishedAt=new Date().toISOString();report.passed=report.jobs.length===jobs.length&&report.jobs.every(r=>r.exitCode===0);await fs.writeFile(file,JSON.stringify(report,null,2));
