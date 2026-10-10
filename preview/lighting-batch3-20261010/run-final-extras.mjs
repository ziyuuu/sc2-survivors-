import fs from 'node:fs/promises';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
const root='reports/local/lighting-batch3-20261010';
// Run only after the original queued review finishes normally. No active job is interrupted.
assert.equal(JSON.parse(await fs.readFile(root+'/gallery-review.json','utf8')).passed,true);
const steps=[
 ['stage-final',['preview/lighting-batch3-20261010/qa-matrix.mjs','--build','candidate-r4','--suite','maps','--groups','marine,immortal,zealot','--settle-ticks','300','--label','stage-final-maps-r1']],
 ['before-edge',['preview/lighting-batch3-20261010/qa-matrix.mjs','--build','baseline-r4','--suite','edge','--groups','carrier,colossus,tank','--settle-ticks','300','--label','before-r5-edge']],
 ['after-edge',['preview/lighting-batch3-20261010/qa-matrix.mjs','--build','candidate-r4','--suite','edge','--groups','carrier,colossus,tank','--settle-ticks','300','--label','after-r6-edge']],
 ['verify-edge',['tools/verify-lighting-batch3.mjs','edge']],
 ['build-final-stage',['preview/lighting-batch3-20261010/build-stage-gallery.mjs','--include-final']],
 ['verify-final-stage',['preview/lighting-batch3-20261010/qa-final-stage.mjs']]
];
await fs.copyFile(root+'/stage-gallery.html',root+'/stage-gallery-before-final.html');
await fs.copyFile(root+'/stage-comparison.json',root+'/stage-comparison-before-final.json');
for(const [label,args]of steps){const log=await fs.open(root+'/'+label+'-extra.log','wx'),child=spawn(process.execPath,args,{stdio:['ignore',log.fd,log.fd]});const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});await log.close();console.log(JSON.stringify({label,code,at:new Date().toISOString()}));if(code!==0){process.exitCode=code??1;break;}}
