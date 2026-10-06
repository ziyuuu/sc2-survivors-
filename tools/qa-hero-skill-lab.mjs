import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const out='reports/local/hero-skill-lab';const report={checks:[],visualChecks:[],errors:[],remote:[],consoleErrors:[]};
const beforeRevision=JSON.parse(await fs.readFile('.cache/hero-skill-lab/qa-before-r2.json','utf8').catch(()=>'{"checks":[]}'));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});report.browser=browser.version();const page=await browser.newPage({viewport:{width:1440,height:900},hasTouch:true});
page.on('pageerror',e=>{report.errors.push(e.message);console.log('Page error',e.message);});page.on('request',r=>{if(/^https?:/.test(r.url()))report.remote.push(r.url());});page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text().slice(0,250));});
const state=()=>page.evaluate(()=>window.__SKILL_DEMO_REPORT__());
async function age(t){await page.waitForFunction(t=>window.__SKILL_DEMO_REPORT__().age>=t,t,{timeout:40000});}
async function pauseAt(t,name){await age(t);await page.locator('#pause').click();await page.screenshot({path:out+'/'+name+'.png'});const s=await state();await page.locator('#pause').click();return s;}
try{
 await page.goto('file:///D:/%E6%98%9F%E9%99%85/dist/Six-Terran-Heroes-Skills-Only.html');await page.waitForFunction(()=>window.__SKILL_DEMO_REPORT__?.().ready||document.querySelector('#interface')?.textContent.includes('失败'),null,{timeout:240000});assert.ok((await state()).ready,await page.locator('#interface').textContent());console.log('Skills ready');
 await page.locator('#auto').click();
 for(const id of ['raynor','tychus','nova','swann','tosh','yamato_battlecruiser']){
  await page.locator(`button[data-hero=${id}]`).click();await page.locator('#speed').selectOption('.25');
  const targetTime={raynor:.9,tychus:1.1,nova:1.04,swann:1.9,tosh:1.37,yamato_battlecruiser:1.42}[id];const release=await pauseAt(targetTime,id+'-release');
  assert.ok(release.visuals.shapes.includes('ring'));assert.ok(release.visuals.shapes.includes('shield'));assert.equal(release.visualTuning.geometricCircles,true);
  if(id==='swann'){assert.equal(release.visuals.shields,7);assert.ok(release.visuals.rings>=7);report.visualChecks.push({hero:id,...release.visuals});}
  if(id==='tosh'){assert.ok(release.visuals.rings>0);report.visualChecks.push({hero:id,...release.visuals});}
  if(id==='tychus'){assert.ok(release.visuals.grenadeVisible);assert.equal(release.visuals.grenadeScale,1.6);report.visualChecks.push({hero:id,...release.visuals});}
  if(id==='raynor'){const held=await pauseAt(1.55,id+'-held-ray');assert.ok(held.visuals.castAge>.65&&held.visuals.castAge<1);assert.equal(held.visuals.beamWidths.length,2);report.visualChecks.push({hero:id,...held.visuals});}
  if(id==='yamato_battlecruiser'){assert.ok(release.visuals.castAge<1);assert.ok(release.visuals.beamWidths.includes(.14));assert.ok(release.visuals.rings>0);report.visualChecks.push({hero:id,phase:'guide',...release.visuals});const flight=await pauseAt(1.95,id+'-projectile');assert.ok(flight.visuals.beamWidths.includes(.85));assert.ok(flight.visuals.beamWidths.includes(.22));assert.ok(!flight.visuals.beamWidths.includes(4.25));report.visualChecks.push({hero:id,phase:'projectile',...flight.visuals});}
  if(id==='nova'){const hit=await pauseAt(1.23,id+'-impact');assert.ok(hit.visuals.rings>0);}if(id==='tychus'){const hit=await pauseAt(1.6,id+'-impact');assert.ok(hit.visuals.rings>0);}if(id==='yamato_battlecruiser'){const hit=await pauseAt(2.1,id+'-impact');assert.ok(hit.visuals.rings>0);}
  await page.locator('#speed').selectOption('1');await age(id==='swann'?5.1:id==='tychus'?4.7:2.9);await page.locator('#pause').click();
  const s=await state();assert.equal(s.shots,0);assert.equal(s.castFailure,'');assert.ok(s.launched);assert.ok(s.effects.impacts>0);assert.deepEqual(s.modelErrors,[]);assert.deepEqual(s.fxErrors,[]);if(id==='swann'){assert.ok(s.healed>0);assert.equal(s.castTargets.length,7);assert.ok(s.targets.every(t=>t.protectedUntil>.8));}else assert.ok(s.targets.some(t=>t.hpNow<t.hp));if(id==='tychus')assert.ok(s.effects.dots>0);
  const old=beforeRevision.checks.find(c=>c.hero===id);if(old){for(const key of ['damage','kills','healed','shots'])assert.equal(s[key],old[key]);assert.deepEqual(s.targets.map(t=>t.hpNow),old.targets.map(t=>t.hpNow));}
  report.checks.push(s);await page.screenshot({path:out+'/'+id+'-result.png'});console.log(id,JSON.stringify({shots:s.shots,hits:s.effects.impacts,dots:s.effects.dots,kills:s.kills,healed:s.healed,errors:s.modelErrors}));
  const before=s.time;await page.waitForTimeout(400);assert.equal((await state()).time,before);
 }
 await page.locator('#rank').selectOption('5');assert.equal((await state()).rank,5);await age(2.15);await page.locator('#pause').click();await page.screenshot({path:out+'/yamato-rank-v.png'});
 for(const [width,height] of [[390,844],[844,390],[667,375]]){
  await page.setViewportSize({width,height});await page.locator('button[data-hero=swann]').click();await age(2.2);await page.locator('#pause').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const boxes=await page.locator('#cast,#pause,#auto').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,bottom:r.bottom};}));assert.ok(boxes.every(b=>b.width>=44&&b.height>=44&&b.bottom<=height));await page.screenshot({path:out+`/view-${width}x${height}.png`});report.checks.push({viewport:[width,height],boxes});
 }
 await page.setViewportSize({width:1440,height:900});await page.locator('button[data-hero=raynor]').click();await page.locator('#auto').click();const cycle=(await state()).cycle;await page.waitForFunction(c=>window.__SKILL_DEMO_REPORT__().cycle>c,cycle,{timeout:15000});assert.equal((await state()).shots,0);report.checks.push({autoLoop:true});
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.remote,[]);assert.deepEqual(report.consoleErrors,[]);
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'});}finally{await browser.close();await fs.writeFile(out+'/qa.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,visualChecks:report.visualChecks,failure:report.failure,errors:report.errors,remote:report.remote,consoleErrors:report.consoleErrors,browser:report.browser}));}

