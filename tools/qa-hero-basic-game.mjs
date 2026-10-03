import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const out='reports/local/hero-basic-game-20261003';await fs.mkdir(out,{recursive:true});
const report={method:'Original models in actual WebGL renderer; deterministic hero showcase is content evidence, separate from natural performance and human acceptance.',checks:[],matrix:[],errors:[],clips:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});report.browser=browser.version();
const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true});let page;
const start=Date.now(),stamp=()=>Number(((Date.now()-start)/1000).toFixed(3));
try{
 page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.addInitScript(()=>{window.__P3_PAD__={id:'P3 standard virtual pad',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:16},()=>({value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__P3_PAD__]});});
 await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5175');await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');console.log('title ready');for(const action of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await page.locator(`[data-action=${action}]`).click();await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>document.body.dataset.battleActionsReady==='true',null,{timeout:240000});await page.evaluate(()=>window.__SC2_DEBUG__.speed=0);console.log('battle ready');
 await page.evaluate(async()=>{const {world:w,view:v}=window.__SC2_DEBUG__;window.__P3_MODULES__={heroes:await import('/src/data/heroes.ts'),casts:await import('/src/simulation/combat/expedition-heroes.ts'),passives:await import('/src/simulation/combat/terran-hero-passives.ts'),flights:await import('/src/simulation/combat/weapon-flight.ts')};w.autoWaves=false;w.pods=[];w.hive=null;w.expansionHives.clear();w.fortifications.clear();w.economicTargets.clear();w.stage=6;w.terrain?.setStage(6);w.anchor.x=w.anchor.z=0;w.wallet={minerals:1e6,gas:1e6};for(const plan of Object.values(w.expedition.production))plan.enabled={};window.__P3_FIXTURE__=async(ids,rank=1)=>{
  w.entities.clear();w.heroes.clear();w.heroCasts=[];w.weaponFlights=[];w.visualEvents=[];w.effects=[];w.pickups=[];w.rewardDrops=[];w.time=10;w.tick=600;w.paused=false;v.fx.reset();for(const [i,id] of ids.entries()){w.acquireHero(id);const u=w.heroEntity(id);u.rank=rank;w.heroes.get(id).rank=rank;u.x=(id==='tychus'?-1.5:-3)+i*2;u.z=1;w.refreshStats(u,true);if(id==='nova'){window.__P3_MODULES__.passives.tickTerranHero(w,u,1/60);}if(id==='tychus'){const s=window.__P3_MODULES__.passives.heroState(u);s.warmupStart=6;s.lastFire=10;}}
  for(let i=0;i<8;i++){const e=w.addUnit(i===6?'mutalisk':'roach','zerg',3+i%3*1.8,-1+Math.floor(i/3)*2.2);e.hp=e.maxHp=100000;e.armor=0;}
  if(ids.includes('swann'))for(let i=0;i<8;i++){const a=w.addUnit('tank','terran',-3+Math.cos(i*Math.PI/4)*4,1+Math.sin(i*Math.PI/4)*4);a.hp=6000;a.maxHp=10000;}
  w.hash.rebuild(w.entities.values());w.changed();await v.prepareRosterAssets();w.changed();return ids.map(id=>({id,hp:w.heroEntity(id).maxHp,damage:w.heroEntity(id).weaponDamage,period:w.heroEntity(id).attackPeriod}));};
 });

 for(const id of ['raynor','tychus','nova','swann','tosh','yamato_battlecruiser']){
  await page.evaluate(async id=>{await window.__P3_FIXTURE__([id],1);const w=window.__SC2_DEBUG__.world;for(const u of w.entities.values())if(u.owner==='zerg')u.hp=u.maxHp=1e7;},id);
  await page.evaluate(async id=>{
   const {world:w,view:v}=window.__SC2_DEBUG__,hero=w.heroEntity(id),target=[...w.entities.values()].find(e=>e.owner==='zerg');
   let next=10;window.__BASIC_BEFORE__={hp:target.hp,time:w.time,damage:hero.weaponDamage};
   for(let i=0;i<240;i++){
    w.time+=1/60;w.tick++;if(w.time>=next){w.fire(hero,target);next+=hero.attackPeriod;}
    window.__P3_MODULES__.flights.tickWeaponFlights(w,1/60);w.changed();await new Promise(requestAnimationFrame);
   }
   window.__BASIC_AFTER__={hp:target.hp,time:w.time,fx:v.fx.heroBasic.stats,particles:v.fx.stats,loaded:v.fx.loaded,errors:v.fx.errors};
  },id);
  const metrics=await page.evaluate(()=>({before:window.__BASIC_BEFORE__,after:window.__BASIC_AFTER__}));assert.ok(metrics.after.hp<metrics.before.hp);assert.ok(metrics.after.fx.impacts>0);assert.deepEqual(metrics.after.errors,[]);report.checks.push({id,metrics});
  await page.screenshot({path:`${out}/${id}-game.png`});console.log(id+': real World damage and basic effects captured');
 }
 for(const [width,height] of [[390,844],[844,390],[667,375]]){
  await page.setViewportSize({width,height});await page.evaluate(async()=>{await window.__P3_FIXTURE__(['yamato_battlecruiser','raynor','nova'],5);const w=window.__SC2_DEBUG__.world;for(const u of w.entities.values())if(u.owner==='zerg')u.hp=u.maxHp=1e7;});
  await page.evaluate(async()=>{const w=window.__SC2_DEBUG__.world;for(const id of ['yamato_battlecruiser','raynor','nova'])w.fire(w.heroEntity(id),[...w.entities.values()].find(e=>e.owner==='zerg'));for(let i=0;i<8;i++){w.time+=1/60;window.__P3_MODULES__.flights.tickWeaponFlights(w,1/60);await new Promise(requestAnimationFrame);}});
  await page.screenshot({path:`${out}/mobile-${width}x${height}.png`});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));report.checks.push({viewport:[width,height]});
 }
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;if(page)await page.screenshot({path:out+'/failure.png'});}finally{await context.close();await browser.close();await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
