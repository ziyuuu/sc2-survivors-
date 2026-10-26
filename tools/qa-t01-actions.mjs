import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';
const run=process.argv[2]??'actions-r1',root=path.resolve('reports/local/t01-20261024/'+run);await fs.mkdir(root,{recursive:false});
const prior=process.argv[3]?JSON.parse(await fs.readFile(process.argv[3],'utf8')):null,server=await serveT01(process.argv[4]?{buildPath:process.argv[4]}:{}),report={run,retestOf:process.argv[3]??null,scope:'Native production actions in controlled fixtures, fixed 60Hz simulation and rendered steps, paused exact-time keyframes. Not performance or balance.',build:server.build.artifacts,rows:[],errors:[]},save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));let browser,child,timer;
try{
 await fs.mkdir(root+'/profile');child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+root+'/profile','--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let n=0;n<150;n++){try{port=Number((await fs.readFile(root+'/profile/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const context=browser.contexts()[0],page=context.pages()[0];page.on('pageerror',e=>report.errors.push(e.message));await page.setViewportSize({width:1440,height:900});
 await page.goto(server.url+'/dynamic.html');await page.waitForFunction(()=>globalThis.T01,null,{timeout:180000});
 let cases=await page.evaluate(()=>T01.cases.filter(c=>c.rank===1&&['skill','heal','mode','ability','auto-ability','stim','refraction'].includes(c.action)));if(prior){const failed=new Set(prior.rows.filter(r=>r.status==='failed').map(r=>r.id));cases=cases.filter(c=>failed.has(c.id));}
 report.catalogueCount=cases.length;timer=setInterval(()=>{console.log(JSON.stringify({done:report.rows.filter(r=>r.status!=='running').length,total:cases.length,current:report.rows.at(-1)?.id}));void save();},25000);
 for(const [index,c] of cases.entries()){
  const row={id:c.id,name:c.name,status:'running',directory:String(index+1).padStart(3,'0')};report.rows.push(row);const dir=root+'/'+row.directory;await fs.mkdir(dir);const evidence={case:c,frames:[],sourceBuild:server.build.inputs};
  try{
   await page.bringToFront();await page.evaluate(id=>T01.load(id),c.id);await page.evaluate(()=>{T01.capture(true);T01.runtime.speed(2);});evidence.before=await page.evaluate(()=>T01.runtime.snapshot());assert.ok(evidence.before.memoryOnly);await page.screenshot({path:dir+'/000-ready.png'});
   evidence.trigger=await page.evaluate(()=>{const s=T01.runtime.trigger();T01.runtime.pause();return s;});
   const times=[.05,.15,.35,.7,1.2,2,3,4,6,8,10,12,16].filter(t=>t<c.seconds).concat(c.seconds);
   for(const [n,t] of times.entries()){
    await page.bringToFront();const visibility=await page.evaluate(()=>{const w=T01.app.world,state={paused:w.paused,hidden:document.hidden,focused:document.hasFocus()};if(w.paused)w.paused=false;return state;});const s=await page.evaluate(t=>T01.runtime.advanceTo(t),t),file=String(n+1).padStart(3,'0')+'-'+t+'.png';await page.screenshot({path:dir+'/'+file});evidence.frames.push({at:t,actual:s.elapsed,file,visibility,actor:s.actor,patient:s.patient,target:s.target,eventCount:s.events.length,spells:s.spells,eliteFields:s.eliteFields,casts:s.casts,phase:s.phase});
    if(s.phase!=='battle')throw Error('Scene ended before full cycle: '+s.phase);
   }
   await page.evaluate(()=>T01.runtime.pause());evidence.after=await page.evaluate(()=>T01.runtime.snapshot());const a=evidence.after,frames=evidence.frames;
   assert.ok(a.elapsed>=c.seconds-1e-5,'Incomplete cycle');assert.deepEqual(a.render.errors,[],'Model preparation failed');
   if(c.action==='heal')assert.ok(a.patient.hp>evidence.before.patient.hp,'Healing never affected the patient');
   if(c.action==='mode')assert.equal(c.family==='tank'?a.actor.mode:a.actor.nativeMode,c.data.mode,'Transformation incomplete');
   if(c.action==='ability')assert.ok(c.family==='banshee'?frames.some(f=>f.actor?.cloaked):frames.some(f=>Math.hypot(f.actor.x,f.actor.z)>2),'Manual ability absent');
   if(c.action==='auto-ability')assert.ok(frames.some(f=>f.spells.length||f.eliteFields.length)||a.events.some(e=>['storm-start','strategic-impact','barrier-start'].includes(e.kind))||a.patient&&a.patient.hp>evidence.before.patient.hp,'Automatic ability did not activate');
   if(c.action==='refraction')assert.ok(a.events.some(e=>e.kind==='weapon-area')&&frames.some(f=>f.actor?.eliteState?.stored>0),'Refraction did not store shield loss and discharge');
   if(c.action==='stim')assert.ok(evidence.trigger.actor.stimUntil>0,'Stim did not activate');
   if(c.action==='skill')assert.ok(a.events.some(e=>['skill-launch','skill-impact','hero-cast','hero-buff'].includes(e.kind))||frames.some(f=>f.casts.length)||a.patient&&a.patient.hp>evidence.before.patient.hp||a.patient&&a.patient.shield>evidence.before.patient.shield,'No cast/effect witness');
   row.status='cycle-captured';row.visualReview='pending';row.seconds=a.elapsed;row.eventKinds=[...new Set(a.events.map(e=>e.kind))];
  }catch(e){row.status='failed';row.failure=String(e);try{evidence.failureState=await page.evaluate(()=>T01.runtime.snapshot());await page.screenshot({path:dir+'/failed.png'});}catch{}}
  await fs.writeFile(dir+'/evidence.json',JSON.stringify(evidence,null,2));await page.evaluate(()=>{T01.runtime.pause();T01.capture(false);}).catch(()=>{});await save();
 }
 report.cycleCapturePass=report.rows.every(r=>r.status==='cycle-captured')&&report.errors.length===0;report.visualPass=false;
}catch(e){report.failure=String(e);process.exitCode=1;}
finally{clearInterval(timer);if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();report.profileClosed=true;await server.close();await save();console.log(JSON.stringify({rows:report.rows.length,failed:report.rows.filter(r=>r.status==='failed').length,errors:report.errors.length,failure:report.failure}));}
