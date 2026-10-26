import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';
const sourceAudio=JSON.parse(await fs.readFile('src/data/combat-audio.json','utf8'));
const offline=process.argv.find(a=>a.startsWith('--offline='))?.slice(10),isolate=process.argv.includes('--isolate'),phase=isolate?'isolate':offline?'offline':'web',root=path.resolve('.cache/t01-review-plan/browser'),profile=path.join(root,'profile-'+phase);
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



 const ids=['equipment:set.traps.2:terran:2:unbound','equipment:set.advanced.phantom.4:terran:4:unbound','presentation:fleet','actor:hero.yamato_battlecruiser:1:idle'];
 for(const id of ids){report.phase=id;await page.evaluate(id=>T01.load(id,true),id);const loop=await page.locator('#t01-loop').isChecked();await page.evaluate(()=>{T01.runtime.pause();T01.app.world.paused=false;});const samples=[];for(const at of id.startsWith('equipment:')?[1,20]:[2]){await page.evaluate(at=>T01.runtime.advanceTo(at),at);samples.push(await page.evaluate(()=>({snapshot:T01.runtime.snapshot(),units:[...T01.app.world.entities.values()].map(u=>({id:u.id,type:u.unitType,model:u.modelKey,hero:u.heroId,scale:u.visualScale??1,x:u.x,z:u.z})),mines:T01.app.world.expedition.support.mines.length,projections:T01.app.world.starship.projections.size})));await page.screenshot({path:path.join(root,id.replaceAll(':','_')+'-'+at+'.png')});}report.cases.push({id,loop,samples});console.log(JSON.stringify({id,loop}));if(id.includes('set.traps.2')){await page.waitForTimeout(400);report.defaultEnded=await page.evaluate(()=>({elapsed:T01.runtime.snapshot().elapsed,playing:T01.runtime.snapshot().playing}));await page.locator('#t01-loop').check();await page.waitForFunction(()=>!T01.busy&&T01.runtime.snapshot().elapsed<3&&T01.runtime.snapshot().playing);report.manualLoopWorks=true;await page.locator('#t01-loop').uncheck();}}
 report.complete=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}finally{clearInterval(timer);if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();await server?.close();await fs.writeFile(path.join(root,phase+'-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({phase,complete:report.complete,failure:report.failure,cases:report.cases.length,errors:report.errors,http:report.http}));}
