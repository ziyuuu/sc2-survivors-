import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.QA_OUT??'reports/local/hero-iteration/playback';await fs.mkdir(out,{recursive:true});
const report=process.env.QA_RESUME==='1'?JSON.parse(await fs.readFile(out+'/progress.json','utf8')):{method:'Visible Chrome, real World and renderer, isolated high-health diagnostic targets. Explicit 60Hz simulation/render diagnostic frames. Local video captures, not natural performance, balance, phone hardware or human visual acceptance.',heroes:[],identities:[],errors:[]};
// Diagnostic playback only: unrelated windows must not throttle these recorded frames.
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false,args:['--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling']});let page;
try{
 page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,hasTouch:true});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5175');await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
 await page.exposeFunction('captureFrame',async name=>{await page.screenshot({path:out+'/'+name+'.png'});});
 await page.exposeFunction('saveClip',async(name,bytes)=>fs.writeFile(`${out}/${name}.webm`,Buffer.from(bytes,'base64')));
 let started=false;for(const race of (process.env.QA_RACES??'terran,zerg,protoss').split(',')){
  if(started){await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.phase='battle';w.paused=false;w.changed();});await page.locator('#topbar [data-action=pause]').click();await page.locator('[data-action=restart]').click();}
  await page.locator('[data-action=menu-new]').click();await page.locator(`[data-action=menu-race][data-race=${race}]`).click();await page.locator('[data-action=menu-race-next]').click();await page.locator('[data-action=menu-difficulty-next]').click();await page.locator('[data-action=menu-start]').click();
  await page.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__?.().readiness?.phase),null,{timeout:600000});assert.equal(await page.evaluate(()=>window.__SC2_REPORT__().readiness.phase),'ready');await page.locator('[data-action=flow-continue]').click();
  await page.evaluate(()=>{const d=window.__SC2_DEBUG__,w=d.world;Object.defineProperty(d,'speed',{configurable:true,get:()=>0,set:()=>{}});w.autoWaves=false;w.sandbox=true;w.stage=18;w.terrain.setStage(18);w.stageElapsed=0;w.hive=null;w.entities.clear();w.pods=[];w.heroCasts=[];w.weaponFlights=[];w.rewardDrops=[];w.pickups=[];for(const p of Object.values(w.expedition.production))p.enabled={};w.changed();});
  started=true;const heroIds=await page.evaluate(async race=>(await import('/src/data/heroes.ts')).HERO_IDS_BY_RACE[race],race);
  for(const id of heroIds){
   if(report.heroes.some(row=>row.id===id))continue;
   await page.bringToFront();const result=await page.evaluate(async id=>{
    const {world:w,view:v}=window.__SC2_DEBUG__,{HEROES}=await import('/src/data/heroes.ts'),{tickWeaponFlights}=await import('/src/simulation/combat/weapon-flight.ts'),{resolveExpeditionHeroCasts}=await import('/src/simulation/combat/expedition-heroes.ts');
    w.entities.clear();w.heroes.clear();w.heroCasts=[];w.weaponFlights=[];w.visualEvents=[];w.effects=[];v.resetRun();w.paused=false;w.phase='battle';w.anchor={x:0,z:0,facing:Math.PI};w.acquireHero(id);const u=w.heroEntity(id);if(!u)throw Error('Missing hero '+id);
    u.x=u.prev.x=0;u.z=u.prev.z=2;u.facing=u.attackFacing=Math.PI;const melee=HEROES[id].range<2,targets=[];
    for(let i=0;i<3;i++){const t=w.addUnit('roach','zerg',(i-1)*.85,melee?.8:-2-i*.6);t.hp=t.maxHp=1e6;t.weaponDamage=0;t.moveSpeed=0;targets.push(t);}
    const ally=w.addUnit(id==='swann'?'tank':id==='artanis'?'stalker':'roach','terran',2,1);ally.hp=ally.maxHp*.1;if(ally.maxShield)ally.shield=0;
    w.hash.rebuild(w.entities.values());const carriers=await import('/src/simulation/combat/carriers.ts');carriers.initializeCarrierSubsystem(w);w.changed();await v.prepareRosterAssets();
    const parts=[],stream=document.querySelector('#battle').captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:1400000});recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};recorder.start();
    const captured=new Set(),events=[],advance=async(seconds,fire=false)=>{for(let f=0;f<Math.ceil(seconds*60);f++){w.time+=1/60;w.tick++;if(fire)w.updateUnit(u,1/60);tickWeaponFlights(w,1/60);resolveExpeditionHeroCasts(w);if(id==='purifier_flagship'){carriers.tickCarrierSubsystem(w,1/60);for(const child of w.entities.values())if(child.summonKind)carriers.tickInterceptor(w,child,1/60);}w.hash.rebuild(w.entities.values());v.render(1/60,1);await new Promise(resolve=>setTimeout(resolve,16));const fresh=w.visualEvents.filter(e=>e.serial>(events.at(-1)?.serial??0));events.push(...fresh);for(const event of fresh)if(event.entityId===u.id&&['attack','skill-launch','skill-impact','skill-status','death'].includes(event.kind)&&!captured.has(event.kind)){captured.add(event.kind);await window.captureFrame(id+'-'+event.kind);}}};
    await advance(.8,true);const cast=w.castHero(id);await advance(4.9,true);
    const ranks=[];for(const rank of [3,5]){u.rank=rank;const record=w.heroes.get(id);record.rank=rank;record.skillReady=w.time;w.refreshStats(u);ally.hp=ally.maxHp*.1;if(ally.maxShield)ally.shield=0;await advance(.6,true);const start=events.length,rankCast=w.castHero(id);await advance(4.9,true);ranks.push({rank,hp:u.maxHp,cast:rankCast,impacts:events.slice(start).filter(e=>e.heroId===id&&['skill-impact','skill-status'].includes(e.kind)).length});}
    w.hit(u,1e9,[],1,'zerg');await advance(1.6);
    await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});stream.getTracks().forEach(t=>t.stop());await window.saveClip(id,await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(new Blob(parts));}));
    const model=v.gpu.get(u.modelKey),death=v.gpu.get(u.modelKey+'.death')??model;
    return {id,cast,ranks,model:u.modelKey,attackEvents:events.filter(e=>e.kind==='attack'&&e.entityId===u.id).length,skillEvents:events.filter(e=>e.heroId===id&&e.kind.startsWith('skill')).map(e=>({kind:e.kind,at:e.time,cast:e.castId,target:e.targetId})),deathEvents:events.filter(e=>e.kind==='death'&&e.entityId===u.id).length,deathClip:death.actions.dead?.name,drawCalls:v.renderer.info.render.calls,coreDrops:v.fx.sculptures.stats.coreDropped,errors:v.report().errors};
   },id);
   assert.equal(result.cast,true,id+' cast needs a real target');assert.ok(result.ranks.every(r=>r.cast&&r.impacts>0),id+' III/V skill must actually resolve');assert.equal(result.deathEvents,1);assert.deepEqual(result.errors,[]);report.heroes.push(result);await fs.writeFile(out+'/progress.json',JSON.stringify(report,null,2));
  }
  if(process.env.QA_SKIP_IDENTITIES==='1'){
   await page.evaluate(async race=>{const {world:w,view:v}=window.__SC2_DEBUG__,{HERO_IDS_BY_RACE}=await import('/src/data/heroes.ts');w.entities.clear();w.heroes.clear();w.heroCasts=[];w.weaponFlights=[];w.visualEvents=[];w.effects=[];v.resetRun();for(const id of HERO_IDS_BY_RACE[race].slice(0,3))w.acquireHero(id);w.phase='battle';w.paused=false;w.changed();v.render(1/60,1);},race);
   report.layouts??=[];
   for(const [width,height] of [[1440,900],[390,844],[844,390],[667,375],[930,430]])for(const scale of [1,1.5]){
    await page.setViewportSize({width,height});await page.evaluate(async scale=>(await import('/src/ui/text-scale.ts')).setTextScale(scale),scale);await page.waitForTimeout(200);
    const layout=await page.evaluate(()=>{const rect=id=>document.querySelector(id).getBoundingClientRect(),header=rect('#topbar'),mission=rect('#mission'),hero=rect('#hero-skills b'),map=rect('#minimap');return {width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth,headerBottom:header.bottom,missionTop:mission.top,missionBottom:mission.bottom,noticeTop:rect('#notice').top,heroWidth:hero.width,heroFont:parseFloat(getComputedStyle(document.querySelector('#hero-skills b')).fontSize),commandFont:parseFloat(getComputedStyle(document.querySelector('#skills button:not([hidden])')).fontSize),map:{x:map.x,y:map.y},canvasBottom:rect('#battle').bottom,consoleTop:rect('#battle-console').top};});
    assert.ok(layout.scroll<=width+1,JSON.stringify(layout));assert.ok(layout.missionTop>=layout.headerBottom+7,JSON.stringify(layout));assert.ok(layout.noticeTop>=layout.missionBottom+7,JSON.stringify(layout));assert.ok(layout.heroWidth>=layout.heroFont*4-1,JSON.stringify(layout));assert.ok(layout.heroFont>=16*scale-.1&&layout.commandFont>=16*scale-.1,JSON.stringify(layout));assert.ok(Math.abs(layout.canvasBottom-layout.consoleTop)<2,JSON.stringify(layout));assert.ok(Math.abs(layout.map.x-8)<2&&Math.abs(layout.map.y-8)<2,JSON.stringify(layout));report.layouts.push({race,scale,...layout});await page.screenshot({path:`${out}/layout-${race}-${width}x${height}-${scale}.png`});
   }
   await page.evaluate(async()=>{(await import('/src/ui/text-scale.ts')).setTextScale(1);});await page.setViewportSize({width:1440,height:900});continue;
  }
  const identities=await page.evaluate(async race=>{const {ALL_FAMILIES,familyRace}=await import('/src/data/races.ts'),{ELITES}=await import('/src/data/elites.ts');return [...ALL_FAMILIES.filter(f=>familyRace(f)===race).map(f=>({id:f,family:f})),...Object.values(ELITES).filter(e=>familyRace(e.family)===race).map(e=>({id:e.id,family:e.family,elite:e.id,model:e.model}))];},race);
  for(const identity of identities){if(report.identities.some(row=>row.id===identity.id))continue;const row=await page.evaluate(async row=>{
   const {world:w,view:v}=window.__SC2_DEBUG__,{tickWeaponFlights}=await import('/src/simulation/combat/weapon-flight.ts');w.entities.clear();w.heroes.clear();w.weaponFlights=[];w.heroCasts=[];w.visualEvents=[];w.effects=[];v.resetRun();
   const u=w.addUnit(row.family,'terran',0,1);if(row.elite){u.eliteId=row.elite;u.modelKey=row.model;w.refreshStats(u,true);}u.facing=u.attackFacing=Math.PI;u.action='attack';
   const t=w.addUnit(['viking','phoenix','corruptor'].includes(row.family)?'mutalisk':'roach','zerg',0,-.4);t.hp=t.maxHp=1e6;
   w.hash.rebuild(w.entities.values());await v.prepareRosterAssets();const before=t.hp;w.fire(u,t);
   for(let i=0;i<24;i++){w.time+=1/60;tickWeaponFlights(w,1/60);v.render(1/60,1);await new Promise(resolve=>setTimeout(resolve,16));}const attack=v.gpu.get(u.modelKey??u.unitType),observed=w.visualEvents.map(e=>e.kind);w.hit(u,1e9,[],1,'zerg');for(let i=0;i<30;i++){w.time+=1/60;v.render(1/60,1);await new Promise(resolve=>setTimeout(resolve,16));}
   return {...row,attackClip:attack?.actions.attack?.name,deathClip:(v.gpu.get((u.modelKey??u.unitType)+'.death')??attack)?.actions.dead?.name,observed,damageAfterFlight:before-t.hp,dead:u.hp<=0,errors:v.report().errors};
  },identity);assert.deepEqual(row.errors,[]);assert.equal(row.dead,true);report.identities.push(row);if(report.identities.length%10===0)await fs.writeFile(out+'/progress.json',JSON.stringify(report,null,2));}
  await page.screenshot({path:`${out}/${race}-map.png`});
 }
 assert.equal(report.heroes.length,Number(process.env.QA_EXPECT_HEROES??18));assert.equal(report.identities.length,process.env.QA_SKIP_IDENTITIES==='1'?0:120);assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;if(page){await page.screenshot({path:out+'/failure.png'});report.state=await page.evaluate(()=>window.__SC2_REPORT__?.());}}
finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({heroes:report.heroes.length,identities:report.identities.length,failure:report.failure??null,errors:report.errors}));}
