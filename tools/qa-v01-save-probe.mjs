import fs from 'node:fs/promises';import {browserRun} from './v01-browser-helper.mjs';
import {readArchive} from '../src/persistence/archive.ts';
const prior=JSON.parse(await fs.readFile('reports/local/v01-20261024/pilot-terran-r2/report.json'));
const env=await browserRun('save-probe-r1','Read isolated pilot save after intermission was blocked. No user profile access. Capture actual validation failures and keep original bytes.',{profile:'D:/星际/reports/local/v01-20261024/pilot-terran-r2/profile',port:Number(new URL(prior.base).port)}),{page,root,report}=env;
try{
 await page.goto(env.base,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>globalThis.A03?.app&&!document.getElementById('scs-opening-visual'),null,{timeout:180000});
 report.boot=await page.evaluate(()=>({save:A03.app.session.report(),failed:A03.app.session.saveFailed,snapshot:A03.app.session.savedSnapshot?{phase:A03.app.session.savedSnapshot.state.phase,time:A03.app.session.savedSnapshot.state.time,stage:A03.app.session.savedSnapshot.state.stage}:null,world:{phase:A03.app.world.phase,time:A03.app.world.time}}));
 const rows=await page.evaluate(()=>new Promise((resolve,reject)=>{const q=indexedDB.open('sc2-survivors-saves',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction('snapshots'),s=tx.objectStore('snapshots'),out={};for(const key of ['current','backup1','backup2']){const r=s.get(key);r.onsuccess=()=>out[key]=r.result??null;}tx.oncomplete=()=>{db.close();resolve(out);};tx.onerror=()=>reject(tx.error);};q.onerror=()=>reject(q.error);}));
 for(const [name,raw]of Object.entries(rows)){await fs.writeFile(root+'/'+name+'.json',raw??'null');try{const a=readArchive(raw);report.checks.push({name,valid:true,phase:a.bundle.run?.state.phase,stage:a.bundle.run?.state.stage,time:a.bundle.run?.state.time});}catch(e){report.checks.push({name,valid:false,error:String(e)});}}
 report.pending=await page.evaluate(()=>{const a=A03.app,s=a.session.savedSnapshot;if(!s)return null;try{a.world.restoreRun(s,true);return 'valid';}catch(e){return String(e.stack);}});
 report.pass=true;
}catch(e){report.failure=String(e.stack);process.exitCode=1;}finally{await env.close();}
console.log(JSON.stringify({boot:report.boot,checks:report.checks,pending:report.pending},null,2));
