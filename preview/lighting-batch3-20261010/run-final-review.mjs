import fs from 'node:fs/promises';import {spawn} from 'node:child_process';
const root='reports/local/lighting-batch3-20261010';
const waiting=['before-r5-settled/results.json','after-r6-settled/results.json','before-r5-lighting/results.json','before-r5-sequence/results.json','after-r6-sequence/results.json','controls-r4/result.json'];
while(true){let ready=true;for(const file of waiting){try{const r=JSON.parse(await fs.readFile(root+'/'+file,'utf8'));if(r.failure)throw Error(file+': '+r.failure);if(r.passed!==true)ready=false;}catch(e){if(e.code!=='ENOENT'&&!(e instanceof SyntaxError))throw e;ready=false;}}if(ready)break;await new Promise(r=>setTimeout(r,5000));}
// All preceding browser suites close their contexts on completion. Leave a short
// gap before sequential visible cost/recording work, with no concurrent QA browser.
await new Promise(r=>setTimeout(r,5000));
const steps=[
 ['before-r5-cost',['preview/lighting-batch3-20261010/qa.mjs','--build','baseline-r4','--suite','cost','--label','before-r5-cost']],
 ['after-r6-cost',['preview/lighting-batch3-20261010/qa.mjs','--build','candidate-r4','--suite','cost','--label','after-r6-cost']],
 ['after-r6-realtime',['preview/lighting-batch3-20261010/qa-lighting.mjs','candidate-r4','after-r6-realtime','realtime']],
 ['paired-states',['tools/verify-lighting-batch3.mjs','pairs']],
 ['build-gallery',['--import','tsx','preview/lighting-batch3-20261010/build-gallery.mjs']],
 ['build-sequence-gallery',['preview/lighting-batch3-20261010/build-sequence-gallery.mjs']],
 ['build-stage-gallery',['preview/lighting-batch3-20261010/build-stage-gallery.mjs']],
 ['build-realtime-gallery',['preview/lighting-batch3-20261010/build-realtime-gallery.mjs']],
 ['gallery-review',['preview/lighting-batch3-20261010/qa-gallery.mjs']],
 ['final-extras',['preview/lighting-batch3-20261010/run-final-extras.mjs']]
];
for(const [label,args]of steps){const log=await fs.open(root+'/'+label+'-processing.log','wx'),child=spawn(process.execPath,args,{stdio:['ignore',log.fd,log.fd]});const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});await log.close();console.log(JSON.stringify({label,code,at:new Date().toISOString()}));if(code!==0){process.exitCode=code??1;break;}}
