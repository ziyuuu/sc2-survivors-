import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const race=process.argv[2]??'terran',out=`reports/local/second-pass-${race}`;await fs.mkdir(out,{recursive:true});
const report={race,scope:'Real WebGL loading and controlled combat/UX fixtures, not a natural campaign or human acceptance.',errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false,args:['--enable-precise-memory-info']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
 await page.evaluate(()=>{const m=window.__PRELOAD_MEMORY__={peak:0,samples:0};m.timer=setInterval(()=>{m.peak=Math.max(m.peak,performance.memory?.usedJSHeapSize??0);m.samples++;},100);});
 const started=Date.now();for(const selector of ['[data-action=menu-new]',`[data-action=menu-race][data-race=${race}]`,'[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(selector).click();
 await page.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__?.().readiness.phase),null,{timeout:600000});
 report.loading=await page.evaluate(()=>{const m=window.__PRELOAD_MEMORY__;clearInterval(m.timer);return {...window.__SC2_REPORT__(),memory:performance.memory?.usedJSHeapSize,observedPeakJSHeap:m.peak,memorySamples:m.samples};});report.loadMs=Date.now()-started;
 assert.equal(report.loading.readiness.phase,'ready',JSON.stringify(report.loading.readiness));
 await page.locator('[data-action=flow-continue]').click();
 await page.evaluate(()=>{window.__SC2_DEBUG__.world.paused=true;});
 // Controlled pose screenshots keep simulation paused; hide only its modal,
 // while retaining the actual HUD and model render. This is not natural play.
 await page.addStyleTag({content:'body.qa-combat #overlay{display:none!important}'});await page.evaluate(()=>document.body.classList.add('qa-combat'));
 report.preload=await page.evaluate(async race=>{const {racePreloadModels}=await import('/src/app/race-preload.ts'),v=window.__SC2_DEBUG__.view;return {expected:[...racePreloadModels(race).keys()],missing:[...racePreloadModels(race).keys()].filter(k=>!v.gpu.has(k)),fort:v.fortTemplates.size,maps:v.mapViews.size};},race);assert.deepEqual(report.preload.missing,[]);
 if(race==='terran'){
  report.reaper=await page.evaluate(async()=>{
   const {world:w,view:v}=window.__SC2_DEBUG__;w.autoWaves=false;w.pods=[];w.economicTargets.clear();w.entities.clear();v.resetRun();w.anchor.x=0;w.anchor.z=0;w.anchor.facing=0;
   const u=w.addUnit('reaper','terran',0,0),enemy=w.addUnit('roach','zerg',0,4);u.facing=u.attackFacing=0;enemy.hp=enemy.maxHp=10000;
   const model=v.gpu.get('reaper'),clips=[],rows=[];for(const age of [0,.15,.35,.55]){const l=model.weaponAt('attack',age*1.4,'Left'),r=model.weaponAt('attack',age*1.4,'Right');rows.push({age,left:l.toArray(),right:r.toArray()});}
   w.fire(u,enemy);u.action='idle';w.time+=.02;v.render(0,1);window.__SECOND_REAPER__=u.id;
   return {rows,pose:v.animationStates.get(u.id)?.sampled,particles:v.fx.particles.filter(p=>p.to).map(p=>({x:p.x,y:p.y,z:p.z,to:p.to,asset:p.asset})),shots:u.shotSequence};
  });assert.equal(report.reaper.particles.length,2);assert.notDeepEqual(report.reaper.rows[0].left,report.reaper.rows[0].right);
  await page.screenshot({path:out+'/reaper-shot.png'});
  report.hero=await page.evaluate(()=>{const {world:w,view:v}=window.__SC2_DEBUG__;w.entities.clear();w.heroes.clear();w.visualEvents.length=0;v.resetRun();w.acquireHero('raynor');const u=w.heroEntity('raynor');u.x=u.prev.x=0;u.z=u.prev.z=0;u.facing=u.attackFacing=0;const enemy=w.addUnit('roach','zerg',0,5);enemy.hp=enemy.maxHp=10000;w.fire(u,enemy);u.action='idle';w.time+=.02;v.render(0,1);return {damage:10000-enemy.hp,traces:v.fx.particles.filter(p=>p.to).map(p=>({asset:p.asset,color:p.color,width:p.size})),hp:u.hp};});assert.equal(report.hero.traces[0].asset,'fx.flame.1');
  await page.screenshot({path:out+'/raynor-shot.png'});
 }
 report.heroes=[];
 const heroes=await page.evaluate(async race=>(await import('/src/data/heroes.ts')).HERO_IDS_BY_RACE[race],race);
 for(const id of heroes){
  const evidence=await page.evaluate(async id=>{
   const {HEROES,HERO_SKILL_FLIGHT}=await import('/src/data/heroes.ts'),{world:w,view:v}=window.__SC2_DEBUG__;
   w.paused=true;w.autoWaves=false;w.entities.clear();w.heroes.clear();w.pods=[];w.economicTargets.clear();w.heroCasts=[];w.visualEvents=[];w.effects=[];v.resetRun();w.anchor.x=w.anchor.z=0;w.acquireHero(id);
   const u=w.heroEntity(id),d=HEROES[id];u.x=u.prev.x=0;u.z=u.prev.z=0;u.facing=u.attackFacing=0;
   const enemy=w.addUnit('roach','zerg',0,Math.min(d.range||4,4));enemy.hp=enemy.maxHp=10000;enemy.weaponDamage=0;
   const ally=w.addUnit(id==='swann'?'tank':id==='artanis'?'zealot':'zergling','terran',2,0);ally.hp=1;ally.shield=0;
   w.hash.rebuild(w.entities.values());if(d.target!=='none')w.fire(u,enemy);v.render(0,1);
   const attacks=w.visualEvents.filter(e=>e.kind==='attack').length;w.paused=false;const cast=w.castHero(id);w.paused=true;window.__HERO_AT__=w.time;
   return {id,cast,attacks,flight:HERO_SKILL_FLIGHT[id]??0,delay:d.delay,model:v.gpu.has(d.model),errors:v.modelErrors};
  },id);assert.ok(evidence.cast,id);assert.ok(evidence.model,id);
  await page.screenshot({path:out+`/${id}-attack.png`});
  evidence.samples=[];
  for(const [label,age] of [['launch',Math.max(.02,evidence.delay-evidence.flight/2)],['impact',evidence.delay+.04]]){
   const sample=await page.evaluate(async age=>{const {resolveExpeditionHeroCasts}=await import('/src/simulation/combat/expedition-heroes.ts'),{world:w,view:v}=window.__SC2_DEBUG__,end=window.__HERO_AT__+age;while(w.time<end-1e-8){w.time=Math.min(end,w.time+1/60);resolveExpeditionHeroCasts(w);v.render(0,1);}return {age,launched:w.visualEvents.filter(e=>e.kind==='skill-launch').length,impacts:w.visualEvents.filter(e=>e.kind==='skill-impact').length,pending:v.fx.stats.pending};},age);
   evidence.samples.push(sample);await page.screenshot({path:out+`/${id}-${label}.png`});
  }
  report.heroes.push(evidence);
 }
 report.ui=await page.evaluate(()=>{const {world:w}=window.__SC2_DEBUG__;w.paused=false;const e=w.addUnit('lurker','zerg',w.anchor.x+3,w.anchor.z);e.cloaked=true;w.changed();document.body.classList.remove('qa-combat');return {sidecards:document.querySelector('#pod-alerts')!==null};});assert.equal(report.ui.sidecards,false);
 await page.waitForTimeout(350);assert.ok(await page.locator('#detection.cloak-threat').count());await page.screenshot({path:out+'/detection.png'});
 const pointer=await page.evaluate(async()=>{const {world:w,view:v}=window.__SC2_DEBUG__,point={x:w.anchor.x+2,z:w.anchor.z+2},projected=v.camera.position.clone().set(point.x,w.terrain.height(point),point.z).project(v.camera),rect=v.canvas.getBoundingClientRect();return {x:rect.left+(projected.x+1)*rect.width/2,y:rect.top+(1-projected.y)*rect.height/2,point};});
 await page.mouse.click(pointer.x,pointer.y);report.pointer=await page.evaluate(()=>window.__SC2_DEBUG__.world.order?.point);assert.ok(report.pointer);assert.ok(Math.hypot(report.pointer.x-pointer.point.x,report.pointer.z-pointer.point.z)<.05);
 // Test one next-stage click through the real HUD. Combat setup here is explicitly synthetic.
 await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.paused=true;w.phase='reward';w.rewardRound='random';w.stage=1;w.expedition.developmentBought=true;w.changed();});
 const next=page.locator('[data-action=skip]');await next.click();await page.waitForFunction(()=>window.__SC2_REPORT__().stage===2,null,{timeout:180000});
 report.next=await page.evaluate(()=>({stage:window.__SC2_REPORT__().stage,phase:window.__SC2_REPORT__().phase,ready:window.__SC2_REPORT__().readiness.kind}));assert.equal(report.next.ready,null);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/narrow.png'});
 assert.deepEqual(report.errors,[]);
}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({race,loadMs:report.loadMs,errors:report.errors,next:report.next}));
