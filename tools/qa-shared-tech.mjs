import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out='reports/local/shared-tech-browser';await fs.mkdir(out,{recursive:true});
const report={method:'Visible desktop Chrome; constructed diagnostic battles for UI/rule checks, not natural balance or phone-hardware approval',checks:[],layouts:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false});let page;
try{
 page=await browser.newPage({viewport:{width:1440,height:900},hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:5174');await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
 await page.locator('[data-action=fullscreen]').click();report.fullscreen=await page.evaluate(()=>!!document.fullscreenElement);if(report.fullscreen)await page.evaluate(()=>document.exitFullscreen());
 for(const race of ['terran','zerg','protoss']){
  if(race!=='terran'){await page.locator('#topbar [data-action=pause]').click();await page.locator('[data-action=restart]').click();}
  await page.locator('[data-action=menu-new]').click();await page.locator(`[data-action=menu-race][data-race=${race}]`).click();await page.locator('[data-action=menu-race-next]').click();await page.locator('[data-action=menu-difficulty-next]').click();await page.locator('[data-action=menu-start]').click();
  await page.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__?.().readiness?.phase),null,{timeout:600000});assert.equal(await page.evaluate(()=>window.__SC2_REPORT__().readiness.phase),'ready');await page.locator('[data-action=flow-continue]').click();
  await page.evaluate(async()=>{const {world:w}=window.__SC2_DEBUG__;window.__SC2_DEBUG__.speed=0;w.autoWaves=false;w.wallet={minerals:10000,gas:10000};for(const p of Object.values(w.expedition.production))p.enabled={};const {buySupport,tickShopSupport}=await import('/src/simulation/combat/shop-support.ts');buySupport(w,'mines');buySupport(w,'strategic');w.expedition.support.stageReceipt='';tickShopSupport(w);w.changed();});
  await page.waitForTimeout(150);const state=await page.evaluate(()=>{const {world:w,view}=window.__SC2_DEBUG__;return {race:w.expedition.race,mines:w.expedition.support.mines.length,pending:w.expedition.support.minePending,errors:view.report().errors};});assert.equal(state.mines+state.pending,6);assert.deepEqual(state.errors,[]);report.checks.push({race,state});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);await page.locator('[data-action=strategic]').tap();await page.locator('[data-transfer-cancel]').tap();assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.expedition.support.ammo),1);assert.equal(await page.evaluate(()=>document.body.dataset.targetFamily),undefined);
  await page.locator('[data-action=strategic]').tap();await page.locator('[data-transfer-confirm]').tap();assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.expedition.support.ammo),0);assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.expedition.support.impacts.filter(i=>i.kind==='strategic').length),1);report.checks.push(`${race}: touch strike cancel retains ammo; confirm consumes exactly one`);
  for(const [width,height] of [[1440,900],[390,844],[844,390],[667,375],[930,430]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(200);
   const layout=await page.evaluate(()=>{const b=document.querySelector('#battle').getBoundingClientRect(),c=document.querySelector('#battle-console').getBoundingClientRect();return {width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth,canvas:b.bottom,console:c.top,consoleHeight:c.height,paused:window.__SC2_DEBUG__.world.paused,tiles:document.querySelectorAll('.squad-seat').length};});
   assert.ok(layout.scroll<=width+1,JSON.stringify(layout));assert.ok(Math.abs(layout.canvas-layout.console)<2,JSON.stringify(layout));assert.equal(layout.paused,false);if(width>height&&width<950)assert.equal(layout.consoleHeight,128);report.layouts.push({race,...layout});await page.screenshot({path:`${out}/${race}-${width}x${height}.png`});
  }
  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>{window.__SC2_DEBUG__.world.endStage();});
  await page.locator('[data-action=development-direction]').first().click();assert.ok(await page.locator('#reward-cards .reward-card').count()>0);await page.locator('#reward-cards [data-action=reward]').first().click();await page.waitForFunction(()=>window.__SC2_DEBUG__.world.rewardRound==='random');await page.screenshot({path:`${out}/${race}-shop-landscape.png`});
  const menu=await page.evaluate(()=>({round:window.__SC2_DEBUG__.world.rewardRound,offers:window.__SC2_DEBUG__.world.rewards.map(r=>r.name),scroll:document.documentElement.scrollWidth}));assert.equal(menu.round,'random');assert.equal(menu.offers.length,3);assert.ok(menu.scroll<=844);report.checks.push({race,menu});
  await page.locator('[data-action=skip]').click();await page.waitForFunction(()=>window.__SC2_DEBUG__.world.phase==='battle',null,{timeout:120000});await page.locator('[data-action=flow-continue]').waitFor({state:'hidden'});report.checks.push(`${race}: development purchase → shop → single-click next stage`);
  await page.setViewportSize({width:1440,height:900});
 }
 assert.deepEqual(report.errors,[]);
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;if(page){report.last=await page.evaluate(()=>window.__SC2_REPORT__?.());report.body=await page.locator('body').innerText();await page.screenshot({path:out+'/failure.png'});}}
finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
