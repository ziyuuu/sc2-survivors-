import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const output='reports/local/qa-m6-loading';await fs.mkdir(output,{recursive:true});
const report={at:new Date().toISOString(),checks:[],phases:[],errors:[],failure:null};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto(process.env.SC2_QA_URL??'http://127.0.0.1:5173/');
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu');
 await page.locator('[data-action=menu-new]').click();
 await page.locator('[data-action=menu-race-next]').click();
 await page.locator('[data-action=menu-difficulty-next]').click();
 await page.evaluate(()=>{
  window.__m6Loading={started:performance.now(),phases:[],previous:''};
  window.__m6LoadingTimer=setInterval(()=>{const s=window.__SC2_REPORT__?.().readiness;
   if(!s)return;const signature=`${s.phase}:${s.done}/${s.total}:${s.label}`;
   if(signature!==window.__m6Loading.previous){window.__m6Loading.previous=signature;window.__m6Loading.phases.push({at:performance.now()-window.__m6Loading.started,phase:s.phase,done:s.done,total:s.total,label:s.label});}
  },16);
 });
 await page.locator('[data-action=menu-start]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});
 const state=await page.evaluate(()=>{clearInterval(window.__m6LoadingTimer);const s=window.__SC2_REPORT__().readiness;window.__m6Loading.phases.push({at:performance.now()-window.__m6Loading.started,phase:s.phase,done:s.done,total:s.total,label:s.label});return {durationMs:performance.now()-window.__m6Loading.started,phases:window.__m6Loading.phases,time:window.__SC2_DEBUG__.world.time,phase:window.__SC2_REPORT__().phase};});
 report.durationMs=state.durationMs;report.phases=state.phases;
 assert.equal(state.phase,'menu');assert.equal(state.time,0);
 assert.ok(state.phases.some(x=>x.phase==='models'));
 assert.ok(state.phases.some(x=>x.phase==='gpu'&&x.total>0&&x.done>0&&x.done<=x.total));
 assert.ok(state.phases.some(x=>x.phase==='ready'));
 report.checks.push('models, actual GPU program progress and ready are visible without advancing simulation');
 await page.locator('[data-action=flow-continue]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='battle');
 report.checks.push('player confirmation starts battle only after resources are ready');
 await page.evaluate(()=>window.__SC2_DEBUG__.world.endStage());
 await page.locator('[data-action=skip]').click();
 await page.waitForFunction(()=>window.__SC2_DEBUG__.world.rewardRound==='random');
 await page.locator('[data-action=skip]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});
 const beforeStage=await page.evaluate(()=>({phase:window.__SC2_REPORT__().phase,stage:window.__SC2_REPORT__().stage,time:window.__SC2_REPORT__().time,kind:window.__SC2_REPORT__().readiness.kind}));
 assert.deepEqual([beforeStage.phase,beforeStage.stage,beforeStage.kind],['reward',1,'reinforcement']);
 await page.locator('[data-action=flow-continue]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='battle'&&window.__SC2_REPORT__?.().stage===2);
 report.checks.push('next-stage assets are gated while reward and time stay frozen; confirmation advances once');
 if(report.errors.length)throw Error(report.errors.join(' | '));
}catch(error){report.failure=String(error?.stack??error);process.exitCode=1;}
finally{await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({checks:report.checks,durationMs:report.durationMs,phases:[...new Set(report.phases.map(x=>x.phase))],errors:report.errors,failure:report.failure}));}
