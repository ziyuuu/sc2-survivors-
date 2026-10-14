import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createGameServer} from './coze-web-server.mjs';
const arg=(key,otherwise)=>process.argv.find(s=>s.startsWith('--'+key+'='))?.slice(key.length+3)??otherwise;
const out=arg('out'),web=arg('web','dist/web');assert.ok(out?.startsWith('reports/local/7a-20261013/')&&!out.includes('..'));await fs.mkdir(out);await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
const report={at:new Date().toISOString(),build:JSON.parse(await fs.readFile(web+'/web-release.json','utf8')),checks:[],screens:[],errors:[],passed:false},server=createGameServer({webRoot:path.resolve(web),assetRoot:path.resolve(arg('assets',web)),backendOptions:{config:{enabled:false}}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,page;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});page=await context.newPage();page.setDefaultTimeout(900000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=value=>{if(value instanceof Uint32Array&&value.length===1){value[0]=529;return value;}return original(value);};localStorage.setItem('sc2.renderQuality','native');});
 const read=()=>page.evaluate(()=>window.__SC2_REPORT__());
 const record=async(name)=>{const state=await read();const file=name+'.png';await page.screenshot({path:out+'/'+file});report.checks.push({name,state});report.screens.push(file);await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));};
 await page.goto('http://127.0.0.1:'+server.address().port,{timeout:900000});await page.locator('.main-actions [data-action=menu-new]').click();
 for(const race of ['zerg','terran','protoss','zerg','terran']){await page.locator(`[data-action=menu-race][data-race=${race}]`).click();await page.waitForTimeout(300);assert.equal((await read()).time,0);}await record('race-replacement');
 await page.waitForFunction(()=>window.__SC2_REPORT__().background.busy,null,{timeout:120000});
 const beforeVisibility=await page.evaluate(()=>({visibility:document.visibilityState,focus:document.hasFocus(),time:window.__SC2_REPORT__().time}));
 const otherPage=await page.context().newPage();await otherPage.goto('about:blank');await otherPage.bringToFront();await page.waitForTimeout(500);
 const whileOtherPage=await page.evaluate(()=>({visibility:document.visibilityState,focus:document.hasFocus(),time:window.__SC2_REPORT__().time}));assert.equal(whileOtherPage.time,0);
 await otherPage.close();await page.bringToFront();await page.waitForFunction(()=>document.visibilityState==='visible'&&document.hasFocus());
 const afterVisibility=await page.evaluate(()=>({visibility:document.visibilityState,focus:document.hasFocus(),time:window.__SC2_REPORT__().time}));assert.equal(afterVisibility.time,0);
 report.visibilityProbe={before:beforeVisibility,whileOtherPage,after:afterVisibility,actualHiddenObserved:whileOtherPage.visibility==='hidden',method:'Open and foreground a second real browser tab, then close it and return. Report the actual document visibility; if headless Chrome keeps both visible, this is only focus recovery and not hidden-tab acceptance.'};await record('optional-page-returned');
 await page.evaluate(()=>{const extension=document.querySelector('#battle').getContext('webgl2').getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL restore extension unavailable');window.__7A_LOST_EXTENSION__=extension;extension.loseContext();});await page.waitForTimeout(400);await page.evaluate(()=>window.__7A_LOST_EXTENSION__.restoreContext());
 await page.waitForFunction(()=>!document.querySelector('#battle').getContext('webgl2').isContextLost());assert.equal((await read()).time,0);await record('optional-context-restored');
 await page.locator('[data-action=menu-race-next]').click();await page.locator('[data-action=menu-difficulty-next]').click();await page.locator('[data-action=menu-start]').click();
 await page.waitForFunction(()=>{const r=window.__SC2_REPORT__();return r.readiness.phase==='models'&&(r.readiness.progress??0)>=.35;},null,{timeout:900000});
 const interrupted=await read();await page.locator('[data-action=flow-cancel]').click();assert.equal((await read()).readiness.kind,null);assert.equal((await read()).time,0);report.interrupted=interrupted;await record('cancel-during-models');
 await page.locator('[data-action=menu-start]').click();await page.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__().readiness.phase),null,{timeout:900000});let r=await read();assert.equal(r.readiness.phase,'ready',JSON.stringify(r));assert.equal(r.time,0);assert.equal(r.assetsPending,0);assert.deepEqual(r.errors,[]);await record('replacement-ready');
 await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>window.__SC2_REPORT__().time>1);await page.locator('#topbar [data-action=pause]').click();r=await read();await page.waitForTimeout(350);assert.equal((await read()).time,r.time);await record('native-battle-paused');
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{report.finishedAt=new Date().toISOString();await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failure:report.failure}));}
