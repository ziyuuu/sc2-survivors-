import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const out='reports/local/qa-m3';await fs.mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),checks:[],errors:[],screens:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
 assert.deepEqual(await page.locator('.m3-main-actions button').allTextContents(),['新游戏','读档','天赋']);
 await page.screenshot({path:out+'/title-desktop.png'});report.screens.push('title-desktop.png');
 await page.locator('[data-action=menu-new]').click();assert.equal(await page.locator('.m3-race-card').count(),3);
 await page.locator('[data-action=menu-race][data-race=zerg]').click();await page.locator('[data-action=menu-race-next]').click();
 await page.locator('[data-action=menu-difficulty][data-difficulty=hard]').click();await page.locator('[data-action=menu-difficulty-next]').click();
 assert.match(await page.locator('.m3-summary').innerText(),/虫族.*困难/s);
 await page.screenshot({path:out+'/new-confirm-desktop.png'});report.screens.push('new-confirm-desktop.png');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/new-confirm-mobile.png'});report.screens.push('new-confirm-mobile.png');
 await page.locator('[data-action=menu-start]').click();await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});
 assert.equal(await page.evaluate(()=>window.__SC2_REPORT__().phase),'menu');await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle');
 const first=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return {runId:w.runId,race:w.expedition.race,difficulty:w.difficulty};});assert.equal(first.race,'zerg');assert.equal(first.difficulty,'hard');report.checks.push('new game is gated and keeps selected race/difficulty');
 await page.locator('#topbar [data-action=pause]').click();await page.locator('[data-action=save-now]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().save.message.includes('已保存'),null,{timeout:30000});
 await page.locator('[data-action=restart]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='menu');
 await page.locator('[data-action=menu-load]').click();assert.ok((await page.locator('[data-action=menu-load-local]').innerText()).includes('虫族'));
 await page.locator('[data-action=menu-load-local]').click();assert.match(await page.locator('.m3-summary').innerText(),/虫族／困难/);
 await page.locator('[data-action=menu-load-ready]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='ready',null,{timeout:240000});await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle');
 const restored=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return {runId:w.runId,race:w.expedition.race,difficulty:w.difficulty,paused:w.paused};});assert.equal(restored.runId,first.runId);assert.equal(restored.race,'zerg');assert.equal(restored.difficulty,'hard');assert.equal(restored.paused,true);report.checks.push('saved game preview and confirmed load retain frozen difficulty and pause');
 await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.paused=false;w.stage=18;w.prepareStage();w.hive.hp=0;w.stageElapsed=w.duration;w.endStage();});await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='won');
 await page.locator('[data-action=endless]').click();assert.equal(await page.evaluate(()=>window.__SC2_REPORT__().phase),'reward');await page.locator('[data-action=skip]').click();await page.locator('[data-action=skip]').click();
 assert.equal(await page.evaluate(()=>window.__SC2_REPORT__().phase),'endless-ready');await page.locator('[data-action=endless-prepare]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='ready',null,{timeout:240000});assert.equal(await page.evaluate(()=>window.__SC2_REPORT__().phase),'endless-ready');
 await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle'&&window.__SC2_REPORT__().map?.name==='endless-flat-v1',null,{timeout:30000});
 const endless=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world,v=window.__SC2_DEBUG__.view,r=window.__SC2_REPORT__();return {map:r.map.name,duration:w.duration,round:w.endless.round,forts:[...w.fortifications.values()].map(f=>f.kind),fortViews:v.fortViews.size,fortMixers:v.fortMixers.size,fortClips:[...v.fortClips.keys()],errors:r.errors};});assert.equal(endless.duration,240);assert.equal(endless.round,1);assert.deepEqual(endless.forts.sort(),['bunker','bunker','bunker','bunker','repair'].sort());assert.equal(endless.fortViews,5);assert.equal(endless.fortMixers,5);assert.deepEqual(endless.fortClips.sort(),['bunker:stand','bunker:death','repair:stand','repair:death'].sort());assert.deepEqual(endless.errors,[]);report.checks.push('verified original SC fort models and stand/death actions render on separate flat map with 240-second round');
 await page.screenshot({path:out+'/endless-desktop.png'});report.screens.push('endless-desktop.png');await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/endless-mobile.png'});report.screens.push('endless-mobile.png');
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.paused=true;w.changed();});await page.locator('[data-action=save-now]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().save.message.includes('已保存'),null,{timeout:30000});await page.reload();await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');await page.locator('[data-action=menu-load]').click();await page.locator('[data-action=menu-load-local]').click();await page.locator('[data-action=menu-load-ready]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().readiness.phase==='ready',null,{timeout:240000});await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().map?.name==='endless-flat-v1',null,{timeout:30000});assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.difficulty),'hard');report.checks.push('flat endless save resumes without campaign-map fallback and keeps difficulty');
 if(report.errors.length)throw Error(report.errors.join(' | '));
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({checks:report.checks,errors:report.errors,failure:report.failure??null}));}
