import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const output='reports/local/qa-m5';
await fs.mkdir(output,{recursive:true});
const report={at:new Date().toISOString(),groups:[],errors:[],screens:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});

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
 for(const race of ['terran','zerg','protoss'])for(let cohort=0;cohort<2;cohort++){
  const page=await context.newPage(),label=`${race}-${cohort+1}`;
  page.on('pageerror',error=>report.errors.push(`${label}: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error')report.errors.push(`${label}: ${message.text()}`);});
  await newRun(page,race);
  const fixture=await page.evaluate(async ({race,cohort})=>{
   const [{ALL_FAMILIES,familyRace},{HERO_IDS_BY_RACE,HEROES},{ELITES}]=await Promise.all([
    import('/src/data/races.ts'),import('/src/data/heroes.ts'),import('/src/data/elites.ts')]);
   const w=window.__SC2_DEBUG__.world,v=window.__SC2_DEBUG__.view;
   w.sandbox=true;w.autoWaves=false;w.paused=true;
   for(const unit of w.entities.values()){unit.x=unit.prev.x=300;unit.z=unit.prev.z=300;}
   const families=ALL_FAMILIES.filter(family=>familyRace(family)===race).slice(cohort*5,cohort*5+5);
   const heroIds=HERO_IDS_BY_RACE[race].slice(cohort*3,cohort*3+3);
   for(let i=0;i<heroIds.length;i++){
    if(!w.acquireHero(heroIds[i]))throw Error('Hero unavailable: '+heroIds[i]);
    const actor=w.heroEntity(heroIds[i]);actor.x=actor.prev.x=-5+i*5;actor.z=actor.prev.z=6;actor.action='attack';actor.attackFacing=Math.PI;
   }
   const eliteIds=[];
   for(let i=0;i<families.length;i++){
    const family=families[i],x=-8+i*4;
    for(let index=0;index<=3;index++){
     const actor=w.addUnit(family,'terran',x,index*2-4,1);
     if(index){const id=`${family}.${index}`;actor.eliteId=id;actor.modelKey=ELITES[id].model;w.refreshStats(actor,true);eliteIds.push(id);}
     actor.action='attack';actor.attackFacing=Math.PI;
    }
    const target=w.addUnit('roach','zerg',x,-8,1);target.hp=target.maxHp=100000;target.weaponDamage=0;target.moveSpeed=0;
   }
   w.hash.rebuild(w.entities.values());w.changed();v.prepareRosterAssets();
   return {families,heroIds,eliteIds,modelKeys:[...new Set([...eliteIds.map(id=>ELITES[id].model),...heroIds.map(id=>HEROES[id].model)])]};
  },{race,cohort});
  await page.waitForFunction(keys=>{const v=window.__SC2_DEBUG__.view;return v.assetsPending===0&&keys.every(key=>v.gpu.has(key));},fixture.modelKeys,{timeout:240000});
  const checked=await page.evaluate(({eliteIds,heroIds})=>{
   const w=window.__SC2_DEBUG__.world,v=window.__SC2_DEBUG__.view;
   const elite=eliteIds.map(id=>{const u=[...w.entities.values()].find(unit=>unit.eliteId===id),m=u&&v.gpu.get(u.modelKey);return {id,model:u?.modelKey,clips:m?[...m.clips.keys()]:[],bones:m?.boneCount,attackClip:m?.actions.attack?.name??null,weaponMountClips:m?[...m.weaponTracks.keys()]:[],scale:u?.visualScale??1};});
   const hero=heroIds.map(id=>{const u=w.heroEntity(id),m=u&&v.gpu.get(u.modelKey);return {id,model:u?.modelKey,clips:m?[...m.clips.keys()]:[],bones:m?.boneCount,attackClip:m?.actions.attack?.name??null,skillClip:m?.actions.skill?.name??null,weaponMountClips:m?[...m.weaponTracks.keys()]:[],flying:u?.flying,portrait:!!document.querySelector(`[data-hero="${id}"] img`)};});
   return {elite,hero,errors:[...v.modelErrors],schema:w.captureRun().schema};
  },fixture);
  assert.equal(checked.elite.length,15);assert.equal(checked.hero.length,3);assert.equal(checked.schema,6);
  assert.ok(checked.elite.every(item=>item.clips.length&&item.bones>0),`${label} elite model/animations`);
  assert.ok(checked.hero.every(item=>item.clips.length&&item.bones>0),`${label} hero model/animations`);
  assert.deepEqual(checked.errors,[]);
  await page.screenshot({path:`${output}/${label}-desktop.png`});report.screens.push(`${label}-desktop.png`);
  const action=await page.evaluate(({families,heroIds})=>{
   const w=window.__SC2_DEBUG__.world;
   w.paused=false;w.hash.rebuild(w.entities.values());
   let fires=0;
   for(const family of families){const actor=[...w.entities.values()].find(unit=>unit.eliteId===`${family}.2`),target=[...w.entities.values()].find(unit=>unit.owner==='zerg'&&Math.abs(unit.x-actor.x)<.1);if(actor&&target){w.fire(actor,target);fires++;}}
   for(const id of heroIds){const actor=w.heroEntity(id),target=[...w.entities.values()].find(unit=>unit.owner==='zerg'&&Math.abs(unit.x-actor.x)<2);if(actor&&target)w.fire(actor,target);}
   w.changed();return {fires,shots:w.stats.shots};
  },fixture);
  assert.equal(action.fires,5);
  await page.waitForTimeout(250);
  await page.screenshot({path:`${output}/${label}-attack.png`});report.screens.push(`${label}-attack.png`);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${label} mobile overflow`);
  await page.screenshot({path:`${output}/${label}-mobile.png`});report.screens.push(`${label}-mobile.png`);
  report.groups.push({race,cohort:cohort+1,...checked,action,drawCalls:await page.evaluate(()=>window.__SC2_DEBUG__.view.renderer.info.render.calls)});
  await page.close();
 }
 assert.deepEqual(report.errors,[]);
 await context.close();
}catch(error){report.failure=String(error?.stack??error);process.exitCode=1;console.error(report.failure);}
finally{await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({groups:report.groups.length,elite:report.groups.reduce((n,g)=>n+g.elite.length,0),heroes:report.groups.reduce((n,g)=>n+g.hero.length,0),errors:report.errors.length,failure:report.failure??null}));}
