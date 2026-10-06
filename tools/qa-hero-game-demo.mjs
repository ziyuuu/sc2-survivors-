import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='reports/local/hero-game-demo';
const report={checks:[],errors:[],remote:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
report.browser=browser.version();
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',e=>{report.errors.push(e.message);console.log('PAGE ERROR',e.message);});
page.on('request',r=>{if(/^https?:/.test(r.url()))report.remote.push(r.url());});
try{
 await page.goto('file:///D:/%E6%98%9F%E9%99%85/dist/Six-Heroes-Actual-Game-Demo.html');
 await page.waitForFunction(()=>window.__GAME_DEMO_REPORT__?.().ready||document.querySelector('#interface')?.textContent.includes('失败'),null,{timeout:240000}); assert.ok(await page.evaluate(()=>window.__GAME_DEMO_REPORT__?.().ready),await page.locator('#interface').textContent());
 console.log('Automatic battle ready');
 for(const id of ['raynor','tychus','nova','swann','tosh','yamato_battlecruiser']){
  await page.locator(`button[data-hero=${id}]`).click();
  await page.waitForFunction(()=>window.__GAME_DEMO_REPORT__().shots>6,null,{timeout:40000});
  await page.waitForTimeout(5000);
  const m=await page.evaluate(()=>window.__GAME_DEMO_REPORT__());
  assert.ok(m.time>0);assert.ok(m.shots>0);assert.ok(m.fx.impacts>0);assert.deepEqual(m.modelErrors,[]);assert.deepEqual(m.fxErrors,[]);
  report.checks.push(m);await page.screenshot({path:`${out}/${id}.png`});console.log(id,JSON.stringify(m));
 }
 await page.locator('#pause').click();const paused=await page.evaluate(()=>window.__GAME_DEMO_REPORT__().time);await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.__GAME_DEMO_REPORT__().time),paused);await page.locator('#pause').click();
 await page.locator('#rank').selectOption('5');await page.waitForFunction(()=>window.__GAME_DEMO_REPORT__().shots>6);assert.equal(await page.evaluate(()=>window.__GAME_DEMO_REPORT__().rank),5);
 for(const [width,height] of [[390,844],[844,390]]){await page.setViewportSize({width,height});await page.waitForTimeout(1000);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`${out}/view-${width}x${height}.png`});report.checks.push({viewport:[width,height]});}
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'});}finally{await browser.close();await fs.writeFile(out+'/qa.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}


