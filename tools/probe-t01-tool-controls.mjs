import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {serveT01} from './t01-server.mjs';
const run=process.argv[2];assert.match(run,/^tool-controls-probe-r\d+$/);
const root=path.resolve('reports/local/t01-20261024',run),profile=path.join(os.tmpdir(),'codex-t01-20261024',run);
await fs.mkdir(root,{recursive:false});await fs.mkdir(profile,{recursive:true});
const server=await serveT01(),report={run,build:server.build,profilePath:profile,steps:[],errors:[]};
let child,browser;
try{
 child=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-features=AutoDeElevate','about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;for(let i=0;i<150;i++){try{port=Number((await fs.readFile(profile+'/DevToolsActivePort','utf8')).split('\n')[0]);if((await fetch('http://127.0.0.1:'+port+'/json/version')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(port);
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true});const context=browser.contexts()[0],page=context.pages()[0];await page.setViewportSize({width:1440,height:900});
 page.on('pageerror',e=>report.errors.push(e.message));await page.goto(server.url+'/static.html');await page.waitForFunction(()=>globalThis.T01,null,{timeout:180000});
 await page.evaluate(()=>{
  globalThis.T01probe={events:[],mutations:[]};
  for(const kind of ['pointerdown','pointerup','mousedown','mouseup','click','focusin','focusout'])document.addEventListener(kind,event=>T01probe.events.push({kind,time:performance.now(),target:event.target.outerHTML?.slice(0,250),trusted:event.isTrusted,x:event.clientX,y:event.clientY}),true);
  new MutationObserver(()=>{const tool=document.querySelector('#t01-tool');T01probe.mutations.push({time:performance.now(),parent:tool?.parentElement?.tagName,popover:tool?.matches(':popover-open'),state:document.querySelector('#t01-state')?.textContent});}).observe(document.body,{childList:true,subtree:true});
 });
 const state=()=>page.evaluate(()=>({results:Object.keys(T01.results),selected:document.querySelector('#t01-case').value,state:document.querySelector('#t01-state').textContent,caseId:T01.staticRuntime.snapshot().caseId,rect:document.querySelector('[data-result="issue"]').getBoundingClientRect().toJSON(),parent:document.querySelector('#t01-tool').parentElement.tagName}));
 const record=async label=>{await page.locator('#t01-note').fill(label);await page.evaluate(()=>{T01probe.events=[];T01probe.mutations=[];});const before=await state();await page.locator('[data-result="issue"]').click();await page.waitForTimeout(100);const after=await state(),probe=await page.evaluate(()=>T01probe);await page.screenshot({path:root+'/'+label+'.jpg'});report.steps.push({label,before,after,probe});};
 const load=async id=>{await page.locator('#t01-case').selectOption(id);await page.locator('#t01-load').click();await page.waitForFunction(id=>document.querySelector('#t01-state').textContent.startsWith('已载入')&&T01.staticRuntime.snapshot().caseId===id,id,{timeout:180000});};
 await load('ui:decision:receipt-detail:terran');await record('receipt');
 await load('ui:ship-operation:dismantle-confirm:terran');await record('dialog');
 await page.locator('#t01-reset').click();await page.waitForFunction(()=>document.querySelector('#t01-state').textContent.startsWith('已载入'));await record('reset-dialog');
 await record('second-click');
 await page.locator('[data-result="issue"]').focus();await page.keyboard.press('Enter');report.keyboard=await state();
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{if(browser){const s=await browser.newBrowserCDPSession();await s.send('Browser.close').catch(()=>{});await browser.close();}if(child?.exitCode===null)child.kill();report.profileClosed=true;await server.close();await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({steps:report.steps.map(s=>({label:s.label,before:s.before.results,after:s.after.results,events:s.probe.events})),keyboard:report.keyboard,failure:report.failure}));}
