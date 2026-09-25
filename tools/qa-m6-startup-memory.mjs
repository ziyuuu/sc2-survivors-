import {chromium} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const out='reports/local/m6-startup-memory';
await fs.mkdir(out,{recursive:true});
const file=path.resolve('dist/SC2-Survivors-Demo.html');
const report={at:new Date().toISOString(),method:'Fresh-context first navigation and same-page reload in local headless Chrome, offline file URL, Terran Normal new run. This is a warm-browser comparison, not a physical cold disk or visible-device benchmark. Readiness phases are sampled and garbage collection is requested only after each timing checkpoint.',htmlBytes:(await fs.stat(file)).size,runs:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-precise-memory-info']});
report.browserVersion=browser.version();
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await context.setOffline(true);
 const page=await context.newPage();
 const cdp=await context.newCDPSession(page);
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
 for(const pass of ['first','reload']){
  const started=Date.now();
  if(pass==='first')await page.goto(pathToFileURL(file).href,{timeout:240000});
  else await page.reload({timeout:240000});
  await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
  const menuMs=Date.now()-started,menuHeap=await page.evaluate(()=>performance.memory?.usedJSHeapSize??null);
  await cdp.send('HeapProfiler.collectGarbage');
  const menuHeapAfterGc=await page.evaluate(()=>performance.memory?.usedJSHeapSize??null);
  await page.locator('[data-action=menu-new]').click();
  await page.locator('[data-action=menu-race][data-race=terran]').click();
  await page.locator('[data-action=menu-race-next]').click();
  await page.locator('[data-action=menu-difficulty-next]').click();
  await page.evaluate(()=>{const start=performance.now(),events=[];let previous='';const sample=()=>{const r=window.__SC2_REPORT__?.().readiness;if(!r)return;const key=r.phase+':'+r.label;if(key!==previous){previous=key;events.push({ms:Math.round(performance.now()-start),phase:r.phase,label:r.label,heapMiB:Math.round((performance.memory?.usedJSHeapSize??0)/1048576)});}};sample();window.__qaStartupPhases={events,stop:null};window.__qaStartupPhases.stop=setInterval(sample,100);});
  await page.locator('[data-action=menu-start]').click();
  await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});
  const readyMs=Date.now()-started,ready=await page.evaluate(()=>{clearInterval(window.__qaStartupPhases.stop);return {heap:performance.memory?.usedJSHeapSize??null,models:window.__SC2_REPORT__().models,assetsPending:window.__SC2_REPORT__().assetsPending,phases:window.__qaStartupPhases.events};});
  await cdp.send('HeapProfiler.collectGarbage');
  const readyHeapAfterGc=await page.evaluate(()=>performance.memory?.usedJSHeapSize??null);
  await page.locator('[data-action=flow-continue]').click();
  await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='battle',null,{timeout:30000});
  await page.waitForTimeout(5000);
  const battle=await page.evaluate(()=>({heap:performance.memory?.usedJSHeapSize??null,phase:window.__SC2_REPORT__().phase,time:window.__SC2_REPORT__().time,models:window.__SC2_REPORT__().models,drawCalls:window.__SC2_REPORT__().drawCalls}));
  const run={pass,menuMs,readyMs,menuHeapMiB:menuHeap/1048576,menuHeapAfterGcMiB:menuHeapAfterGc/1048576,readyHeapMiB:ready.heap/1048576,readyHeapAfterGcMiB:readyHeapAfterGc/1048576,battleHeapMiB:battle.heap/1048576,readyModels:ready.models,readyAssetsPending:ready.assetsPending,phases:ready.phases,battle};
  report.runs.push(run);
  await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));
  const mapPhases=run.phases.filter(p=>p.label.startsWith('载入战场'));
  console.log(JSON.stringify({pass,menuMs,readyMs,mapFirstMs:mapPhases[0]?.ms,mapLastMs:mapPhases.at(-1)?.ms,readyAfterClickMs:run.phases.find(p=>p.phase==='ready')?.ms,readyHeapAfterGcMiB:run.readyHeapAfterGcMiB,errors:report.errors}));
 }
 await context.close();
 if(report.errors.length)throw Error(report.errors.join(' | '));
}catch(error){report.failure=String(error?.stack??error);process.exitCode=1;}
finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
