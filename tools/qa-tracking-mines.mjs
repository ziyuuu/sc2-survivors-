import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='reports/local/tracking-mines-20261003';await fs.mkdir(out,{recursive:true});
const report={checks:[],errors:[]},browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});let page;
try{
 page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5175');await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
 for(const action of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await page.locator(`[data-action=${action}]`).click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>document.body.dataset.battleActionsReady==='true',null,{timeout:240000});await page.evaluate(()=>window.__SC2_DEBUG__.speed=0);
 const initial=await page.evaluate(async()=>{
  const {world:w,view:v}=window.__SC2_DEBUG__,{tickShopSupport}=await import('/src/simulation/combat/shop-support.ts'),{newSupportMine}=await import('/src/simulation/combat/tracking-mines.ts');
  w.paused=true;w.autoWaves=false;w.entities.clear();w.hive=null;w.expansionHives.clear();w.pods=[];w.fortifications.clear();w.economicTargets.clear();
  const p={x:w.anchor.x,z:w.anchor.z};w.addUnit('marine','terran',p.x-2,p.z-2);const target=w.addUnit('zergling','zerg',p.x+3,p.z);target.hp=target.maxHp=500;
  tickShopSupport(w);const s=w.expedition.support;s.stageReceipt=`${w.runId}:${w.stage}`;s.minePending=0;s.mines=[newSupportMine(w.nextId++,p)];w.paused=false;tickShopSupport(w);w.paused=false;w.changed();await v.prepareRosterAssets();w.changed();
  window.__MINE_TARGET__=target.id;return {phase:s.mines[0].phase,x:s.mines[0].point.x,emergeAt:s.mines[0].emergeAt};
 });console.log('mine fixture prepared');assert.equal(initial.phase,'emerging');await page.waitForTimeout(150);await page.screenshot({path:out+'/emerging.png'});report.checks.push('real original mine model renders emerging state');
 const saved=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;const run=w.captureRun();w.restoreRun(run);return {schema:run.schema,paused:w.paused,mine:w.expedition.support.mines[0]};});assert.equal(saved.schema,15);assert.equal(saved.paused,true);assert.equal(saved.mine.emergeAt,initial.emergeAt);
 const moving=await page.evaluate(async()=>{const w=window.__SC2_DEBUG__.world,{tickShopSupport}=await import('/src/simulation/combat/shop-support.ts');w.paused=false;w.time=w.expedition.support.mines[0].emergeAt;tickShopSupport(w);w.paused=false;w.changed();return structuredClone(w.expedition.support.mines[0]);});assert.equal(moving.phase,'chasing');assert.ok(Math.abs(moving.point.x-initial.x-.1)<1e-8);await page.waitForTimeout(150);await page.screenshot({path:out+'/chasing.png'});report.checks.push('emergence timer and stable target survive paused restore; real chasing changes position');
 const outcome=await page.evaluate(async()=>{const w=window.__SC2_DEBUG__.world,{tickShopSupport}=await import('/src/simulation/combat/shop-support.ts');w.paused=false;for(let i=0;i<100&&w.expedition.support.mines.length;i++){w.time+=1/60;tickShopSupport(w);}const hp=w.entities.get(window.__MINE_TARGET__).hp;tickShopSupport(w);w.paused=false;w.changed();return {hp,after:w.entities.get(window.__MINE_TARGET__).hp,mines:w.expedition.support.mines.length};});assert.deepEqual(outcome,{hp:380,after:380,mines:0});await page.waitForTimeout(150);await page.screenshot({path:out+'/exploded.png'});report.checks.push('one explosion removes mine and applies exactly 120 damage, repeated update does not repay');
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;if(page)await page.screenshot({path:out+'/failure.png'});}
finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
