import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chromium} from '@playwright/test';
import {createGameServer} from './coze-web-server.mjs';
import {playNativeBattle} from './7a-native-battle.mjs';

const arg=(key,otherwise)=>process.argv.find(s=>s.startsWith('--'+key+'='))?.slice(key.length+3)??otherwise;
const out=arg('out'),webRoot=arg('web','reports/local/7a-20261013/baseline/web'),assetRoot=arg('assets','deploy/runtime'),html=arg('html'),race=arg('race','terran'),dwell=Number(arg('dwell','0')),seconds=Number(arg('seconds','10')),profile=process.argv.includes('--profile'),cache=arg('cache','fresh');
const storageObserve=process.argv.includes('--storage-observe');
assert.ok(out?.startsWith('reports/local/7a-20261013/')&&!out.split('/').includes('..'));
assert.ok(['terran','protoss','zerg'].includes(race)&&['fresh','warm','reuse','all'].includes(cache));
assert.ok(Number.isFinite(dwell)&&dwell>=0&&Number.isFinite(seconds)&&seconds>=0);
await fs.access(out).then(()=>{throw Error('Evidence directory exists');},e=>{if(e.code!=='ENOENT')throw e;});await fs.mkdir(out,{recursive:true});await fs.copyFile(new URL(import.meta.url),out+'/runner.mjs');
await fs.copyFile(new URL('./7a-native-battle.mjs',import.meta.url),out+'/native-battle-runner.mjs');
const quantile=(v,q)=>v.length?[...v].sort((a,b)=>a-b)[Math.min(v.length-1,Math.floor(v.length*q))]:null;
const stats=v=>({count:v.length,mean:v.length?v.reduce((a,b)=>a+b,0)/v.length:null,p50:quantile(v,.5),p95:quantile(v,.95),p99:quantile(v,.99),max:v.length?Math.max(...v):null});
const report={at:new Date().toISOString(),method:'Native formal UI; fixed entropy seed 529; 1440x900 DPR1 native quality. Browser context/cache condition explicit; OS/driver caches not cleared. Timing and CPU profiling are separate runs. No World mutation or health lock. Automation and headless measurements do not establish physical-device latency or final 60 FPS acceptance.',race,dwell,cache,profile,seconds,host:{cpu:os.cpus()[0]?.model,cores:os.cpus().length,totalRAM:os.totalmem(),freeRAM:os.freemem()},errors:[],runs:[],requests:{http:0}};
report.experiment={shader:arg('shader','full')};
report.cdpHeaps=[];report.systemMemory=[];report.processMemory=[];let heapTimer,heapPending=false,processTimer,processPending=false;
let browser,server,page,inFlightRun;
try{
 if(storageObserve){
  report.storageObservation='Existing resource-cache keys, storage usage/quota and persistence are observed before each timed pass and after its frame capture. Bodies are not read, cache contents are not cleared, and no quota or persistence override is requested. Metadata observation may itself warm browser metadata; both comparison versions use the same probe.';
  report.storageProbes=[];report.storageVolumes=[];
  for(const [label,target]of [['browser-temp-volume',os.tmpdir()],['workspace-volume',process.cwd()]]){try{const s=await fs.statfs(target);report.storageVolumes.push({label,freeBytes:s.bavail*s.bsize,totalBytes:s.blocks*s.bsize});}catch(error){report.storageVolumes.push({label,error:String(error)});}}
 }
 let url;
 if(html){const hash=createHash('sha256');let bytes=0;for await(const chunk of createReadStream(html)){bytes+=chunk.length;hash.update(chunk);}report.build={html,bytes,sha256:hash.digest('hex')};url=pathToFileURL(path.resolve(html)).href;}
 else {report.build=JSON.parse(await fs.readFile(webRoot+'/web-release.json','utf8'));server=createGameServer({webRoot:path.resolve(webRoot),assetRoot:path.resolve(assetRoot),backendOptions:{config:{enabled:false}}});await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port;}
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});report.browserVersion=browser.version();
 if(process.argv.includes('--process-memory')){
  const browserCdp=await browser.newBrowserCDPSession(),run=promisify(execFile);
  const sample=async()=>{if(processPending)return;processPending=true;try{
   const {processInfo}=await browserCdp.send('SystemInfo.getProcessInfo'),ids=processInfo.map(p=>Number(p.id));assert.ok(ids.every(Number.isSafeInteger));
   const command='Get-Process -Id '+ids.join(',')+' -ErrorAction SilentlyContinue | Select-Object Id,WorkingSet64,PrivateMemorySize64 | ConvertTo-Json -Compress';
   const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{windowsHide:true});const rows=JSON.parse(stdout);report.processMemory.push({at:Date.now(),processInfo,rows:Array.isArray(rows)?rows:[rows]});
  }catch(error){(report.memorySamplingErrors??=[]).push(String(error));}finally{processPending=false;}};
  await sample();processTimer=setInterval(sample,5000);report.memoryMethod='Owned Chrome PIDs from CDP; per-process working set/private bytes every 5 s. Working sets may count shared pages more than once; not physical VRAM. This optional memory-instrumented run is excluded from timing/FPS comparison.';
 }
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});if(html)await context.setOffline(true);
 await context.addInitScript(options=>{window.__7A_OPTIONS__=options;},{shader:arg('shader','full'),gpu:process.argv.includes('--gpu'),native:seconds>=180});
 await context.addInitScript(()=>{
  performance.setResourceTimingBufferSize(10000);
  const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=array=>{if(array instanceof Uint32Array&&array.length===1){array[0]=529;return array;}return original(array);};
  localStorage.setItem('sc2.renderQuality','native');
  const p=window.__7A={phases:[],longTasks:[],events:[],heaps:[],frames:[],first10:[],samples:[],active:false,done:false,last:0,battleAt:0,previous:''};
  new PerformanceObserver(list=>{for(const e of list.getEntries())p.longTasks.push({at:e.startTime,ms:e.duration});}).observe({type:'longtask',buffered:true});
  if(PerformanceObserver.supportedEntryTypes.includes('event'))new PerformanceObserver(list=>{for(const e of list.getEntries())p.events.push({name:e.name,at:e.startTime,duration:e.duration,inputDelay:e.processingStart-e.startTime,processing:e.processingEnd-e.processingStart,interactionId:e.interactionId});}).observe({type:'event',buffered:true,durationThreshold:16});
  setInterval(()=>{const r=window.__SC2_REPORT__?.(),s=r?.readiness,key=s?`${s.phase}:${s.label}`:'boot';if(key!==p.previous){p.previous=key;p.phases.push({at:performance.now(),phase:s?.phase,label:s?.label,assets:r?.embeddedAssets});}if(performance.memory)p.heaps.push({at:performance.now(),used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize});if(p.active&&r)p.samples.push({at:performance.now(),phase:r.phase,time:r.time,stage:r.stage,debt:r.simulationBacklogSeconds,discard:r.discardedSimulationBacklogSeconds,ready:s?.phase,pending:r.assetsPending});},1000);
  const frame=now=>{if(p.active&&(!window.__7A_OPTIONS__.native||document.body.dataset.uiPhase==='battle')){if(p.last){p.frames.push(now-p.last);if(now-p.battleAt<10000)p.first10.push(now-p.last);}p.last=now;}else p.last=0;if(!p.done)requestAnimationFrame(frame);};requestAnimationFrame(frame);
 });
 page=await context.newPage();page.setDefaultTimeout(180000);page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))report.requests.http++;});
 const cdp=await context.newCDPSession(page);
 const storageProbe=async label=>{
  const began=Date.now(),data=await page.evaluate(async()=>{
   const value={url:location.href};
   try{value.estimate=await navigator.storage?.estimate?.();value.persisted=await navigator.storage?.persisted?.();}catch(error){value.storageError=String(error);}
   try{if(typeof caches!=='undefined'){value.cacheNames=await caches.keys();if(value.cacheNames.includes('sc2-resource-bytes-v1')){const resourceCache=await caches.open('sc2-resource-bytes-v1'),keys=await resourceCache.keys();value.resourceHashes=keys.map(r=>new URL(r.url).pathname.split('/').at(-1)).sort();value.resourceCacheEntries=keys.length;}}}catch(error){value.cacheError=String(error);}
   return value;
  });const snapshot={label,at:Date.now(),queryMs:Date.now()-began,...data};report.storageProbes.push(snapshot);return snapshot;
 };
 const captureHeap=async(source)=>{const at=Date.now();try{report.cdpHeaps.push({at,source,...await cdp.send('Runtime.getHeapUsage')});}catch(error){if(source!=='interval')(report.memorySamplingErrors??=[]).push(String(error));}};
 heapTimer=setInterval(async()=>{report.systemMemory.push({at:Date.now(),free:os.freemem()});if(heapPending)return;heapPending=true;try{await captureHeap('interval');}finally{heapPending=false;}},1000);
 report.heapSampling={intervalMs:1000,explicitPassStartAndReady:true,method:'One-second lightweight CDP samples plus explicit pass-start and ready-gate snapshots, so a subsecond reused entrance does not become an invented zero-memory reading. The ready timestamp is recorded before its extra heap snapshot.'};
 for(let pass=0;pass<(cache==='fresh'?1:cache==='all'?3:2);pass++){
  const storageBefore=storageObserve?await storageProbe('before-'+pass):undefined;
  const passWall=Date.now();let origin=0;
  await captureHeap('pass-start:'+pass);
  const condition=pass===0?'fresh':cache==='all'?(pass===1?'reuse':'warm'):cache;
  if(profile){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
  if(condition==='fresh'||condition==='warm')await page.goto(url,{timeout:900000});
  else {origin=await page.evaluate(()=>performance.now());await page.locator('#topbar [data-action=pause]').click();await page.locator('#overlay [data-action=restart]').click();await page.evaluate(()=>{const p=window.__7A;p.phases=[];p.longTasks=[];p.events=[];p.heaps=[];});}
  await page.locator('.main-actions [data-action=menu-new]').click({trial:true});
  const run={pass,condition,storageBefore,menuMs:await page.evaluate(()=>performance.now()),menu:await page.evaluate(()=>window.__SC2_REPORT__())};
  inFlightRun=run;
  run.origin=origin;run.menuMs-=origin;run.interactions=[];
  const click=async(selector)=>{const start=performance.now();await page.locator(selector).click();run.interactions.push({selector,automationMs:performance.now()-start});};
  if(dwell)await page.waitForTimeout(dwell);
  await click('.main-actions [data-action=menu-new]');
  if(process.argv.includes('--menu-probe')){run.menuProbe=[];for(let i=0;i<18;i++){const choice=['terran','protoss','zerg'][i%3],at=performance.now();await click(`[data-action=menu-race][data-race=${choice}]`);run.menuProbe.push({choice,automationMs:performance.now()-at,at:await page.evaluate(()=>performance.now())});assert.equal((await page.evaluate(()=>window.__SC2_REPORT__())).time,0);await page.waitForTimeout(750);}}
  await click(`[data-action=menu-race][data-race=${race}]`);await click('[data-action=menu-race-next]');await click('[data-action=menu-difficulty-next]');
  run.startAt=await page.evaluate(()=>performance.now());await page.locator('[data-action=menu-start]').click();
  await page.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__?.().readiness.phase),null,{timeout:900000});
  run.readyAt=await page.evaluate(()=>performance.now());run.entryMs=run.readyAt-run.startAt;run.ready=await page.evaluate(()=>window.__SC2_REPORT__());assert.equal(run.ready.readiness.phase,'ready');assert.deepEqual(run.ready.errors,[]);
  await captureHeap('ready:'+pass);
  run.loadingHeaps=report.cdpHeaps.filter(x=>x.at>=passWall);run.peakLoadingJSHeap=Math.max(0,...run.loadingHeaps.map(x=>x.usedSize));run.peakLoadingBackingStorage=Math.max(0,...run.loadingHeaps.map(x=>x.backingStorageSize??0));run.minimumLoadingSystemFreeBytes=Math.min(os.freemem(),...report.systemMemory.filter(x=>x.at>=passWall).map(x=>x.free));
  if(profile){const {profile:cpu}=await cdp.send('Profiler.stop');await fs.writeFile(out+`/pass${pass}.cpuprofile`,JSON.stringify(cpu));await cdp.send('Profiler.disable');const nodes=new Map(cpu.nodes.map(n=>[n.id,n.callFrame])),times=new Map();for(let i=0;i<(cpu.samples?.length??0);i++){const id=cpu.samples[i];times.set(id,(times.get(id)??0)+(cpu.timeDeltas?.[i]??0));}run.cpuSelf=[...times].sort((a,b)=>b[1]-a[1]).slice(0,50).map(([id,microseconds])=>({ms:microseconds/1000,...nodes.get(id)}));}
  report.environment=await page.evaluate(()=>{const gl=document.querySelector('#battle').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {agent:navigator.userAgent,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,visibility:document.visibilityState,focus:document.hasFocus(),timerQuery:!!gl.getExtension('EXT_disjoint_timer_query_webgl2'),parallelCompile:!!gl.getExtension('KHR_parallel_shader_compile'),schedulerYield:!!globalThis.scheduler?.yield,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio}};});
  if(process.argv.includes('--profile-battle')){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
  await page.evaluate(()=>{const p=window.__7A;p.battleAt=performance.now();p.active=true;p.frames=[];p.first10=[];p.samples=[];});await page.locator('[data-action=flow-continue]').click();
  run.battleAt=await page.evaluate(()=>performance.now());
  if(seconds>=180){let loggedAt=-30;run.native=await playNativeBattle(page,seconds,{onCheckpoint:progress=>fs.writeFile(out+'/native-checkpoint.json',JSON.stringify(progress,null,2)),onSample:r=>{if(r.sampledSeconds>=loggedAt+30){loggedAt=r.sampledSeconds;console.log(JSON.stringify({event:'native-progress',race,pass,time:r.time,sampledSeconds:r.sampledSeconds,stage:r.stage,phase:r.phase,pending:r.assetsPending}));}}});assert.equal(run.native.passed,true,JSON.stringify({reason:run.native.reason,time:run.native.after?.time,stage:run.native.after?.stage}));}else await page.waitForTimeout(seconds*1000);
  if(process.argv.includes('--profile-battle')){const {profile:cpu}=await cdp.send('Profiler.stop');await fs.writeFile(out+`/pass${pass}-battle.cpuprofile`,JSON.stringify(cpu));await cdp.send('Profiler.disable');}
  const raw=await page.evaluate(origin=>{window.__7A.active=false;return {...window.__7A,spans:window.__7A_SPANS__,gpu:window.__7A_GPU__,resources:performance.getEntriesByType('resource').filter(e=>e.startTime>=origin).map(e=>e.toJSON()),report:window.__SC2_REPORT__()};},origin);
  if(process.argv.includes('--animation-snapshot'))run.animation=await page.evaluate(()=>window.__7A_ANIMATION_SNAPSHOT__());
  run.after=raw.report;run.frames=stats(raw.frames);run.first10=stats(raw.first10);run.longTasks=raw.longTasks;run.events=raw.events;run.quantizedPerformanceHeapPeak=Math.max(0,...raw.heaps.map(x=>x.used));run.cdpHeaps=report.cdpHeaps.filter(x=>x.at>=passWall);run.peakJSHeap=Math.max(0,...run.cdpHeaps.map(x=>x.usedSize));run.peakBackingStorage=Math.max(0,...run.cdpHeaps.map(x=>x.backingStorageSize??0));run.maxDebt=Math.max(0,...raw.samples.map(x=>x.debt));run.raw=`pass${pass}-raw.json`;run.totalMs=run.readyAt-origin;
  await fs.writeFile(out+'/'+run.raw,JSON.stringify(raw));await page.screenshot({path:out+`/pass${pass}-battle.png`});if(storageObserve)run.storageAfter=await storageProbe('after-'+pass);report.runs.push(run);await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({pass,condition:run.condition,menuMs:run.menuMs,entryMs:run.entryMs,totalMs:run.totalMs,frameP95:run.frames.p95,phase:run.after.phase,time:run.after.time,peakJSHeap:run.peakJSHeap,cpu:run.cpuSelf?.slice(0,8)}));
 }
 assert.deepEqual(report.errors,[]);if(html)assert.equal(report.requests.http,0);report.passed=true;
}catch(e){report.passed=false;report.failure=String(e.stack??e);report.failedRun=inFlightRun;report.failureState=await page?.evaluate(()=>window.__SC2_REPORT__?.()).catch(()=>null);const raw=await page?.evaluate(()=>({...window.__7A,report:window.__SC2_REPORT__?.()})).catch(()=>null);if(raw)await fs.writeFile(out+'/failure-raw.json',JSON.stringify(raw));await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{clearInterval(heapTimer);clearInterval(processTimer);report.finishedAt=new Date().toISOString();await fs.writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser?.close();if(server)await new Promise(r=>server.close(r));console.log(JSON.stringify({passed:report.passed,out,failure:report.failure}));}
