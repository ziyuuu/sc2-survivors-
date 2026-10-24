import fs from 'node:fs/promises';
let s=await fs.readFile('tools/qa-v01-stage-final.mjs','utf8');
const from="await page.waitForFunction(()=>__SC2_REPORT__().readiness.phase==='ready',null,{timeout:240000});";
if(!s.includes(from))throw Error('Missing reload wait anchor');
s=s.replace(from,"await page.waitForFunction(()=>['ready','error'].includes(__SC2_REPORT__().readiness.phase),null,{timeout:240000});assert.equal((await state()).readiness.phase,'ready');");
s=s.replace('report.failureState=await state().catch(()=>null);',"report.failureState=await state().catch(()=>null);report.contextState=await page.evaluate(()=>{const g=document.querySelector('canvas#battle')?.getContext('webgl2');return {available:!!g,lost:g?.isContextLost()};}).catch(()=>null);");
await fs.writeFile('tools/qa-v01-dense-baseline-restore.mjs',s,{flag:'wx'});console.log('Prepared old-build same-archive restore check with error-state capture.');
