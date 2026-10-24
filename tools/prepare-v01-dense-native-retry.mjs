import fs from 'node:fs/promises';
let s=await fs.readFile('tools/qa-v01-dense-final.mjs','utf8');
const from="await page.waitForFunction(()=>__SC2_REPORT__().readiness.phase==='ready',null,{timeout:240000});";
if(!s.includes(from))throw Error('Missing restore wait');
const to="await page.waitForFunction(()=>['ready','error'].includes(__SC2_REPORT__().readiness.phase),null,{timeout:240000});if((await state()).readiness.phase==='error'){report.restoreFirstFailure=await state();await shot('restore-first-failure');await click('[data-action=flow-retry]');await page.waitForFunction(()=>['ready','error'].includes(__SC2_REPORT__().readiness.phase),null,{timeout:300000});report.restoreRetry=await state();await save();}assert.equal((await state()).readiness.phase,'ready');";
s=s.replace(from,to).replace('Uninstrumented final production entry.','Uninstrumented final production entry. A failed reload remains recorded, and one existing native Retry action is exercised without changing production timeouts.');
await fs.writeFile('tools/qa-v01-dense-native-retry.mjs',s,{flag:'wx'});console.log('Prepared ordinary entry with explicit retained failure and one native retry.');
