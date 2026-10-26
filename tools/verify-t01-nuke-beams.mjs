import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';
const baseline=process.argv.includes('--baseline'),offline=process.argv.find(a=>a.startsWith('--offline='))?.slice(10),controlsOnly=process.argv.includes('--controls-only'),all=process.argv.includes('--all'),phase=baseline?'baseline':offline?(controlsOnly?'offline-controls':all?'offline-final':'offline'):'repaired',root=path.resolve('.cache/t01-nuke-beams'),profile=root+'/profile-'+phase;
await fs.mkdir(profile,{recursive:true});
const report={phase,cases:[],checks:[],errors:[],http:[],complete:false},server=offline?undefined:await serveT01();let browser,child;
const timer=setInterval(()=>console.log(JSON.stringify({phase:report.phase,cases:report.cases.length,errors:report.errors.length})),25000);
try{
 if(!baseline){const b=JSON.parse(await fs.readFile('reports/local/t01-20261024/build.json','utf8'));for(const r of b.inputs)assert.equal(createHash('sha256').update(await fs.readFile(r.file)).digest('hex'),r.sha256,r.file);report.verifiedInputs=b.inputs.length;}
 if(offline){const b=JSON.parse(await fs.readFile(path.dirname(offline)+'/build.json','utf8')),a=b.artifacts.find(a=>a.mode==='combined'),h=createHash('sha256');for await(const bytes of createReadStream(offline))h.update(bytes);assert.equal(h.digest('hex'),a.sha256);report.htmlSha256=a.sha256;}
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<150;i++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(port,'Chrome DevTools port unavailable');browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const page=browser.contexts()[0].pages()[0];
 await page.setViewportSize({width:1440,height:900});const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});await page.bringToFront();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',e=>{if(e.type()==='error')report.errors.push(e.text());});page.on('response',r=>{if(r.status()>=400)report.http.push([r.status(),r.url()]);});if(offline){page.on('request',r=>{if(/^https?:/.test(r.url()))report.http.push(r.url());});await page.context().setOffline(true);}
 await page.goto(offline?'file:///'+path.resolve(offline).replaceAll('\\','/'):server.url+'/combined.html');await page.waitForFunction(()=>globalThis.T01?.ready||document.querySelector('#t01-fatal'),null,{timeout:240000});
 if(await page.locator('#t01-fatal').count())throw Error(await page.locator('#t01-fatal').textContent());
 await page.evaluate(()=>T01.runtime.pause());
 report.counts=await page.evaluate(()=>({objects:T01.gallery.length,units:T01.gallery.filter(o=>o.unit).length,dynamic:T01.catalogue.dynamic.length,static:T01.catalogue.static.length}));
 const cases=[...['colossus','void_ray'].flatMap(f=>[f,...[1,2,3].map(i=>'elite.'+f+'.'+i)].map(actor=>({id:'actor:'+actor+':1:attack',actor,times:f==='colossus'?[.22,.3,.4,.5,.6,.8,1,2]:[.4,.8,1.4,2.5,5.5,6]}))),{id:'native-card:terran:support.terran.strategic:effect',actor:'nuke',times:[2.9,3.1,3.3,3.7,4.3,5,7,10,13,18]}];
 for(const c of controlsOnly?[]:offline&&!all?cases.filter(c=>['nuke','colossus','void_ray'].includes(c.actor)):cases){
  report.phase=phase+':'+c.actor;await page.evaluate(id=>T01.load(id),c.id);await page.evaluate(()=>{T01.app.world.paused=false;});const samples=[];
  const times=c.actor==='nuke'&&!baseline?[...c.times,16].sort((a,b)=>a-b):offline&&c.actor==='colossus'?[...c.times,.7].sort((a,b)=>a-b):c.times;
  for(const t of times){await page.evaluate(t=>T01.runtime.advanceTo(t),t);const s=await page.evaluate(()=>{
   const {world:w,view}=T01.app,p=view.sourceCombatEffects.player,stat=p.report();return {elapsed:T01.runtime.snapshot().elapsed,mechanics:{time:w.time,stats:w.stats,entities:[...w.entities.values()].map(u=>({id:u.id,type:u.unitType,hp:u.hp,shield:u.shield,x:u.x,z:u.z,lastShot:u.lastShotAt,sequence:u.shotSequence,weapon:u.weaponDamage,cooldown:u.nextShotAt,elite:u.protossEliteCombat})),impacts:w.expedition.support.impacts.map(i=>({id:i.id,at:i.at,damage:i.damage,point:{x:i.point.x,z:i.point.z}}))},draws:stat.modelDraws,ending:stat.endingChannels,channels:[...p.loops].filter(([key])=>/thermal|void|channel/.test(key)).map(([key,e])=>({key,model:e.request.model,age:e.request.age,clip:e.request.clip,placement:e.request.placement,stopped:e.stopped})),routes:view.sourceCombatEffects.report().routes,missing:stat.missing};});samples.push(s);
   if(!baseline&&c.actor==='nuke'&&t===16){const nuke=s.draws.find(r=>r.model==='GhostNukeExplode');assert.equal(nuke?.meshes??0,0);assert.equal(nuke?.displacementMeshes??0,0);report.checks.push('nuke-no-frozen-ending-mesh');}
   if(!baseline&&(c.actor==='nuke'?[3.3,4.3,7,13,16].includes(t):c.actor.includes('colossus')?[.3,.5,.6,.7,.8].includes(t):[.4,1.4,5.5].includes(t)))await page.screenshot({path:root+'/'+phase+'-'+c.actor+'-'+t+'.png'});
  }
  report.cases.push({id:c.id,actor:c.actor,samples});
 }
 if(!baseline&&(!offline||all)){const old=JSON.parse(await fs.readFile(root+'/baseline-browser.json','utf8'));report.mechanicsCompared=0;for(const c of report.cases){const before=old.cases.find(a=>a.id===c.id);assert.ok(before);for(const s of c.samples){const b=before.samples.find(a=>Math.abs(a.elapsed-s.elapsed)<1e-6);if(!b){assert.ok(c.actor==='nuke'||c.actor==='colossus'&&Math.abs(s.elapsed-.7)<1e-6);continue;}assert.deepEqual(JSON.parse(JSON.stringify(s.mechanics)),b.mechanics,c.id+' '+s.elapsed);report.mechanicsCompared++;}}}
 if(offline){
  report.phase='offline-controls';await page.evaluate(()=>T01.load('actor:colossus:1:attack',true));await page.waitForFunction(()=>T01.runtime.snapshot().elapsed>.1);report.checks.push('autoplay');
  await page.locator('#t01-play').click();const time=await page.evaluate(()=>T01.runtime.snapshot().elapsed);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>T01.runtime.snapshot().elapsed),time);
  await page.locator('#t01-advanced summary').click();await page.locator('#t01-step').click();assert.ok(Math.abs(await page.evaluate(()=>T01.runtime.snapshot().elapsed)-time-1/60)<1e-6);await page.locator('#t01-advanced summary').click();report.checks.push('pause-and-frame-step');
  await page.locator('#t01-speed').selectOption('.5');assert.equal(await page.evaluate(()=>T01.runtime.snapshot().speed),.5);await page.locator('#t01-speed').selectOption('1');await page.locator('#t01-loop').check();await page.evaluate(()=>T01.runtime.advanceTo(6));await page.waitForFunction(()=>!T01.busy&&T01.runtime.snapshot().elapsed<3&&T01.runtime.snapshot().playing,null,{timeout:120000});await page.locator('#t01-loop').uncheck();await page.locator('#t01-play').click();report.checks.push('speed-and-loop');
  const downloads=[],downloadRoot=path.join(root,'downloads');report.downloads=downloads;await fs.mkdir(downloadRoot,{recursive:true});const session=await browser.newBrowserCDPSession();session.on('Browser.downloadWillBegin',d=>downloads.push({...d,state:'started'}));session.on('Browser.downloadProgress',d=>Object.assign(downloads.find(a=>a.guid===d.guid)??{},d));await session.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:downloadRoot,eventsEnabled:true});
  await page.locator('#t01-note').fill('核弹与射线修复复核');await page.locator('[data-result="viewed"]').click();await page.locator('#t01-export').click();for(let i=0;i<100&&!downloads.some(d=>d.state==='completed');i++)await page.waitForTimeout(100);const d=downloads.find(d=>d.state==='completed');assert.ok(d);const exported=JSON.parse(await fs.readFile(downloadRoot+'/'+d.guid,'utf8'));assert.ok(Object.values(exported.results).some(r=>r.note==='核弹与射线修复复核'));report.checks.push('actual-action-review-export');
  const before=await page.evaluate(()=>({time:T01.app.world.time,wallet:T01.app.world.wallet}));await page.locator('#t01-static').click();await page.waitForFunction(()=>!T01.busy&&T01.mode==='static');assert.deepEqual(await page.evaluate(()=>({time:T01.app.world.time,wallet:T01.app.world.wallet})),before);assert.ok(await page.locator('#t01-prototype-frame').isVisible());report.checks.push('ui-prototype-isolation');
 }
 assert.equal(report.errors.length,0);assert.equal(report.http.length,0);report.complete=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{clearInterval(timer);if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();await server?.close();await fs.writeFile(root+'/'+phase+'-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify({phase,complete:report.complete,failure:report.failure,cases:report.cases.length,mechanicsCompared:report.mechanicsCompared,errors:report.errors,http:report.http}));}
