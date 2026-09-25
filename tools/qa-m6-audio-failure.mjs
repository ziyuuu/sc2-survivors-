import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const output='reports/local/qa-m6-audio-failure';await fs.mkdir(output,{recursive:true});
const report={at:new Date().toISOString(),checks:[],errors:[],failure:null};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.route('**/assets/audio/shot.wav',route=>route.abort());
 await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5173/');
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
 await page.locator('[data-action=menu-new]').click();
 await page.locator('[data-action=menu-race-next]').click();
 await page.locator('[data-action=menu-difficulty-next]').click();
 await page.locator('[data-action=menu-start]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='error',null,{timeout:240000});
 const failed=await page.evaluate(()=>window.__SC2_REPORT__());
 assert.equal(failed.phase,'menu');
 assert.match(failed.readiness.error,/必需音效未就绪/);
 assert.equal(await page.locator('[data-action=flow-retry]').count(),1);
 report.checks.push('required audio decode/read failure keeps new run uncommitted and shows retry');
 await page.unroute('**/assets/audio/shot.wav');
 await page.locator('[data-action=flow-retry]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});
 await page.locator('[data-action=flow-continue]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='battle');
 report.checks.push('retry decodes missing audio and starts the same selected run');
 if(report.errors.length)throw Error(report.errors.join(' | '));
}catch(error){report.failure=String(error?.stack??error);process.exitCode=1;}
finally{await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
