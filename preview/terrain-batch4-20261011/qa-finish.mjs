// Continue the approved checks sequentially after the active matrix has exited.
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const root='reports/local/terrain-batch4-20261011',file=root+'/remaining-checks.json';
await fs.access(file).then(()=>{throw Error('Evidence already exists');},e=>{if(e.code!=='ENOENT')throw e;});
const report={startedAt:new Date().toISOString(),method:'Wait for the immutable matrix completion report, then run one browser process at a time; stop on first failure.',phases:[]};
await fs.writeFile(file,JSON.stringify(report,null,2));
const deadline=Date.now()+7200000;
while(true){
 const matrix=JSON.parse(await fs.readFile(root+'/batch-matrices.json','utf8'));
 if(matrix.finishedAt){assert.equal(matrix.passed,true,'Matrix must pass before remaining checks');break;}
 assert.ok(Date.now()<deadline,'Matrix completion timeout');await new Promise(resolve=>setTimeout(resolve,5000));
}
for(const phase of ['motion','industrial','formal','recording','cost']){
 const row={phase,startedAt:new Date().toISOString()};report.phases.push(row);await fs.writeFile(file,JSON.stringify(report,null,2));console.log('START PHASE '+phase);
 row.exitCode=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['preview/terrain-batch4-20261011/qa-batch.mjs',phase],{windowsHide:true,stdio:'inherit'});child.once('error',reject);child.once('exit',resolve);});
 row.finishedAt=new Date().toISOString();await fs.writeFile(file,JSON.stringify(report,null,2));console.log('END PHASE '+phase+' '+row.exitCode);
 if(row.exitCode!==0){process.exitCode=1;break;}
}
report.passed=report.phases.length===5&&report.phases.every(row=>row.exitCode===0);report.finishedAt=new Date().toISOString();await fs.writeFile(file,JSON.stringify(report,null,2));
