import fs from 'node:fs/promises';import {spawn} from 'node:child_process';
const root='reports/local/lighting-batch3-20261010';
let ready=false;while(!ready){try{const r=JSON.parse(await fs.readFile(root+'/web-final-r3/result.json','utf8'));if(r.failure)throw Error('Formal Web did not pass: '+r.failure);ready=r.checks.length===24&&r.screens.length===51;}catch(e){if(e.code!=='ENOENT')throw e;}if(!ready)await new Promise(r=>setTimeout(r,5000));}
for(const [script,args,env,label]of [
 ['tools/qa-native-hud.mts',['--full','--touch','--offline'],{SC2_NATIVE_QA_DIR:root+'/offline-final-r1',SC2_QA_OFFLINE_HTML:'dist/SC2-Survivors-Lighting-Batch3-20261010.html',SC2_NATIVE_QA_READY_TIMEOUT_MS:'900000',SC2_NATIVE_QA_ACTION_TIMEOUT_MS:'120000',SC2_NATIVE_QA_ISOLATE_EVENTS:'1'},'offline-final-r1'],
 ['tools/qa-lighting-controls.mts',[root+'/controls-r1'],{},'controls-r1']
]){const log=await fs.open(root+'/'+label+'.log','wx');const child=spawn(process.execPath,['--import','tsx',script,...args],{env:{...process.env,...env},stdio:['ignore',log.fd,log.fd]});const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});await log.close();console.log(JSON.stringify({label,code}));if(code!==0){process.exitCode=code??1;break;}}
