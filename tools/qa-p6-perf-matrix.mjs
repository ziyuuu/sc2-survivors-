import {spawn} from 'node:child_process';import fs from 'node:fs/promises';
const root='reports/local/p6-20261006';
const cases=[
 ['terran','siege','natural-normal','89241','16',1,'terran-late'],
 ['zerg','entrench','natural-zerg-coverage','5','16',1,'zerg-late'],
 ['protoss','fleet','natural-normal','7','10',1,'protoss-mid'],
 ['protoss','shield','natural-80-retry','89241','16',3,'protoss-80-late'],
 ['terran','siege','natural-normal','89241','endless',1,'terran-endless'],
 ['zerg','entrench','natural-zerg-coverage','5','endless',1,'zerg-endless'],
 ['protoss','fleet','natural-normal-retry','7','endless',1,'protoss-endless'],
 ['terran','bio','natural-41-start','89241','1',1,'terran-41-first'],
];
const report={at:new Date().toISOString(),method:'Sequential browser samples on the same machine; no concurrent QA simulation/browser jobs. Representative coverage, not full A34/A35 matrix. Three repeats for the largest legal80-point roster.',results:[]};
for(const [race,build,dir,seed,stage,repeat,name]of cases){
 const output=`${root}/perf-${name}`,args=['tools/qa-p6-performance.mjs','--races',race,'--build',build,'--seed',seed,'--checkpoint',`${root}/${dir}/checkpoints/${build}-${seed}-stage-${stage}.json`,'--seconds','180','--repeat',String(repeat),'--gpu','--output',output];
 console.log(JSON.stringify({begin:name}));const code=await new Promise(resolve=>{const p=spawn(process.execPath,args,{stdio:'inherit',windowsHide:true,env:{...process.env,SC2_QA_URL:'http://127.0.0.1:12192'}});p.on('error',e=>{console.error(e);resolve(-1);});p.on('exit',resolve);});
 const result=await fs.readFile(output+'/results.json','utf8').then(JSON.parse).catch(()=>null);report.results.push({name,code,output,runs:result?.runs?.length,failure:result?.failure??null});await fs.writeFile(root+'/performance-matrix.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.results.at(-1)));
}
if(report.results.some(r=>r.code!==0))process.exitCode=1;
