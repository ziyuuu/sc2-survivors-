import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';
const sourceAudio=JSON.parse(await fs.readFile('src/data/combat-audio.json','utf8'));
const offline=process.argv.find(a=>a.startsWith('--offline='))?.slice(10),phase=offline?'offline':'web',root=path.resolve('.cache/t01-audio'),profile=path.join(root,'profile-'+phase);
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
 const snap=()=>page.evaluate(()=>{const w=T01.app.world,a=T01.app.hud.audio,p=T01.app.view.sourceCombatEffects.player;return {elapsed:T01.runtime.snapshot().elapsed,audio:a.report(),actor:T01.runtime.snapshot().actor,stimDraws:p.report().modelDraws.filter(r=>r.model.startsWith('Stimpack')),stimChannels:[...p.loops].filter(([key])=>key.startsWith('stim:')).map(([key,e])=>({key,model:e.request.model,age:e.request.age,placement:e.request.placement})),routes:T01.app.view.sourceCombatEffects.report().routes};});
 const cases=[...['marine','marauder'].flatMap(f=>[f,...[1,2,3].map(i=>'elite.'+f+'.'+i)].map(actor=>({id:'actor:'+actor+':1:stim',kind:'stim',actor}))),...['void_ray','sentry','colossus','medivac','science_vessel'].map(actor=>({id:'actor:'+actor+':1:'+(['medivac','science_vessel'].includes(actor)?'heal':'attack'),actor,kind:'channel'})),...Object.keys(sourceAudio.skills).map(actor=>({id:'actor:hero.'+actor+':1:skill',actor,kind:'hero'})),{id:'native-card:terran:support.terran.strategic:effect',actor:'nuke',kind:'support'}];
 for(const c of cases){
  report.phase=phase+':'+c.actor;await page.evaluate(id=>T01.load(id,true),c.id);
  const samples=[];
  if(c.kind==='stim'){
   await page.evaluate(()=>{T01.runtime.pause();T01.app.world.paused=false;});await page.evaluate(()=>T01.runtime.advanceTo(.2));samples.push(await snap());
   assert.ok(samples[0].stimDraws.some(r=>r.model==='StimpackStartImpact'&&(r.meshes>0||r.particles>0)),c.id+' start draw');
   await page.screenshot({path:path.join(root,phase+'-'+c.actor+'-start.png')});
   await page.evaluate(()=>T01.runtime.advanceTo(11.2));samples.push(await snap());assert.ok(samples[1].routes.includes('stim-end'),c.id+' normal end');assert.ok(samples[1].stimDraws.some(r=>r.model==='StimpackEndImpact'&&(r.meshes>0||r.particles>0)),c.id+' end draw');
   if(!c.actor.startsWith('elite.'))await page.screenshot({path:path.join(root,phase+'-'+c.actor+'-end.png')});
   const banks=samples[1].audio.nativePlayed;assert.equal(Object.keys(banks).filter(k=>/Stimpack$/.test(k)).length,1);assert.equal(Object.entries(banks).filter(([k])=>/Stimpack$/.test(k)).reduce((n,[,v])=>n+v,0),1);
  }else{
   await page.waitForFunction(()=>T01.runtime.snapshot().elapsed>.65);samples.push(await snap());
   if(c.actor==='void_ray'){
    report.signal=await page.evaluate(async()=>{let peak=0;const data=new Float32Array(audioAnalyser.fftSize);for(let i=0;i<30;i++){audioAnalyser.getFloatTimeDomainData(data);peak=Math.max(peak,...data.map(Math.abs));await new Promise(r=>setTimeout(r,20));}return peak;});assert.ok(report.signal>0.00001,'actual nonzero battle bus signal');
    await page.evaluate(()=>T01.runtime.pause());assert.equal((await snap()).audio.activeVoices,0);await page.waitForTimeout(200);report.checks.push('pause-stops-native-voices');await page.evaluate(()=>T01.runtime.play());await page.waitForTimeout(300);
   }
   await page.evaluate(async()=>{T01.runtime.pause();T01.app.world.paused=false;await T01.runtime.advanceTo(8);});samples.push(await snap());assert.ok(Object.keys(samples.at(-1).audio.nativePlayed).length>0,c.id+' plays original banks');if(c.kind==='hero')assert.ok(samples.at(-1).audio.nativePlayed[sourceAudio.skills[c.actor].launch],c.id+' actual hero skill bank');if(c.actor==='nuke')for(const bank of sourceAudio.special.nuke)assert.ok(samples.at(-1).audio.nativePlayed[bank],bank);
  }
  await page.evaluate(()=>T01.runtime.pause());assert.equal((await snap()).audio.activeChannels.length,0);assert.equal((await snap()).audio.activeVoices,0);report.cases.push({...c,samples});
 }
 report.checks.push('eight-native-stim-start-and-end','ordinary-elites-hero-support-audio','continuous-channel-stop');
 await page.evaluate(()=>T01.load('actor:marine:1:stim',true));await page.waitForFunction(()=>T01.runtime.snapshot().elapsed>.2);await page.evaluate(()=>{const w=T01.app.world,u=w.entities.get(T01.runtime.snapshot().actor.id),witness=w.addUnit('marine','terran',50,50);witness.nextShotAt=Infinity;witness.moveSpeed=0;w.hit(u,100000);T01.runtime.pause();w.paused=false;return T01.runtime.advanceTo(11.3);});const dead=await snap();assert.ok(!dead.actor||dead.actor.hp<=0);assert.ok(!dead.stimDraws.some(r=>r.model==='StimpackEndImpact'&&(r.meshes>0||r.particles>0)));report.checks.push('dead-stim-unit-has-no-normal-end');
 await page.locator('#t01-audio').click();await page.waitForFunction(()=>!T01.busy&&T01.app.hud.audio.context.state==='suspended');await page.locator('#t01-audio').click();await page.waitForFunction(()=>!T01.busy&&T01.app.hud.audio.context.state==='running');report.checks.push('user-audio-toggle');
 await page.evaluate(()=>T01.load('actor:marine:1:attack',true));await page.waitForFunction(()=>T01.runtime.snapshot().elapsed>.2);await page.locator('#t01-play').click();const time=await page.evaluate(()=>T01.runtime.snapshot().elapsed);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>T01.runtime.snapshot().elapsed),time);
 await page.locator('#t01-advanced summary').click();await page.locator('#t01-step').click();assert.ok(Math.abs(await page.evaluate(()=>T01.runtime.snapshot().elapsed)-time-1/60)<1e-6);await page.locator('#t01-advanced summary').click();report.checks.push('autoplay-pause-frame-step');
 await page.locator('#t01-speed').selectOption('.5');assert.equal(await page.evaluate(()=>T01.runtime.snapshot().speed),.5);await page.locator('#t01-speed').selectOption('1');await page.locator('#t01-loop').check();await page.evaluate(()=>T01.runtime.advanceTo(6));await page.waitForFunction(()=>!T01.busy&&T01.runtime.snapshot().elapsed<3&&T01.runtime.snapshot().playing);await page.locator('#t01-loop').uncheck();await page.locator('#t01-play').click();report.checks.push('speed-loop');
 const downloads=[],downloadRoot=path.join(root,'downloads-'+phase);await fs.mkdir(downloadRoot,{recursive:true});const session=await browser.newBrowserCDPSession();session.on('Browser.downloadWillBegin',d=>downloads.push({...d,state:'started'}));session.on('Browser.downloadProgress',d=>Object.assign(downloads.find(a=>a.guid===d.guid)??{},d));await session.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:downloadRoot,eventsEnabled:true});
 await page.locator('#t01-note').fill('音效与兴奋剂复核');await page.locator('[data-result="viewed"]').click();await page.locator('#t01-export').click();for(let i=0;i<100&&!downloads.some(d=>d.state==='completed');i++)await page.waitForTimeout(100);const d=downloads.find(d=>d.state==='completed');assert.ok(d);const exported=JSON.parse(await fs.readFile(path.join(downloadRoot,d.guid),'utf8'));assert.ok(Object.values(exported.results).some(r=>r.note==='音效与兴奋剂复核'));report.checks.push('actual-action-review-export');
 const before=await page.evaluate(()=>({time:T01.app.world.time,wallet:T01.app.world.wallet}));await page.locator('#t01-static').click();await page.waitForFunction(()=>!T01.busy&&T01.mode==='static');assert.deepEqual(await page.evaluate(()=>({time:T01.app.world.time,wallet:T01.app.world.wallet})),before);assert.ok(await page.locator('#t01-prototype-frame').isVisible());report.checks.push('ui-prototype-isolation');
 assert.equal(report.errors.length,0);assert.equal(report.http.length,0);report.complete=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{clearInterval(timer);if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();await server?.close();await fs.writeFile(path.join(root,phase+'-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({phase,complete:report.complete,failure:report.failure,cases:report.cases.length,errors:report.errors,http:report.http}));}
