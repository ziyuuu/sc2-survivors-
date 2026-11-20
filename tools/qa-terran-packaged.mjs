/** Re-import the three UI-exported checkpoints into the same compiled release. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createGameServer} from './coze-web-server.mjs';
const out=process.env.SC2_TERRAN_QA_OUTPUT??'reports/local/terran-integration-20261119',root=await fs.realpath(process.env.SC2_TERRAN_WEB??'dist/terran-integration-20261119');
const release=JSON.parse(await fs.readFile(path.join(root,'web-release.json'),'utf8'));
const server=createGameServer({webRoot:root,backendOptions:{config:{enabled:false},maintenance:false}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',args:['--no-proxy-server','--autoplay-policy=no-user-gesture-required']}),report={appBuildId:release.appBuildId,release:release.release,checks:[],errors:[]};
try{
 for(const branch of ['armed','doomsday','bio']){
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(branch+': '+e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});page.on('console',m=>{if(m.type()==='error'&&/Shader Error|GL_INVALID_OPERATION/.test(m.text()))report.errors.push(m.text());});
  const ready=async()=>{await page.waitForFunction(()=>{const r=window.__SC2_REPORT__?.();return ['ready','error'].includes(r?.readiness?.phase)||r?.phase==='battle'&&!r.readiness.kind&&r.assetsReady;},null,{timeout:300000});const r=await page.evaluate(()=>window.__SC2_REPORT__());assert.ok(r.readiness.phase==='ready'||r.phase==='battle'&&!r.readiness.kind&&r.assetsReady,JSON.stringify(r.readiness));};
  await page.goto(base,{timeout:180000});await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:180000});assert.equal(await page.locator('meta[name=sc2-app-build]').getAttribute('content'),release.appBuildId);assert.equal(await page.evaluate(()=>typeof window.__SC2_DEBUG__),'undefined');
  await page.locator('[data-action=settings]:visible').first().click();await page.locator('[data-action=settings-tab][data-tab=saves]').click();const picker=page.waitForEvent('filechooser');await page.locator('[data-action=menu-load-file]').click();await(await picker).setFiles(path.resolve(out,branch+'-export.json'));await ready();await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='reward');
  await page.locator('[data-action=skip]').click();await ready();if(await page.locator('[data-action=flow-continue]').count())await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle');if(await page.locator('.pause-actions [data-action=pause]').count())await page.locator('.pause-actions [data-action=pause]').click();const before=await page.evaluate(()=>window.__SC2_REPORT__().time);await page.waitForFunction(t=>window.__SC2_REPORT__().time>t+.5,before,{timeout:30000});
  const battle=await page.evaluate(()=>window.__SC2_REPORT__());assert.deepEqual(battle.errors,[]);report.checks.push({branch,menu:true,import:true,nextBattle:true,time:battle.time});await page.screenshot({path:out+`/${branch}-packaged.png`});console.log(branch+' compiled flow passed');await context.close();
 }
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;console.error(report.failure);}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await fs.writeFile(out+'/packaged.json',JSON.stringify(report,null,2));}
