import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.argv[2], expectedBuild=process.argv[3];
assert(origin&&expectedBuild,'Provide published origin and expected appBuildId');
const output='reports/local/quality-deploy';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-background-timer-throttling']});
const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1});
await context.addInitScript(()=>{globalThis.__name=v=>v;localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:'low',tier:'low',texture:'low'}));});
const page=await context.newPage();page.setDefaultTimeout(180000);
const errors=[],failures=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/')&&!r.url().endsWith('favicon.ico'))failures.push({status:r.status(),url:r.url()});});
const tick=setInterval(async()=>{try{console.log('readiness',await page.evaluate(()=>globalThis.__SC2_REPORT__?.().readiness?.phase??document.title));}catch{}},20000);
const click=action=>page.locator(`[data-action="${action}"]:visible`).first().click();
try{
 const response=await page.request.get(origin+'/web-release.json');assert.equal(response.status(),200);
 const release=await response.json();assert.equal(release.appBuildId,expectedBuild);assert.equal(release.qualityVariants,true);
 const manage=await page.request.get(origin+'/manage');assert.equal(manage.status(),403);
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>globalThis.__SC2_REPORT__?.().phase==='menu'&&!document.getElementById('scs-opening-visual'),null,{timeout:300000});
 await click('settings');await page.locator('[data-action="settings-tab"][data-tab="graphics"]').click();
 assert.equal(await page.locator('[data-setting="graphics-preset"]').inputValue(),'low');
 assert.equal(await page.locator('[data-setting="texture-quality"]').inputValue(),'low');await click('settings-back');
 for(const action of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await click(action);
 await page.waitForFunction(()=>['ready','error'].includes(globalThis.__SC2_REPORT__().readiness.phase),null,{timeout:420000});
 assert.equal(await page.evaluate(()=>globalThis.__SC2_REPORT__().readiness.phase),'ready');await click('flow-continue');
 await page.waitForFunction(()=>globalThis.__SC2_REPORT__().time>3,null,{timeout:120000});await click('pause');
 const report=await page.evaluate(()=>globalThis.__SC2_REPORT__());
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 const result={release,publicEntry:true,unauthenticatedManageStatus:manage.status(),isolatedBrowser:true,physicalPhone:false,graphics:report.graphics,readiness:report.readiness,phase:report.phase,time:report.time,errors,failures};
 await fs.writeFile(output+'/online.json',JSON.stringify(result,null,2));console.log(JSON.stringify({build:release.appBuildId,phase:report.phase,time:report.time,errors,failures}));
}catch(error){await fs.writeFile(output+'/online-failure.json',JSON.stringify({error:String(error),errors,failures},null,2));throw error;}
finally{clearInterval(tick);await context.close();await browser.close();}
