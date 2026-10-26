import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';

const run=process.argv[2];assert.match(run,/^residual-probe-r\d+$/);
const root=path.resolve('reports/local/t01-20261024/'+run);await fs.mkdir(root,{recursive:false});
const profile=path.join(os.tmpdir(),'codex-t01-20261024',run);await fs.mkdir(profile,{recursive:true});
const server=await serveT01({buildPath:'reports/local/t01-20261024/static-r8/frozen-web/build.json'});
const report={run,build:server.build,profilePath:profile,fort:[],receipt:[],errors:[]};let child,browser;
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
try{
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<150;i++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const page=browser.contexts()[0].pages()[0];await page.setViewportSize({width:1440,height:900});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(server.url+'/dynamic.html');await page.waitForFunction(()=>globalThis.T01,null,{timeout:180000});
 await page.evaluate(()=>T01.load('native-card:terran:support.terran.bunker:effect'));await page.evaluate(()=>{T01.capture(true);T01.runtime.trigger('normal');T01.runtime.pause();});
 for(const t of [1.4,1.5,1.5333333333,1.55,1.6,1.6166666667,1.7,2,30,31.5,31.55,32,35]){
  await page.bringToFront();await page.evaluate(()=>T01.app.world.paused=false);const state=await page.evaluate(t=>T01.runtime.advanceTo(t),t);
  const render=await page.evaluate(()=>{const v=T01.app.view,w=T01.app.world;return {worldTime:w.time,paused:w.paused,backgroundBusy:v.backgroundBusy,entryPreparation:v.entryPreparation,fortViews:[...v.fortViews].map(([id,g])=>({id,uuid:g.uuid,parent:g.parent?.uuid,visible:g.visible,position:g.position.toArray(),data:g.userData})),fortDeathViews:[...v.fortDeathViews].map(([id,d])=>({id,until:d.until,parent:d.group.parent?.uuid})),templates:[...v.fortTemplates].map(([kind,g])=>({kind,uuid:g.uuid,parent:g.parent?.uuid})),scene:v.scene.children.filter(n=>n.visible&&!n.isInstancedMesh).map(n=>({uuid:n.uuid,name:n.name,type:n.type,position:n.position.toArray(),children:n.children.map(n=>({name:n.name,type:n.type})),data:n.userData}))};});
  const file=`fort-${t}.jpg`;await page.screenshot({path:root+'/'+file,type:'jpeg',quality:92});report.fort.push({t,state,render,file});await save();console.log(JSON.stringify({fort:t,views:render.fortViews.length,deaths:render.fortDeathViews.length,busy:render.backgroundBusy}));
 }
 await page.goto(server.url+'/static.html');await page.waitForFunction(()=>globalThis.T01,null,{timeout:180000});
 for(const race of ['terran','zerg','protoss']){
  await page.evaluate(race=>T01.load('ui:decision:receipt-detail:'+race),race);await page.evaluate(()=>T01.capture(true));
  const sample=async label=>{const state=await page.evaluate(()=>({open:document.querySelector('.family-receipt details')?.open,html:document.querySelector('.family-receipt')?.outerHTML,revision:T01.app.world.revision,assets:T01.app.view.assetsPending,operations:T01.staticRuntime.snapshot()}));const file=`receipt-${race}-${label}.jpg`;await page.screenshot({path:root+'/'+file,type:'jpeg',quality:92});report.receipt.push({race,label,state,file});await save();};
  await sample('immediate');await page.waitForTimeout(2500);await sample('settled');
  const details=page.locator('.family-receipt details');if(!await details.evaluate(e=>e.open))await details.locator('summary').click();
  await sample('clicked');await page.waitForTimeout(2000);await sample('later');console.log(JSON.stringify({receipt:race}));
 }
}catch(e){report.failure=String(e);process.exitCode=1;}
finally{if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();report.profileClosed=true;await server.close();await save();console.log(JSON.stringify({fort:report.fort.length,receipt:report.receipt.length,errors:report.errors,failure:report.failure,profile}));}
