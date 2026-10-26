import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

const run=process.argv[2];assert.match(run,/^offline-qa-r\d+$/);
const exportOnly=process.argv[4]==='export-only';
const build=JSON.parse(await fs.readFile(process.argv[3]??'reports/local/t01-20261024/offline-r2/build.json','utf8'));
const root=path.resolve('reports/local/t01-20261024/'+run),profile=path.join(os.tmpdir(),'codex-t01-20261024',run);
await fs.mkdir(root,{recursive:false});await fs.mkdir(profile,{recursive:true});
const report={run,build,profilePath:profile,scope:'Fresh-profile, HTTP-offline, direct file opening of the two isolated inspection tools. Bounded controls/lifecycle validation; not full catalogue visual acceptance.',modes:[],errors:[],http:[],checks:[]};
let child,browser,timer,current='initial';const save=async()=>{await fs.writeFile(root+'/report-next.json',JSON.stringify(report,null,2));await fs.rename(root+'/report-next.json',root+'/report.json');};
try{
 for(const a of build.artifacts){const h=createHash('sha256');for await(const b of createReadStream(a.file))h.update(b);assert.equal(h.digest('hex'),a.sha256);}
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<150;i++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const context=browser.contexts()[0];await context.setOffline(true);
 const downloadSession=await browser.newBrowserCDPSession(),downloadRoot=path.join(root,'downloads'),downloads=[];report.downloads=downloads;report.exportOnly=exportOnly;await fs.mkdir(downloadRoot);
 downloadSession.on('Browser.downloadWillBegin',event=>downloads.push({...event,state:'started'}));
 downloadSession.on('Browser.downloadProgress',event=>{const item=downloads.find(d=>d.guid===event.guid);if(item)Object.assign(item,event);});
 // noDefaults intentionally preserves the native browser configuration and
 // does not enable Playwright download events. Observe actual downloaded files
 // via an explicit CDP destination in this dedicated test browser.
 await downloadSession.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:downloadRoot,eventsEnabled:true});
 timer=setInterval(()=>console.log(JSON.stringify({phase:current,checks:report.checks.length,errors:report.errors.length,http:report.http.length})),25000);
 const artifacts=process.argv[5]?build.artifacts.filter(a=>a.mode===process.argv[5]):build.artifacts;report.modeFilter=process.argv[5]??null;assert.ok(artifacts.length);
 for(const artifact of artifacts){
  const page=await context.newPage();await page.setViewportSize({width:1440,height:900});page.on('pageerror',e=>report.errors.push({mode:artifact.mode,error:e.message}));page.on('request',r=>{if(/^https?:/.test(r.url()))report.http.push({mode:artifact.mode,url:r.url()});});
  const row={mode:artifact.mode,file:artifact.file,checks:[],screens:[]};report.modes.push(row);
  const shot=async label=>{const file=artifact.mode+'-'+label+'.jpg';await page.screenshot({path:root+'/'+file,type:'jpeg',quality:92});row.screens.push(file);};
  const boot=async()=>{await page.goto(pathToFileURL(path.resolve(artifact.file)).href,{waitUntil:'domcontentloaded',timeout:240000});await page.waitForFunction(()=>globalThis.T01||document.querySelector('#t01-fatal'),null,{timeout:240000});assert.equal(await page.locator('#t01-fatal').count(),0);};
  const selectLoad=async id=>{await page.locator('#t01-search').fill('');await page.locator('#t01-group').selectOption('');await page.locator('#t01-case').selectOption(id);await page.locator('#t01-load').click();await page.waitForFunction(id=>document.querySelector('#t01-state').textContent.startsWith('已载入')&&(T01.mode==='dynamic'?T01.runtime.snapshot():T01.staticRuntime.snapshot()).caseId===id,id,{timeout:180000});};
  current=artifact.mode+':boot-offline';await boot();await page.bringToFront();
  await page.evaluate(()=>{
   globalThis.T01probe={button:document.querySelector('[data-result="issue"]'),tool:document.querySelector('#t01-tool'),events:[]};
   document.addEventListener('click',event=>{if(event.target.closest?.('#t01-tool'))T01probe.events.push({phase:'capture',target:event.target.outerHTML.slice(0,300),trusted:event.isTrusted});},true);
   T01probe.button.addEventListener('click',event=>T01probe.events.push({phase:'button',trusted:event.isTrusted}));
  });
  const initial=await page.evaluate(()=>({mode:T01.mode,count:T01.cases.length,memoryOnly:T01.app.session.memoryOnly,storageClass:localStorage.constructor.name,persistent:localStorage instanceof Storage}));
  assert.equal(initial.mode,artifact.mode);assert.equal(initial.count,artifact.mode==='dynamic'?10481:332);assert.equal(initial.memoryOnly,true);assert.equal(initial.persistent,false);row.initial=initial;await shot('tool-ready');
  if(exportOnly){await selectLoad(artifact.mode==='dynamic'?'actor:marine:1:attack':'ui:ship-operation:dismantle-confirm:terran');}
  else if(artifact.mode==='dynamic'){
   current='dynamic:filter-load-targets';
   await page.locator('#t01-group').selectOption('普通单位');await page.locator('#t01-search').fill('actor:marine:1:attack');const filtered=await page.locator('#t01-case option').evaluateAll(es=>es.map(e=>e.value));assert.deepEqual(filtered,['actor:marine:1:attack','actor:marine:1:attack-air']);row.checks.push({filter:filtered});
   for(const target of ['ground','air','shield']){
    await page.locator('#t01-target').selectOption(target);await selectLoad('actor:marine:1:attack');const s=await page.evaluate(()=>{const s=T01.runtime.snapshot(),t=T01.app.world.entities.get(s.target.id);return {id:t.id,type:t.unitType,flying:t.flying,shield:t.shield,assets:s.render.assetsPending,errors:s.render.errors};});
    assert.equal(s.flying,target==='air');if(target==='shield')assert.ok(s.shield>0);assert.equal(s.assets,0);assert.deepEqual(s.errors,[]);row.checks.push({target,state:s});await shot('target-'+target);
   }
   current='dynamic:play-pause-step-speed';await page.locator('#t01-speed').selectOption('.25');await page.locator('#t01-play').click();await page.waitForFunction(()=>T01.runtime.snapshot().elapsed>.2,null,{timeout:30000});await page.locator('#t01-pause').click();
   const paused=await page.evaluate(()=>T01.runtime.snapshot());assert.equal(paused.playing,false);assert.equal(paused.speed,.25);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>T01.runtime.snapshot().time),paused.time);
   await page.locator('#t01-step').click();const stepped=await page.evaluate(()=>T01.runtime.snapshot());assert.ok(Math.abs(stepped.time-paused.time-1/60)<1e-6);await shot('paused-step');row.checks.push({control:'pause-step-slow',before:paused.time,after:stepped.time,speed:stepped.speed});
   await page.locator('#t01-health-lock').check();assert.equal(await page.evaluate(()=>T01.runtime.snapshot().diagnostic.enabled),true);await page.locator('#t01-reset').click();await page.waitForFunction(()=>document.querySelector('#t01-state').textContent==='已载入 · 尚未检查'&&T01.runtime.snapshot().elapsed===0,null,{timeout:180000});assert.equal(await page.evaluate(()=>T01.runtime.snapshot().diagnostic.enabled),false);row.checks.push({control:'reset-clears-diagnostic',pass:true});
   current='dynamic:loop';await page.locator('#t01-speed').selectOption('1');await page.evaluate(()=>T01.runtime.advanceTo(6));await page.locator('#t01-loop').check();await page.waitForFunction(()=>T01.runtime.snapshot().playing&&T01.runtime.snapshot().elapsed<2,null,{timeout:180000});await page.locator('#t01-loop').uncheck();await page.locator('#t01-pause').click();row.checks.push({control:'native-loop-reloaded',state:await page.evaluate(()=>({elapsed:T01.runtime.snapshot().elapsed,playing:T01.runtime.snapshot().playing}))});
   current='dynamic:context-loss';await page.evaluate(()=>{T01.contextExt=T01.app.view.renderer.getContext().getExtension('WEBGL_lose_context');if(!T01.contextExt)throw Error('Missing context extension');T01.contextExt.loseContext();});await page.waitForFunction(()=>T01.app.view.renderer.getContext().isContextLost());await shot('context-lost');await page.evaluate(()=>T01.contextExt.restoreContext());
   await page.waitForFunction(()=>!T01.app.view.renderer.getContext().isContextLost()&&!T01.app.readiness.state.kind&&!T01.app.view.assetsPending&&!T01.app.view.entryPreparation,null,{timeout:240000});await selectLoad('actor:marine:1:attack');await page.evaluate(async()=>{T01.runtime.trigger();T01.runtime.pause();T01.app.world.paused=false;await T01.runtime.advanceTo(1);});await shot('context-restored');assert.deepEqual(await page.evaluate(()=>T01.app.view.report().errors),[]);row.checks.push({control:'actual-webgl-restore-and-replay',pass:true});
  }else{
   current='static:filter-load-reset';await page.locator('#t01-search').fill('receipt-detail:');assert.equal(await page.locator('#t01-case option').count(),3);
   for(const race of ['terran','zerg','protoss']){await selectLoad('ui:decision:receipt-detail:'+race);assert.equal(await page.locator('.family-receipt details').evaluate(e=>e.open),true);await shot('receipt-'+race);row.checks.push({caseId:'ui:decision:receipt-detail:'+race,expanded:true});}
   await selectLoad('ui:ship-operation:dismantle-confirm:terran');assert.equal(await page.locator('dialog[open]').count(),1);await shot('operation');await page.locator('#t01-reset').click();await page.waitForFunction(()=>document.querySelector('#t01-state').textContent.startsWith('已载入'),null,{timeout:180000});assert.equal(await page.locator('dialog[open]').count(),1);row.checks.push({control:'static-reset',pass:true});
  }
  current=artifact.mode+':record-export';await page.locator('#t01-note').fill('T01 离线控制检查；不是全量视觉通过');await page.locator('[data-result="issue"]').click();const entries=await page.evaluate(()=>Object.entries(T01.results));row.recordProbe=await page.evaluate(()=>({state:document.querySelector('#t01-state').textContent,resultCount:Object.keys(T01.results).length,caseId:T01.staticRuntime.snapshot().caseId,toolParent:document.querySelector('#t01-tool').parentElement.tagName,dialogCount:document.querySelectorAll('dialog[open]').length,note:document.querySelector('#t01-note').value,sameButton:T01probe.button===document.querySelector('[data-result="issue"]'),sameTool:T01probe.tool===document.querySelector('#t01-tool'),originalConnected:T01probe.button.isConnected,events:T01probe.events}));await shot('record-click');assert.equal(entries.length,1);assert.equal(entries[0][1].status,'issue');
  const downloadStart=downloads.length;await page.locator('#t01-export').click();
  row.exportProbe=await page.evaluate(()=>{let serialized;try{serialized={bytes:JSON.stringify(T01.results).length};}catch(e){serialized={error:String(e)};}return {state:document.querySelector('#t01-state').textContent,serialized,href:location.href.slice(0,200)};});await shot('export-click');
  for(let wait=0;wait<150&&!downloads.slice(downloadStart).some(d=>d.state==='completed');wait++)await page.waitForTimeout(200);
  const downloaded=downloads.slice(downloadStart).find(d=>d.state==='completed');assert.ok(downloaded,'Native review download must complete');
  const exportedBytes=await fs.readFile(downloadRoot+'/'+downloaded.guid);await fs.writeFile(root+'/'+artifact.mode+'-export.json',exportedBytes);const exported=JSON.parse(exportedBytes);assert.equal(exported.mode,artifact.mode);assert.equal(Object.keys(exported.results).length,1);row.checks.push({control:'review-export',caseId:entries[0][0],download:downloaded});
  current=artifact.mode+':reload-isolation';await page.evaluate(()=>{localStorage.setItem('T01-isolation-sentinel','temporary');sessionStorage.setItem('T01-isolation-sentinel','temporary');});await boot();assert.deepEqual(await page.evaluate(()=>({local:localStorage.getItem('T01-isolation-sentinel'),session:sessionStorage.getItem('T01-isolation-sentinel'),results:Object.keys(T01.results).length,memoryOnly:T01.app.session.memoryOnly})),{local:null,session:null,results:0,memoryOnly:true});row.checks.push({control:'reload-clears-memory-state',pass:true});await shot('reload');row.status='passed';report.checks.push({mode:artifact.mode,count:row.checks.length});await save();await page.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.pass=true;
}catch(e){report.failure=String(e.stack??e);report.phase=current;process.exitCode=1;}
finally{clearInterval(timer);if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();report.profileClosed=true;await save();console.log(JSON.stringify({pass:report.pass,modes:report.modes.map(x=>({mode:x.mode,status:x.status,checks:x.checks.length})),errors:report.errors.length,http:report.http.length,failure:report.failure,phase:report.phase}));}
