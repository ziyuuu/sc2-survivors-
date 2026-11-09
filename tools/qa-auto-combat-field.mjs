/** Bounded normal-clock rendering/settlement check in the isolated production-module candidate. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {serveTutorial} from './serve-short-tutorial-candidate.mjs';
import {tutorialWorkRoot} from './tutorial-candidate-paths.mjs';
const server=await serveTutorial({port:0,diagnostic:true}),rows=[];let browser,entry;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-background-timer-throttling']});
 const production=await browser.newPage(),entryErrors=[];production.on('pageerror',e=>entryErrors.push(e.message));await production.goto('http://127.0.0.1:'+server.address().port+'/');await production.locator('[data-action="menu-new"]:visible').waitFor({timeout:240000});await production.waitForFunction(()=>!document.getElementById('scs-opening-visual'));await production.locator('[data-action="menu-new"]:visible').click();await production.locator('[data-action="menu-race-next"]:visible').waitFor();assert.deepEqual(entryErrors,[]);entry={unmodifiedProductionMenu:true,errors:entryErrors};await production.close();
 for(const race of ['terran','zerg','protoss']){
  const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/qa.html');await page.waitForFunction(()=>globalThis.__TUTORIAL_APP__&&!document.getElementById('scs-opening-visual'),null,{timeout:240000});
  const click=a=>page.locator('[data-action="'+a+'"]:visible').first().click();await click('menu-new');await page.locator('[data-action="menu-race"][data-race="'+race+'"]').click();await click('menu-race-next');await click('menu-difficulty-next');await click('menu-start');await page.locator('[data-tutorial="skip"]').click();
  await page.waitForFunction(()=>['ready','error'].includes(globalThis.__TUTORIAL_APP__.readiness.state.phase),null,{timeout:240000});assert.equal(await page.evaluate(()=>globalThis.__TUTORIAL_APP__.readiness.state.phase),'ready');await click('flow-continue');await page.waitForFunction(()=>globalThis.__TUTORIAL_APP__.world.phase==='battle'&&!globalThis.__TUTORIAL_APP__.readiness.state.kind,null,{timeout:240000});
  const initial=await page.evaluate(()=>{const w=globalThis.__TUTORIAL_APP__.world,u=w.allies()[0],e=w.addUnit('roach','zerg',u.x+3,u.z);e.hp=e.maxHp=1000;e.stoppedUntil=w.time+30;globalThis.__AC_TARGET__=e.id;return {time:w.time,hp:e.hp,shots:w.stats.shots};});
  await page.waitForTimeout(12000);
  const final=await page.evaluate(async()=>{const {world:w,session,view}=globalThis.__TUTORIAL_APP__;await session.saveNow();return {time:w.time,hp:w.entities.get(globalThis.__AC_TARGET__)?.hp??0,shots:w.stats.shots,modelErrors:view.modelErrors,saveFailed:session.saveFailed,phase:w.phase};});
  assert.ok(final.time-initial.time>5);assert.ok(final.hp<initial.hp);assert.ok(final.shots>initial.shots);assert.equal(final.saveFailed,false);assert.deepEqual(errors,[]);rows.push({race,initial,final,errors,passed:true});await context.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));await fs.writeFile(tutorialWorkRoot+'/field.json',JSON.stringify({scope:'Full renderer and original game clock; synthetic stationary 1000-HP roach near the starting squad, twelve wall-clock seconds per race. No injected hits/time advances or combat stat buffs after setup. Not balance or device acceptance.',entry,rows},null,2));}console.log(JSON.stringify(rows));
