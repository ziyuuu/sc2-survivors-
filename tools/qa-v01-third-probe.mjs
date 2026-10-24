import fs from 'node:fs/promises';import {browserRun} from './v01-browser-helper.mjs';
import {readArchive} from '../src/persistence/archive.ts';
const prior=JSON.parse(await fs.readFile('reports/local/v01-20261024/baseline-terran-r2/report.json'));
const env=await browserRun('third-save-probe-r1','Read isolated pilot save after intermission was blocked. No user profile access. Capture actual validation failures and keep original bytes.',{profile:'D:/星际/reports/local/v01-20261024/baseline-terran-r2/profile',port:Number(new URL(prior.base).port)}),{page,root,report}=env;
try{
 await page.goto(env.base+'runtime-config.json',{waitUntil:'domcontentloaded',timeout:120000});
 const rows=await page.evaluate(()=>new Promise((resolve,reject)=>{const q=indexedDB.open('sc2-survivors-saves',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction('snapshots'),s=tx.objectStore('snapshots'),out={};for(const key of ['current','backup1','backup2']){const r=s.get(key);r.onsuccess=()=>out[key]=r.result??null;}tx.oncomplete=()=>{db.close();resolve(out);};tx.onerror=()=>reject(tx.error);};q.onerror=()=>reject(q.error);}));
 for(const [name,raw]of Object.entries(rows)){await fs.writeFile(root+'/'+name+'.json',raw??'null');try{const a=readArchive(raw);report.checks.push({name,valid:true,phase:a.bundle.run?.state.phase,stage:a.bundle.run?.state.stage,time:a.bundle.run?.state.time});}catch(e){report.checks.push({name,valid:false,error:String(e)});}}
 report.pass=true;
}catch(e){report.failure=String(e.stack);process.exitCode=1;}finally{await env.close();}
console.log(JSON.stringify({boot:report.boot,checks:report.checks,pending:report.pending},null,2));
