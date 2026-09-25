import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';

const seconds=Number(process.argv.includes('--seconds')?process.argv[process.argv.indexOf('--seconds')+1]:60);
const headed=process.argv.includes('--headed');
const races=(process.argv.includes('--races')?process.argv[process.argv.indexOf('--races')+1]:'terran,zerg,protoss').split(',');
const output=process.argv.includes('--output')?process.argv[process.argv.indexOf('--output')+1]:'reports/local/m6-natural';
if(!Number.isFinite(seconds)||seconds<1||seconds>450||races.some(r=>!['terran','zerg','protoss'].includes(r))||!/^reports\/local\/[a-z0-9-]+$/.test(output))throw Error('Invalid benchmark arguments');
await fs.mkdir(output,{recursive:true});
const report={at:new Date().toISOString(),method:`Local ${headed?'headed':'headless'} Chrome, DPR1 1440x900, genuine new-run menu, Normal stage-1 natural waves and normal production. Samples start at battle resume; no warmup clipping or synthetic actors. Headed automation is not manual visible-window acceptance.`,host:{cpu:os.cpus()[0]?.model,logicalCores:os.cpus().length,totalRAM:os.totalmem()},seconds,runs:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:!headed,args:['--enable-precise-memory-info']});
report.browserVersion=browser.version();
const summarize=values=>{const sorted=[...values].sort((a,b)=>a-b),q=x=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*x))]:null;return {count:values.length,p50:q(.5),p95:q(.95),p99:q(.99),max:sorted.at(-1)??null,over20:values.filter(x=>x>20).length,over50:values.filter(x=>x>50).length};};
try{
 for(const race of races){
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5173/');
  await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
  await page.locator('[data-action=menu-new]').click();
  await page.locator(`[data-action=menu-race][data-race=${race}]`).click();
  await page.locator('[data-action=menu-race-next]').click();
  await page.locator('[data-action=menu-difficulty-next]').click();
  await page.locator('[data-action=menu-start]').click();
  await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});
  await page.evaluate(()=>{
   const {world:w,view:v}=window.__SC2_DEBUG__,p=window.__m6Perf={frames:[],first10:[],steps:[],renders:[],stepSpikes:[],renderSpikes:[],frameSpikes:[],longTasks:[],last:0,done:false};
   const step=w.step.bind(w),render=v.render.bind(v);
   w.step=(...args)=>{const t=performance.now();try{return step(...args);}finally{const ms=performance.now()-t;p.steps.push(ms);if(ms>15)p.stepSpikes.push({at:t,ms,stage:w.stage,elapsed:w.stageElapsed,entities:w.entities.size});}};
   v.render=(...args)=>{const t=performance.now();try{return render(...args);}finally{const ms=performance.now()-t;p.renders.push(ms);if(ms>15)p.renderSpikes.push({at:t,ms,stage:w.stage,elapsed:w.stageElapsed,entities:w.entities.size,programs:v.renderer.info.programs?.length});}};
   new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!p.done)p.longTasks.push({at:entry.startTime,length:entry.duration});}).observe({entryTypes:['longtask']});
   const sample=now=>{if(p.started&&w.phase==='battle'&&!w.paused){if(p.last){const ms=now-p.last;p.frames.push(ms);if(now-p.started<10000)p.first10.push(ms);if(ms>20)p.frameSpikes.push({at:now,ms,stage:w.stage,elapsed:w.stageElapsed,entities:w.entities.size,assetsPending:v.assetsPending});}p.last=now;}if(!p.done)requestAnimationFrame(sample);};requestAnimationFrame(sample);
  });
  await page.evaluate(()=>{window.__m6Perf.started=performance.now();});
  await page.locator('[data-action=flow-continue]').click();
  await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='battle',null,{timeout:30000});
  const before=await page.evaluate(()=>{const p=window.__m6Perf;return {wall:p.started,time:window.__SC2_DEBUG__.world.time,backlog:window.__SC2_REPORT__().simulationBacklogSeconds};});
  await page.waitForTimeout(seconds*1000);
  const after=await page.evaluate(()=>{
   const {world:w,view:v}=window.__SC2_DEBUG__,p=window.__m6Perf;p.done=true;
   return {wall:performance.now(),time:w.time,backlog:window.__SC2_REPORT__().simulationBacklogSeconds,stage:w.stage,phase:w.phase,enemies:w.enemyCount(),allies:w.allies().length,drawCalls:v.renderer.info.render.calls,triangles:v.renderer.info.render.triangles,effectsDropped:v.fx.stats.dropped,heap:performance.memory?.usedJSHeapSize??null,frames:p.frames,first10:p.first10,steps:p.steps,renders:p.renders,frameSpikes:p.frameSpikes,stepSpikes:p.stepSpikes,renderSpikes:p.renderSpikes,longTasks:p.longTasks.filter(entry=>entry.at>=p.started)};
  });
  const run={race,wallSeconds:(after.wall-before.wall)/1000,simSeconds:after.time-before.time,backlogDelta:after.backlog-before.backlog,frameMs:summarize(after.frames),first10FrameMs:summarize(after.first10),stepMs:summarize(after.steps),renderMs:summarize(after.renders),frameSpikes:after.frameSpikes,stepSpikes:after.stepSpikes,renderSpikes:after.renderSpikes,longTasks:after.longTasks,stage:after.stage,phase:after.phase,enemies:after.enemies,allies:after.allies,drawCalls:after.drawCalls,triangles:after.triangles,effectsDropped:after.effectsDropped,heapMiB:after.heap/1048576,errors};
  report.runs.push(run);await fs.writeFile(output+'/results.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({race,stage:run.stage,phase:run.phase,frame:run.frameMs,first10:run.first10FrameMs,step:run.stepMs,render:run.renderMs,backlog:run.backlogDelta,drawCalls:run.drawCalls,errors}));
  await context.close();
 }
}catch(error){report.failure=String(error?.stack??error);process.exitCode=1;console.error(report.failure);}
finally{await fs.writeFile(output+'/results.json',JSON.stringify(report,null,2));await browser.close();}
