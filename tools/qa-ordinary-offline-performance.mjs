import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import os from 'node:os';
import assert from 'node:assert/strict';

const output=process.argv.includes('--output')?process.argv[process.argv.indexOf('--output')+1]:'reports/local/ordinary-performance-20260924-offline';
const sampleSeconds=process.argv.includes('--seconds')?Number(process.argv[process.argv.indexOf('--seconds')+1]):20;
const race=process.argv.includes('--race')?process.argv[process.argv.indexOf('--race')+1]:'terran';
if(!/^reports\/local\/[a-z0-9-]+$/.test(output)||!Number.isInteger(sampleSeconds)||sampleSeconds<10||sampleSeconds>120||!['terran','zerg','protoss'].includes(race))throw Error('Invalid local output, duration or race');
const quantile=(values,q)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*q))];
const summary=values=>({count:values.length,mean:values.reduce((a,b)=>a+b,0)/values.length,p50:quantile(values,.5),p95:quantile(values,.95),p99:quantile(values,.99),max:Math.max(...values),over20:values.filter(v=>v>20).length,over33:values.filter(v=>v>33.4).length});
await fs.mkdir(output,{recursive:true});
const report={at:new Date().toISOString(),method:`Local production standalone file:// HTML, unmodified natural ${race} Normal opening, zero talents, 1440x900 DPR1, 2s warmup + at most ${sampleSeconds}s wall sample. rAF cadence and public read-only report only; no debug API, no server, no requests. Headless Chrome display pacing is near 60Hz, not physical-device acceptance.`,race,host:{cpu:os.cpus()[0]?.model},errors:[],requests:[]};
let browser;
try{
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-precise-memory-info']});
  report.browserVersion=browser.version();
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
  page.on('request',request=>{if(/^https?:/.test(request.url()))report.requests.push(request.url());});
  await page.goto(pathToFileURL(path.resolve('dist/SC2-Survivors-Demo.html')).href,{waitUntil:'domcontentloaded',timeout:240000});
  await page.waitForFunction(()=>window.__SC2_REPORT__?.().assetsReady&&!window.__SC2_REPORT__().assetsPending,null,{timeout:300000});
  await page.getByLabel('开局种族').selectOption(race);
  await page.locator('[data-setting=difficulty]').selectOption('normal');
  await page.locator('[data-action=start]').click();
  await page.waitForTimeout(2000);
  const start=await page.evaluate(()=>{const frames=[],sample={frames,last:performance.now(),done:false};window.__ordinaryOffline=sample;const raf=now=>{frames.push(now-sample.last);sample.last=now;if(!sample.done)requestAnimationFrame(raf);};requestAnimationFrame(raf);return {wall:performance.now(),report:window.__SC2_REPORT__()};});
  const checkpoints=[];
  for(let elapsed=0;elapsed<sampleSeconds;){
    const seconds=Math.min(10,sampleSeconds-elapsed);
    await page.waitForTimeout(seconds*1000);elapsed+=seconds;
    const checkpoint=await page.evaluate(()=>({wall:performance.now(),frameIndex:window.__ordinaryOffline.frames.length,report:window.__SC2_REPORT__()}));
    checkpoints.push(checkpoint);
    if(checkpoint.report.phase!=='battle')break;
  }
  const finish=await page.evaluate(()=>{const sample=window.__ordinaryOffline;sample.done=true;return {wall:performance.now(),frames:sample.frames.slice(1),report:window.__SC2_REPORT__(),heap:performance.memory?.usedJSHeapSize};});
  await page.screenshot({path:`${output}/${race}-opening.png`});
  let previous={wall:start.wall,frameIndex:0};
  const windows=checkpoints.map(checkpoint=>{const count=checkpoint.frameIndex-previous.frameIndex,wallSeconds=(checkpoint.wall-previous.wall)/1000;const result={wallSeconds,fps:count/wallSeconds,stage:checkpoint.report.stage,phase:checkpoint.report.phase,simTime:checkpoint.report.time,backlog:checkpoint.report.simulationBacklogSeconds,drawCalls:checkpoint.report.drawCalls,triangles:checkpoint.report.triangles};previous=checkpoint;return result;});
  report.run={start:start.report,finish:finish.report,heap:finish.heap,wallSeconds:(finish.wall-start.wall)/1000,simulationSeconds:finish.report.time-start.report.time,backlogDelta:finish.report.simulationBacklogSeconds-start.report.simulationBacklogSeconds,deliveredFps:finish.frames.length/((finish.wall-start.wall)/1000),frameMs:summary(finish.frames),windows};
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);
  console.log(JSON.stringify({wall:report.run.wallSeconds,sim:report.run.simulationSeconds,debt:report.run.backlogDelta,fps:report.run.deliveredFps,frames:report.run.frameMs,windows,draws:finish.report.drawCalls,triangles:finish.report.triangles,errors:report.errors,requests:report.requests}));
  await context.close();
}catch(error){report.failure=String(error.stack??error);console.error(report.failure);process.exitCode=1;}
finally{await browser?.close();await fs.writeFile(`${output}/results.json`,JSON.stringify(report,null,2));}
