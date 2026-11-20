/** Load the UI-exported doomsday checkpoint in the compiled, hash-addressed Web build. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createGameServer} from './coze-web-server.mjs';
const out=process.env.SC2_DOOMSDAY_QA_OUTPUT??'reports/local/doomsday-20261117',root=await fs.realpath(process.env.SC2_DOOMSDAY_WEB??'dist/doomsday-20261117/web');
const release=JSON.parse(await fs.readFile(path.join(root,'web-release.json'),'utf8'));
const fixture=path.resolve(out,'player-orange-export.json');await fs.access(fixture);
const server=createGameServer({webRoot:root,backendOptions:{config:{enabled:false},maintenance:false}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']}),report={appBuildId:release.appBuildId,release:release.release,checks:[],errors:[]};let page;
try{
 page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 const ready=async()=>{await page.waitForFunction(()=>{const r=window.__SC2_REPORT__?.();return ['ready','error'].includes(r?.readiness.phase)||r?.phase==='battle'&&!r.readiness.kind&&r.assetsReady;},null,{timeout:300000});const r=await page.evaluate(()=>window.__SC2_REPORT__());assert.ok(r.readiness.phase==='ready'||r.phase==='battle'&&!r.readiness.kind&&r.assetsReady);};
 await page.goto(base,{timeout:180000});await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:180000});assert.equal(await page.locator('meta[name=sc2-app-build]').getAttribute('content'),release.appBuildId);report.checks.push('built menu matches release hash');
 await page.locator('[data-action=settings]:visible').first().click();await page.locator('[data-action=settings-tab][data-tab=saves]').click();const picker=page.waitForEvent('filechooser');await page.locator('[data-action=menu-load-file]').click();await(await picker).setFiles(fixture);await ready();await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='reward');report.checks.push('UI-exported orange checkpoint imported');
 await page.locator('[data-action=skip]').click();await ready();if(await page.locator('[data-action=flow-continue]').count())await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle');if(await page.locator('.pause-actions [data-action=pause]').count())await page.locator('.pause-actions [data-action=pause]').click();const before=await page.evaluate(()=>window.__SC2_REPORT__().time);await page.waitForFunction(t=>window.__SC2_REPORT__().time>t+.5,before,{timeout:30000});
 report.battle=await page.evaluate(()=>window.__SC2_REPORT__());assert.deepEqual(report.battle.errors,[]);assert.deepEqual(report.errors,[]);report.checks.push('compiled next battle advances with original assets');await page.screenshot({path:out+'/packaged-battle.png'});
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;report.last=await page?.evaluate(()=>({state:window.__SC2_REPORT__?.(),text:document.body.innerText.slice(-1000)})).catch(()=>null);}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));await fs.writeFile(out+'/packaged.json',JSON.stringify(report,null,2));console.log(JSON.stringify({appBuildId:report.appBuildId,checks:report.checks,errors:report.errors,failure:report.failure}));}
