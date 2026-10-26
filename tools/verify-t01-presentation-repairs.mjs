import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';
const sourceAudio=JSON.parse(await fs.readFile('src/data/combat-audio.json','utf8'));
const offline=process.argv.find(a=>a.startsWith('--offline='))?.slice(10),phase=offline?'offline':'web',root=path.resolve('.cache/t01-audit-repairs/browser'),profile=path.join(root,'profile-'+phase);
await fs.mkdir(profile,{recursive:true});
const report={phase,cases:[],checks:[],errors:[],http:[],complete:false},server=offline?undefined:await serveT01();let browser,child;
const timer=setInterval(()=>console.log(JSON.stringify({phase:report.phase,cases:report.cases.length,errors:report.errors.length})),25000);
try{
 const b=JSON.parse(await fs.readFile('reports/local/t01-20261024/build.json','utf8'));for(const r of b.inputs)assert.equal(createHash('sha256').update(await fs.readFile(r.file)).digest('hex'),r.sha256,r.file);report.verifiedInputs=b.inputs.length;
 if(offline){const b=JSON.parse(await fs.readFile(path.dirname(offline)+'/build.json','utf8')),a=b.artifacts.find(a=>a.mode==='combined'),h=createHash('sha256');for await(const bytes of createReadStream(offline))h.update(bytes);assert.equal(h.digest('hex'),a.sha256);report.htmlSha256=a.sha256;}
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<150;i++){try{port=Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(port);browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const page=browser.contexts()[0].pages()[0];page.setDefaultTimeout(120000);
 await page.setViewportSize({width:1440,height:900});const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});await page.bringToFront();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});page.on('response',r=>{if(r.status()>=400)report.http.push([r.status(),r.url()]);});if(offline){page.on('request',r=>{if(/^https?:/.test(r.url()))report.http.push(r.url());});await page.context().setOffline(true);}
 await page.goto(offline?'file:///'+path.resolve(offline).replaceAll('\\','/'):server.url+'/combined.html');await page.waitForFunction(()=>globalThis.T01?.ready||document.querySelector('#t01-fatal'),null,{timeout:240000});
 if(await page.locator('#t01-fatal').count())throw Error(await page.locator('#t01-fatal').textContent());
 await page.locator('#t01-audio').click();await page.waitForFunction(()=>T01.app.hud.audio.context.state==='running');
 report.decoded=await page.evaluate(()=>{const a=T01.app.hud.audio;a.output();globalThis.audioAnalyser=a.context.createAnalyser();a.masterBus.connect(audioAnalyser);return a.report();});
 const audioRecords=JSON.parse(await fs.readFile('deploy/runtime/combat-audio.json','utf8')).records;assert.equal(report.decoded.originalDecoded,audioRecords.length+10);assert.equal(report.decoded.errors.length,0);report.checks.push('all-new-and-10-existing-original-assets-decoded');
 report.counts=await page.evaluate(()=>({objects:T01.gallery.length,units:T01.gallery.filter(o=>o.unit).length,dynamic:T01.catalogue.dynamic.length,static:T01.catalogue.static.length}));

 const snap=()=>page.evaluate(()=>{const v=T01.app.view,w=T01.app.world,s=T01.runtime.snapshot();return {elapsed:s.elapsed,actor:s.actor,events:s.events,audio:T01.app.hud.audio.report(),corpses:[...v.corpses.values()],missionDeaths:[...v.missionDeaths.values()].map(d=>({model:d.root.name,age:w.time-d.at,duration:d.clip.duration,visible:d.root.visible})),source:v.sourceCombatEffects.report(),render:v.report()};});
 const skins=['marine.2','baneling.1','queen.1','high_templar.1','reaper.1','mutalisk.1','colossus.1'];
 const cases=await page.evaluate(skins=>[...T01.catalogue.dynamic.filter(c=>c.runner==='presentation').map(c=>({id:c.id,kind:c.data.kind,model:c.data.model})),...skins.map(k=>({id:'actor:elite.'+k+':1:death',kind:'skin',model:'elite.'+k})),...['marine','zergling','zealot'].map(k=>({id:'actor:'+k+':1:arrival',kind:'arrival',model:k}))],skins);
 for(const c of cases){
  report.phase=phase+':'+c.id;await page.evaluate(id=>T01.load(id,true),c.id);await page.evaluate(()=>{T01.runtime.pause();T01.app.world.paused=false;});
  const samples=[];
  for(const at of c.kind==='fleet'?[.2,1.2,3.5,5,7,15.5]:c.kind==='arrival'?[1,3,6,9.5]:c.kind==='skin'?[.15,1,3,6.8]:[.2,1.2,2.5,5,11.5,15.8]){
   await page.evaluate(t=>T01.runtime.advanceTo(t),at);samples.push(await snap());
   if((c.kind==='skin'&&at<=1)||(c.kind!=='skin'&&at===1.2)||(c.kind==='fleet'&&at===5)||(c.kind==='special'&&at===2.5))await page.screenshot({path:path.join(root,phase+'-'+c.id.replaceAll(':','_')+'-'+at+'.png')});
  }
  const sounded=samples.some(s=>Object.keys(s.audio.nativePlayed).length);assert.ok(sounded,c.id+' original sound');
  assert.ok(samples.every(s=>s.render.errors.length===0),c.id+' render errors');
  if(c.kind==='mission'){assert.equal(samples.at(-1).missionDeaths.length,0,c.id+' finished full Death');if(['scv','drone','probe'].includes(c.model))assert.ok(samples.some(s=>s.corpses.some(d=>d.type===c.model)),c.id+' worker corpse');else assert.ok(samples.some(s=>s.missionDeaths.some(d=>d.model==='mission-death:'+c.model&&d.visible)),c.id+' building Death');}
  if(c.model==='fun-cocoon'){assert.ok(samples.some(s=>s.source.source.modelDraws.some(d=>d.model==='FunCocoonDeath'&&(d.meshes||d.particles))),c.id+' original Death draw');assert.ok(samples.every(s=>!s.corpses.some(d=>d.type==='fun-cocoon')));}
  if(c.kind==='expiry'){assert.ok(samples.some(s=>s.events.some(e=>e.kind==='unit-expired')));assert.ok(samples.some(s=>s.source.source.modelDraws.some(d=>['BurrowFXSmall','BlinkOriginModel'].includes(d.model)&&(d.meshes||d.particles))));assert.ok(!samples.at(-1).actor);}
  if(c.kind==='skin')assert.ok(samples.some(s=>s.corpses.some(d=>d.type===c.model&&d.teamColor)),c.id+' frozen skin identity');
  if(c.kind==='fleet')for(const kind of ['attack','skill-line','skill-launch','skill-impact'])assert.ok(samples.at(-1).events.some(e=>e.kind===kind&&e.missionFleet),c.id+':'+kind);
  await page.evaluate(()=>T01.runtime.pause());const paused=await snap();assert.equal(paused.audio.activeVoices,0);assert.equal(paused.audio.activeChannels.length,0);report.cases.push({...c,samples});console.log(JSON.stringify({case:c.id,ok:true}));
 }
 await page.evaluate(()=>T01.load('presentation:equipment-projection-birth',true));
 report.signal=await page.evaluate(async()=>{let peak=0;const data=new Float32Array(audioAnalyser.fftSize);for(let i=0;i<140;i++){audioAnalyser.getFloatTimeDomainData(data);peak=Math.max(peak,...data.map(Math.abs));await new Promise(r=>setTimeout(r,20));}return peak;});assert.ok(report.signal>.00001,'new original sound has actual waveform');
 report.checks.push('repair-cycles-and-source-death-models','special-lifecycle-native-sounds','actual-new-audio-waveform','pause-clears-all-voices');
 await page.evaluate(()=>T01.load('actor:marine:1:attack',true));await page.waitForFunction(()=>T01.runtime.snapshot().elapsed>.2);await page.locator('#t01-play').click();const time=await page.evaluate(()=>T01.runtime.snapshot().elapsed);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>T01.runtime.snapshot().elapsed),time);
 await page.locator('#t01-advanced summary').click();await page.locator('#t01-step').click();assert.ok(Math.abs(await page.evaluate(()=>T01.runtime.snapshot().elapsed)-time-1/60)<1e-6);await page.locator('#t01-advanced summary').click();report.checks.push('autoplay-pause-frame-step');
 await page.locator('#t01-speed').selectOption('.5');assert.equal(await page.evaluate(()=>T01.runtime.snapshot().speed),.5);await page.locator('#t01-speed').selectOption('1');await page.locator('#t01-loop').check();await page.evaluate(()=>T01.runtime.advanceTo(6));await page.waitForFunction(()=>!T01.busy&&T01.runtime.snapshot().elapsed<3&&T01.runtime.snapshot().playing);await page.locator('#t01-loop').uncheck();await page.locator('#t01-play').click();report.checks.push('speed-loop');
 const downloads=[],downloadRoot=path.join(root,'downloads-'+phase);await fs.mkdir(downloadRoot,{recursive:true});const session=await browser.newBrowserCDPSession();session.on('Browser.downloadWillBegin',d=>downloads.push({...d,state:'started'}));session.on('Browser.downloadProgress',d=>Object.assign(downloads.find(a=>a.guid===d.guid)??{},d));await session.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:downloadRoot,eventsEnabled:true});
 await page.locator('#t01-note').fill('音效与兴奋剂复核');await page.locator('[data-result="viewed"]').click();await page.locator('#t01-export').click();for(let i=0;i<100&&!downloads.some(d=>d.state==='completed');i++)await page.waitForTimeout(100);const d=downloads.find(d=>d.state==='completed');assert.ok(d);const exported=JSON.parse(await fs.readFile(path.join(downloadRoot,d.guid),'utf8'));assert.ok(Object.values(exported.results).some(r=>r.note==='音效与兴奋剂复核'));report.checks.push('actual-action-review-export');
 const before=await page.evaluate(()=>({time:T01.app.world.time,wallet:T01.app.world.wallet}));await page.locator('#t01-static').click();await page.waitForFunction(()=>!T01.busy&&T01.mode==='static');assert.deepEqual(await page.evaluate(()=>({time:T01.app.world.time,wallet:T01.app.world.wallet})),before);assert.ok(await page.locator('#t01-prototype-frame').isVisible());report.checks.push('ui-prototype-isolation');
 assert.equal(report.errors.length,0);assert.equal(report.http.length,0);report.complete=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{clearInterval(timer);if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();await server?.close();await fs.writeFile(path.join(root,phase+'-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({phase,complete:report.complete,failure:report.failure,cases:report.cases.length,errors:report.errors,http:report.http}));}
