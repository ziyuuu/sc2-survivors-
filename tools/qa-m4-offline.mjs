import {chromium} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const output='reports/local/qa-m4-offline';await fs.mkdir(output,{recursive:true});
const report={at:new Date().toISOString(),checks:[],errors:[],network:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const watch=(page,prefix)=>{page.on('pageerror',e=>report.errors.push(prefix+e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(prefix+m.text());});};
try{
 const source=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});const dev=await source.newPage();watch(dev,'dev: ');
 await dev.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5173/');await dev.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
 await dev.locator('[data-action=menu-new]').click();await dev.locator('[data-action=menu-race-next]').click();await dev.locator('[data-action=menu-difficulty-next]').click();await dev.locator('[data-action=menu-start]').click();
 await dev.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});await dev.locator('[data-action=flow-continue]').click();await dev.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle');
 const before=await dev.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.autoWaves=false;w.paused=false;w.expedition.familySlots.push('hellion');const ordinary=w.addUnit('hellion','terran',-2,0);w.refreshStats(ordinary);if(!w.acquireElite('hellion.2'))throw Error('M4 elite fixture unavailable');if(!w.acquireHero('raynor'))throw Error('M4 hero fixture unavailable');const hero=w.heroEntity('raynor');hero.x=hero.prev.x=0;hero.z=hero.prev.z=0;const enemy=w.addUnit('roach','zerg',5,0);enemy.hp=enemy.maxHp=2000;enemy.moveSpeed=0;enemy.weaponDamage=0;w.hash.rebuild(w.entities.values());if(!w.castHero('raynor'))throw Error('M4 projectile fixture has no legal target');w.paused=true;w.changed();return {cast:w.heroCasts[0]?.phase,elite:w.allies().find(u=>u.eliteId)?.eliteId,hero:hero.heroId,schema:w.captureRun().schema};});
 assert.deepEqual(before,{cast:'line-travel',elite:'hellion.2',hero:'raynor',schema:5});
 await dev.locator('[data-action=save-now]').click();await dev.waitForFunction(()=>window.__SC2_REPORT__().save.message.includes('已保存'),null,{timeout:30000});
 const [firstDownload]=await Promise.all([dev.waitForEvent('download'),dev.locator('[data-action=save-export]').click()]);await firstDownload.saveAs(output+'/m4-midflight.json');
 const raw=await fs.readFile(output+'/m4-midflight.json','utf8');assert.ok(raw.includes('line-travel')&&raw.includes('hellion.2'));
 await source.close();report.checks.push('development browser exported schema-v5 Raynor flight and Hellion elite identity');

 const offline=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true,offline:true});const file=await offline.newPage();watch(file,'offline: ');file.on('request',r=>{if(/^https?:/i.test(r.url()))report.network.push(r.url());});
 await file.goto(pathToFileURL(path.resolve('dist/SC2-Survivors-Demo.html')).href,{timeout:240000});await file.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
 await file.locator('[data-action=menu-load]').click();
 report.offlineMenu={phase:await file.evaluate(()=>window.__SC2_REPORT__().phase),importCount:await file.locator('[data-action=menu-load-file]').count(),importVisible:await file.locator('[data-action=menu-load-file]').isVisible()};
 const [choose]=await Promise.all([file.waitForEvent('filechooser'),file.locator('[data-action=menu-load-file]').click()]);await choose.setFiles(output+'/m4-midflight.json');
 await file.locator('[data-action=menu-load-ready]').waitFor({timeout:240000});await file.locator('[data-action=menu-load-ready]').click();
 await file.waitForFunction(()=>window.__SC2_REPORT__()?.readiness?.phase==='ready',null,{timeout:240000});await file.locator('[data-action=flow-continue]').click();
 await file.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='battle',null,{timeout:30000});
 assert.equal(await file.evaluate(()=>window.__SC2_REPORT__().expedition.race),'terran');assert.equal(await file.evaluate(()=>typeof window.__SC2_DEBUG__),'undefined');
 assert.deepEqual(report.network,[]);await file.screenshot({path:output+'/offline-loaded.png'});
 const [secondDownload]=await Promise.all([file.waitForEvent('download'),file.locator('[data-action=save-export]').click()]);await secondDownload.saveAs(output+'/m4-roundtrip.json');
 const roundtrip=await fs.readFile(output+'/m4-roundtrip.json','utf8');assert.ok(roundtrip.includes('line-travel')&&roundtrip.includes('hellion.2'));
 report.checks.push('offline single HTML imports and reexports the pending shot and elite without a network request or debug API');
 await offline.close();assert.deepEqual(report.errors,[]);
}catch(error){report.failure=String(error?.stack??error);process.exitCode=1;console.error(report.failure);}
finally{await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({checks:report.checks,errors:report.errors,failure:report.failure??null}));}
