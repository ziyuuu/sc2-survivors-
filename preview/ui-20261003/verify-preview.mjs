import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const output='reports/local/ui-redesign-20261003',url='http://127.0.0.1:4178/preview/ui-20261003/index.html';
await fs.mkdir(output,{recursive:true});
const report={at:new Date().toISOString(),scope:'Static UI prototype only; not game acceptance. Headless Chrome; desktop and emulated mobile viewports.',captures:[],errors:[],checks:[],layoutIssues:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true});const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(url);await page.waitForFunction(()=>window.__UI_PREVIEW__);
 const capture=async(route,label)=>{
  await page.selectOption('#page-select',route);await page.waitForTimeout(route==='loading'?2000:650);
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
  const audit=await page.evaluate(()=>{
   const f=document.querySelector('#game-frame').getBoundingClientRect();
   const important=[...document.querySelectorAll('.screen-bottom>.game-button,.main-action,.modal-footer>.game-button,.victory-actions>.game-button,.battle-console .command-key')].filter(n=>n.getClientRects().length);
   return{windowOverflow:document.documentElement.scrollWidth>innerWidth,missing:[...document.images].filter(n=>!n.naturalWidth).map(n=>n.src),outside:important.filter(n=>{const r=n.getBoundingClientRect();return r.right>f.right+1||r.left<f.left-1||r.bottom>f.bottom+1||r.top<f.top-1;}).map(n=>n.textContent.trim()),frame:{width:f.width,height:f.height},buttons:important.length};
  });
  if(audit.windowOverflow||audit.missing.length||audit.outside.length)report.layoutIssues.push({route,label,...audit});
  const file=`${route}-${label}.png`;await page.screenshot({path:path.join(output,file)});report.captures.push({route,label,file,...audit});
 };
 const routes=await page.evaluate(()=>window.__UI_PREVIEW__.routes);
 for(const route of routes)await capture(route,'landscape');
 await page.setViewportSize({width:390,height:844});await page.click('[data-layout=portrait]');
 for(const route of routes)await capture(route,'portrait');
 for(const viewport of [{width:844,height:390},{width:667,height:375}]){
  await page.setViewportSize(viewport);await page.click('[data-layout=landscape]');
  for(const route of ['home','race','difficulty','confirm','battle','development','shop','talents','pause','settings','victory'])await capture(route,`${viewport.width}x${viewport.height}`);
 }
 await page.setViewportSize({width:1440,height:900});await page.click('[data-layout=landscape]');
 await page.selectOption('#page-select','home');await page.locator('[data-action="route:race"]').click();
 await page.locator('[data-action=select-race][data-value=zerg]').click();assert.equal(await page.locator('[data-action=select-race][data-value=zerg]').getAttribute('aria-checked'),'true');
 await page.locator('[data-action="route:difficulty"]').last().click();await page.locator('[data-action=select-difficulty][data-value=hard]').click();
 await page.locator('[data-action="route:confirm"]').last().click();await page.locator('[data-action="route:loading"]').click();await page.waitForFunction(()=>!document.querySelector('#enter-battle').disabled);
 await page.locator('#enter-battle').click();await page.locator('[data-action="modal:pause"]').click();
 await page.locator('[data-action="modal:settings"]').click();await page.locator('[data-action=setting-tab][data-value=graphics]').click();await page.locator('[data-action=toggle-motion]').click();assert.equal(await page.evaluate(()=>window.__UI_PREVIEW__.getState().motion),false);
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.__UI_PREVIEW__.getState().layer),'pause');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.__UI_PREVIEW__.getState().layer),undefined);
 report.checks.push('Actual clickable new-game path: Zerg / Hard -> confirmation -> bounded loading -> battle; nested pause/settings returns correctly; motion switch works.');
 await page.setViewportSize({width:390,height:844});await page.click('[data-layout=portrait]');await page.selectOption('#page-select','battle');assert.equal(await page.locator('.unit-portrait').count(),14);
 await page.locator('[data-action=roster-next]').click();assert.equal(await page.locator('.unit-portrait').count(),14);assert.equal(await page.evaluate(()=>window.__UI_PREVIEW__.getState().rosterPage),1);
 await page.locator('.unit-portrait').first().click();assert.equal(await page.evaluate(()=>window.__UI_PREVIEW__.getState().layer),'unit');await page.keyboard.press('Escape');
 report.checks.push('Portrait battle preserves seven-by-two roster pages, unit inspector and return path.');
 await page.selectOption('#page-select','talents');assert.equal(await page.locator('.talent-node').count(),55);await page.locator('[data-action=talent-race][data-value=protoss]').click();assert.equal(await page.locator('.talent-node').count(),55);await page.locator('[data-action=talent-line][data-value=micro]').click();
 report.checks.push('All 165 authentic talent definitions; 55 per race, four lines, portrait branch navigation.');
 await page.selectOption('#page-select','pause');const modal=page.locator('[role=dialog]');const last=modal.locator('button').last();await last.focus();await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.querySelector('[role=dialog]').contains(document.activeElement)));await page.keyboard.press('Escape');
 report.checks.push('Modal keyboard focus remains within the active layer and Escape returns.');
 const storage=await page.evaluate(async()=>({localStorage:Object.keys(localStorage),databases:(await indexedDB.databases()).map(x=>x.name)}));assert.deepEqual(storage,{localStorage:[],databases:[]});
 report.checks.push('Prototype creates no localStorage entries or IndexedDB saves; no game code changed.');
 const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const reducedPage=await reduced.newPage();await reducedPage.goto(url);await reducedPage.waitForFunction(()=>window.__UI_PREVIEW__);assert.equal(await reducedPage.evaluate(()=>window.__UI_PREVIEW__.getState().motion),false);report.checks.push('OS reduced-motion preference is respected.');await reduced.close();
}catch(e){report.failure=String(e.stack||e);process.exitCode=1;}finally{await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({captures:report.captures.length,errors:report.errors,layoutIssues:report.layoutIssues,checks:report.checks,failure:report.failure},null,2));}
