import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const out='reports/local/feedback-f05-f07-browser';await fs.mkdir(out,{recursive:true});
const report={at:new Date().toISOString(),method:'Local Chrome QA fixtures through real World; injected test actors are NOT natural campaign or performance acceptance.',groups:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 for(const race of ['terran','zerg','protoss'])for(let cohort=0;cohort<2;cohort++){
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(`${race}/${cohort}: ${e.message}`));
  await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
  for(const selector of ['[data-action=menu-new]',`[data-action=menu-race][data-race=${race}]`,'[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(selector).click();
  await page.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__?.().readiness?.phase),null,{timeout:240000});
  assert.equal(await page.evaluate(()=>window.__SC2_REPORT__().readiness.phase),'ready','Required race assets must load before play');
  await page.locator('[data-action=flow-continue]').click();
  const ids=await page.evaluate(async ({race,cohort})=>{
   const {HERO_IDS_BY_RACE}=await import('/src/data/heroes.ts'),{world:w,view:v}=window.__SC2_DEBUG__;
   w.paused=true;w.sandbox=true;w.autoWaves=false;w.entities.clear();w.heroes.clear();w.pods=[];w.economicTargets.clear();w.pickups=[];
   const ids=HERO_IDS_BY_RACE[race].slice(cohort*3,cohort*3+3);
   ids.forEach((id,i)=>{if(!w.acquireHero(id))throw Error('Missing hero '+id);const u=w.heroEntity(id);u.x=u.prev.x=-4+i*4;u.z=u.prev.z=0;u.facing=u.attackFacing=0;
    const e=w.addUnit('roach','zerg',u.x,1.8);e.hp=e.maxHp=100000;e.armor=0;e.moveSpeed=0;e.weaponDamage=0;
    const a=w.addUnit(id==='swann'?'tank':'zealot','terran',u.x,1);a.hp=Math.max(1,a.maxHp/2);a.shield=0;
   });const pod=w.spawnPod(w.expedition.familySlots[0],{x:0,z:-6});pod.status='active';pod.landedAt=w.time;pod.createdAt=w.time-4;const guard=w.addUnit('roach','zerg',0,-7);guard.hp=guard.maxHp=100000;guard.moveSpeed=0;guard.weaponDamage=0;pod.guardianIds.add(guard.id);w.hash.rebuild(w.entities.values());w.changed();v.prepareRosterAssets();return ids;
  },{race,cohort});
  await page.waitForFunction(ids=>{const {world:w,view:v}=window.__SC2_DEBUG__;return !v.assetsPending&&ids.every(id=>v.gpu.has(w.heroEntity(id).modelKey));},ids,{timeout:240000});
  const group={race,cohort,ids,checks:[],casts:[]};
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.hero-world-label .hero-slot,.hero-world-label .unit-label-title,.hero-world-label .hero-action').count(),0);
  assert.equal(await page.locator('#hero-skills .hero-skill').count(),3);
  assert.ok(await page.locator('.hero-world-label').evaluateAll(nodes=>nodes.length>0&&nodes.every(n=>getComputedStyle(n).pointerEvents==='none')));
  group.checks.push('No head text/slot; fixed three skill controls retained; health overlays do not intercept input');
  await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.paused=false;w.changed();});
  for(let slot=1;slot<=3;slot++){await page.keyboard.press(String(slot));await page.waitForTimeout(70);}
  await page.waitForTimeout(1400);
  group.casts=await page.evaluate(ids=>ids.map(id=>{const w=window.__SC2_DEBUG__.world,r=w.heroes.get(id);return {id,skillReady:r.skillReady,cast:r.skillReady>w.time,hp:w.heroEntity(id).hp};}),ids);
  assert.ok(group.casts.every(c=>c.cast),JSON.stringify(group.casts));
  await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world,e=w.spawnEconomic('egg',{x:-6,z:-4});w.hit(e,1000,[],1,'terran');w.changed();});await page.waitForTimeout(80);await page.screenshot({path:`${out}/${race}-${cohort}-desktop.png`});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
  await page.screenshot({path:`${out}/${race}-${cohort}-mobile.png`});
  group.render=await page.evaluate(()=>window.__SC2_DEBUG__.view.report());
  assert.deepEqual(group.render.errors,[]);assert.ok(group.render.carrierModels.includes(race));assert.equal(group.render.podModel,true);group.workers=await page.evaluate(()=>window.__SC2_DEBUG__.world.workers);assert.equal(group.workers,1);report.groups.push(group);
  await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await context.close();
 }
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({groups:report.groups.length,errors:report.errors,failure:report.failure??null}));}
