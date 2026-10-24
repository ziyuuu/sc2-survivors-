import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const base='reports/local/v01-20261024';
const web=JSON.parse(await fs.readFile(base+'/final-web-dense-shaders-new-r1/report.json'));assert.ok(web.pass&&web.profileClosed);
const plan=[
 {run:'final-offline-dense-r1',args:['--import','tsx','tools/qa-v01-dense-native-retry.mjs','offline','dense-r1']},
 {run:'dense-native-final-r1',args:[base+'/dense-native-comparison.mjs','dense-native-final-r1','dense-adopted-r1','0','1']},
 {run:'dense-lifecycle-final-r1',args:['tools/qa-v01-stage-window-lifecycle.mjs','dense-lifecycle-final-r1','dense-adopted-r1']}
],progress=[];
for(const item of plan){const begin=new Date().toISOString();console.log(JSON.stringify({run:item.run,event:'starting',at:begin}));const log=await fs.open(base+'/'+item.run+'.log','wx');
 const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,item.args,{stdio:['ignore',log.fd,log.fd],windowsHide:true,env:{...process.env,SC2_D04_TRACE:'0',SC2_D04_STAGES:'3',V01_ENTRY_MODE:'staged'}});child.on('error',reject);child.on('exit',resolve);});await log.close();
 const report=JSON.parse(await fs.readFile(base+'/'+item.run+'/report.json'));progress.push({run:item.run,begin,end:new Date().toISOString(),code,pass:report.pass,profileClosed:report.profileClosed});await fs.writeFile(base+'/dense-final-browser-progress.json',JSON.stringify(progress,null,2));console.log(JSON.stringify(progress.at(-1)));assert.equal(code,0);assert.ok(report.pass&&report.profileClosed);
}
