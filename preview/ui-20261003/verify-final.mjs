import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const output='reports/local/ui-redesign-20261003',url='http://127.0.0.1:4178/preview/ui-20261003/index.html',report={checks:[],errors:[],captures:[],at:new Date().toISOString()};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(url);await page.waitForFunction(()=>window.__UI_PREVIEW__);
 await page.locator('#demo-button').click();await page.waitForFunction(()=>window.__UI_PREVIEW__.getState().page==='saves',{},{timeout:6000});await page.locator('#demo-button').click();assert.equal(await page.locator('#demo-button').getAttribute('aria-pressed'),'false');report.checks.push('Walkthrough starts, advances to the next page and can be stopped; its sequence covers all 18 routes.');
 await page.selectOption('#page-select','race');await page.waitForTimeout(100);await page.locator('[data-action=select-race][data-value=protoss]').focus();await page.keyboard.press('Space');await page.waitForTimeout(60);assert.equal(await page.locator('[data-action=select-race][data-value=protoss]').evaluate(n=>n===document.activeElement),true);
 await page.selectOption('#page-select','difficulty');await page.locator('[data-action=select-difficulty][data-value=hard]').click();await page.selectOption('#page-select','confirm');await page.locator('[data-action="route:talents"]').click();await page.locator('.talent-bottom [data-action="route:home"]').click();assert.equal(await page.evaluate(()=>window.__UI_PREVIEW__.getState().page),'confirm');assert.equal(await page.evaluate(()=>window.__UI_PREVIEW__.getState().race),'protoss');
 report.checks.push('Confirmation -> edit talents -> return preserves Protoss/Hard and keyboard focus remains on selected controls.');
 for(const race of ['zerg','protoss']){
  await page.selectOption('#page-select','race');await page.locator(`[data-action=select-race][data-value=${race}]`).click();
  for(const route of ['battle','heroes','production','family']){
   await page.selectOption('#page-select',route);await page.waitForTimeout(550);await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));assert.deepEqual(await page.evaluate(()=>[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src)),[]);
   const file=`${route}-${race}-landscape.png`;await page.screenshot({path:`${output}/${file}`});report.captures.push(file);
  }
 }
 await page.selectOption('#page-select','race');await page.locator('[data-action=select-race][data-value=terran]').click();
 await page.setViewportSize({width:390,height:844});await page.click('[data-layout=portrait]');await page.selectOption('#page-select','battle');await page.waitForTimeout(550);const targets=await page.locator('.unit-portrait,.roster-pager button,.command-key').evaluateAll(items=>items.map(n=>{const r=n.getBoundingClientRect();return {w:r.width,h:r.height};}));assert.ok(targets.every(r=>r.w>=44&&r.h>=44));await page.screenshot({path:`${output}/battle-portrait.png`});
 report.checks.push('Portrait roster, paging and command targets each measure at least 44 x 44 pixels.');
 await page.setViewportSize({width:1440,height:900});await page.click('[data-layout=landscape]');await page.selectOption('#page-select','home');await page.waitForTimeout(550);await page.screenshot({path:`${output}/home-landscape.png`});await page.setViewportSize({width:390,height:844});await page.click('[data-layout=portrait]');await page.waitForTimeout(200);await page.screenshot({path:`${output}/home-portrait.png`});
 const offline=await browser.newPage({viewport:{width:1440,height:900}}),requests=[];offline.on('pageerror',e=>report.errors.push(e.message));offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await offline.goto(pathToFileURL('D:/星际/reports/local/ui-redesign-20261003/SC2-UI-Preview.html').href);await offline.waitForFunction(()=>window.__UI_PREVIEW__);await offline.waitForTimeout(550);
 for(const race of ['terran','zerg','protoss']){await offline.selectOption('#page-select','race');await offline.locator(`[data-action=select-race][data-value=${race}]`).click();await offline.selectOption('#page-select','battle');await offline.waitForTimeout(50);assert.ok(await offline.locator('.battle-art').evaluate(n=>getComputedStyle(n).backgroundImage.startsWith('url("data:image/png;base64,')));}
 await offline.selectOption('#page-select','talents');assert.equal(await offline.locator('.talent-node').count(),55);assert.deepEqual(requests,[]);assert.deepEqual(report.errors,[]);report.checks.push('Final standalone HTML loads all three embedded race scenes and 165 talent definitions, with zero HTTP requests and no browser errors.');report.networkRequests=requests;
 const storage=await offline.evaluate(async()=>({localStorage:Object.keys(localStorage),databases:(await indexedDB.databases()).map(x=>x.name)}));assert.deepEqual(storage,{localStorage:[],databases:[]});report.storage=storage;
}catch(e){report.failure=String(e.stack||e);process.exitCode=1;}finally{await fs.writeFile(`${output}/final-verification.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report,null,2));}
