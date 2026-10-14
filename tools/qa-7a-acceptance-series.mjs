import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [label,matrixFile]=process.argv.slice(2),root='reports/local/7a-20261013',out=root+'/'+label;
assert.match(label,/^[a-z0-9-]+$/);assert.ok(matrixFile.startsWith(root+'/')&&!matrixFile.includes('..'));
const matrix=JSON.parse(await fs.readFile(matrixFile,'utf8'));await fs.mkdir(out);await fs.copyFile(matrixFile,out+'/matrix.json');await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const frozen=new Map();for(const file of ['tools/qa-7a-loading.mjs','tools/7a-native-battle.mjs']){const bytes=await fs.readFile(file);frozen.set(file,bytes);await fs.writeFile(out+'/'+file.split('/').at(-1),bytes);}
const report={at:new Date().toISOString(),matrix,runs:[],passed:false,runnerHashes:Object.fromEntries([...frozen].map(([file,bytes])=>[file,createHash('sha256').update(bytes).digest('hex')])),method:'Sequential actual formal Web/offline UI measurements. Each child owns a fresh browser. Profiling and other heavy QA must not overlap this series.'};
try{
 for(let i=0;i<matrix.length;i++){
  const row=matrix[i];assert.match(row.name,/^[a-z0-9-]+$/);assert.ok(Array.isArray(row.args)&&row.args.every(a=>typeof a==='string'&&!a.startsWith('--out=')));
  for(const [file,bytes]of frozen)assert.ok(bytes.equals(await fs.readFile(file)),'Runner changed: '+file);
  const run=root+'/'+label+'-'+String(i+1).padStart(2,'0')+'-'+row.name;
  console.log(JSON.stringify({label,index:i+1,total:matrix.length,name:row.name,event:'start'}));
  const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['tools/qa-7a-loading.mjs','--out='+run,...row.args],{stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',resolve);});
  const result=JSON.parse(await fs.readFile(run+'/result.json','utf8'));report.runs.push({name:row.name,run,code,result});await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));
  for(const [file,bytes]of frozen)assert.ok(bytes.equals(await fs.readFile(file)),'Runner changed: '+file);
  assert.equal(code,0,'Child failed: '+run);assert.equal(result.passed,true,'Child failed: '+run);
 }
 report.passed=true;
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify({label,passed:report.passed,runs:report.runs.length,failure:report.failure}));}
