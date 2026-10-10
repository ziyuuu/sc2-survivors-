import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
const root='reports/local/lighting-batch3-20261010';
// Preserve all existing jobs. Recheck the failed long mobile suite only after
// the baseline and formal-browser queues finish, with a single QA GPU browser.
const waiting=['before-r5-settled/results.json','controls-r1/result.json'];
while(true){let ready=true;for(const file of waiting){try{const r=JSON.parse(await fs.readFile(root+'/'+file,'utf8'));if(r.failure)throw Error(file+': '+r.failure);if(r.passed!==true)ready=false;}catch(e){if(e.code!=='ENOENT'&&!(e instanceof SyntaxError))throw e;ready=false;}}if(ready)break;await new Promise(r=>setTimeout(r,5000));}
const steps=[
 ['mobile-r5',['preview/lighting-batch3-20261010/run-matrix.mjs','candidate-r3','after-r5','--reuse-context','mobile']],
 ['remaining-r4',['preview/lighting-batch3-20261010/run-matrix.mjs','candidate-r3','after-r4','--reuse-context','forms','actors','enemies','invariants','fleet','core','color','heroes']]
];
for(const [label,args]of steps){const log=await fs.open(root+'/recovery-'+label+'.log','wx');const child=spawn(process.execPath,args,{env:{...process.env,DEBUG:'pw:browser'},stdio:['ignore',log.fd,log.fd]});const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});await log.close();console.log(JSON.stringify({label,code,at:new Date().toISOString()}));if(code!==0){process.exitCode=code??1;break;}}
