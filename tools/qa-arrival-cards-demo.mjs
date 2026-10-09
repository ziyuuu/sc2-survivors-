import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const out='reports/local/arrival-cards-20261009';
const build=JSON.parse(await fs.readFile(out+'/build.json','utf8'));
const report={build:build.sampleBuildId,checks:[],errors:[],captures:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
try{
 let page=await browser.newPage({viewport:{width:1440,height:900},hasTouch:false});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text().slice(0,600));});
 await page.goto(pathToFileURL(path.resolve(build.output)).href,{timeout:120000,waitUntil:'load'});
 await page.waitForFunction(()=>document.body.dataset.arrivalReady==='true',null,{timeout:180000});
 const state=()=>page.evaluate(()=>window.__ARRIVAL_DEMO_REPORT__());
 const capture=async name=>{await page.screenshot({path:out+'/'+name+'.png'});report.captures.push(name);};
 for(const [name,width,height]of [['desktop',1440,900],['portrait',390,844],['narrow',320,700],['landscape',844,390]]){
  if(name==='portrait'){await page.close();page=await browser.newPage({viewport:{width,height},hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text().slice(0,600));});await page.goto(pathToFileURL(path.resolve(build.output)).href,{timeout:120000,waitUntil:'load'});await page.waitForFunction(()=>document.body.dataset.arrivalReady==='true',null,{timeout:180000});}
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  await page.locator('[data-arrival=sequence]').click();await page.waitForTimeout(200);
  let s=await state();assert.equal(s.current?.kind,'elite');assert.equal(s.hero,1);assert.equal(s.elite,1);assert.equal(s.paused,false);
  const box=await page.locator('.arrival-card').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y+box.height<=height);
  for(const selector of ['#minimap','#joystick','.sample-army']){
   const b=await page.locator(selector).boundingBox();if(b&&await page.locator(selector).isVisible())assert.ok(box.x+box.width<=b.x||b.x+b.width<=box.x||box.y+box.height<=b.y||b.y+b.height<=box.y,'Overlaps '+selector+' '+name);
  }
  assert.equal(await page.locator('#arrival-layer').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
  assert.equal(await page.locator('.arrival-art > [data-art-key]').getAttribute('data-art-key'),'marine.2');
  await page.waitForFunction(()=>window.__ARRIVAL_DEMO_REPORT__().current?.kind==='hero');await page.waitForTimeout(820);
  assert.equal(await page.locator('.arrival-art > [data-art-key]').getAttribute('data-art-key'),'raynor');await capture(name+'-hero');
  await page.waitForFunction(()=>window.__ARRIVAL_DEMO_REPORT__().current===null);
  s=await state();assert.deepEqual(s.history.map(x=>x.kind),['elite','hero']);assert.ok(s.time>2);report.checks.push(name+': correct art, native joins, queue, dismissal, uninterrupted simulation, HUD separation');
  for(const [phase,time] of [['charge',200],['elite-burst',680],['elite',1100]]){
   await page.locator('[data-arrival=elite]').click();
   await page.locator('.arrival-card').evaluate((el,time)=>{for(const a of el.getAnimations({subtree:true})){a.pause();a.currentTime=time;}},time);
   if(phase==='elite-burst')assert.ok(await page.locator('.arrival-sparks i').evaluateAll(nodes=>nodes.some(e=>Number(getComputedStyle(e).opacity)>0)));
   await capture(name+'-'+phase);
  }

 }
 await page.setViewportSize({width:1440,height:900});await page.locator('[data-arrival=promotion]').click();await page.waitForTimeout(200);
 let s=await state();assert.equal(s.elite,2);assert.equal(s.current.promoted,true);assert.equal(s.current.rank,2);await capture('promotion');report.checks.push('Native repeat acquisition is a rank-II promotion');
 await page.locator('[data-arrival=sequence]').click();
 const before=await page.evaluate(()=>window.__BATTLE_UI_SAMPLE_REPORT__().anchor);
 await page.keyboard.down('w');await page.waitForTimeout(450);await page.keyboard.up('w');
 const after=await page.evaluate(()=>window.__BATTLE_UI_SAMPLE_REPORT__().anchor);
 assert.notDeepEqual(after,before);assert.equal((await state()).paused,false);report.checks.push('Keyboard movement continues while card is visible');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);await page.locator('[data-arrival=sequence]').click();
 const pad=await page.locator('#joystick').boundingBox(),cdp=await page.context().newCDPSession(page);
 const touchBefore=await page.evaluate(()=>window.__BATTLE_UI_SAMPLE_REPORT__().anchor);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pad.x+pad.width/2,y:pad.y+pad.height/2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pad.x+pad.width/2+26,y:pad.y+pad.height/2}]});
 await page.waitForTimeout(350);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.notDeepEqual(await page.evaluate(()=>window.__BATTLE_UI_SAMPLE_REPORT__().anchor),touchBefore);report.checks.push('Mobile touch joystick moves during arrival');
 await page.locator('[data-command=dash]').tap();
 assert.equal(await page.locator('[data-command=dash]').evaluate(e=>e.classList.contains('cooling')),true);report.checks.push('Native acceleration remains usable during arrival');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-arrival=hero]').click();await page.waitForTimeout(200);
 assert.ok(['none','arrival-fade'].includes(await page.locator('.arrival-card').evaluate(e=>getComputedStyle(e).animationName)));assert.equal(await page.locator('.arrival-card').evaluate(e=>getComputedStyle(e).transform),'none');await capture('reduced-motion');report.checks.push('Reduced motion has no translation or scaling');
 assert.deepEqual(report.errors,[]);
 report.runtimeErrors=await page.evaluate(()=>window.__BATTLE_UI_SAMPLE_REPORT__().errors);assert.deepEqual(report.runtimeErrors,[]);
}catch(e){report.failure=e.stack;throw e;}finally{await fs.writeFile(out+'/browser.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
