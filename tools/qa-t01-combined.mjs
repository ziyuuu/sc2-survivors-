import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

const run=process.argv[2];assert.match(run,/^offline-qa-r\d+$/);
const build=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
const catalogue=JSON.parse(await fs.readFile('reports/local/t01-20261024/catalogue-current.json','utf8'));
assert.equal(build.artifacts.length,1);const artifact=build.artifacts[0];assert.equal(artifact.mode,'combined');
const root=path.resolve('reports/local/t01-20261024/'+run),profile=path.join(os.tmpdir(),'codex-t01-20261024',run);
await fs.mkdir(root,{recursive:false});await fs.mkdir(profile,{recursive:true});
const report={run,build:process.argv[3],file:artifact.file,profilePath:profile,scope:'Bounded usability checks for the single offline HTML delivered for user inspection; no catalogue-wide game acceptance.',checks:[],errors:[],http:[],screens:[]};
let browser,child,current='boot',timer;
try{
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let n=0;n<150;n++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const context=browser.contexts()[0];await context.setOffline(true);const page=context.pages()[0];await page.setViewportSize({width:1440,height:900});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))report.http.push(r.url());});
 timer=setInterval(()=>console.log(JSON.stringify({phase:current,checks:report.checks.length,errors:report.errors.length})),25000);
 const shot=async name=>{const file=root+'/'+name+'.jpg';await page.screenshot({path:file,type:'jpeg',quality:88});report.screens.push(file);};
 await page.goto(pathToFileURL(path.resolve(artifact.file)).href,{waitUntil:'domcontentloaded',timeout:240000});await page.waitForFunction(()=>globalThis.T01||document.querySelector('#t01-fatal'),null,{timeout:240000});assert.equal(await page.locator('#t01-fatal').count(),0);await page.bringToFront();
 const initial=await page.evaluate(()=>({documentMode:T01.documentMode,mode:T01.mode,dynamic:T01.catalogue.dynamic.length,static:T01.catalogue.static.length,memoryOnly:T01.app.session.memoryOnly,persistent:localStorage instanceof Storage}));assert.deepEqual(initial,{documentMode:'combined',mode:'dynamic',dynamic:catalogue.dynamic.length,static:catalogue.static.length,memoryOnly:true,persistent:false});report.checks.push({control:'offline-open-and-isolation',...initial});
 const load=async id=>{await page.locator('#t01-search').fill(id);await page.locator('#t01-case').selectOption(id);await page.locator('#t01-load').click();await page.waitForFunction(id=>document.querySelector('#t01-state').textContent.startsWith('已载入')&&(T01.mode==='dynamic'?T01.runtime.snapshot():T01.staticRuntime.snapshot()).caseId===id,id,{timeout:180000});};
 current='dynamic-load-and-play';await load('actor:marine:1:attack');await page.locator('#t01-speed').selectOption('.25');await page.locator('#t01-play').click();await page.waitForFunction(()=>T01.runtime.snapshot().elapsed>.25,null,{timeout:30000});await page.locator('#t01-pause').click();
 const paused=await page.evaluate(()=>T01.runtime.snapshot().time);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>T01.runtime.snapshot().time),paused);await page.locator('#t01-step').click();assert.ok(Math.abs(await page.evaluate(()=>T01.runtime.snapshot().time)-paused-1/60)<1e-6);await shot('dynamic');report.checks.push({control:'filter-load-play-slow-pause-step',pass:true});
 await page.locator('#t01-note').fill('控制检查：动态播放可用');await page.locator('[data-result="viewed"]').click();assert.equal(await page.evaluate(()=>T01.results['actor:marine:1:attack'].status),'viewed');
 await page.locator('#t01-reset').click();await page.waitForFunction(()=>document.querySelector('#t01-state').textContent.startsWith('已载入')&&T01.runtime.snapshot().elapsed===0,null,{timeout:180000});report.checks.push({control:'reset',pass:true});
 current='loop';await page.locator('#t01-speed').selectOption('1');await page.evaluate(()=>T01.runtime.advanceTo(6));await page.locator('#t01-loop').check();await page.waitForFunction(()=>T01.runtime.snapshot().playing&&T01.runtime.snapshot().elapsed<2,null,{timeout:180000});await page.locator('#t01-loop').uncheck();await page.locator('#t01-pause').click();report.checks.push({control:'loop-replay',pass:true});
 current='queen-corrosion-mechanics';
 for(const id of ['enemy:elite:queen:skill-ground','enemy:boss:queen:corrosive-bile:skill-ground','enemy:lord:queen:corrosive-bile:skill-ground']){
  await load(id);const receipt=await page.evaluate(async()=>{
   const r=T01.runtime,w=T01.app.world,baseline=r.snapshot().diagnostic.damage;r.trigger();r.pause();w.paused=false;await r.advanceTo(1);const cast=structuredClone(w.enemySpecials.casts[0]);
   await r.advanceTo(3);const active=structuredClone(w.statuses.snapshot().entries.filter(s=>s.kind==='corruption'));
   const before=r.snapshot().diagnostic.damage;await r.advanceTo(6.8);const after=r.snapshot().diagnostic.damage,remaining=w.statuses.snapshot().entries.filter(s=>s.kind==='corruption');return {cast,active,baseline,before,after,remaining};
  });
  assert.equal(receipt.cast.damage,0);assert.ok(receipt.cast.corruptionDot>0);assert.equal(receipt.active.length,1);assert.equal(receipt.active[0].value,.2);assert.equal(receipt.before,receipt.baseline);assert.ok(receipt.after>receipt.before);assert.equal(receipt.remaining.length,0);report.checks.push({control:'queen-corruption-and-dot',id,receipt,pass:true});
 }
 current='static-modal';await page.locator('#t01-mode').selectOption('static');assert.equal(await page.locator('#t01-playback').isVisible(),false);await load('ui:ship-operation:dismantle-confirm:terran');assert.equal(await page.locator('dialog[open]').count(),1);await shot('static-modal');
 await page.locator('#t01-note').fill('控制检查：静态页面与备注可用');await page.locator('[data-result="issue"]').click();assert.equal(await page.evaluate(()=>T01.results['ui:ship-operation:dismantle-confirm:terran'].status),'issue');report.checks.push({control:'dynamic-to-static-modal-and-note',pass:true});
 current='export';const session=await browser.newBrowserCDPSession(),downloads=[];const downloadRoot=path.join(root,'downloads');await fs.mkdir(downloadRoot);session.on('Browser.downloadWillBegin',e=>downloads.push({...e}));session.on('Browser.downloadProgress',e=>{const d=downloads.find(d=>d.guid===e.guid);if(d)Object.assign(d,e);});await session.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:downloadRoot,eventsEnabled:true});await page.locator('#t01-export').click();
 for(let n=0;n<100&&!downloads.some(d=>d.state==='completed');n++)await page.waitForTimeout(200);const downloaded=downloads.find(d=>d.state==='completed');assert.ok(downloaded);const exported=JSON.parse(await fs.readFile(path.join(downloadRoot,downloaded.guid),'utf8'));assert.equal(exported.mode,'combined');assert.equal(exported.results['actor:marine:1:attack'].status,'viewed');assert.equal(exported.results['ui:ship-operation:dismantle-confirm:terran'].status,'issue');report.checks.push({control:'actual-combined-review-download',bytes:downloaded.totalBytes,pass:true});
 current='return-to-dynamic';await page.locator('#t01-mode').selectOption('dynamic');await load('actor:marine:1:attack');assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.locator('#t01-playback').isVisible(),true);await page.locator('#t01-play').click();await page.waitForFunction(()=>T01.runtime.snapshot().elapsed>.25);await page.locator('#t01-pause').click();await shot('dynamic-return');report.checks.push({control:'static-to-dynamic-replay-and-dialog-cleanup',pass:true});
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.pass=true;
}catch(e){report.failure=String(e.stack??e);report.phase=current;process.exitCode=1;}
finally{clearInterval(timer);if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();report.profileClosed=true;await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,checks:report.checks.length,errors:report.errors.length,http:report.http.length,phase:report.phase,failure:report.failure}));}
