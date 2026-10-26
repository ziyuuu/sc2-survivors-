import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';
const root=path.resolve('reports/local/t01-20261024/slot-fix-r1');await fs.mkdir(root,{recursive:false});
const server=await serveT01(),report={scope:'Approved production occupied-slot positioning fix; current bundled production stylesheet, no injected override',rows:[],errors:[],build:server.build.artifacts},save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));let browser,child;
try{
 await fs.mkdir(root+'/profile');child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+root+'/profile','--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<150;i++){try{port=Number((await fs.readFile(root+'/profile/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const context=browser.contexts()[0],page=context.pages()[0];page.on('pageerror',e=>report.errors.push(e.message));await page.setViewportSize({width:1440,height:900});
 await page.goto(server.url+'/static.html');await page.waitForFunction(()=>globalThis.T01,null,{timeout:180000});
 for(const race of ['terran','zerg','protoss']){
  await page.evaluate(id=>T01.load(id),'ui:starship:loadout:populated:'+race);await page.evaluate(()=>T01.capture(true));
  for(const [width,height] of [[1440,900],[844,390],[390,844]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(300);
   const state=await page.evaluate(()=>{const d=document.querySelector('.ship-diagram'),r=d.getBoundingClientRect();return {race:document.querySelector('.starship-ui').dataset.race,diagram:{x:r.x,y:r.y,w:r.width,h:r.height},slots:[...d.querySelectorAll('.slot')].map(e=>{const b=e.getBoundingClientRect();return {name:e.getAttribute('aria-label'),occupied:e.classList.contains('occupied'),position:getComputedStyle(e).position,bounds:{x:b.x,y:b.y,w:b.width,h:b.height},inside:b.x>=r.x-.6&&b.y>=r.y-.6&&b.right<=r.right+.6&&b.bottom<=r.bottom+.6};})};});
   const file=root+`/${race}-${width}x${height}.png`;await page.screenshot({path:file});report.rows.push({race,width,height,state,file});await save();assert.equal(state.slots.length,12);assert.equal(state.slots.filter(s=>s.occupied).length,8);assert.ok(state.slots.every(s=>s.inside&&s.position==='absolute'));
  }
 }
 report.pass=report.errors.length===0;
}catch(e){report.failure=String(e);report.pass=false;process.exitCode=1;}
finally{if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();report.profileClosed=true;await server.close();await save();console.log(JSON.stringify({pass:report.pass,rows:report.rows.length,errors:report.errors.length,failure:report.failure}));}
