import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
const arg=(key,otherwise)=>process.argv.find(s=>s.startsWith('--'+key+'='))?.slice(key.length+3)??otherwise;
const name=arg('name'),web=arg('web'),conditions=arg('conditions','full,link,link,full,full,link').split(','),base='reports/local/7a-20261013/';
if(!/^[a-z0-9-]+$/.test(name)||!web?.startsWith(base))throw Error('Explicit isolated series name and web build required');
const out=base+name;await fs.mkdir(out);await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const result={at:new Date().toISOString(),web,conditions,runs:[],passed:false};
for(let i=0;i<conditions.length;i++){
 const condition=conditions[i],run=base+name+'-'+(i+1)+'-'+condition;
 const args=['tools/qa-7a-loading.mjs','--web='+web,'--shader='+condition,'--out='+run,'--seconds=10'];
 console.log(JSON.stringify({series:name,index:i+1,condition,event:'start'}));
 const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{stdio:'inherit',windowsHide:true});p.on('error',reject);p.on('exit',resolve);});
 result.runs.push({condition,run,code,result:JSON.parse(await fs.readFile(run+'/result.json','utf8'))});await fs.writeFile(out+'/result.json',JSON.stringify(result,null,2));
 if(code!==0)throw Error('Series run failed: '+run);
}
result.passed=true;result.finishedAt=new Date().toISOString();await fs.writeFile(out+'/result.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({series:name,passed:true,runs:result.runs.map(r=>({condition:r.condition,total:r.result.runs[0].totalMs,entry:r.result.runs[0].entryMs,menu:r.result.runs[0].menuMs,heap:r.result.runs[0].peakJSHeap,p95:r.result.runs[0].first10.p95}))}));
