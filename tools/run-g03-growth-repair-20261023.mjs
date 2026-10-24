import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import {createHash} from 'node:crypto';
const root='reports/local/g03-growth-consumption-20261023',plan=JSON.parse(fs.readFileSync(root+'/repair-plan.json','utf8')),limit=Number(process.argv[2]??4),active=new Map(),finished=[],queue=plan.cases.map((c,index)=>({c,index}));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const tools=['tools/measure-g03-growth-repair-20261023.mts','tools/lib/g03-growth-runtime.mts','tools/lib/g03-growth-cases.mts','tools/lib/g03-consumption-controller-r2.mts','tools/lib/g03-economy-runtime-tier-objectives-r2.mts','tools/qa-campaign-controller.ts','tools/probe-g03-consumption-repair-20261023.mts'];
for(const p of tools){const dest=root+'/repair-runtime-tools/'+p;fs.mkdirSync(path.dirname(dest),{recursive:true});if(fs.existsSync(dest)&&sha(dest)!==sha(p))throw Error('Measurement tools changed: '+p);if(!fs.existsSync(dest))fs.copyFileSync(p,dest);}
fs.mkdirSync(root+'/repaired-logs',{recursive:true});
const status=()=>fs.writeFileSync(root+'/repair-batch-status.json',JSON.stringify({started,updated:new Date().toISOString(),limit,pending:queue.length,active:[...active.values()],finished},null,2));
const started=new Date().toISOString();
function pump(){
 while(active.size<limit&&queue.length){
  const {c,index}=queue.shift(),id=[c.version,c.policy,c.race,c.difficulty,c.tier,c.seed].join('-'),file=root+'/repaired-routes/'+id+'.json';
  if(fs.existsSync(file)){const d=JSON.parse(fs.readFileSync(file,'utf8'));finished.push({id,index,existing:true,stop:d.stop,stage:d.stage});continue;}
  if(fs.existsSync(file+'.lock'))throw Error('Unresolved route lock: '+id);
  const log=root+'/repaired-logs/'+id+'.log',fd=fs.openSync(log,'wx'),child=spawn(process.execPath,['--import','tsx','tools/measure-g03-growth-repair-20261023.mts',String(index)],{stdio:['ignore',fd,fd],windowsHide:true});
  const row={id,index,pid:child.pid,started:new Date().toISOString(),log};active.set(id,row);status();console.log(JSON.stringify({started:id,index,pid:child.pid}));
  child.once('exit',(code,signal)=>{fs.closeSync(fd);active.delete(id);const d=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;finished.push({...row,code,signal,stop:d?.stop??'process-error',stage:d?.stage,seconds:d?.wallSeconds});if(code!==0)process.exitCode=1;status();console.log(JSON.stringify({completed:id,code,stop:d?.stop??'process-error',stage:d?.stage,finished:finished.length}));pump();});
 }
 status();if(!active.size&&!queue.length)console.log(JSON.stringify({complete:true,total:finished.length,failures:finished.filter(x=>x.code&&x.code!==0)}));
}
pump();
