import fs from 'node:fs/promises';import {spawn} from 'node:child_process';
const root='reports/local/lighting-batch3-20261010';
while(true){try{const r=JSON.parse(await fs.readFile(root+'/before-r5-settled/results.json','utf8'));if(r.failure)throw Error(r.failure);if(r.passed===true)break;}catch(e){if(e.code!=='ENOENT'&&!(e instanceof SyntaxError))throw e;}await new Promise(r=>setTimeout(r,5000));}
for(const args of [
 ['preview/lighting-batch3-20261010/run-matrix.mjs','candidate-r4','after-r6','--reuse-context','lighting','maps','portraits','actions','mobile','forms','actors','enemies','invariants','fleet','core','color','heroes'],
 ['preview/lighting-batch3-20261010/run-followup.mjs','after-r6-heroes','candidate-r4','after-r6','sequence','settled']
]){const child=spawn(process.execPath,args,{env:{...process.env,DEBUG:'pw:browser'},stdio:'inherit'});const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});if(code!==0){process.exitCode=code??1;break;}}
