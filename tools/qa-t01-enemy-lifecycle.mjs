import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';
const run=process.argv[2];assert.match(run,/^actions-r\d+(?:-r\d+)?$/);
const root=path.resolve('reports/local/t01-20261024/'+run),profile=path.join(os.tmpdir(),'codex-t01-20261024',run);
await fs.mkdir(root,{recursive:false});await fs.mkdir(profile,{recursive:true});
const server=await serveT01({buildPath:process.argv[3]}),report={run,profilePath:profile,build:server.build,scope:'Native pause, paused detail round trip, actual WebGL loss/restore without scene reload, and subsequent full-tail cleanup. Controlled fixtures, not performance acceptance. Screenshot-only CSS hides the pause overlay so the frozen game canvas can be inspected; production UI and paused state remain unchanged.',rows:[],errors:[]};
const specs=[['enemy:boss:queen:skill',.7],['enemy:boss:ravager:skill',.7],['enemy:boss:ravager:skill',1.8],['enemy:boss:lurker:skill',1.5],['enemy:boss:roach:skill',.95],['enemy:boss:roach:skill',1.15],['enemy:boss:mutalisk:skill-air',1.2]];
const save=async()=>{await fs.writeFile(root+'/report-next.json',JSON.stringify(report,null,2));await fs.rename(root+'/report-next.json',root+'/report.json');};
const core=s=>Object.fromEntries(['caseId','playing','speed','time','elapsed','phase','enemy','actor','target','patient','events','spells','eliteFields','casts','receipt','memoryOnly'].map(k=>[k,s[k]]));
let child,browser,timer;
try{
 await fs.copyFile(new URL(import.meta.url),root+'/runner.mjs');
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<150;i++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const page=browser.contexts()[0].pages()[0];await page.setViewportSize({width:1440,height:900});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true});report.foreground='CDP focus emulation for controlled inspection, not native focus validation';
 page.on('pageerror',e=>report.errors.push(e.message));await page.goto(server.url+'/dynamic.html');await page.waitForFunction(()=>globalThis.T01||document.querySelector('#t01-fatal'),null,{timeout:180000});assert.equal(await page.locator('#t01-fatal').count(),0);
 timer=setInterval(()=>console.log(JSON.stringify({done:report.rows.filter(r=>r.status!=='running').length,total:specs.length,current:report.rows.at(-1)?.id})),25000);
 for(const [index,[id,at]] of specs.entries()){
  const row={id,at,directory:String(index+1).padStart(4,'0'),status:'running',screens:[]},evidence={id,at,states:{}};report.rows.push(row);await save();const dir=root+'/'+row.directory;await fs.mkdir(dir);
  const snap=()=>page.evaluate(()=>T01.runtime.snapshot());
  const shot=async label=>{const file=label+'.png',b=await page.screenshot({path:dir+'/'+file,style:'#overlay { visibility: hidden !important; }'});row.screens.push({file,sha256:createHash('sha256').update(b).digest('hex')});};
  const source=s=>({active:s.render.sourceCombat.source.activeRequests,draws:s.render.sourceCombat.source.modelDraws});
  try{
   await page.bringToFront();await page.evaluate(async id=>{await T01.load(id);T01.capture(true);const w=T01.app.world,v=T01.app.view;v.setCombatPreset('full');v.setCameraZoom(.6);v.setCameraPitch(60);v.render(.3,1);const s=T01.runtime.snapshot(),a=w.entities.get(s.actor?.id),t=w.entities.get(s.target?.id);if(a&&t){const d=Math.hypot(t.x-a.x,t.z-a.z);t.x=a.x+d;t.z=a.z;t.prev={x:t.x,z:t.z};w.hash.rebuild(w.entities.values());}T01.runtime.trigger();T01.runtime.pause();w.paused=false;},id);
   await page.evaluate(at=>T01.runtime.advanceTo(at),at);await page.evaluate(()=>{T01.app.world.paused=true;T01.app.view.render(0,1);});
   evidence.states.before=await snap();assert.equal(evidence.states.before.memoryOnly,true);
   assert.ok(id.includes('mutalisk')?evidence.states.before.enemy.missiles.length>0:source(evidence.states.before).active.length>0,'The inspected native effect must actually be active');await shot('01-before');
   await page.waitForTimeout(350);evidence.states.paused=await snap();assert.deepEqual(core(evidence.states.paused),core(evidence.states.before));assert.deepEqual(source(evidence.states.paused),source(evidence.states.before));await shot('02-paused');
   await page.evaluate(()=>{const v=T01.app.view;v.setCombatPreset('low');v.render(0,1);});await shot('03-low');
   await page.evaluate(()=>{const v=T01.app.view;v.setCombatPreset('full');v.render(0,1);});evidence.states.roundTrip=await snap();await shot('04-full');
   assert.deepEqual(core(evidence.states.roundTrip),core(evidence.states.before));assert.deepEqual(source(evidence.states.roundTrip),source(evidence.states.before),'Paused detail round trip changed native effect requests');
   await page.evaluate(()=>{const gl=T01.app.view.renderer.getContext();globalThis.T01restore=gl.getExtension('WEBGL_lose_context');if(!T01restore)throw Error('Missing context extension');T01restore.loseContext();});await page.waitForFunction(()=>T01.app.view.renderer.getContext().isContextLost());await shot('05-context-lost');
   await page.evaluate(()=>T01restore.restoreContext());await page.waitForFunction(()=>!T01.app.view.renderer.getContext().isContextLost()&&!T01.app.readiness.state.kind&&!T01.app.view.assetsPending&&!T01.app.view.entryPreparation,null,{timeout:240000});
   await page.evaluate(()=>{T01.runtime.pause();T01.app.world.paused=true;T01.app.view.render(0,1);});evidence.states.restored=await snap();await shot('06-restored');
   assert.deepEqual(core(evidence.states.restored),core(evidence.states.before),'Context restore advanced or replaced the controlled battle');assert.deepEqual(source(evidence.states.restored),source(evidence.states.before),'Context restore changed frozen native effect requests');
   await page.evaluate(()=>{T01.app.world.paused=false;});await page.evaluate(()=>T01.runtime.advanceTo(16));evidence.states.tail=await snap();await shot('07-tail');
   assert.deepEqual(evidence.states.tail.render.errors,[]);assert.equal(evidence.states.tail.enemy.casts.length+evidence.states.tail.enemy.missiles.length,0);assert.equal(evidence.states.tail.render.sourceCombat.source.activeRequests.filter(k=>k.startsWith('enemy-special:')).length,0);
   await page.evaluate(()=>T01.load('actor:marine:1:idle'));evidence.states.reset=await snap();await shot('08-reset');assert.equal(evidence.states.reset.render.sourceCombat.source.activeRequests.filter(k=>k.startsWith('enemy-special:')).length,0);
   row.status='checks-passed';row.visualReview='pending';
  }catch(e){row.status='failed';row.failure=String(e.stack??e);try{evidence.states.failed=await snap();await shot('failed');}catch{}}
  await fs.writeFile(dir+'/evidence.json.gz',gzipSync(JSON.stringify(evidence)));await save();
 }
 report.complete=true;assert.equal(report.rows.filter(r=>r.status==='failed').length,0);assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{clearInterval(timer);if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();report.profileClosed=true;await server.close();await save();console.log(JSON.stringify({rows:report.rows.length,failed:report.rows.filter(r=>r.status==='failed').length,errors:report.errors.length,failure:report.failure}));}
