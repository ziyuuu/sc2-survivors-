import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';
const offline=process.argv.find(a=>a.startsWith('--offline='))?.slice(10),phase=process.argv.includes('--controls-only')?'controls':offline?'offline':'web',root=path.resolve('.cache/t01-feedback-repairs/browser'),profile=path.join(root,'profile-'+phase+'-'+process.pid);
await fs.mkdir(profile,{recursive:true});
const report={phase,cases:[],loops:[],checks:[],errors:[],http:[],complete:false},server=offline?undefined:await serveT01();let browser,child;
const timer=setInterval(()=>console.log(JSON.stringify({phase:report.phase,cases:report.cases.length,loops:report.loops.length,errors:report.errors.length})),25000);
try{
 const build=JSON.parse(await fs.readFile('reports/local/t01-20261024/build.json','utf8'));for(const r of build.inputs)assert.equal(createHash('sha256').update(await fs.readFile(r.file)).digest('hex'),r.sha256,r.file);report.verifiedInputs=build.inputs.length;
 if(offline){const b=JSON.parse(await fs.readFile(path.dirname(offline)+'/build.json','utf8')),a=b.artifacts.find(a=>a.mode==='combined'),h=createHash('sha256');for await(const bytes of createReadStream(offline))h.update(bytes);assert.equal(h.digest('hex'),a.sha256);report.htmlSha256=a.sha256;}
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<150;i++){try{port=Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(port);browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const page=browser.contexts()[0].pages()[0];page.setDefaultTimeout(120000);
 await page.setViewportSize({width:1440,height:900});const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});await page.bringToFront();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});page.on('response',r=>{if(r.status()>=400)report.http.push([r.status(),r.url()]);});if(offline){page.on('request',r=>{if(/^https?:/.test(r.url()))report.http.push(r.url());});await page.context().setOffline(true);}
 await page.goto(offline?'file:///'+path.resolve(offline).replaceAll('\\','/'):server.url+'/combined.html');await page.waitForFunction(()=>globalThis.T01?.ready||document.querySelector('#t01-fatal'),null,{timeout:240000});if(await page.locator('#t01-fatal').count())throw Error(await page.locator('#t01-fatal').textContent());
 assert.ok(await page.locator('#t01-loop').isChecked());report.checks.push('loop-on-by-default');
 await page.locator('#t01-audio').click();await page.waitForFunction(()=>T01.app.hud.audio.context.state==='running');
 report.decoded=await page.evaluate(()=>{const a=T01.app.hud.audio;a.output();globalThis.audioAnalyser=a.context.createAnalyser();a.masterBus.connect(audioAnalyser);return a.report();});
 assert.equal(report.decoded.originalDecoded,JSON.parse(await fs.readFile('deploy/runtime/combat-audio.json','utf8')).records.length+10);assert.deepEqual(report.decoded.errors,[]);
 report.counts=await page.evaluate(()=>({objects:T01.gallery.length,units:T01.gallery.filter(o=>o.unit).length,dynamic:T01.catalogue.dynamic.length,static:T01.catalogue.static.length,equipmentActions:T01.gallery.filter(o=>o.id.startsWith('equipment:')).reduce((n,o)=>n+o.actions.length,0)}));assert.equal(report.counts.units,165);assert.equal(report.counts.static,365);
 const specs=await page.evaluate(()=>{
  const gear=(key,race='terran',phase='cycle',binding)=>{const c=T01.catalogue.dynamic.find(c=>c.runner==='equipment'&&c.data.focusEffect===key&&c.race===race&&c.data.previewPhase===phase&&(!binding||Object.values(c.data.binding).includes(binding)));if(!c)throw Error('Missing '+[key,race,phase,binding]);return {id:c.id,kind:key,race,phase,seconds:c.seconds};};
  return [
   ...['zealot','elite.zealot.1','elite.zealot.2','elite.zealot.3'].map(a=>({id:'actor:'+a+':1:attack',kind:'dread',seconds:6})),{id:'actor:zealot:1:idle',kind:'dread',seconds:6},{id:'actor:zealot:1:move',kind:'dread',seconds:6},
   {id:'presentation:fleet',kind:'fleet',seconds:12},{id:'presentation:fleet-expiry',kind:'fleet-expiry',seconds:7},{id:'presentation:fun-brood',kind:'expiry',seconds:8},{id:'presentation:hero-baneling',kind:'expiry',seconds:8},
   gear('phantom'),gear('phantom','terran','expiry'),gear('phantom','terran','death'),gear('phantom','zerg'),gear('phantom','protoss'),
   gear('auto_recall'),gear('auto_recall','zerg'),gear('auto_recall','protoss'),gear('recall_phantom','terran','expiry'),
   gear('phase','terran','expiry'),gear('phase','terran','death'),gear('reinforcement','terran','expiry'),gear('drop_pod','terran','expiry'),gear('swarm','terran','expiry'),gear('konstant','terran','expiry'),
   gear('periodic_trap'),gear('fortification'),gear('stage_yamato'),gear('direction_reinforcement','terran','cycle','starport'),gear('hero_orange','zerg','cycle','niadra')
  ];
 });
 const snap=()=>page.evaluate(()=>{const w=T01.app.world,v=T01.app.view,s=T01.runtime.snapshot(),source=v.sourceCombatEffects.report().source;return {elapsed:s.elapsed,actor:s.actor,patient:s.patient,events:s.events.map(e=>({kind:e.kind,type:e.unitType,missionFleet:e.missionFleet})),equipment:s.equipment?{key:s.equipment.key,phase:s.equipment.phase,stage:s.equipment.stage,observed:s.equipment.observed,current:s.equipment.current}:null,alive:w.allies().map(u=>({id:u.id,type:u.unitType,model:v.modelKey(u),hp:u.hp,rank:u.rank,temporary:!!u.temporary,projection:w.starship.projections.get(u.id)?.kind,shots:u.shotSequence,x:u.x,z:u.z,scale:u.visualScale})),fleet:{count:w.missions.fleet.ships.size,pending:w.missions.fleet.pending},source:{requests:source.activeRequests,draws:source.modelDraws,ending:source.endingChannels,meshInstances:source.meshInstances,particles:source.particles,ribbons:source.ribbons},audio:T01.app.hud.audio.report(),renderErrors:v.report().errors};});
 const repeat=new Set(['fleet-expiry','expiry','phase','reinforcement','drop_pod','swarm','konstant','recall_phantom']);
 for(const c of process.argv.includes('--controls-only')?[]:specs){
  report.phase=phase+':'+c.id;await page.evaluate(id=>T01.load(id,true),c.id);await page.evaluate(()=>T01.runtime.pause());
  const cycles=[];const count=repeat.has(c.kind)||(c.kind==='phantom'&&c.phase!=='cycle')?3:1;
  for(let round=0;round<count;round++){
   await page.evaluate(()=>T01.runtime.pause());const samples=[];
   for(const at of c.kind==='dread'?[.8,2,4]:[.9,2.5,4.2,c.seconds]){await page.evaluate(t=>T01.runtime.advanceTo(t),at);samples.push(await snap());if(round===0&&((at===2.5&&c.kind!=='phantom')||(at===2.5&&c.race==='terran')||(at===.8&&c.kind==='dread')))await page.screenshot({path:path.join(root,phase+'-'+c.id.replaceAll(':','_')+'-'+at+'.png')});}
   assert.ok(samples.every(s=>s.renderErrors.length===0),c.id+' renderer');
   for(const s of samples)for(const draw of s.source.draws.filter(d=>d.model==='BlinkOriginModel'))assert.equal(draw.meshes,0,c.id+' Stalker mesh excluded');
   if(c.kind==='dread'){assert.ok(samples.some(s=>s.source.requests.some(k=>k.startsWith('body-ribbon:'))),c.id+' live source hair');assert.ok(samples.every(s=>new Set(s.source.requests.filter(k=>k.startsWith('body-ribbon:'))).size===s.source.requests.filter(k=>k.startsWith('body-ribbon:')).length));}
   if(c.kind==='fleet'||c.kind==='fleet-expiry'){assert.ok(samples.some(s=>s.fleet.count===3),c.id+' all three ships');assert.ok(samples.flatMap(s=>s.alive).filter(u=>u.model==='hero.yamato_battlecruiser').every(u=>u.scale===1));if(c.kind==='fleet-expiry')assert.equal(samples.at(-1).fleet.count,0);}
   if(c.kind==='expiry'){assert.ok(samples.some(s=>s.events.some(e=>e.kind==='unit-expired')));assert.equal(samples.at(-1).actor,null);}
   if(['phantom','recall_phantom','phase'].includes(c.kind)){assert.ok(samples.some(s=>s.alive.some(u=>u.projection)),c.id+' actual copy');if(c.phase!=='cycle')assert.ok(samples.at(-1).alive.every(u=>!u.projection));}
   if(c.kind==='auto_recall'){assert.ok(samples.some(s=>Math.hypot(s.actor.x,s.actor.z)<10));assert.ok(samples.some(s=>s.equipment.current.receipts.some(r=>r.kind==='recall-to')));}
   if(c.kind==='stage_yamato'){assert.ok(samples.some(s=>s.alive.some(u=>u.type==='yamato_battlecruiser'&&u.model==='hero.yamato_battlecruiser')));}
   await page.evaluate(()=>T01.runtime.pause());const paused=await snap();assert.equal(paused.audio.activeVoices,0);assert.equal(paused.audio.activeChannels.length,0);
   const signature=samples.map(s=>({alive:s.alive.map(u=>[u.type,u.model,u.rank,u.temporary,u.projection??null]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),fleet:s.fleet.count,requests:s.source.requests.length,ending:s.source.ending}));
   if(cycles.length)assert.deepEqual(signature,cycles[0].signature,c.id+' no cross-cycle body/effect accumulation');cycles.push({signature,samples:round===0?samples:undefined});
   if(round<count-1){await page.evaluate(()=>{T01.app.world.paused=false;});await page.waitForFunction(id=>!T01.busy&&T01.runtime.snapshot().caseId===id&&T01.runtime.snapshot().elapsed<.7&&T01.runtime.snapshot().playing,c.id);}
  }
  report.cases.push({...c,cycles});if(count===3)report.loops.push({id:c.id,cycles:3});console.log(JSON.stringify({id:c.id,cycles:count,ok:true}));
 }
 report.checks.push('full-native-lifecycle-three-consecutive-default-loops','pause-clears-all-voices','generic-effects-never-draw-Stalker-mesh','Zealot-live-single-dread-layer','fleet-full-three-ships-and-native-expiry');
 // Fixed camera / common world positions: actual hero art, new mission scale,
 // legacy save scale, and equipment gift all use the same rendering normalization.
 await page.evaluate(()=>T01.load('presentation:fleet',false));
 report.scaleReference=await page.evaluate(async()=>{
  const w=T01.app.world,v=T01.app.view;T01.runtime.pause();const ship=w.entities.get([...w.missions.fleet.ships.keys()][0]);
  w.entities.clear();w.missions.fleet.pending=null;w.missions.fleet.ships.clear();
  const variants=[{label:'正式英雄',heroId:'yamato_battlecruiser',mission:undefined,visualScale:1},{label:'新协战舰',visualScale:1},{label:'旧存档协战舰',visualScale:.5},{label:'装备赠舰',heroId:undefined,mission:undefined,modelKey:undefined,visualScale:1}],rows=[];
  for(let i=0;i<variants.length;i++){const x=(i-1.5)*7,u=Object.assign(structuredClone(ship),variants[i],{id:w.nextId++,x,z:0,prev:{x,z:0},nextShotAt:Infinity,stoppedUntil:Infinity});w.entities.set(u.id,u);rows.push({label:variants[i].label,id:u.id,x:u.x,model:v.modelKey(u)});}
  v.prepareRosterAssets();while(v.assetsPending)await new Promise(r=>setTimeout(r,16));
  globalThis.t01ComparisonSaved={render:v.render,update:v.cameraController.update,visible:v.visible};
  v.cameraController.update=()=>{};v.visible=()=>true;v.camera.position.set(0,35,27);v.camera.lookAt(0,2,0);v.camera.updateProjectionMatrix();v.camera.updateMatrixWorld(true);
  w.changed();v.render(0,1);v.render=function(){this.renderScene();};
  const b=v.gpu.get('hero.yamato_battlecruiser'),a=b.meshes[0].instanceMatrix.array,instances=Array.from({length:b.count},(_,i)=>({x:a[i*16+12],scale:Math.hypot(a[i*16],a[i*16+1],a[i*16+2])}));
  return {rows,camera:v.camera.position.toArray(),instances};
 });
 assert.equal(report.scaleReference.instances.length,4);assert.ok(Math.max(...report.scaleReference.instances.map(v=>v.scale))-Math.min(...report.scaleReference.instances.map(v=>v.scale))<1e-6);
 await page.screenshot({path:path.join(root,phase+'-fixed-camera-yamato-comparison.png')});
 await page.evaluate(()=>{const v=T01.app.view;v.render=t01ComparisonSaved.render;v.cameraController.update=t01ComparisonSaved.update;v.visible=t01ComparisonSaved.visible;delete globalThis.t01ComparisonSaved;T01.app.world.changed();});
 report.checks.push('four-identities-identical-instance-scale-under-fixed-camera');
 // Real-time sound signal, ordinary playback controls, and switching cleanup.
 await page.evaluate(()=>T01.load('presentation:equipment-projection-birth',true));report.signal=await page.evaluate(async()=>{let peak=0;const data=new Float32Array(audioAnalyser.fftSize);for(let i=0;i<100;i++){audioAnalyser.getFloatTimeDomainData(data);peak=Math.max(peak,...data.map(Math.abs));await new Promise(r=>setTimeout(r,20));}return peak;});assert.ok(report.signal>.00001);
 await page.locator('#t01-play').click();const time=await page.evaluate(()=>T01.runtime.snapshot().elapsed);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>T01.runtime.snapshot().elapsed),time);
 await page.locator('#t01-advanced summary').click();await page.locator('#t01-step').click();assert.ok(Math.abs(await page.evaluate(()=>T01.runtime.snapshot().elapsed)-time-1/60)<1e-6);await page.locator('#t01-advanced summary').click();
 await page.locator('#t01-speed').selectOption('.5');assert.equal(await page.evaluate(()=>T01.runtime.snapshot().speed),.5);await page.locator('#t01-speed').selectOption('1');
 await page.evaluate(()=>T01.runtime.advanceTo(12));const pausedAtEnd=await page.evaluate(()=>T01.runtime.snapshot().elapsed);await page.waitForTimeout(450);assert.equal(await page.evaluate(()=>T01.runtime.snapshot().elapsed),pausedAtEnd);report.checks.push('pause-at-end-blocks-auto-restart','frame-step','half-speed','actual-audio-signal');
 await page.evaluate(()=>T01.load('actor:marine:1:idle',false));report.switchCleanup=await page.evaluate(()=>({projections:T01.app.world.starship.projections.size,temporary:T01.app.world.allies().filter(u=>u.temporary).length,voices:T01.app.hud.audio.report().activeVoices,requests:T01.app.view.sourceCombatEffects.report().source.activeRequests}));assert.equal(report.switchCleanup.projections,0);assert.equal(report.switchCleanup.temporary,0);assert.equal(report.switchCleanup.voices,0);assert.equal(report.switchCleanup.requests.length,0);
 const downloads=[],downloadRoot=path.join(root,'downloads-'+phase);await fs.mkdir(downloadRoot,{recursive:true});const session=await browser.newBrowserCDPSession();session.on('Browser.downloadWillBegin',d=>downloads.push({...d,state:'started'}));session.on('Browser.downloadProgress',d=>Object.assign(downloads.find(a=>a.guid===d.guid)??{},d));await session.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:downloadRoot,eventsEnabled:true});
 await page.locator('#t01-note').fill('八项反馈修复复核');await page.locator('[data-result="viewed"]').click();await page.locator('#t01-export').click();for(let i=0;i<100&&!downloads.some(d=>d.state==='completed');i++)await page.waitForTimeout(100);const download=downloads.find(d=>d.state==='completed');assert.ok(download);const exported=JSON.parse(await fs.readFile(path.join(downloadRoot,download.guid),'utf8'));assert.ok(Object.values(exported.results).some(r=>r.note==='八项反馈修复复核'));report.checks.push('actual-export');
 const before=await page.evaluate(()=>({time:T01.app.world.time,wallet:T01.app.world.wallet}));await page.locator('#t01-static').click();await page.waitForFunction(()=>!T01.busy&&T01.mode==='static');assert.deepEqual(await page.evaluate(()=>({time:T01.app.world.time,wallet:T01.app.world.wallet})),before);await page.locator('#t01-dynamic').click();await page.waitForFunction(()=>!T01.busy&&T01.mode==='dynamic');assert.ok(await page.locator('#t01-loop').isChecked());report.checks.push('UI-isolation-and-loop-preference-survives-mode-change');
 report.ruleNotes=await page.evaluate(()=>({tavernDynamic:T01.gallery.some(o=>o.actions.some(a=>a.cases.some(c=>c.runner==='card-effect'&&c.data.effect.kind==='funShop'&&c.data.effect.item==='tavern'))),tavernReference:document.querySelector('#t01-catalogue-notes').textContent.includes('1.3/1.7/2.2'),eggReference:document.querySelector('#t01-catalogue-notes').textContent.includes('子单位列表为空')}));assert.equal(report.ruleNotes.tavernDynamic,false);assert.ok(report.ruleNotes.tavernReference&&report.ruleNotes.eggReference);
 const layoutId=specs.find(c=>c.kind==='phantom'&&c.phase==='expiry').id;await page.evaluate(id=>T01.load(id,false),layoutId);report.layouts=[];for(const [width,height]of [[1440,900],[844,390],[390,844]]){await page.setViewportSize({width,height});await page.waitForTimeout(250);const layout=await page.evaluate(()=>{const el=id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return {id,x:r.x,y:r.y,width:r.width,height:r.height,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth};};return {stage:el('t01-stage'),footer:document.querySelector('.viewer-footer').getBoundingClientRect().toJSON(),hud:getComputedStyle(document.querySelector('#game-root #interface')).visibility,buttons:[...['t01-play','t01-reset','t01-loop','t01-export'].map(el),...Array.from(document.querySelectorAll('.viewer-review button')).map(e=>({id:e.textContent,...e.getBoundingClientRect().toJSON()}))]};});assert.ok(layout.stage.width>100&&layout.stage.height>100);assert.equal(layout.hud,'hidden');for(const b of layout.buttons)assert.ok(b.x>=0&&b.x+b.width<=width+1&&b.y>=0&&b.y+b.height<=height+1,JSON.stringify(b));report.layouts.push({width,height,...layout});await page.screenshot({path:path.join(root,phase+'-layout-'+width+'x'+height+'.png')});}
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.complete=true;
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;}
finally{clearInterval(timer);if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();await server?.close();await fs.writeFile(path.join(root,phase+'-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({phase,complete:report.complete,failure:report.failure,cases:report.cases.length,loops:report.loops.length,errors:report.errors,http:report.http}));}
