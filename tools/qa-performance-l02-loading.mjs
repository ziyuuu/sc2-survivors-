import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const [kind='web',variant='candidate-r1',rep='1']=process.argv.slice(2),folder='performance-l02-20261020-'+variant,root=path.resolve('reports/local/performance-l02-20261020',`${kind}-${variant}-${rep}`);
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const offline=kind==='offline',hash=x=>createHash('sha256').update(x).digest('hex'),artifact=path.resolve(`reports/local/performance-l02-20261020/offline-${variant}/performance-l02.html`);
const report={kind,variant,rep,started:new Date().toISOString(),scope:'Paired diagnostic entry. Fresh Chrome profile is browser-cache cold, not OS-cache cold. Nested asynchronous spans overlap; upload means CPU submission, not GPU execution. Heap is sampled JS heap, not process RAM or VRAM. Ordinary full-effects game; no FPS or human acceptance.',build:JSON.parse(await fs.readFile(offline?`reports/local/performance-l02-20261020/offline-${variant}/build-inputs.json`:`preview/${folder}/build-inputs.json`)),stages:[],screens:[],errors:[],failedRequests:[],served:[],network:[],heap:[],checks:[]};
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));let ctx,page,cdp,sampling,phase='boot';
const shot=async name=>{const file=root+'/'+name+'.png';await page.screenshot({path:file});report.screens.push({name,file,sha256:hash(await fs.readFile(file))});await save();};
const state=()=>page.evaluate(()=>{const l=window.L02,a=l?.app,v=a?.view,w=a?.world;return {at:performance.now(),bootFinished:l?.bootFinished,loadedAt:l?.loadedAt,scheduling:{nativeYield:typeof globalThis.scheduler?.yield==='function',hidden:document.hidden,userAgent:navigator.userAgent},error:l?.error,spans:l?.spans,phases:l?.phases,probe:window.L02Probe,readiness:a?.readiness.state,world:w?{phase:w.phase,time:w.time,tick:w.tick,seed:w.seed,stage:w.stage,map:w.runConfig?.campaignMap,runId:w.runId,rng:w.rngState}:null,models:v?{keys:[...v.gpu.keys()].sort(),screenWarmed:v.screenWarmed.size,programs:v.validatedPrograms.size,preparationKey:v.preparationKey,errors:v.modelErrors,ready:v.initialAssetsLoaded,counts:{...v.renderer.info.memory},contextLost:v.renderer.getContext().isContextLost()}:null,embedded:window.__SC2_EMBEDDED__?Object.keys(window.__SC2_EMBEDDED__):null,resources:performance.getEntriesByType('resource').map(e=>({name:e.name,start:e.startTime,ms:e.duration,transfer:e.transferSize,decoded:e.decodedBodySize})),navigation:performance.getEntriesByType('navigation').map(e=>e.toJSON()),memory:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null};});
async function stage(label,fn){phase=label;const started=performance.now();await fn();const data=await state();report.stages.push({label,wallMs:performance.now()-started,data,metrics:await cdp.send('Performance.getMetrics'),dom:await cdp.send('Memory.getDOMCounters')});await save();console.log(JSON.stringify({kind,variant,rep,label,ms:report.stages.at(-1).wallMs,ready:data.readiness?.phase,modelCount:data.models?.keys.length}));}
async function ready(){await page.waitForFunction(()=>['ready','error'].includes(window.L02?.app?.readiness.state.phase),null,{timeout:240000});const s=await page.evaluate(()=>L02.app.readiness.state);assert.equal(s.phase,'ready',JSON.stringify(s));}
async function menu(){await page.waitForFunction(()=>!!window.L02?.app&&!document.getElementById('scs-opening-visual'),null,{timeout:240000});}
async function prepare(){for(const action of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await page.locator(`[data-action=${action}]:visible`).click();await ready();}
async function enter(){await page.evaluate(()=>{const a=L02.app,commit=a.hud.onCommitFlow;a.hud.onCommitFlow=()=>{commit();a.world.paused=true;a.hud.update();a.hud.onCommitFlow=commit;};});await page.locator('[data-action=flow-continue]:visible').click();await page.waitForFunction(()=>L02.app.world.phase==='battle');}
try{
 ctx=await chromium.launchPersistentContext(root+'/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1,offline,args:['--enable-precise-memory-info']});
 page=ctx.pages()[0];page.setDefaultTimeout(90000);cdp=await ctx.newCDPSession(page);await cdp.send('Performance.enable');
 try{const browser=ctx.browser(),system=await browser.newBrowserCDPSession(),info=await system.send('SystemInfo.getInfo');report.hardware={browser:browser.version(),gpu:info.gpu};await system.detach();}catch(error){report.hardware={unavailable:String(error)};}
 const served=[];page.on('response',r=>{if(/\/main\.(js|css)$/.test(new URL(r.url()).pathname))served.push(r.body().then(b=>({url:r.url(),sha256:hash(b)})));});
 page.on('pageerror',e=>report.errors.push({phase,type:'page',message:e.message}));page.on('console',m=>{if(m.type()==='error')report.errors.push({phase,type:'console',message:m.text()});});page.on('requestfailed',r=>report.failedRequests.push({phase,url:r.url(),error:r.failure()?.errorText}));
 page.on('request',r=>{if(/^https?:/.test(r.url()))report.network.push({phase,url:r.url()});});
 await page.addInitScript(()=>{
  localStorage.setItem('sc2.renderQuality','native');localStorage.setItem('sc2.ordinaryEffects','full');localStorage.setItem('sc2.heroEffects','full');localStorage.setItem('sc2.animationMode','complete');
  const p=window.L02Probe={longTasks:[],frames:[],heap:[],packRemoved:[],statuses:[]};performance.setResourceTimingBufferSize(4000);
  new PerformanceObserver(list=>{for(const e of list.getEntries())p.longTasks.push({at:e.startTime,ms:e.duration});}).observe({type:'longtask',buffered:true});
  let last=0;function frame(now){p.frames.push({at:now,ms:last?now-last:0});last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);
  setInterval(()=>{if(performance.memory)p.heap.push({at:performance.now(),used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize});},250);
  new MutationObserver(list=>{let count=0;for(const m of list)for(const node of m.removedNodes)if(node.nodeType===1&&node.matches('script[data-sc2-resource-chunk]'))count++;if(count)p.packRemoved.push({at:performance.now(),count});}).observe(document,{childList:true,subtree:true});
 });
 sampling=setInterval(()=>{cdp.send('Performance.getMetrics').then(m=>report.heap.push({at:Date.now(),phase,used:m.metrics.find(e=>e.name==='JSHeapUsedSize')?.value,total:m.metrics.find(e=>e.name==='JSHeapTotalSize')?.value})).catch(()=>{});},1000);
 const url=offline?pathToFileURL(artifact).href:`http://127.0.0.1:4439/${folder}/`;
 await stage('cold-home',async()=>{await page.goto(url,{waitUntil:'domcontentloaded',timeout:240000});await menu();});await shot('cold-home');
 report.served=await Promise.all(served);if(!offline)assert.ok(report.served.some(s=>s.sha256===report.build.outputs.find(o=>o.file.endsWith('/main.js')).sha256));
 await stage('cold-ready',prepare);await shot('cold-ready');
 report.checks.push({name:'required-ready-before-world-start',ok:await page.evaluate(()=>L02.app.world.phase==='menu'&&L02.app.world.time===0&&L02.app.view.modelErrors.length===0)});
 await stage('first-enter',enter);await shot('first-battle-paused');
 await stage('same-page-return',async()=>{await page.locator('[data-action=restart]:visible').click();await page.waitForFunction(()=>L02.app.world.phase==='menu');});
 await stage('same-page-resume',async()=>{await page.locator('[data-action=save-continue]:visible').click();await page.waitForFunction(()=>L02.app.world.phase==='battle');await page.evaluate(()=>{L02.app.world.paused=true;L02.app.hud.update();});});await shot('same-page-resume');
 // A warm navigation is separate from the same-page continuation above.
 await stage('reload-home',async()=>{await page.reload({waitUntil:'domcontentloaded',timeout:240000});await menu();});
 await stage('reload-ready',prepare);await shot('reload-ready');
 report.served=await Promise.all(served);
 report.final=await state();report.complete=true;
 if(offline)assert.equal(report.network.length,0);
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));assert.ok(report.checks.every(c=>c.ok));
}catch(error){report.failure=String(error.stack??error);if(page){report.failureState=await state().catch(e=>({error:String(e)}));await shot('failure').catch(()=>{});}process.exitCode=1;}
finally{clearInterval(sampling);report.finished=new Date().toISOString();await save();await ctx?.close();console.log(JSON.stringify({kind,variant,rep,complete:report.complete,errors:report.errors.length,failure:report.failure?.slice(0,500)}));}
