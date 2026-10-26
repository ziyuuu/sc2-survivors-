import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';
const run=process.argv[2]??'static-r1',root=path.resolve('reports/local/t01-20261024/'+run),only=process.argv[3];await fs.mkdir(root,{recursive:false});
const server=await serveT01(process.argv[4]?{buildPath:process.argv[4]}:{}),report={run,scope:'All indexed production UI display fixtures; screenshot and DOM evidence. Human review is separate.',build:server.build,rows:[],errors:[],failedRequests:[]},save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));let browser,child;
try{
 await fs.mkdir(root+'/profile');child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+root+'/profile','--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let n=0;n<150;n++){try{port=Number((await fs.readFile(root+'/profile/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const context=browser.contexts()[0],page=context.pages()[0];
 page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),failure:r.failure()}));await page.setViewportSize({width:1440,height:900});
 await page.goto(server.url+'/static.html');await page.waitForFunction(()=>globalThis.T01,null,{timeout:180000});let cases=await page.evaluate(()=>T01.cases);report.catalogueCount=cases.length;if(only){const previous=JSON.parse(await fs.readFile(only,'utf8')),ids=new Set(Array.isArray(previous)?previous:previous.rows.filter(r=>r.status==='failed').map(r=>r.id));cases=cases.filter(c=>ids.has(c.id));report.selection=only;}
 for(const [index,c] of cases.entries()){
  const row={id:c.id,name:c.name,screens:[],status:'running'};report.rows.push(row);console.log(`${index+1}/${cases.length} ${c.id}`);
  try{
   await page.evaluate(id=>T01.load(id),c.id);await page.evaluate(()=>T01.capture(true));
   if(c.action==='inspector'){
    const inspector=await page.evaluate(()=>({unit:!!document.querySelector('#unit-inspector:not([hidden])'),carrier:!!document.querySelector('#carrier-inspector:not([hidden])'),open:document.querySelector('#unit-inspector details[data-ability]')?.open,entities:T01.app.world.entities.size,pods:T01.app.world.pods.length}));row.inspector=inspector;
    if(c.target==='empty'){assert.equal(inspector.unit,false);assert.equal(inspector.entities,0);assert.equal(inspector.pods,0);}
    else if(c.target.startsWith('carrier'))assert.equal(inspector.carrier,true,'Expected carrier detail open');
    else {assert.equal(inspector.unit,true,'Expected actual unit detail open');if(['abilities','ability-detail'].includes(c.target))assert.equal(inspector.open,c.target==='ability-detail','Ability expanded state');}
   }
   for(const [width,height] of [[1440,900],[844,390],[390,844]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(100);await page.evaluate(async()=>{const finite=document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity);await Promise.race([Promise.allSettled(finite.map(a=>a.finished)),new Promise(r=>setTimeout(r,1500))]);const painted=e=>{if(!e.getBoundingClientRect().width||!e.getBoundingClientRect().height)return false;for(let p=e;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;}return true;};for(let n=0;n<100;n++){const imgs=[...document.images].filter(painted);await Promise.all(imgs.map(i=>i.decode().catch(()=>{})));if(!document.querySelector('[data-deferred-icon]')&&[...document.images].filter(painted).every(i=>i.complete&&i.naturalWidth))break;await new Promise(r=>setTimeout(r,100));}});
    const state=await page.evaluate(()=>{const painted=e=>{if(!e.getBoundingClientRect().width||!e.getBoundingClientRect().height)return false;for(let p=e;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;}return true;};return {snapshot:T01.staticRuntime.snapshot(),visibleText:[...document.querySelectorAll('#interface,#native-starship')].filter(e=>!e.hidden).map(e=>e.innerText).join('\n'),brokenImages:[...document.images].filter(i=>painted(i)&&(!i.complete||!i.naturalWidth)).map(i=>({src:i.src,html:i.outerHTML})),unpaintedImagePlaceholders:[...document.images].filter(i=>!painted(i)&&(!i.complete||!i.naturalWidth)).map(i=>i.outerHTML),overflow:document.documentElement.scrollWidth>innerWidth+1,dialogs:[...document.querySelectorAll('[role="dialog"],dialog[open]')].filter(e=>e.offsetWidth).length};});row.lastState=state;
    assert.ok(state.snapshot.memoryOnly);assert.ok(state.visibleText.trim().length>0,'Empty production UI');assert.equal(state.brokenImages.length,0,'Visible asset failed');
    const file=`${String(index+1).padStart(3,'0')}-${c.id.replaceAll(':','-')}-${width}x${height}.png`;await page.screenshot({path:root+'/'+file,fullPage:true});row.screens.push({width,height,file,state});
   }
   row.status='captured';row.visualReview='pending';
  }catch(e){row.status='failed';row.failure=String(e);await page.screenshot({path:root+`/failed-${index+1}.png`});}
  await page.evaluate(()=>T01.capture(false));await save();
 }
 report.capturePass=report.rows.every(r=>r.status==='captured')&&report.errors.length===0;report.visualPass=false;
}catch(e){report.failure=String(e);process.exitCode=1;}
finally{if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();report.profileClosed=true;await server.close();await save();console.log(JSON.stringify({captured:report.rows.filter(r=>r.status==='captured').length,failed:report.rows.filter(r=>r.status==='failed').length,errors:report.errors.length,failure:report.failure}));}
