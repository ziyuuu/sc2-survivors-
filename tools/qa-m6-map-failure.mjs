import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const output='reports/local/qa-m6-map-failure';
await fs.mkdir(output,{recursive:true});
const report={at:new Date().toISOString(),checks:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5173/');
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
 await page.route('**/assets/map/model.map.crystalslow_07.gltf',route=>route.abort());
 await page.locator('[data-action=menu-new]').click();
 await page.locator('[data-action=menu-race-next]').click();
 await page.locator('[data-action=menu-difficulty-next]').click();
 await page.locator('[data-action=menu-start]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='error',null,{timeout:120000});
 const failed=await page.evaluate(()=>({phase:window.__SC2_REPORT__().phase,time:window.__SC2_DEBUG__.world.time,mapRoots:window.__SC2_DEBUG__.view.scene.children.filter(n=>n.name.startsWith('terrain-')).length}));
 assert.deepEqual(failed,{phase:'menu',time:0,mapRoots:0});
 report.checks.push('a failed required map model keeps the new run uncommitted and removes partial map geometry');
 await page.unroute('**/assets/map/model.map.crystalslow_07.gltf');
 await page.locator('[data-action=flow-retry]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='ready',null,{timeout:120000});
 const ready=await page.evaluate(()=>({phase:window.__SC2_REPORT__().phase,time:window.__SC2_DEBUG__.world.time,mapRoots:window.__SC2_DEBUG__.view.scene.children.filter(n=>n.name.startsWith('terrain-')).length,errors:window.__SC2_REPORT__().errors}));
 assert.equal(ready.phase,'menu');assert.equal(ready.time,0);assert.equal(ready.mapRoots,1);assert.deepEqual(ready.errors,[]);
 await page.locator('[data-action=flow-continue]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle',null,{timeout:30000});
 report.checks.push('retry loads one original map and starts battle after explicit confirmation');
 if(report.errors.length)throw Error(report.errors.join(' | '));
}catch(error){report.failure=String(error?.stack??error);process.exitCode=1;}
finally{await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
