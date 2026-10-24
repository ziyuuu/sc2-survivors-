import fs from 'node:fs';import {spawn} from 'node:child_process';
const file='reports/local/g03-farm-minor-20261023/batch-status.json';let timer;
function check(){const s=JSON.parse(fs.readFileSync(file,'utf8'));if(s.pending||s.active.length)return;if(s.finished.length!==24||s.finished.some(r=>!r.existing&&r.code!==0))throw Error('Original batch incomplete or process errors');clearInterval(timer);const child=spawn(process.execPath,['tools/run-g03-farm-mode-20261023.mjs','4'],{stdio:'inherit',windowsHide:true});child.once('exit',code=>{process.exitCode=code??1;});console.log('Original 24 finished; starting frozen eight zerg replays.');}
console.log('Waiting for original batch to release its four worker slots.');timer=setInterval(check,15000);check();
