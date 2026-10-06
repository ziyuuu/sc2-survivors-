import fs from 'node:fs/promises';
const file='tools/qa-aura-production-integration.mts';let s=await fs.readFile(file,'utf8');
s=s.replace("await page.locator('[data-inspect-close]').click();", "await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#unit-inspector.inspect-open'));" );
s=s.replace('covering six revised Zerg elite support sources', 'covering five revised Zerg elite support sources');
await fs.writeFile(file,s);
const report='reports/local/protoss-elites-auras-20261005/zerg-aura-production/report.json';await fs.copyFile(report,report.replace('report.json','first-report.json'));
