import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
const arg=(key,otherwise)=>process.argv.find(s=>s.startsWith('--'+key+'='))?.slice(key.length+3)??otherwise;
const name=arg('name'),source=arg('matrix'),base='reports/local/7a-20261013/';
if(!/^[a-z0-9-]+$/.test(name)||!source?.startsWith(base)||source.includes('..'))throw Error('Explicit isolated series name and matrix required');
const matrix=JSON.parse(await fs.readFile(source,'utf8')),out=base+name;
await fs.mkdir(out);await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');await fs.copyFile(source,out+'/matrix.json');
await fs.copyFile('tools/qa-7a-loading.mjs',out+'/qa-7a-loading.mjs');await fs.copyFile('tools/7a-native-battle.mjs',out+'/7a-native-battle.mjs');
// The copied runner still imports its server helper at its original relative path.
// Freeze both helpers beside it, so later tool edits cannot change an active series.
await fs.copyFile('tools/coze-web-server.mjs',out+'/coze-web-server.mjs');
const result={at:new Date().toISOString(),matrix,runs:[],passed:false};
for(let i=0;i<matrix.length;i++){
 const spec=matrix[i],run=base+name+'-'+(i+1)+'-'+spec.name;
 if(!/^[a-z0-9-]+$/.test(spec.name)||!spec.web?.startsWith(base))throw Error('Unsafe case');
 // Use the live tool only for resolving its established server dependencies; its
 // complete bytes are bound to this series before and after every child run.
 const frozen=await fs.readFile(out+'/qa-7a-loading.mjs');if(!frozen.equals(await fs.readFile('tools/qa-7a-loading.mjs')))throw Error('Runner changed during series');
 const args=['tools/qa-7a-loading.mjs','--web='+spec.web,'--out='+run,'--seconds='+String(spec.seconds??10),...(spec.args??[])];
 console.log(JSON.stringify({series:name,index:i+1,condition:spec.name,event:'start'}));
 const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{stdio:'inherit',windowsHide:true});p.on('error',reject);p.on('exit',resolve);});
 result.runs.push({name:spec.name,run,code,result:JSON.parse(await fs.readFile(run+'/result.json','utf8'))});await fs.writeFile(out+'/result.json',JSON.stringify(result,null,2));
 if(!frozen.equals(await fs.readFile('tools/qa-7a-loading.mjs')))throw Error('Runner changed during series');
 if(code!==0)throw Error('Series failed: '+run);
}
result.passed=true;result.finishedAt=new Date().toISOString();await fs.writeFile(out+'/result.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({series:name,passed:true,runs:result.runs.map(r=>({name:r.name,total:r.result.runs[0].totalMs,entry:r.result.runs[0].entryMs,menu:r.result.runs[0].menuMs,heap:r.result.runs[0].peakJSHeap,p95:r.result.runs[0].first10.p95}))}));
