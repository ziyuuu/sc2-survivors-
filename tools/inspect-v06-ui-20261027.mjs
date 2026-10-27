import {chromium} from '@playwright/test';
import {gunzipSync,gzipSync} from 'node:zlib';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const output=process.env.V06_UI_OUTPUT??'reports/local/v06-feedback-20261027';await fs.mkdir(output,{recursive:true});
const origin=process.env.V06_UI_URL??'http://127.0.0.1:18801';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();page.setDefaultTimeout(60000);
const errors=[],httpErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/api/config'))httpErrors.push([r.status(),r.url()]);});
// Expose the boot result only in this diagnostic response; shipped bytes stay unchanged.
await page.route(/\/assets\/sc2-entry(?:\.[\da-f]+)?\.js\.gz$/,async route=>{const r=await route.fetch(),code=gunzipSync(await r.body()).toString('utf8'),match=code.match(/([\w$]+)\(\)\.catch\(\w+=>\{/g)?.at(-1);assert.ok(match);const at=code.lastIndexOf(match),patched=code.slice(0,at)+code.slice(at).replace(match,match.replace('.catch(','.then(value=>{globalThis.__V06__=value;return value}).catch('));await route.fulfill({response:r,body:gzipSync(patched),headers:{...r.headers(),'content-type':'application/octet-stream'}});});
let phase='opening';const timer=setInterval(()=>console.log(JSON.stringify({phase})),25000);
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>globalThis.__V06__&&!document.getElementById('scs-opening-visual'),null,{timeout:180000});
 phase='new-game';const click=async action=>page.locator(`[data-action="${action}"]:visible`).first().click();
 await click('menu-new');await click('menu-race-next');await click('menu-difficulty-next');await click('menu-start');
 await page.waitForFunction(()=>['ready','error'].includes(globalThis.__SC2_REPORT__().readiness.phase),null,{timeout:300000});assert.equal(await page.evaluate(()=>globalThis.__SC2_REPORT__().readiness.phase),'ready');await click('flow-continue');
 await page.waitForFunction(()=>globalThis.__SC2_REPORT__().time>1,null,{timeout:120000});
 phase='battle';const battle=await page.evaluate(()=>({text:document.getElementById('interface').innerText,rings:document.querySelectorAll('.loading-ring').length,report:globalThis.__SC2_REPORT__()}));await fs.writeFile(output+'/baseline-battle.json',JSON.stringify(battle,null,2));await page.screenshot({path:output+'/battle.png'});
 if(process.env.V06_FINAL==='1'){
  assert.equal(battle.rings,0);const checks=[];
  for(const [width,height]of [[1440,900],[844,390],[390,844]]){
   phase='cards-'+width+'x'+height;await page.setViewportSize({width,height});
   if(checks.length===0)await page.evaluate(()=>{const {world:w}=globalThis.__V06__;w.phase='battle';w.paused=false;w.stage=3;w.stageElapsed=0;w.prepareStage();w.specialStages.ticket={stage:4,kind:'resources',claimed:false};w.specialStages.offerChecked=4;w.endStage();w.skipReward();w.wallet={minerals:100000,gas:100000};w.changed();});
   await page.waitForSelector('#reward-cards .imx-card-body');await page.waitForTimeout(700);
   const rectangles=()=>page.evaluate(()=>[...document.querySelectorAll('#reward-cards>.im-card')].map(e=>({id:e.dataset.cardId,name:e.querySelector('h2')?.textContent,rect:e.getBoundingClientRect().toJSON(),animation:getComputedStyle(e).animationName,rows:getComputedStyle(e).gridTemplateRows,html:e.outerHTML,parts:[...e.querySelectorAll('.imx-name,.imx-kind,.imx-copy,.im-card-bottom,.im-card-action,.im-card-status')].map(n=>({class:n.className,rect:n.getBoundingClientRect().toJSON(),css:Object.fromEntries(['height','min-height','padding','margin','border-width','line-height','font-size','box-sizing','display'].map(k=>[k,getComputedStyle(n).getPropertyValue(k)]))}))})));
   const before=await rectangles();assert.equal(before.length,3);assert.ok(before.some(c=>c.id.includes(':special-ticket:')));
   const button=checks.length===0?page.locator('#reward-cards>.im-card').filter({has:page.locator('[data-id*="special-ticket"]')}).locator('.im-card-action'):page.locator('#reward-cards .im-card-action:not(:disabled)').first();await button.click();
   const samples=[];for(let i=0;i<4;i++){await page.waitForTimeout(80);samples.push(await rectangles());}
   await fs.writeFile(output+'/'+width+'x'+height+'-measurements.json',JSON.stringify({before,samples},null,2));
   for(const sample of samples)for(const [i,c]of sample.entries()){assert.ok(Math.abs(c.rect.width-before[i].rect.width)<1);assert.ok(Math.abs(c.rect.height-before[i].rect.height)<1,`${width}: ${c.name} height shifted ${before[i].rect.height} -> ${c.rect.height}`);assert.notEqual(c.animation,'im-deal');}
   await page.screenshot({path:output+'/'+width+'x'+height+'.png'});checks.push({width,height,threeCards:true,ticketSameWidth:before.every(c=>Math.abs(c.rect.width-before[0].rect.width)<1),purchaseStable:true});
  }
  phase='special-entry';await page.evaluate(()=>{const {world:w}=globalThis.__V06__;w.finishIntermission();});
  await page.waitForFunction(()=>globalThis.__V06__.world.specialStages.active?.phase==='active',null,{timeout:180000});
  assert.equal(await page.locator('.loading-ring').count(),0);assert.equal(await page.locator('.special-dialog:visible').count(),0);
  const report={checks,battleRingRemoved:true,specialEntered:true,errors,httpErrors};assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);await fs.writeFile(output+'/final-ui.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }else{
 await page.evaluate(()=>{const {world:w}=globalThis.__V06__;w.paused=false;w.stage=7;w.stageElapsed=0;w.prepareStage();w.endStage();w.skipReward();w.wallet={minerals:100000,gas:100000};w.changed();});
 await page.waitForSelector('.imx-card-body');
 const sample=()=>page.evaluate(()=>({text:document.getElementById('interface').innerText,cards:[...document.querySelectorAll('#reward-cards>.im-card')].map(e=>({id:e.dataset.cardId,name:e.querySelector('h2')?.textContent,rect:e.getBoundingClientRect().toJSON(),rows:getComputedStyle(e).gridTemplateRows,html:e.outerHTML})),grid:document.querySelector('#reward-cards')?.getBoundingClientRect().toJSON(),report:globalThis.__SC2_REPORT__()}));
 const before=await sample();await page.screenshot({path:output+'/before.png'});
 const action=page.locator('#reward-cards .im-card-action:not(:disabled)').first();if(await action.count())await action.click();await page.waitForTimeout(1200);
 const after=await sample();await page.screenshot({path:output+'/after.png'});
 await fs.writeFile(output+'/baseline-ui.json',JSON.stringify({before,after,errors,httpErrors},null,2));console.log(JSON.stringify({before:before.cards.map(c=>({name:c.name,rect:c.rect})),after:after.cards.map(c=>({name:c.name,rect:c.rect})),text:after.text.slice(-1500),errors,httpErrors}));
 }
}catch(error){await fs.writeFile(output+'/failure.json',JSON.stringify({phase,error:String(error),errors,httpErrors,text:await page.locator('body').innerText().catch(()=>''),report:await page.evaluate(()=>globalThis.__SC2_REPORT__?.()).catch(()=>null)},null,2));await page.screenshot({path:output+'/failure.png'}).catch(()=>{});throw error;}finally{clearInterval(timer);await context.close();await browser.close();}
