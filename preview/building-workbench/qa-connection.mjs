import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const revision=process.env.MVP1_QA_REVISION??'connection-r1',out=path.resolve('reports/local/mvp1-building-integration-20261013',revision);
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({reducedMotion:'reduce'}),checks=[],images=[],errors=[],external=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(r.url().startsWith('http')&&!r.url().startsWith('http://127.0.0.1:4387/'))external.push(r.url());});
const load=(race,scene='developed')=>page.goto(`http://127.0.0.1:4387/?review=${revision}&race=${race}&scene=${scene}`,{waitUntil:'load'});
const snap=()=>page.evaluate(()=>window.__MVP1_CONNECTION__.snapshot());
const root=action=>page.locator(`.intermission-screen [data-action="${action}"]`).first(),tab=action=>page.locator(`.wb-base-tabs [data-action="${action}"]`);
const image=async name=>{await page.screenshot({path:path.join(out,name+'.png')});images.push(name+'.png');};
const tech=()=>page.locator('.wb-skill-card,.wb-research-node,.wb-system-card').evaluateAll(els=>els.map(el=>[el.dataset.skill??el.dataset.research??el.dataset.system,el.querySelector('.wb-tech-state').textContent]));
const tabs=async selected=>{assert.equal(await page.locator('.wb-base-tabs [role="tab"]').count(),3);assert.equal(await tab(selected).getAttribute('aria-selected'),'true');for(const action of ['placement','research','tree'])assert.ok(await tab(action).isVisible());};
async function findCard(id){for(let i=0;i<50;i++){const button=page.locator(`.im-card-action[data-id="${id}"]`);if(await button.count()){if(await button.isDisabled())await page.locator('#review-funds').click();return button;}if(i%4===0)await page.locator('#review-funds').click();await root('refresh').click();}throw Error('Missing card '+id);}
const next=async()=>{await root('next').click();await root('next').click();await page.locator('[data-action="next-stage"]').click();};
let failure;
try{
 for(const [format,viewport] of [['desktop',{width:1440,height:900}],['portrait',{width:390,height:844}]]){
  await page.setViewportSize(viewport);
  for(const race of ['terran','zerg','protoss']){
   await load(race);let s=await snap();assert.equal(s.scope,'isolated-module-not-mounted');
   assert.match(await page.locator('.wb-refresh-cost').getAttribute('aria-label'),/0水晶/);
   assert.equal(await page.locator('.feedback-progress-strip [data-action]').count(),3);assert.doesNotMatch(await page.locator('.feedback-progress-strip').innerText(),/武器|防护/);
   await image(race+'-'+format+'-building');
   const initial=s.state.wallet.minerals;await root('refresh').click();s=await snap();assert.equal(s.state.wallet.minerals,initial);assert.equal(s.state.paidRefresh,0);assert.match(await page.locator('.wb-refresh-cost').getAttribute('aria-label'),/50水晶/);
   await root('refresh').click();assert.equal((await snap()).state.wallet.minerals,initial-50);
   await root('placement').click();await tabs('placement');await image(race+'-'+format+'-placement');
   assert.doesNotMatch(await page.locator('[role="tabpanel"]').innerText(),/轮流|付费订单|每组最多|→|待定/);
   const enabled=()=>page.locator('.wb-facility [data-action="enable"]').first();await enabled().click();
   await tab('research').click();await tabs('research');
   assert.equal(await page.locator('.wb-skill-card').count(),5);assert.equal(await page.locator('.wb-research-node').count(),18);
   const sizes=await page.locator('.wb-ui-icon').evaluateAll(els=>els.map(el=>[el.getBoundingClientRect().width,el.getBoundingClientRect().height]));assert.ok(sizes.length&&sizes.every(([w,h])=>w===28&&h===28));
   const fonts=await page.locator('.wb-item-heading').evaluateAll(els=>els.map(el=>[getComputedStyle(el.querySelector('strong')).fontSize,getComputedStyle(el.querySelector('.wb-tech-state,.wb-node-state')).fontSize]));assert.ok(fonts.every(([a,b])=>a==='14px'&&b==='12px'));
   assert.doesNotMatch(await page.locator('[role="dialog"]').innerText(),/布置只影响后续生产|基础生产建筑|基础研究|阶段\s*(6|12)/);
   const state=await tech();await image(race+'-'+format+'-technology');await tab('tree').click();await tabs('tree');assert.deepEqual(await tech(),state);await image(race+'-'+format+'-tree');
   await page.locator('.modal-content').evaluate(el=>el.scrollTop=el.scrollHeight);await tabs('tree');assert.equal(await page.locator('.modal-content').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
   await tab('placement').click();assert.equal(await enabled().getAttribute('aria-pressed'),'false');await page.keyboard.press('ArrowRight');await tabs('research');await page.keyboard.press('End');await tabs('tree');await page.keyboard.press('Home');await tabs('placement');
   await page.locator('[data-action="apply"]').click();assert.equal((await snap()).state.groups[0].enabled,false);
   await root('placement').click();await enabled().click();await tab('tree').click();await page.keyboard.press('Escape');assert.equal((await snap()).state.groups[0].enabled,false);assert.equal(await root('placement').evaluate(el=>el===document.activeElement),true);
   await page.locator('#review-funds').click();const before=(await snap()).state.wallet;await page.locator('#review-production').click();s=await snap();assert.ok(s.orders.length);assert.ok(s.orders.some(j=>j.state==='settled'));assert.ok(s.state.wallet.minerals<before.minerals);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   checks.push(race+' '+format+': shared icons/fonts/tabs/draft, real refresh costs and native isolated production');
  }
 }
 await page.setViewportSize({width:1440,height:900});
 for(const race of ['terran','protoss']){await load(race,'prerequisite');assert.equal(await page.locator('.im-card').count(),0);assert.equal(await page.locator('.wb-prerequisite .wb-ui-icon').count(),1);assert.ok(await root('refresh').isDisabled());await image(race+'-prerequisite');checks.push(race+': prerequisite is an icon with no cross-line purchase option');}
 await load('zerg','opening');const roach=await findCard('unlock.roach');await roach.click();assert.equal((await snap()).state.tech['unlock.roach'],1);await next();await page.locator('[data-action="direction"][data-line="zerg.evolution"]').click();const evolution=await findCard('evolve-zerg.evolution');
 let before=await snap();const quote=before.state.offers['zerg.evolution'].find(q=>q.projectId==='evolve-zerg.evolution');assert.deepEqual(quote.baseCost,{minerals:150,gas:100});await evolution.click();assert.equal(await page.locator('#target-hatchery option').count(),1);await image('zerg-evolution-target');await page.locator('[data-action="confirm"]').click();let after=await snap();assert.deepEqual(after.state.groups[0].directions,['ground']);assert.equal(after.state.wallet.minerals,before.state.wallet.minerals-quote.cost.minerals);assert.equal(after.state.tech['unlock.hydralisk'],1);checks.push('Zerg ground evolution charges the approved quote and updates only the selected hatchery');
 await next();await page.locator('[data-action="direction"][data-line="zerg.air"]').click();await (await findCard('evolve-zerg.air')).click();await page.locator('[data-action="confirm"]').click();assert.deepEqual((await snap()).state.groups[0].directions,['ground','air']);await root('placement').click();const h=page.locator('.wb-facility[data-facility="h1"]');await h.locator('[data-family="zergling"]').click();await h.locator('[data-family="hydralisk"]').click();await h.locator('[data-family="mutalisk"]').click();await tab('research').click();await tab('placement').click();await page.locator('[data-action="apply"]').click();assert.deepEqual((await snap()).state.groups[0].outputs,['hydralisk','mutalisk']);checks.push('Zerg second direction retains both directions and accepts mixed two-output placement');
 await load('protoss','opening');await (await findCard('crystal')).click();after=await snap();assert.equal(after.state.groups.find(g=>g.kind==='crystal').ids.length,2);await root('placement').click();assert.equal(await page.locator('.wb-facility[data-facility="crystal-pair"] [data-family="zealot"]').isDisabled(),false);const crystalToggle=()=>page.locator('.wb-facility[data-facility="crystal-pair"] [data-action="enable"]');assert.equal(await crystalToggle().isDisabled(),false);await crystalToggle().click();await tab('tree').click();await tab('placement').click();assert.equal(await crystalToggle().getAttribute('aria-pressed'),'false');await page.keyboard.press('Escape');assert.equal((await snap()).state.groups.find(g=>g.kind==='crystal').enabled,true);await root('placement').click();await crystalToggle().click();await image('protoss-crystal-placement');await page.locator('[data-action="apply"]').click();assert.equal((await snap()).state.groups.find(g=>g.kind==='crystal').enabled,false);await next();await (await findCard('crystal')).click();assert.equal((await snap()).state.groups.find(g=>g.kind==='crystal').ids.length,4);checks.push('Protoss builds two full crystal pairs; outputs and production toggle are enabled; tab/cancel/apply semantics match other groups');
 for(const race of ['terran','zerg','protoss']){await load(race,'poor');const before=(await snap()).state.wallet;assert.equal(await page.locator('.im-card-action:not(:disabled)').count(),0);await root('refresh').click();assert.deepEqual((await snap()).state.wallet,before);assert.ok(await root('refresh').isDisabled());checks.push(race+': unaffordable purchase/paid refresh is disabled; initial free refresh still works');}
 await load('terran','opening');for(let stage=1;stage<18;stage++)await next();assert.equal((await snap()).state.stage,18);await root('next').click();await root('next').click();assert.equal(await page.locator('[data-action="next-stage"]').count(),0);assert.equal(await page.locator('[data-action="restart-review"]').count(),1);checks.push('Original three-step flow remains navigable through stage18 without a stage19');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}catch(e){failure=String(e);await image('failure');}
finally{fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({scope:'Independent module only, not main-game integration or save/combat acceptance',checks,images,errors,external,failure},null,2));await browser.close();}
console.log(JSON.stringify({checks:checks.length,images:images.length,errors,external,failure}));if(failure)process.exitCode=1;
