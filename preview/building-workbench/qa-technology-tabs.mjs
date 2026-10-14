import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const out=path.resolve('reports/local/mvp1-intermission-design-20261013',process.env.MVP1_QA_REVISION??'r10');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({reducedMotion:'reduce'}),checks=[],images=[],errors=[],external=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(r.url().startsWith('http')&&!r.url().startsWith('http://127.0.0.1:4387/'))external.push(r.url());});
const root=action=>page.locator(`.intermission-screen [data-action="${action}"]`).first();
const tab=action=>page.locator(`.wb-base-tabs [data-action="${action}"]`);
const openResearch=async()=>{await root('placement').click();await tab('research').click();};
const screen=async(name)=>{await page.screenshot({path:path.join(out,name+'.png')});images.push(name+'.png');};
const load=(race,scene='developed')=>page.goto(`http://127.0.0.1:4387/?race=${race}&scene=${scene}`,{waitUntil:'load'});
const assertTabs=async(action)=>{assert.equal(await page.locator('.wb-base-tabs [role="tab"]').count(),3);assert.equal(await page.locator('.wb-base-tabs [aria-selected="true"]').count(),1);assert.equal(await tab(action).getAttribute('aria-selected'),'true');for(const t of await page.locator('.wb-base-tabs [role="tab"]').all())assert.equal(await t.isVisible(),true);assert.equal(await page.locator('[role="tabpanel"]').getAttribute('aria-labelledby'),'facility-tab-'+action);};
const techSnapshot=()=>page.locator('.wb-skill-card,.wb-research-node,.wb-system-card').evaluateAll(els=>els.map(el=>[el.dataset.skill??el.dataset.research??el.dataset.system,el.querySelector('.wb-tech-state').textContent]));
const assertPresentation=async()=>{
 const sizes=await page.locator('[role="tabpanel"] .wb-ui-icon').evaluateAll(els=>els.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));assert.ok(sizes.length>0&&sizes.every(s=>s.w===28&&s.h===28));
 assert.equal(await page.locator('.modal-heading p,.wb-stage-gate,.wb-tree-prerequisite').count(),0);
 assert.doesNotMatch(await page.locator('[role="dialog"]').innerText(),/布置只影响后续生产|基础生产建筑|基础研究|阶段\s*(6|12)/);
 const headings=await page.locator('.wb-item-heading').evaluateAll(els=>els.map(el=>({title:parseFloat(getComputedStyle(el.querySelector('strong')).fontSize),state:parseFloat(getComputedStyle(el.querySelector('.wb-tech-state,.wb-node-state')).fontSize)})));assert.ok(headings.length>0&&headings.every(h=>h.title===14&&h.state===12));
 const inline=await page.locator('.wb-skill-body>.wb-item-heading,.wb-system-body>.wb-item-heading').evaluateAll(els=>els.map(el=>{const title=el.querySelector('strong').getBoundingClientRect(),state=el.querySelector('.wb-tech-state').getBoundingClientRect();return state.left>=title.right&&Math.abs(title.top+title.height/2-state.top-state.height/2)<2;}));assert.ok(inline.every(Boolean),'skill and system status must sit beside the title');
 assert.equal(await page.locator('.modal-content').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
};
let failure;
try{
 for(const [label,viewport] of [['desktop',{width:1440,height:900}],['portrait',{width:390,height:844}]]){
  await page.setViewportSize(viewport);
  for(const race of ['terran','zerg','protoss']){
   await load(race);await root('placement').click();await assertTabs('placement');
   assert.equal(await page.locator('.wb-placement-help,.wb-order-note,[data-output-summary]').count(),0);assert.doesNotMatch(await page.locator('[role="tabpanel"]').innerText(),/轮流|付费订单|订单保持原进度|每组最多|每座孵化场最多|两座用途示例|→/);await screen(race+'-'+label+'-placement-clean');
   const enable=()=>page.locator('.wb-facility [data-action="enable"]').first();assert.equal(await enable().getAttribute('aria-pressed'),'true');await enable().click();
   await tab('research').click();await assertTabs('research');
   assert.equal(await page.locator('.wb-skill-card').count(),5);assert.equal(await page.locator('.wb-system-card').count(),3);assert.equal(await page.locator('.wb-research-node').count(),18);
   const icons=await page.locator('.wb-skill-icon>img').evaluateAll(els=>els.map(el=>({ready:el.complete&&el.naturalWidth>0,width:el.getBoundingClientRect().width,frame:el.parentElement.getBoundingClientRect().width})));assert.ok(icons.every(i=>i.ready&&i.width===28&&i.frame===28));
   assert.ok((await page.locator('.wb-equipment-icon').evaluateAll(els=>els.map(el=>({width:el.getBoundingClientRect().width,url:getComputedStyle(el).backgroundImage})))).every(i=>i.width===28&&i.url.includes('blob:')));
   await assertPresentation();const snapshot=await techSnapshot();await screen(race+'-'+label+'-technology-icons');
   await page.locator('.modal-content').evaluate(el=>el.scrollTop=el.scrollHeight);await assertTabs('research');
   const tabsBounds=await page.locator('.wb-base-tabs').boundingBox(),heading=await page.locator('.modal-heading').boundingBox();assert.ok(tabsBounds.y>=heading.y+heading.height-1);await screen(race+'-'+label+'-technology-scrolled');
   await tab('tree').click();await assertTabs('tree');await assertPresentation();assert.deepEqual(await techSnapshot(),snapshot);assert.equal(await page.locator('.wb-tree-skills').count(),0);await screen(race+'-'+label+'-tree-icons');
   await tab('placement').click();await assertTabs('placement');assert.equal(await enable().getAttribute('aria-pressed'),'false');
   await page.keyboard.press('ArrowRight');await assertTabs('research');assert.equal(await tab('research').evaluate(el=>el===document.activeElement),true);await page.keyboard.press('End');await assertTabs('tree');await page.keyboard.press('Home');await assertTabs('placement');await page.keyboard.press('ArrowLeft');await assertTabs('tree');
   await page.locator('[data-action="apply"]').click();await root('placement').click();assert.equal(await enable().getAttribute('aria-pressed'),'false');await enable().click();await tab('research').click();await page.keyboard.press('Escape');assert.equal(await page.locator('[role="dialog"]').count(),0);assert.equal(await root('placement').evaluate(el=>el===document.activeElement),true);await root('placement').click();assert.equal(await enable().getAttribute('aria-pressed'),'false');await page.locator('[data-action="close"]').first().click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   checks.push(race+' '+label+': clean placement with no order captions; 14px names/12px states and inline skill/system status; equal 28px icons; persistent tabs/draft and keyboard navigation');
  }
 }
 await page.setViewportSize({width:1440,height:900});await load('terran','opening');await page.locator('.im-card-action[data-id="stim"]').click();await openResearch();await assertTabs('research');assert.match(await page.locator('[data-skill="stim"] .wb-tech-state').innerText(),/已研究/);await tab('placement').click();assert.equal(await page.locator('.wb-facility').count(),1);await tab('tree').click();assert.match(await page.locator('[data-skill="stim"] .wb-tech-state').innerText(),/已研究/);await page.keyboard.press('Escape');assert.equal(await root('placement').evaluate(el=>el===document.activeElement),true);checks.push('Technology is reached through Facilities, retaining placement draft and restoring its opener; researched skill has consistent icon state');
 await load('terran','opening');await root('refresh').click();await page.locator('.im-card-action[data-id="system.barracks"]').click();await openResearch();assert.match(await page.locator('[data-system="barracks"] .wb-tech-state').innerText(),/已研究/);assert.match(await page.locator('[data-research="research.barracks.weapon.1"] .wb-tech-state').innerText(),/可研究/);assert.match(await page.locator('[data-research="research.barracks.weapon.2"] .wb-tech-state').innerText(),/未解锁/);assert.equal(await page.locator('[data-research="research.barracks.weapon.2"]').getAttribute('data-required-stage'),'6');assert.equal(await page.locator('[data-research="research.barracks.weapon.3"]').getAttribute('data-required-stage'),'12');await assertPresentation();checks.push('System selection enables level1; predecessor/stage gates still lock later levels without permanent stage captions');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}catch(e){failure=String(e);await screen('technology-tabs-failure');}
finally{fs.writeFileSync(path.join(out,failure?'technology-tabs-failure.json':'technology-tabs.json'),JSON.stringify({scope:'Icon UI and facility tab behavior only; no real research/payment/production/save',checks,images,errors,external,failure},null,2));await browser.close();}
console.log(JSON.stringify({checks:checks.length,images:images.length,errors,failure}));if(failure)process.exitCode=1;
