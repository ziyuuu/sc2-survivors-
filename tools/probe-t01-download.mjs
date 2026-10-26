import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const run=process.argv[2];assert.match(run,/^download-probe-r\d+$/);
const root=path.resolve('reports/local/t01-20261024/'+run),profile=path.join(os.tmpdir(),'codex-t01-20261024',run);
await fs.mkdir(root,{recursive:false});await fs.mkdir(profile,{recursive:true});
const report={profilePath:profile,scope:'Minimal isolated native Chrome Blob download diagnosis; no game acceptance.',rows:[]};let child,browser;
try{
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let n=0;n<150;n++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const context=browser.contexts()[0],session=await browser.newBrowserCDPSession(),events=[];
 session.on('Browser.downloadWillBegin',e=>events.push({...e,state:'started'}));session.on('Browser.downloadProgress',e=>{const item=events.find(x=>x.guid===e.guid);if(item)Object.assign(item,e);});
 for(const [label,offline,destination]of [['mixed-offline',true,root+'/downloads'],['workspace-offline',true,path.join(root,'downloads')],['temporary-offline',true,path.join(profile,'downloads')],['workspace-online',false,path.join(root,'downloads')]]){
  await fs.mkdir(destination,{recursive:true});await context.setOffline(offline);await session.send('Browser.setDownloadBehavior',{behavior:'allowAndName',downloadPath:destination,eventsEnabled:true});
  const page=await context.newPage();await fs.writeFile(root+'/probe.html','<button id="go">Export</button><script>document.querySelector("button").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({test:"T01",payload:"x".repeat(200000)})],{type:"application/json"}));a.download="probe.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}</script>');await page.goto(pathToFileURL(root+'/probe.html').href);
  const start=events.length;await page.locator('#go').click();for(let i=0;i<100&&!events.slice(start).some(e=>['completed','canceled'].includes(e.state));i++)await page.waitForTimeout(100);
  const downloads=events.slice(start),history=await context.newPage();await history.goto('chrome://downloads/');await history.waitForTimeout(500);
  const ui=await history.evaluate(()=>{const manager=document.querySelector('downloads-manager'),s=manager?.shadowRoot;return {text:s?.textContent?.slice(0,1500),items:[...(s?.querySelectorAll('downloads-item')??[])].map(e=>({text:e.shadowRoot?.textContent?.trim().slice(-3000),data:e.data}))};});
  report.rows.push({label,offline,destination,downloads,files:await fs.readdir(destination),ui});await history.screenshot({path:root+'/'+label+'.jpg',type:'jpeg',quality:90});await history.close();await page.close();
 }
}catch(e){report.failure=String(e);process.exitCode=1;}finally{if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();report.profileClosed=true;const replacer=(k,v)=>typeof v==='bigint'?v.toString():v;await fs.writeFile(root+'/report.json',JSON.stringify(report,replacer,2));console.log(JSON.stringify({rows:report.rows.map(r=>({label:r.label,downloads:r.downloads,files:r.files,items:r.ui.items.map(i=>({text:i.text.slice(-1000),data:i.data}))})),failure:report.failure},replacer));}
