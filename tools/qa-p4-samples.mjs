import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir='reports/local/p4-samples-20261005';await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(path.resolve('dist/P4-Large-Mines-And-Medical-Samples.html')).href);
await page.waitForFunction(()=>window.__P4_SAMPLE_REPORT__?.().ready,{},{timeout:120000});
const report=()=>page.evaluate(()=>window.__P4_SAMPLE_REPORT__());
const advance=s=>page.evaluate(s=>{if(window.__P4_SAMPLE_REPORT__().paused)document.querySelector('#pause').click();window.__P4_SAMPLE_ADVANCE__(s);document.querySelector('#pause').click();},s);
const cases=[];
for(const id of ['hellion.3','medivac.2','science_vessel.1'])for(const rank of ['1','3','5']){
 await page.locator(`[data-sample="${id}"]`).click();await page.selectOption('#rank',rank);await advance(id==='hellion.3'?13.5:.4);
 const r=await report();assert.equal(r.schema,20);assert.deepEqual(r.errors,[]);
 if(id==='hellion.3'){assert.ok(r.damage>0);assert.ok(r.targetPlanes.filter(t=>t.air).every(t=>t.hp===100000));}else{assert.ok(r.healed>0);assert.equal(r.source.healTargets.length,id==='medivac.2'?5:3);assert.equal(r.render.beams,id==='medivac.2'?5:0);if(id==='science_vessel.1')assert.equal(r.render.fogTargets,3);if(id==='science_vessel.1')assert.ok(r.render.shields>=3&&r.render.shields<=7);}
 await page.screenshot({path:`${dir}/${id}-${rank}.png`});cases.push({id,rank,...r});
 await page.click('#save');const saved=await report();await page.click('#pause');await advance(.5);await page.click('#restore');const restored=await report();assert.equal(restored.time,saved.time);assert.deepEqual(restored.state,saved.state);assert.equal(restored.paused,true);
}
for(const id of ['medivac.2','science_vessel.1'])for(const scene of ['full','empty','mixed']){await page.locator(`[data-sample="${id}"]`).click();await page.selectOption('#scenario',scene);await advance(.4);const r=await report();if(scene==='full'){assert.equal(r.healed,0);assert.equal(r.render.beams,0);assert.equal(r.state.barriers.length,0);}if(scene==='empty')assert.ok(r.healed<30,'only regenerated energy may heal');cases.push({id,scene,...r});}
await page.locator('[data-sample="hellion.3"]').click();await page.selectOption('#rank','1');
await page.evaluate(()=>{for(let i=0;i<900;i++){window.__P4_SAMPLE_ADVANCE__(1/60);if(window.__P4_SAMPLE_REPORT__().state.fires.length)break;}for(let i=0;i<6;i++)window.__P4_SAMPLE_ADVANCE__(1/60);document.querySelector('#pause').click();});
await page.screenshot({path:dir+'/mine-explosion.png'});assert.ok((await report()).state.fires.length>0);
const layouts=[];
for(const size of [{width:390,height:844},{width:844,height:390},{width:1440,height:900}])for(const quality of ['full','balanced','low']){
 await page.setViewportSize(size);await page.locator('[data-sample="science_vessel.1"]').click();await page.selectOption('#quality',quality);await advance(.4);
 const r=await report();assert.equal(r.render.beams,0);assert.equal(r.render.fogTargets,3);assert.ok(r.render.shields>=3&&r.render.shields<=7);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:`${dir}/layout-${size.width}-${quality}.png`,fullPage:true});layouts.push({size,quality,render:r.render});
}
assert.deepEqual(errors,[]);await fs.writeFile(`${dir}/browser.json`,JSON.stringify({cases,layouts,errors},null,2));await browser.close();console.log(JSON.stringify({cases:cases.length,layouts:layouts.length,errors}));
