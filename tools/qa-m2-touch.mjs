import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const out='reports/local/qa-m2';await fs.mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),checks:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5173/');
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
 await page.locator('[data-action=menu-new]').tap();
 await page.locator('[data-action=menu-race][data-race=protoss]').tap();
 await page.locator('[data-action=menu-race-next]').tap();
 await page.locator('[data-action=menu-difficulty-next]').tap();
 await page.locator('[data-action=menu-start]').tap();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});
 await page.locator('[data-action=flow-continue]').tap();
 await page.waitForFunction(()=>window.__SC2_REPORT__().phase==='battle');
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.runConfig.frozenTalents.levels['P-M04']=1;w.changed();});
 await page.locator('[data-action=airlift]').tap();
 const member=page.locator('#transfer-picker [data-transfer-id]').first();await member.waitFor();
 const initial=await member.getAttribute('aria-pressed');await member.tap();assert.notEqual(await member.getAttribute('aria-pressed'),initial);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:out+'/touch-transfer.png'});
 await page.locator('#transfer-picker [data-transfer-cancel]').tap();
 assert.equal(await page.locator('#transfer-picker').isHidden(),true);
 assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.talentTransferPlan),null);
 report.checks.push('390×844 touch opens transfer through the actual HUD action, toggles a member and cancels without a committed plan or horizontal overflow');
 assert.deepEqual(report.errors,[]);await context.close();
}catch(error){report.failure=String(error?.stack??error);console.error(report.failure);process.exitCode=1;}
finally{await fs.writeFile(out+'/touch.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
