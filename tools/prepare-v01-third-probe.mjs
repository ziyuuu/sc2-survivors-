import fs from 'node:fs/promises';
let code=await fs.readFile('tools/qa-v01-save-probe.mjs','utf8');code=code.replaceAll('pilot-terran-r2','baseline-terran-r2').replaceAll('save-probe-r1','third-save-probe-r1');
code=code.replace("await page.goto(env.base,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>globalThis.A03?.app&&!document.getElementById('scs-opening-visual'),null,{timeout:180000});", "await page.goto(env.base+'runtime-config.json',{waitUntil:'domcontentloaded',timeout:120000});");
const first=code.indexOf(' report.boot='),last=code.indexOf(' const rows=',first);code=code.slice(0,first)+code.slice(last);
const a=code.indexOf(' report.pending='),b=code.indexOf(' report.pass=',a);code=code.slice(0,a)+code.slice(b);
await fs.writeFile('tools/qa-v01-third-probe.mjs',code);
