import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.QA_OUT??'reports/local/hero-iteration/environment';await fs.mkdir(out,{recursive:true});
const report={method:'Visible Chrome, explicit diagnostic fixtures and deterministic render steps; not natural performance or human approval.',maps:[],carriers:[],mixed:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false,args:['--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling']});let page;
try{
 page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5181');await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
 await page.exposeFunction('saveEnvironmentClip',async(name,bytes)=>fs.writeFile(out+'/'+name+'.webm',Buffer.from(bytes,'base64')));
 for(const race of ['terran','zerg','protoss']){
  if(race!=='terran'){await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;w.phase='battle';w.paused=false;w.changed();});await page.locator('#topbar [data-action=pause]').click();await page.locator('[data-action=restart]').click();}
  await page.locator('[data-action=menu-new]').click();await page.locator(`[data-action=menu-race][data-race=${race}]`).click();await page.locator('[data-action=menu-race-next]').click();await page.locator('[data-action=menu-difficulty-next]').click();await page.locator('[data-action=menu-start]').click();
  await page.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__?.().readiness?.phase),null,{timeout:600000});assert.equal(await page.evaluate(()=>window.__SC2_REPORT__().readiness.phase),'ready');await page.locator('[data-action=flow-continue]').click();
  await page.evaluate(()=>{const d=window.__SC2_DEBUG__,w=d.world;Object.defineProperty(d,'speed',{configurable:true,get:()=>0,set:()=>{}});w.autoWaves=false;w.sandbox=true;w.phase='battle';w.stage=18;w.stageElapsed=0;w.terrain.setStage(18);w.entities.clear();w.pods=[];w.hive=null;w.heroCasts=[];w.weaponFlights=[];w.effects=[];w.anchor={x:0,z:0,facing:0};const observer=w.addFamilyMember(w.expedition.familySlots[0],{x:0,z:0});observer.stoppedUntil=Infinity;w.changed();});
  if(race==='terran')for(const theme of ['industrial','mar-sara','char']){
   const map=await page.evaluate(async theme=>{const {world:w,view:v}=window.__SC2_DEBUG__,{campaignTerrain}=await import('/src/data/campaign-map.ts');const recipe={version:1,seed:731,theme,layout:1};await v.prepareCampaignAssets(recipe);w.terrain=campaignTerrain(recipe);w.terrain.setStage(18);w.changed();v.render(1/60,1);await new Promise(r=>setTimeout(r,100));v.render(1/60,1);const root=v.scene.getObjectByName(w.terrain.definition.source.sha256),materials=[];root.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])materials.push({mesh:n.name,hasMap:!!m.map,loaded:!!m.map?.image,width:m.map?.image?.width??0});});return {theme,materials,report:v.report().map};},theme);
   assert.ok(map.materials.length>2);assert.ok(map.materials.every(m=>m.hasMap&&m.loaded),JSON.stringify(map));report.maps.push(map);await page.screenshot({path:out+'/map-'+theme+'.png'});
  }
  const carrier=await page.evaluate(async race=>{const {world:w,view:v}=window.__SC2_DEBUG__,family=w.expedition.familySlots[0];const p=w.spawnPod(family,{x:4,z:0});if(!p)throw Error('No carrier position');p.status='active';p.landedAt=w.time;w.hash.rebuild(w.entities.values());w.changed();v.render(1/60,1);const chunks=[],stream=document.querySelector('#battle').captureStream(30),rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:1000000});rec.ondataavailable=e=>chunks.push(e.data);rec.start();p.hp=0;p.status='destroyed';p.resolvedAt=w.time;for(let i=0;i<150;i++){w.time+=1/60;v.render(1/60,1);await new Promise(r=>setTimeout(r,16));}const view=v.podViews.get(p.id),result={race,state:view.state,sourceDeath:!!view.deathModel,mixerTime:view.deathMixer?.time,originalClip:view.deathDuration,errors:v.report().errors};await new Promise(resolve=>{rec.onstop=resolve;rec.stop();});stream.getTracks().forEach(t=>t.stop());await window.saveEnvironmentClip('carrier-'+race,await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(new Blob(chunks));}));return result;},race);
  assert.equal(carrier.sourceDeath,true);assert.ok(carrier.mixerTime>2);assert.deepEqual(carrier.errors,[]);report.carriers.push(carrier);await page.screenshot({path:out+'/carrier-'+race+'.png'});
  const mixed=await page.evaluate(async race=>{
   const {world:w,view:v}=window.__SC2_DEBUG__,{ELITES}=await import('/src/data/elites.ts');
   w.entities.clear();w.pods=[];w.heroCasts=[];w.weaponFlights=[];w.heroes.clear();w.visualEvents=[];w.effects=[];w.stageElapsed=0;w.phase='battle';w.paused=false;w.enemySpecials.casts=[];w.enemySpecials.missiles=[];w.enemySpecials.charges.clear();v.resetRun();
   const ids={terran:['raynor','tychus','nova'],zerg:['kerrigan','zagara','hots_leviathan'],protoss:['alarak','fenix','purifier_flagship']}[race];
   const eliteIds={terran:['marine.1','marauder.2','hellion.2','viking.2','tank.1'],zerg:['zergling.1','roach.2','ravager.2','hydralisk.1','lurker.1'],protoss:['zealot.1','stalker.2','sentry.1','immortal.1','high_templar.3']}[race];
   for(const [i,id] of ids.entries()){w.acquireHero(id);const h=w.heroEntity(id);h.x=h.prev.x=(i-1)*3;h.z=h.prev.z=2;h.facing=h.attackFacing=Math.PI;}
   for(const [i,id] of eliteIds.entries()){const d=ELITES[id],u=w.addFamilyMember(d.family,{x:(i-2)*2,z:5});u.eliteId=id;u.modelKey=d.model;w.refreshStats(u,true);}
   Object.assign(w.expedition.tech,{storm:1,charge:1});
   for(let i=0;i<5;i++){const enemy=w.addUnit(i===4?'mutalisk':'roach','zerg',(i-2)*1.3,-1);enemy.hp=enemy.maxHp=1e6;enemy.stoppedUntil=Infinity;}
   const boss=w.spawnSpecial('ravager','boss',{x:0,z:-6});if(!boss)throw Error('Mixed fixture Boss landing');boss.hp=boss.maxHp=1e6;boss.specialReady=w.time+.25;
   w.hash.rebuild(w.entities.values());await v.prepareRosterAssets();
   const parts=[],stream=document.querySelector('#battle').captureStream(30),rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:1500000});rec.ondataavailable=e=>parts.push(e.data);rec.start();let warningFrames=0,childShots=0;
   for(let f=0;f<330;f++){if(f===30)for(const id of ids)w.castHero(id);w.step();if(w.enemySpecials.casts.length)warningFrames++;childShots=Math.max(childShots,[...w.entities.values()].filter(u=>u.summonKind==='interceptor').reduce((n,u)=>n+u.shotSequence,0));v.render(1/60,1);await new Promise(r=>setTimeout(r,16));}
   await new Promise(resolve=>{rec.onstop=resolve;rec.stop();});stream.getTracks().forEach(t=>t.stop());await window.saveEnvironmentClip('three-heroes-'+race,await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(new Blob(parts));}));
   return {race,ids,eliteIds,warningFrames,childShots,stats:{...v.fx.sculptures.stats},calls:v.renderer.info.render.calls,errors:v.report().errors};
  },race);
  assert.deepEqual(mixed.errors,[]);assert.equal(mixed.stats.coreDropped,0);assert.ok(mixed.warningFrames>0);if(race==='protoss')assert.ok(mixed.childShots>0);report.mixed.push(mixed);await fs.writeFile(out+'/progress.json',JSON.stringify(report,null,2));
 }
 report.ancillary=await page.evaluate(async()=>{
  const {world:w,view:v}=window.__SC2_DEBUG__;w.entities.clear();w.heroCasts=[];w.weaponFlights=[];w.pods=[];w.effects=[];w.economicTargets.clear();
  const drone=w.spawnEconomic('drone',{x:2,z:0});w.hive={...drone,id:w.nextId++,kind:undefined,x:-3,z:0,unitRadius:3,attributes:['Armored','Biological','Structure'],race:'zerg',team:'enemy'};
  v.render(1/60,1);const id=w.hive.id;w.hit(drone,1e6,[],1,'terran');w.hit(w.hive,1e6,[],1,'terran');
  for(let i=0;i<90;i++){w.time+=1/60;v.render(1/60,1);await new Promise(r=>setTimeout(r,16));}
  const result={workerDeaths:['scv','drone','probe'].map(key=>({key,clip:v.gpu.get(key+'.death')?.actions.dead?.name})),droneStatus:drone.status,hiveDeathTime:v.hiveDeaths.get(id)?.mixer.time,hiveHp:w.hive.hp,errors:v.report().errors};
  v.resetRun();v.render(1/60,1);result.restoreDoesNotReplay=v.hiveDeaths.size===0;return result;
 });
 assert.ok(report.ancillary.workerDeaths.every(d=>d.clip));assert.equal(report.ancillary.droneStatus,'killed');assert.ok(report.ancillary.hiveDeathTime>1);assert.equal(report.ancillary.restoreDoesNotReplay,true);assert.deepEqual(report.ancillary.errors,[]);await page.screenshot({path:out+'/ancillary-death.png'});
 // GLTFLoader's tolerated missing image must be promoted to a readiness error.
 report.badTexture=await page.evaluate(async()=>{const {configurePlatformAssetUrl,assetUrl}=await import('/src/assets/manifest.ts'),{loadSemanticGltf}=await import('/src/render/loaders/semantic-gltf.ts');const original=assetUrl('model.map.rock_00'),json=await(await fetch(original)).json(),bad=URL.createObjectURL(new Blob([JSON.stringify(json)],{type:'model/gltf+json'}));configurePlatformAssetUrl(id=>id==='model.map.rock_00'?bad:'data:image/png;base64,AAAA');try{await loadSemanticGltf('model.map.rock_00');return 'incorrectly accepted';}catch(e){return String(e.message);}finally{configurePlatformAssetUrl(null);URL.revokeObjectURL(bad);}});
 assert.match(report.badTexture,/贴图加载失败/);assert.deepEqual(report.errors,[]);
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;if(page){report.state=await page.evaluate(()=>window.__SC2_REPORT__?.());await page.screenshot({path:out+'/failure.png'});}}
finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
