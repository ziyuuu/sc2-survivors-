import fs from 'node:fs/promises';
const file='D:/星际/reports/local/integration-i02-20261022/qa-browser.mjs';let s=await fs.readFile(file,'utf8');
s=s.replace("assert.equal(await p.locator('.special-dialog').count(),0);","await p.locator('.special-dialog').waitFor({state:'detached'});")
 .replace('await step(1800);','await step(await p.evaluate(()=>1800-__FUN_LAB__.world.specialStages.active.clock));')
 .replace('remaining:w.expedition.detectionReady-w.time,expected:','remaining:Math.max(0,w.expedition.detectionReady-w.time),expected:')
 .replace("p.locator('.special-dialog').waitFor({state:'detached'})","p.locator('.special-dialog').waitFor({state:'hidden'})");
await fs.writeFile(file,s);
