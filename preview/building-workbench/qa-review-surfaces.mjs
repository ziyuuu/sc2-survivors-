import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const out=path.resolve('reports/local/mvp1-intermission-design-20261013',process.env.MVP1_QA_REVISION??'r8');
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),checks=[],images=[];
try{
for(const race of ['terran','zerg','protoss']){await page.goto(`http://127.0.0.1:4387/?race=${race}&scene=developed`);await page.locator('[data-action="placement"]').first().click();await page.locator('[data-action="tree"]').click();assert.equal(await page.locator('.wb-tree-line').count(),3);const b=await page.locator('[role="dialog"]').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=390&&b.y+b.height<=844);await page.screenshot({path:path.join(out,race+'-portrait-build-tree.png')});images.push(race+'-portrait-build-tree.png');checks.push(race+': portrait tree fits viewport');}
await page.setViewportSize({width:1440,height:900});await page.goto('http://127.0.0.1:4387/?race=protoss&scene=developed');await page.locator('[data-action="next"]').click();await page.locator('[data-action="next"]').click();assert.match(await page.locator('.wb-front').innerText(),/第 10 关准备就绪/);assert.equal(await page.locator('[data-action="next-stage"]').isVisible(),true);await page.screenshot({path:path.join(out,'protoss-desktop-front.png')});images.push('protoss-desktop-front.png');checks.push('Protoss: front preview with next-stage action visible');
fs.writeFileSync(path.join(out,'surfaces.json'),JSON.stringify({scope:'New UI surfaces only',checks,images},null,2));console.log(JSON.stringify({checks:checks.length,images:images.length}));
}finally{await browser.close();}
