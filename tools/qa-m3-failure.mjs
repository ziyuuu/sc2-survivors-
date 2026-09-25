import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const out='reports/local/qa-m3-failure';await fs.mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),checks:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
 await page.locator('[data-action=menu-new]').click();await page.locator('[data-action=menu-race-next]').click();await page.locator('[data-action=menu-difficulty-next]').click();await page.locator('[data-action=menu-start]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='ready',null,{timeout:240000});await page.locator('[data-action=flow-continue]').click();
 await page.evaluate(()=>{const world=window.__SC2_DEBUG__.world;world.stage=18;world.prepareStage();world.hive.hp=0;world.stageElapsed=world.duration;world.endStage();});
 await page.locator('[data-action=endless]').click();await page.locator('[data-action=skip]').click();await page.locator('[data-action=skip]').click();
 const before=await page.evaluate(()=>{const world=window.__SC2_DEBUG__.world;return {phase:world.phase,map:world.battlefield.mapId,revision:world.endlessEntry.revision,runId:world.runId};});assert.equal(before.phase,'endless-ready');
 await page.route('**/model.fort.bunker.glb',route=>route.abort());await page.locator('[data-action=endless-prepare]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='error',null,{timeout:60000});
 assert.deepEqual(await page.evaluate(()=>{const world=window.__SC2_DEBUG__.world;return {phase:world.phase,map:world.battlefield.mapId,revision:world.endlessEntry.revision,runId:world.runId};}),before);
 assert.equal(await page.locator('[data-action=flow-retry]').count(),1);assert.equal(await page.locator('[data-action=flow-cancel]').count(),1);assert.equal(await page.locator('[data-action=save-export]').count(),1);
 report.checks.push('building read failure keeps campaign state and presents retry, return and export');
 await page.unroute('**/model.fort.bunker.glb');await page.locator('[data-action=flow-retry]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='ready',null,{timeout:120000});
 assert.deepEqual(await page.evaluate(()=>{const world=window.__SC2_DEBUG__.world;return {phase:world.phase,map:world.battlefield.mapId,revision:world.endlessEntry.revision,runId:world.runId};}),before);
 report.checks.push('retry prepares authentic buildings without an early map transition');
 await page.locator('#battle').evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='error');
 assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.phase),'endless-ready');
 await page.locator('[data-action=flow-cancel]').click();assert.equal(await page.evaluate(()=>window.__SC2_REPORT__().readiness.phase),'idle');assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.phase),'endless-ready');
 report.checks.push('context loss exposes an error; cancel leaves the saved preparation intact');
 if(report.errors.length)throw Error(report.errors.join(' | '));
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({checks:report.checks,errors:report.errors,failure:report.failure??null}));}
