import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const output='reports/local/qa-m4';
await fs.mkdir(output,{recursive:true});
const report={at:new Date().toISOString(),samples:[],variantComparisons:[],air:[],errors:[],screens:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const fixtures={
 terran:{hero:'raynor',elites:['hellion.2','viking.2'],ordinary:['hellion','viking']},
 zerg:{hero:'dehaka',elites:['lurker.1','ravager.2'],ordinary:['lurker','ravager']},
 protoss:{hero:'fenix',elites:['immortal.1','high_templar.3'],ordinary:['immortal','high_templar']},
};

async function newRun(page,race){
 await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5173/');
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
 await page.locator('[data-action=menu-new]').click();
 await page.locator(`[data-action=menu-race][data-race=${race}]`).click();
 await page.locator('[data-action=menu-race-next]').click();
 await page.locator('[data-action=menu-difficulty-next]').click();
 await page.locator('[data-action=menu-start]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});
 await page.locator('[data-action=flow-continue]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='battle',null,{timeout:30000});
}

try{
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 for(const [race,fixture] of Object.entries(fixtures)){
  const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(`${race}: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error')report.errors.push(`${race}: ${message.text()}`);});
  await newRun(page,race);
  const placed=await page.evaluate(async ({hero,elites,ordinary})=>{
   const {ELITES}=await import('/src/data/elites.ts');const w=window.__SC2_DEBUG__.world,v=window.__SC2_DEBUG__.view;
   w.sandbox=true;w.autoWaves=false;w.paused=true;
   for(let i=0;i<ordinary.length;i++){
    const type=ordinary[i];if(!w.expedition.familySlots.includes(type))w.expedition.familySlots.push(type);
    const plain=w.addUnit(type,'terran',-5+i*10,1,1);
    const elite=w.addUnit(type,'terran',-5+i*10,-2,1);
    elite.eliteId=elites[i];elite.modelKey=ELITES[elites[i]].model;w.refreshStats(elite,true);
    const enemy=w.addUnit(type==='viking'?'mutalisk':'roach','zerg',-5+i*10,-7,1);enemy.hp=enemy.maxHp=100000;enemy.weaponDamage=0;enemy.moveSpeed=0;
    elite.attackTarget=enemy.id;
    if(type==='lurker'){elite.nativeMode=elite.desiredNativeMode='lurker_burrowed';}
    plain.action=elite.action='attack';plain.attackFacing=elite.attackFacing=Math.PI;
   }
   if(!w.acquireHero(hero))throw Error('Cannot acquire sample hero '+hero);
   const actor=w.heroEntity(hero);actor.x=actor.prev.x=0;actor.z=actor.prev.z=-1;actor.action='attack';actor.attackFacing=Math.PI;
   const enemy=w.addUnit('roach','zerg',0,hero==='dehaka'?-3:-6,1);enemy.hp=enemy.maxHp=100000;enemy.weaponDamage=0;enemy.moveSpeed=0;
   w.changed();v.prepareRosterAssets();
   return {hero,eliteIds:elites,modelKeys:elites.map(id=>ELITES[id].model)};
  },fixture);
  await page.waitForFunction(({modelKeys,hero})=>{const v=window.__SC2_DEBUG__.view;return v.assetsPending===0&&modelKeys.every(key=>v.gpu.has(key))&&v.gpu.has('hero.'+hero);},{modelKeys:placed.modelKeys,hero:fixture.hero},{timeout:240000});
  const sample=await page.evaluate(({hero,elites})=>{
   const w=window.__SC2_DEBUG__.world,v=window.__SC2_DEBUG__.view;
   const actors=[...w.entities.values()].filter(u=>u.eliteId&&elites.includes(u.eliteId)||u.heroId===hero);
   const weapons=actors.map(u=>{const model=v.gpu.get(u.modelKey);return {id:u.eliteId??u.heroId,model:u.modelKey,bones:model?.boneCount,clips:[...model?.clips.keys()??[]],weaponTracks:[...model?.weaponTracks.keys()??[]],weapon:model?.weaponAt('attack',.1)?.toArray(),height:model?.bodyHeight};});
   w.paused=false;for(const u of actors.filter(u=>u.eliteId)){const target=w.entities.get(u.attackTarget);if(target)w.fire(u,target);}w.changed();return {race:w.expedition.race,actors:actors.length,weapons,modelErrors:[...v.modelErrors],shots:w.stats.shots};
  },fixture);
  assert.equal(sample.actors,3);assert.deepEqual(sample.modelErrors,[]);report.samples.push(sample);
  await page.waitForTimeout(350);
  await page.screenshot({path:`${output}/${race}-desktop.png`});report.screens.push(`${race}-desktop.png`);
  const skill=await page.evaluate(id=>{const w=window.__SC2_DEBUG__.world;return {cast:w.castHero(id),time:w.time,castIds:w.heroCasts.filter(c=>c.hero===id).map(c=>c.id)};},fixture.hero);
  sample.skill=skill;
  assert.equal(skill.cast,true,`${race} sample hero skill has no target`);
  await page.waitForTimeout(race==='protoss'?320:race==='zerg'?370:80);
  await page.screenshot({path:`${output}/${race}-skill.png`});report.screens.push(`${race}-skill.png`);
  await page.evaluate(()=>{const p=window.__m4Frames={values:[],last:performance.now(),done:false};const tick=now=>{if(p.last>0)p.values.push(now-p.last);p.last=now;if(!p.done)requestAnimationFrame(tick);};requestAnimationFrame(tick);});
  await page.waitForTimeout(3000);
  sample.performance=await page.evaluate(()=>{const p=window.__m4Frames,v=window.__SC2_DEBUG__.view,w=window.__SC2_DEBUG__.world;p.done=true;const values=p.values.slice(1).sort((a,b)=>a-b),q=x=>values[Math.min(values.length-1,Math.floor(values.length*x))];return {frames:values.length,medianFrameMs:q(.5),p95FrameMs:q(.95),drawCalls:v.renderer.info.render.calls,effectsDropped:v.fx.stats.dropped,allies:w.allies().length,enemies:w.enemyCount(),modelCount:v.gpu.size};});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
  await page.screenshot({path:`${output}/${race}-mobile.png`});report.screens.push(`${race}-mobile.png`);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${race} mobile overflow`);
  if(race==='terran'){
   await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.expedition.eliteRescueRights.push({receipt:'qa-m4-rescue-claim',eliteId:'marine.1'});w.changed();});
   const choices=page.locator('[data-action=elite-rescue-claim]');await choices.first().waitFor();
   assert.equal(await choices.count(),3);
   await page.screenshot({path:`${output}/elite-rescue-mobile.png`});report.screens.push('elite-rescue-mobile.png');
   await choices.nth(1).click();
   await page.waitForFunction(()=>!window.__SC2_DEBUG__.world.eliteRescueChoice);
   assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.expedition.eliteRescueCompleted.filter(id=>id==='qa-m4-rescue-claim').length),1);
   await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.expedition.eliteRescueRights.push({receipt:'qa-m4-rescue-decline',eliteId:'marine.1'});w.changed();});
   await page.locator('[data-action=elite-rescue-decline]').click();
   await page.waitForFunction(()=>!window.__SC2_DEBUG__.world.eliteRescueChoice);
   assert.equal(await page.evaluate(()=>window.__SC2_DEBUG__.world.expedition.eliteRescueCompleted.filter(id=>id==='qa-m4-rescue-decline').length),1);
   sample.rescueUi='three variants, one claim, explicit decline exit';
  }
  await page.close();
 }
 for(const [race,family] of [['terran','viking'],['zerg','ravager'],['protoss','high_templar']]){
  const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(`${race}-variants: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error')report.errors.push(`${race}-variants: ${message.text()}`);});
  await newRun(page,race);
  const comparison=await page.evaluate(async family=>{
   const {ELITES}=await import('/src/data/elites.ts');const w=window.__SC2_DEBUG__.world,v=window.__SC2_DEBUG__.view;
   w.sandbox=true;w.autoWaves=false;w.paused=true;
   for(const unit of w.entities.values()){unit.x=unit.prev.x=300;unit.z=unit.prev.z=300;}
   if(!w.expedition.familySlots.includes(family))w.expedition.familySlots.push(family);
   const actors=[];
   for(let i=0;i<4;i++){
    const actor=w.addUnit(family,'terran',-5.4+i*3.6,0,1);
    if(i){actor.eliteId=`${family}.${i}`;actor.modelKey=ELITES[actor.eliteId].model;w.refreshStats(actor,true);}
    actor.facing=Math.PI;actor.attackFacing=Math.PI;actor.action='idle';actors.push({id:actor.eliteId??family,modelKey:actor.modelKey??family});
   }
   w.changed();v.prepareRosterAssets();return actors;
  },family);
  await page.waitForFunction(actors=>{const v=window.__SC2_DEBUG__.view;return v.assetsPending===0&&actors.every(actor=>v.gpu.has(actor.modelKey));},comparison,{timeout:240000});
  await page.waitForTimeout(220);
  assert.deepEqual(await page.evaluate(()=>window.__SC2_DEBUG__.view.modelErrors),[]);
  await page.screenshot({path:`${output}/${race}-three-variants.png`});report.screens.push(`${race}-three-variants.png`);
  report.variantComparisons.push({race,family,actors:comparison});
  await page.close();
 }
 const airPage=await context.newPage();
 airPage.on('pageerror',error=>report.errors.push(`air: ${error.message}`));
 airPage.on('console',message=>{if(message.type()==='error')report.errors.push(`air: ${message.text()}`);});
 await newRun(airPage,'terran');
 await airPage.evaluate(()=>{
  const w=window.__SC2_DEBUG__.world,v=window.__SC2_DEBUG__.view;
  w.sandbox=true;w.autoWaves=false;w.paused=true;
  const ships=[
   {modelKey:'hero.yamato_battlecruiser',x:-7,race:'terran',hp:1100,shield:0,damage:40,period:.65,range:8,speed:2.62},
   {modelKey:'hero.hots_leviathan',x:0,race:'zerg',hp:1300,shield:0,damage:60,period:.55,range:7.5,speed:2.5},
   {modelKey:'elite.carrier.1',x:7,race:'protoss',hp:850,shield:750,damage:0,period:.55,range:8,speed:2.62},
  ];
  for(const ship of ships){
   // Diagnostic World actor only: M5 creates the three real hero identities and skills.
   const u=w.addUnit('carrier','terran',ship.x,0,1);
   u.modelKey=ship.modelKey;u.race=ship.race;u.hp=u.maxHp=ship.hp;u.shield=u.maxShield=ship.shield;
   u.weaponDamage=ship.damage;u.attackPeriod=u.shotInterval=ship.period;u.attackRange=ship.range;u.moveSpeed=ship.speed;
   u.flying=true;u.action='attack';u.attackFacing=Math.PI;
   const target=w.addUnit('roach','zerg',ship.x,-8,1);target.hp=target.maxHp=100000;target.moveSpeed=0;target.weaponDamage=0;
  }
  w.changed();v.prepareRosterAssets();
 });
 await airPage.waitForFunction(()=>{const v=window.__SC2_DEBUG__.view;return v.assetsPending===0&&['hero.yamato_battlecruiser','hero.hots_leviathan','elite.carrier.1'].every(key=>v.gpu.has(key));},null,{timeout:240000});
 report.air=await airPage.evaluate(()=>{const w=window.__SC2_DEBUG__.world,v=window.__SC2_DEBUG__.view;w.paused=false;w.changed();return [...w.entities.values()].filter(u=>['hero.yamato_battlecruiser','hero.hots_leviathan','elite.carrier.1'].includes(u.modelKey)).map(u=>{const m=v.gpu.get(u.modelKey);return {model:u.modelKey,bodyHeight:m.bodyHeight,clips:[...m.clips.keys()],weaponTracks:[...m.weaponTracks.keys()],weapon:m.weaponAt('attack',.1).toArray(),bones:m.boneCount,hp:u.hp,shield:u.shield,damage:u.weaponDamage,range:u.attackRange};});});
 assert.equal(report.air.length,3);
 assert.deepEqual(await airPage.evaluate(()=>window.__SC2_DEBUG__.view.modelErrors),[]);
 await airPage.evaluate(()=>{const w=window.__SC2_DEBUG__.world;for(const ship of w.allies().filter(u=>['hero.yamato_battlecruiser','hero.hots_leviathan','elite.carrier.1'].includes(u.modelKey))){const target=[...w.entities.values()].find(u=>u.owner==='zerg'&&Math.abs(u.x-ship.x)<.1);if(target){ship.attackFacing=Math.PI;w.visual('skill-launch',ship,target);w.visual('skill-impact',ship,target);}}});
 await airPage.waitForTimeout(60);await airPage.screenshot({path:`${output}/air-desktop.png`});report.screens.push('air-desktop.png');
 await airPage.evaluate(()=>{const p=window.__m4Frames={values:[],last:performance.now(),done:false};const tick=now=>{if(p.last>0)p.values.push(now-p.last);p.last=now;if(!p.done)requestAnimationFrame(tick);};requestAnimationFrame(tick);});
 await airPage.waitForTimeout(3000);
 report.airPerformance=await airPage.evaluate(()=>{const p=window.__m4Frames,v=window.__SC2_DEBUG__.view;p.done=true;const values=p.values.slice(1).sort((a,b)=>a-b),q=x=>values[Math.min(values.length-1,Math.floor(values.length*x))];return {frames:values.length,medianFrameMs:q(.5),p95FrameMs:q(.95),drawCalls:v.renderer.info.render.calls,effectsDropped:v.fx.stats.dropped,modelCount:v.gpu.size};});
 await airPage.setViewportSize({width:390,height:844});await airPage.waitForTimeout(200);await airPage.screenshot({path:`${output}/air-mobile.png`});report.screens.push('air-mobile.png');
 await airPage.close();await context.close();
 assert.deepEqual(report.errors,[]);
}catch(error){report.failure=String(error?.stack??error);process.exitCode=1;console.error(report.failure);}
finally{await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({samples:report.samples.length,variantComparisons:report.variantComparisons.length,air:report.air.length,errors:report.errors.length,failure:report.failure??null}));}
