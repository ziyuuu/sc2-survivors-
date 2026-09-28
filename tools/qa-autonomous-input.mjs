// Orchestrated UI fixture matrix. Use only against a stable dev server, never
// while build tools rewrite the asset manifest. Each child writes actual results.
import {spawnSync} from 'node:child_process';
const cases=[
 ['tools/qa-feedback.mjs',{SC2_QA_MODES:'keyboard,touch,gamepad',SC2_QA_STAGES:'menu,controls,receipt,shop,elite,boss',SC2_QA_LABEL:'autonomous-input'}],
 ['tools/qa-m3-input.mjs',{}],
 ['tools/qa-m2-touch.mjs',{}],
 ['tools/qa-m2-gamepad.mjs',{}],
 ['tools/qa-m3-failure.mjs',{}],
];
for(const [file,env] of cases){
 console.log(`Running ${file}`);
 const result=spawnSync(process.execPath,[file],{env:{...process.env,...env},stdio:'inherit'});
 if(result.status!==0){process.exitCode=1;break;}
}


