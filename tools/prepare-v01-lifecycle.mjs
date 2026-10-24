import fs from 'node:fs/promises';
let old=await fs.readFile('tools/qa-performance-l02-lifecycle.mjs','utf8');
const state=old.slice(old.indexOf('const state='),old.indexOf('try{\n context=')).replaceAll('L02','A03');
const body=old.slice(old.indexOf(' // Fail required native requests'),old.indexOf(" phase='GPU-fence-timeout-fixture';")).replaceAll('L02','A03');
let code=`import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {browserRun} from './v01-browser-helper.mjs';
const run=process.argv[2]??'lifecycle-r1',env=await browserRun(run,'Current unified production inputs. Actual HTTP failure/retry, cancelled queued preparation and late callback, real WebGL context loss/restore. Controlled boundary checks, not performance or natural gameplay.');
const {root,report,page,context,base,save,shot}=env;await fs.copyFile(import.meta.filename,root+'/runner.mjs');let phase='boot';
${state}
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:180000});await page.waitForFunction(()=>window.A03?.app&&!document.getElementById('scs-opening-visual'),null,{timeout:180000});
${body}
 report.unexpectedErrors=report.errors.filter(e=>!['required-resource-failure','retry'].includes(e.phase));assert.deepEqual(report.unexpectedErrors,[]);report.pass=true;
}catch(e){report.failure=String(e.stack??e);report.failureState=await state().catch(error=>({error:String(error)}));await shot('failure').catch(()=>{});process.exitCode=1;}
finally{await env.close();}
`;
code=code.replaceAll("await page.reload({", "await page.reload({");
code=code.replaceAll(/phase='([^']+)';/g,(_m,p)=>`phase='${p}';env.setPhase(phase);`);
code=code.replace("a.hud.onCommitFlow=()=>{commit();a.world.paused=true;", "a.hud.onCommitFlow=async()=>{await commit();a.world.paused=true;");
// Exact state comparison excludes only the known context-recovery notice.
code=code.replace("(_key,value)=>value instanceof Map?", "(_key,value)=>_key==='notice'||_key==='noticeUntil'?undefined:value instanceof Map?");
await fs.writeFile('tools/qa-v01-lifecycle.mjs',code);
console.log('tools/qa-v01-lifecycle.mjs');
