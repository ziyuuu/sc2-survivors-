import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';
const confirmed=process.argv.includes('--confirmed'),recheck=process.argv.includes('--recheck')||confirmed,offline=process.argv.find(a=>a.startsWith('--offline='))?.slice(10),phase=offline?'offline':'web',root=path.resolve(confirmed?'.cache/t01-closeout/browser':recheck?'.cache/t01-sound-recheck/browser':'.cache/t01-motion-feedback/browser'),profile=path.join(root,'profile-'+phase+'-'+process.pid);
await fs.mkdir(profile,{recursive:true});
const report={phase,cases:[],checks:[],errors:[],http:[],complete:false},server=offline?undefined:await serveT01();let browser,child;
const timer=setInterval(()=>console.log(JSON.stringify({phase:report.phase,cases:report.cases.length,errors:report.errors.length})),25000);
try{
 const build=JSON.parse(await fs.readFile('reports/local/t01-20261024/build.json','utf8'));for(const r of build.inputs)assert.equal(createHash('sha256').update(await fs.readFile(r.file)).digest('hex'),r.sha256,r.file);report.verifiedInputs=build.inputs.length;
 if(offline){const b=JSON.parse(await fs.readFile(path.dirname(offline)+'/build.json','utf8')),a=b.artifacts.find(a=>a.mode==='combined'),h=createHash('sha256');for await(const bytes of createReadStream(offline))h.update(bytes);assert.equal(h.digest('hex'),a.sha256);report.htmlSha256=a.sha256;}
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<150;i++){try{port=Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(port);browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const page=browser.contexts()[0].pages()[0];page.setDefaultTimeout(120000);
 await page.setViewportSize({width:1440,height:900});const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});await page.bringToFront();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});page.on('response',r=>{if(r.status()>=400)report.http.push([r.status(),r.url()]);});if(offline){page.on('request',r=>{if(/^https?:/.test(r.url()))report.http.push(r.url());});await page.context().setOffline(true);}
 await page.goto(offline?'file:///'+path.resolve(offline).replaceAll('\\','/'):server.url+'/combined.html');await page.waitForFunction(()=>globalThis.T01?.ready||document.querySelector('#t01-fatal'),null,{timeout:240000});if(await page.locator('#t01-fatal').count())throw Error(await page.locator('#t01-fatal').textContent());
 await page.locator('#t01-audio').click();await page.waitForFunction(()=>T01.app.hud.audio.context.state==='running');
 report.decoded=await page.evaluate(()=>{const a=T01.app.hud.audio;a.output();globalThis.audioAnalyser=a.context.createAnalyser();a.masterBus.connect(audioAnalyser);return a.report();});
 assert.equal(report.decoded.originalDecoded,JSON.parse(await fs.readFile('deploy/runtime/combat-audio.json','utf8')).records.length+10);assert.deepEqual(report.decoded.errors,[]);
 const data=JSON.parse(await fs.readFile('src/data/combat-audio.json','utf8')),specs=recheck?[
  ...Object.entries(data.dialogue).filter(([k])=>k.startsWith('hero:')).map(([key,banks])=>({id:'actor:'+key.replace('hero:','hero.')+':1:idle',kind:'dialogue',banks})),
  ...Object.entries(data.walkEvents).map(([key,walk])=>({id:'actor:'+key.replace('hero:','hero.')+':1:move',kind:'footsteps',banks:[...new Set(walk.events.map(e=>e.bank))]})),
  {id:'actor:marine:1:idle',kind:'dialogue',banks:data.dialogue.marine},
 ]:[
  ...Object.entries(data.transforms).map(([key,banks])=>({id:'actor:'+key.split(':')[0]+':1:mode:'+key.split(':')[1],kind:'transform',banks})),
  ...['hellion','thor','viking','banshee','medivac','science_vessel','baneling','ultralisk','phoenix','void_ray','carrier'].map(key=>({id:'actor:'+key+':1:move',kind:'movement',banks:[data.motion[key]]})),
  {id:'actor:hellion:1:form:hellbat:move',kind:'movement',banks:[data.motion.hellbat]},
  ...['marine','tank','hero.raynor','hero.kerrigan','hero.zagara','hero.fenix'].map(key=>({id:'actor:'+key+':1:idle',kind:'dialogue',banks:data.dialogue[key.replace('hero.','hero:')]})),
  ...['terran','zerg','protoss'].map(race=>({id:'equipment:module.moving_fire.3:'+race+':1:unbound',kind:'gear',banks:[]}))
 ];
 const snap=()=>page.evaluate(()=>{const s=T01.runtime.snapshot(),a=T01.app.hud.audio.report();return {snapshot:{caseId:s.caseId,elapsed:s.elapsed,actor:s.actor},audio:{nativePlayed:a.nativePlayed,nativeRoutes:a.nativeRoutes,activeVoices:a.activeVoices,activeChannels:a.activeChannels},alive:T01.app.world.allies().map(u=>({id:u.id,type:u.unitType,x:u.x,z:u.z,velocity:u.velocity,shots:u.shotSequence})),renderErrors:T01.app.view.errors??[]};});
 for(const spec of specs){
  report.phase=phase+':'+spec.id;await page.evaluate(async id=>{await T01.load(id,true);T01.runtime.pause();T01.app.world.paused=false;},spec.id);
  const samples=[],moving=new Set();let previous=new Map();
  const ticks=recheck&&spec.kind==='dialogue'?[126]:Array.from({length:25},(_,i)=>(i+1)*12);
  for(const tick of ticks){
   await page.evaluate(at=>T01.runtime.advanceTo(at),tick/60);
   {const s=await snap();samples.push(s);for(const u of s.alive)if(u.shots>(previous.get(u.id)??0)&&Math.hypot(u.velocity.x,u.velocity.z)>.01)moving.add(u.type);previous=new Map(s.alive.map(u=>[u.id,u.shots]));}
   if(tick===120&&['gear','transform'].includes(spec.kind))await page.screenshot({path:path.join(root,phase+'-'+spec.id.replaceAll(':','_')+'.png')});
  }
  const last=samples.at(-1),played=last.audio.nativePlayed;
  if(spec.kind==='dialogue')assert.ok(spec.banks.some(bank=>played[bank]>0),spec.id+' voice');else for(const bank of spec.banks)assert.ok(played[bank]>0,spec.id+': '+bank);
  if(spec.kind==='gear'){assert.ok(moving.size>0,spec.id+' moving shots');if(spec.id.includes(':terran:'))assert.ok(moving.has('tank'),'real moving tank projectile');}
  assert.ok(samples.every(s=>s.renderErrors.length===0));
  await page.evaluate(()=>T01.runtime.pause());const paused=await snap();assert.equal(paused.audio.activeVoices,0);assert.equal(paused.audio.activeChannels.length,0);
  report.cases.push({...spec,played,movingShotTypes:[...moving],samples:[samples[0],samples[9],last]});console.log(JSON.stringify({id:spec.id,ok:true}));
 }
 // Actual wall-clock playback and measured signal, then user pause/step/reset.
 await page.evaluate(()=>T01.load('actor:hellion:1:move',true));await page.waitForTimeout(1000);
 report.signal=await page.evaluate(async()=>{let peak=0;const b=new Float32Array(audioAnalyser.fftSize);for(let i=0;i<30;i++){audioAnalyser.getFloatTimeDomainData(b);for(const v of b)peak=Math.max(peak,Math.abs(v));await new Promise(r=>setTimeout(r,25));}return peak;});assert.ok(report.signal>.00001);
 await page.locator('#t01-play').click();const pausedTime=await page.evaluate(()=>T01.app.world.time);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>T01.app.world.time),pausedTime);
 await page.evaluate(()=>T01.runtime.advanceTo(T01.runtime.snapshot().elapsed+1/60));assert.ok(await page.evaluate(()=>T01.app.world.time)>pausedTime);
 await page.locator('#t01-reset').click();assert.ok(await page.evaluate(()=>T01.runtime.snapshot().elapsed)<.3);report.checks.push('actual-audio-signal','play-pause-frame-reset','all-scenes-pause-clears-voices');
 report.loops=[];for(let cycle=0;cycle<3;cycle++){await page.waitForFunction(()=>T01.runtime.snapshot().elapsed>5.5);await page.waitForFunction(()=>!T01.busy&&T01.runtime.snapshot().elapsed<.6&&T01.runtime.snapshot().playing);const s=await snap();assert.ok(s.audio.activeVoices<=4);report.loops.push({cycle,elapsed:s.snapshot.elapsed,voices:s.audio.activeVoices});}report.checks.push('three-default-loops-without-voice-accumulation');await page.evaluate(()=>T01.runtime.pause());
 const downloads=[],downloadRoot=path.join(root,'downloads-'+phase);await fs.mkdir(downloadRoot,{recursive:true});const session=await browser.newBrowserCDPSession();session.on('Browser.downloadWillBegin',d=>downloads.push({...d,state:'started'}));session.on('Browser.downloadProgress',d=>Object.assign(downloads.find(a=>a.guid===d.guid)??{},d));await session.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:downloadRoot,eventsEnabled:true});
 await page.locator('#t01-note').fill('移动变形音效与移动射击复核');await page.locator('[data-result="viewed"]').click();await page.locator('#t01-export').click();for(let i=0;i<100&&!downloads.some(d=>d.state==='completed');i++)await page.waitForTimeout(100);const download=downloads.find(d=>d.state==='completed');assert.ok(download);const exported=JSON.parse(await fs.readFile(path.join(downloadRoot,download.guid),'utf8'));assert.ok(Object.values(exported.results).some(r=>r.note==='移动变形音效与移动射击复核'));report.checks.push('actual-export');
 report.counts=await page.evaluate(()=>({objects:T01.gallery.length,units:T01.gallery.filter(o=>o.unit).length,static:T01.catalogue.static.length}));assert.equal(report.counts.units,165);assert.equal(report.counts.static,365);
 if(recheck){
  report.voiceRotations=[];
  for(const spec of specs.filter(s=>s.kind==='dialogue')){
   const heard=[];let peak=0;
   for(let cycle=0;cycle<spec.banks.length;cycle++){
    await page.evaluate(async id=>{await T01.load(id,true);T01.runtime.pause();T01.app.world.paused=false;await T01.runtime.advanceTo(2.1);},spec.id);
    const s=await snap(),bank=spec.banks.find(b=>s.audio.nativePlayed[b]>0);assert.ok(bank,spec.id+' rotation '+cycle);heard.push(bank);
    if(cycle===0){peak=await page.evaluate(async()=>{let peak=0;const b=new Float32Array(audioAnalyser.fftSize);for(let i=0;i<12;i++){audioAnalyser.getFloatTimeDomainData(b);for(const v of b)peak=Math.max(peak,Math.abs(v));await new Promise(r=>setTimeout(r,25));}return peak;});assert.ok(peak>.00001,spec.id+' real dialogue signal');if(/hots_leviathan|purifier_flagship|fenix/.test(spec.id))await page.screenshot({path:path.join(root,phase+'-'+spec.id.replaceAll(':','_')+'.png')});}
   }
   assert.deepEqual(new Set(heard),new Set(spec.banks),spec.id+' full category rotation across short loops');report.voiceRotations.push({id:spec.id,heard,peak});
   await page.evaluate(()=>T01.runtime.pause());assert.equal((await snap()).audio.activeVoices,0);
  }
  report.checks.push('all-eighteen-hero-dialogue-signals','all-dialogue-categories-survive-short-loops');
 }
 if(confirmed){
  report.confirmedMovement=[];
  const signal=()=>page.evaluate(async()=>{let peak=0;const b=new Float32Array(audioAnalyser.fftSize);for(let i=0;i<36;i++){audioAnalyser.getFloatTimeDomainData(b);for(const v of b)peak=Math.max(peak,Math.abs(v));await new Promise(r=>setTimeout(r,25));}return peak;});
  for(const spec of [{family:'zergling',count:9,layers:0},{family:'zergling',count:10,layers:1},{family:'zergling',count:25,layers:2},{family:'zergling',count:100,layers:3},{family:'queen',count:6,layers:0},{family:'queen',count:7,layers:1},{family:'queen',count:18,layers:2}]){
   await page.evaluate(async spec=>{
    await T01.load('actor:'+spec.family+':1:move',false);T01.runtime.pause();const w=T01.app.world,a=T01.app.hud.audio;w.entities.clear();w.pods=[];w.time=0;w.paused=false;a.reset();
    for(let i=0;i<spec.count;i++){const x=(i%10)*.1,z=Math.floor(i/10)*.1,u=w.addUnit(spec.family,'terran',x,z);u.velocity={x:1,z:0};u.action='move';u.bornAt=-10;}
    a.update(w);
   },spec);
   const actual=await page.evaluate(()=>T01.app.hud.audio.report()),groups=actual.activeChannels.filter(c=>c.key.startsWith('herd:'));assert.equal(groups.length,spec.layers);assert.ok(groups.every(c=>c.playing));
   const peak=spec.layers?await signal():0;if(spec.layers)assert.ok(peak>.000001);
   if(spec.count===10||spec.count===7)await page.screenshot({path:path.join(root,phase+'-herd-'+spec.family+'.png')});
   await page.evaluate(()=>{for(const u of T01.app.world.entities.values())u.velocity={x:0,z:0};T01.app.hud.audio.update(T01.app.world);});assert.equal((await snap()).audio.activeChannels.length,0);
   report.confirmedMovement.push({...spec,groups,peak,stopped:true});
  }
  // Original Dehaka contacts must reach the real audio graph, not merely route counters.
  await page.evaluate(async()=>{await T01.load('actor:hero.dehaka:1:move',true);});const dehakaPeak=await signal();assert.ok(dehakaPeak>.000001);await page.screenshot({path:path.join(root,phase+'-dehaka-walk.png')});await page.evaluate(()=>T01.runtime.pause());report.confirmedMovement.push({kind:'dehaka-actual-walk',peak:dehakaPeak});
  await page.evaluate(async()=>{await T01.load('actor:marine:1:arrival',false);T01.runtime.pause();const w=T01.app.world,a=T01.app.hud.audio;w.paused=false;a.reset();a.update(w);});
  const falling=await snap();assert.ok(falling.audio.activeChannels.some(c=>c.key.startsWith('carrier-movement:')&&c.playing));const carrierPeak=await signal();assert.ok(carrierPeak>.000001);await page.screenshot({path:path.join(root,phase+'-barracks-descent.png')});
  await page.evaluate(()=>{const w=T01.app.world;for(const p of w.pods)p.status='active';T01.app.hud.audio.update(w);});assert.ok(!(await snap()).audio.activeChannels.some(c=>c.key.startsWith('carrier-movement:')));await page.evaluate(()=>T01.runtime.pause());report.confirmedMovement.push({kind:'barracks-descent',peak:carrierPeak,landedSilent:true});
  report.checks.push('source-herd-thresholds-and-real-signals','dehaka-walk-real-signal','barracks-descent-real-signal-and-landing-stop');
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.complete=true;
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;}
finally{clearInterval(timer);if(browser?.isConnected()){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();await server?.close();await fs.writeFile(path.join(root,phase+'-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({phase,complete:report.complete,failure:report.failure,cases:report.cases.length,errors:report.errors,http:report.http}));}
