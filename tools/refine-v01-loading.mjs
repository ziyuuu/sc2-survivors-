import fs from 'node:fs/promises';
const file='reports/local/v01-20261024/loading.mjs';
let code=await fs.readFile(file,'utf8');
code=code.replace('events:controller.events};','events:controller.events,imageProbe:globalThis.V01ImageProbe?{...V01ImageProbe.metrics,live:V01ImageProbe.live()}:null};');
code=code.replace("report.failureText=await page.locator('body')", "report.failureState=await page.evaluate(()=>({world:A03?.app?.world?.phase,gate:A03?.app?.readiness?.state,session:A03?.app?.session?.report?.(),checkpoint:A03?.app?.world?.snapshot?.()})).catch(e=>({error:String(e)}));report.failureText=await page.locator('body')");
code=code.replace('row.stages.push(result);await save();await shot', "row.stages.push(result);await save();await page.waitForFunction(()=>!A03.app.session.busy&&!A03.app.session.scheduled,null,{timeout:30000});result.checkpoint=await page.evaluate(()=>({failed:A03.app.session.saveFailed,report:A03.app.session.report()}));await save();assert.equal(result.checkpoint.failed,false,'Native intermission checkpoint: '+result.checkpoint.report.message);await fs.writeFile(root+'/cycle'+cycle+'-stage'+stage+'-archive.json',await page.evaluate(()=>A03.app.session.exportJSON()));await shot");
await fs.writeFile(file,code);
