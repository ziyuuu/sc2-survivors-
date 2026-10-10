import fs from 'node:fs/promises';import {spawn} from 'node:child_process';
const root='reports/local/lighting-batch3-20261010';
while(true){try{const r=JSON.parse(await fs.readFile(root+'/before-r5-settled/results.json','utf8'));if(r.failure)throw Error(r.failure);if(r.passed===true)break;}catch(e){if(e.code!=='ENOENT'&&!(e instanceof SyntaxError))throw e;}await new Promise(r=>setTimeout(r,5000));}
for(const [script,args,env,label]of [
 ['tools/qa-native-hud.mts',['--full','--touch'],{SC2_NATIVE_QA_DIR:root+'/web-final-r4'},'web-final-r4'],
 ['tools/qa-native-hud.mts',['--full','--touch','--offline'],{SC2_NATIVE_QA_DIR:root+'/offline-final-r2',SC2_QA_OFFLINE_HTML:'dist/SC2-Survivors-Lighting-Batch3-Final-20261010.html'},'offline-final-r2'],
 ['tools/qa-lighting-controls.mts',[root+'/controls-r2'],{},'controls-r2']
]){const log=await fs.open(root+'/'+label+'.log','wx');const child=spawn(process.execPath,['--import','tsx',script,...args],{env:{...process.env,SC2_NATIVE_QA_READY_TIMEOUT_MS:'900000',SC2_NATIVE_QA_ACTION_TIMEOUT_MS:'120000',SC2_NATIVE_QA_ISOLATE_EVENTS:'1',...env},stdio:['ignore',log.fd,log.fd]});const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});await log.close();console.log(JSON.stringify({label,code,at:new Date().toISOString()}));if(code!==0){process.exitCode=code??1;break;}}
