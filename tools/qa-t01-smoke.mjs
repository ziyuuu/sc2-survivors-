import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {serveT01} from './t01-server.mjs';
const run=process.argv[2]??'smoke-r1',root=path.resolve('reports/local/t01-20261024/'+run);await fs.mkdir(root,{recursive:false});
const report={run,checks:[],errors:[],screens:[],failedRequests:[],build:'reports/local/t01-20261024/build.json'},save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
const server=await serveT01();let context,browser,child,timer;
try{
 await fs.mkdir(root+'/profile');child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--user-data-dir='+root+'/profile','--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let n=0;n<150;n++){try{port=Number((await fs.readFile(root+'/profile/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});context=browser.contexts()[0];report.native=true;
 const page=context.pages()[0];await page.setViewportSize({width:1440,height:900});page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),failure:r.failure()}));page.on('response',r=>{if(r.status()>=400)report.failedRequests.push({url:r.url(),status:r.status()});});
 timer=setInterval(async()=>{try{const s=await page.evaluate(()=>({ready:!!globalThis.T01,loading:globalThis.__SC2_REPORT__?.().readiness,tool:document.querySelector('#t01-state')?.textContent}));console.log(JSON.stringify(s));await save();}catch{}},20000);
 const shot=async name=>{const file=root+'/'+name+'.png';await page.screenshot({path:file});report.screens.push(file);};
 await page.goto(server.url+'/dynamic.html');await page.waitForFunction(()=>globalThis.T01||document.querySelector('#t01-fatal'),null,{timeout:180000});
 if(await page.locator('#t01-fatal').count())throw Error(await page.locator('#t01-fatal').textContent());
 report.catalogue=await page.evaluate(()=>({count:T01.cases.length,scope:T01.scope}));await save();
 for(const id of ['actor:marine:1:attack','actor:marine:1:death','actor:hero.raynor:1:skill']){
  console.log('prepare '+id);await page.evaluate(id=>T01.load(id),id);await page.evaluate(()=>T01.capture(true));await shot(id.replaceAll(':','-')+'-ready');
  await page.evaluate(()=>T01.runtime.trigger());
  for(const t of [.1,.5,1.5,3]){await page.waitForFunction(t=>T01.runtime.snapshot().elapsed>=t||T01.runtime.snapshot().phase!=='battle',t,{timeout:30000});await shot(id.replaceAll(':','-')+'-'+t);}
  await page.evaluate(()=>T01.runtime.pause());const state=await page.evaluate(()=>T01.runtime.snapshot());report.checks.push({id,state});assert.ok(state.memoryOnly);await page.evaluate(()=>T01.capture(false));await save();
 }
 await page.goto(server.url+'/static.html');await page.waitForFunction(()=>globalThis.T01||document.querySelector('#t01-fatal'),null,{timeout:180000});
 for(const id of ['ui:title:terran','ui:starship:loadout:populated:terran','ui:starship:warehouse:empty:terran','ui:pause']){await page.evaluate(id=>T01.load(id),id);await page.evaluate(()=>T01.capture(true));await shot(id.replaceAll(':','-'));report.checks.push({id,state:await page.evaluate(()=>T01.staticRuntime.snapshot())});await page.evaluate(()=>T01.capture(false));await save();}
 report.pass=report.errors.length===0;
}catch(e){report.pass=false;report.failure=String(e);console.error(e);process.exitCode=1;}
finally{clearInterval(timer);if(browser){const b=await browser.newBrowserCDPSession();await b.send('Browser.close').catch(()=>{});await browser.close();}else await context?.close();if(child?.exitCode===null)child.kill();report.profileClosed=true;await server.close();await save();console.log(JSON.stringify({run,pass:report.pass,checks:report.checks.length,errors:report.errors.length,failure:report.failure}));}
