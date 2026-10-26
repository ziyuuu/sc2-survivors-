// Read-only production inspection. Screenshots/profile are temporary; retain summary only.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';
const supplemental=process.argv.includes('--supplemental');
const root=path.resolve('.cache/t01-feedback-inspection'),profile=root+'/profile';
await fs.mkdir(profile,{recursive:true});
const report={cases:[],errors:[],http:[],inputMismatches:[],phase:'boot'};
const server=await serveT01();
for(const i of server.build.inputs){const actual=createHash('sha256').update(await fs.readFile(i.file)).digest('hex');if(actual!==i.sha256)report.inputMismatches.push(i.file);}
let browser,child;
const timer=setInterval(()=>console.log(JSON.stringify({phase:report.phase,done:report.cases.length,errors:report.errors.length})),25000);
try{
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<150;i++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const page=browser.contexts()[0].pages()[0];
 await page.setViewportSize({width:1440,height:900});const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});await page.bringToFront();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http.push([r.status(),r.url()]);});
 await page.goto(server.url+'/combined.html');await page.waitForFunction(()=>globalThis.T01?.ready||document.querySelector('#t01-fatal'),null,{timeout:240000});
 if(await page.locator('#t01-fatal').count())throw Error(await page.locator('#t01-fatal').textContent());
 await page.mouse.click(900,400);await page.evaluate(async()=>{T01.runtime.pause();await T01.app.hud.audio.start();});
 report.catalogue=await page.evaluate(()=>({objects:T01.gallery.length,groups:T01.gallery.reduce((a,o)=>(a[o.group]=(a[o.group]??0)+1,a),{}),nuclear:T01.catalogue.dynamic.filter(c=>/核弹|核爆|nuke|strategic/.test(c.id+' '+c.name)).map(c=>({id:c.id,name:c.name,runner:c.runner,seconds:c.seconds})),audio:T01.app.hud.audio.report()}));
 if(supplemental){
  for(const coordinateOnly of [false,true]){
   report.phase=coordinateOnly?'nuclear clean coordinate':'nuclear fixture entity';await page.evaluate(()=>T01.load('native-card:terran:support.terran.strategic:effect'));
   if(coordinateOnly)await page.evaluate(()=>{for(const i of T01.app.world.expedition.support.impacts)i.point={x:i.point.x,z:i.point.z};});
   await page.evaluate(()=>{T01.app.world.paused=false;});const samples=[];
   for(const t of [3,3.1,3.4,3.9,4.3]){await page.evaluate(t=>T01.runtime.advanceTo(t),t);samples.push(await page.evaluate(()=>({t:T01.runtime.snapshot().elapsed,events:T01.app.world.visualEvents.filter(e=>e.kind==='strategic-impact'),source:T01.app.view.sourceCombatEffects.report().source.modelDraws,nonhero:T01.app.view.nonHeroEffects.report(),particles:T01.app.view.fx.particles.map(p=>({asset:p.asset,start:p.start,life:p.life}))})));await page.screenshot({path:root+'/supp-nuclear-'+coordinateOnly+'-'+t+'.png'});}
   report.cases.push({coordinateOnly,samples});
  }
  report.phase='colossus launch timing';await page.evaluate(()=>T01.load('actor:colossus:1:attack'));await page.evaluate(()=>{T01.app.world.paused=false;});
  const samples=[];for(const t of [.22,.25,.3,.35,.4]){await page.evaluate(t=>T01.runtime.advanceTo(t),t);samples.push(await page.evaluate(()=>{const p=T01.app.view.sourceCombatEffects.player,m=T01.app.view.gpu.get('colossus');return {t:T01.runtime.snapshot().elapsed,channels:[...p.loops].map(([key,e])=>({key,age:e.request.age,stop:e.stopped})),draws:p.report().modelDraws,mounts:['Left','Right','02','03'].map(side=>({side,at:m.weaponAt('attack',.2,side)}))};}));await page.screenshot({path:root+'/supp-colossus-'+t+'.png'});}report.cases.push({kind:'colossus',samples});
  report.phase='carrier source scale';await page.evaluate(()=>T01.load('actor:carrier:1:attack'));report.carrier=await page.evaluate(()=>[...T01.app.view.gpu].filter(([k])=>['carrier','interceptor'].includes(k)).map(([key,m])=>({key,height:m.bodyHeight,radius:m.bodyRadius,scale:m.scale,normalization:m.normalization.elements})));
  report.complete=true;
 }else{
 const snapshot=()=>page.evaluate(()=>{const {world:w,view,hud}=T01.app,s=T01.runtime.snapshot(),p=view.sourceCombatEffects.player;return {elapsed:s.elapsed,actor:s.actor,events:s.events.map(e=>({kind:e.kind,unitType:e.unitType,heroId:e.heroId,time:e.time})),audio:hud.audio.report().played,audioState:hud.audio.context?.state,stim:s.actor?.stimUntil,source:p.report().modelDraws,endingChannels:p.report().endingChannels,channels:[...p.loops].map(([key,e])=>({key,model:e.request.model,age:e.request.age,placement:e.request.placement,stopped:e.stopped})),areas:w.expedition.weaponAreas,models:[...view.gpu].filter(([k])=>['carrier','interceptor'].includes(k)).map(([k,m])=>({key:k,height:m.bodyHeight,radius:m.bodyRadius})),bodies:[...w.entities.values()].filter(u=>u.unitType==='carrier').map(u=>({id:u.id,model:u.modelKey,scale:u.visualScale,summon:u.summonKind})),errors:view.report().errors};});
 for(const actor of ['marine','marauder','reaper','thor','viking','banshee','hydralisk','hero.nova']){
  report.phase='audio '+actor;const id=await page.evaluate(actor=>T01.catalogue.dynamic.find(c=>c.runner==='actor'&&c.actor===actor&&c.rank===1&&c.action==='attack'&&!c.fixture?.mode&&!c.applicability)?.id,actor);if(!id)throw Error('No attack '+actor);
  await page.evaluate(id=>T01.load(id),id);await page.evaluate(()=>{T01.app.world.paused=false;T01.runtime.play();});await page.waitForFunction(()=>T01.runtime.snapshot().elapsed>=1.5,null,{timeout:30000});await page.evaluate(()=>T01.runtime.pause());report.cases.push({id,kind:'realtime-audio',samples:[await snapshot()]});
 }
 for(const spec of [{actor:'marine',action:'stim',times:[.25,2]},{actor:'marine',action:'death',times:[.1]},{actor:'marauder',action:'death',times:[.1]},{actor:'hero.nova',action:'skill',times:[.05,.4]},{actor:'colossus',action:'attack',times:[.2,.4,.6,1]},{actor:'void_ray',action:'attack',times:[.2,.4,.6,.8,1,1.2,1.4]},{actor:'carrier',action:'attack',times:[1.5]}]){
  report.phase=spec.actor+' '+spec.action;const id=await page.evaluate(spec=>T01.catalogue.dynamic.find(c=>c.runner==='actor'&&c.actor===spec.actor&&c.rank===1&&c.action===spec.action&&!c.fixture?.mode&&!c.applicability)?.id,spec);if(!id)throw Error('No case '+report.phase);
  await page.evaluate(id=>T01.load(id),id);await page.evaluate(()=>{T01.app.world.paused=false;});const samples=[];
  for(const time of spec.times){await page.evaluate(async time=>{await T01.runtime.advanceTo(time);T01.app.hud.audio.update(T01.app.world);},time);samples.push(await snapshot());if(['stim','colossus','void_ray','carrier'].includes(spec.actor)||spec.action==='stim')await page.screenshot({path:root+'/'+spec.actor+'-'+spec.action+'-'+time+'.png'});}
  report.cases.push({id,kind:'precise-frames',samples});
 }
 const nukes=report.catalogue.nuclear.filter(c=>c.runner==='card-effect');const pick=[...new Map(nukes.map(c=>[c.id.replace(/:[1-5]$/,''),c])).values()].slice(0,2);
 for(const c of pick){report.phase=c.id;await page.evaluate(id=>T01.load(id),c.id);await page.evaluate(()=>{T01.app.world.paused=false;});const samples=[];for(const t of [.2,1,2,3,5]){await page.evaluate(t=>T01.runtime.advanceTo(t),t);samples.push(await snapshot());await page.screenshot({path:root+'/nuclear-'+report.cases.length+'-'+t+'.png'});}report.cases.push({id:c.id,kind:'nuclear',samples});}
 report.complete=true;
 }
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{clearInterval(timer);if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();await server.close();await fs.writeFile(root+(supplemental?'/supplemental.json':'/report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({complete:report.complete,failure:report.failure,cases:report.cases.length,errors:report.errors,http:report.http,inputMismatches:report.inputMismatches}));}
