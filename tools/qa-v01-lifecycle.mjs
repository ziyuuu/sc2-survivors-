import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {browserRun} from './v01-browser-helper.mjs';
const run=process.argv[2]??'lifecycle-r1',env=await browserRun(run,'Current unified production inputs. Actual HTTP failure/retry, cancelled queued preparation and late callback, real WebGL context loss/restore. Controlled boundary checks, not performance or natural gameplay.');
const {root,report,page,context,base,save,shot}=env;await fs.copyFile(import.meta.filename,root+'/runner.mjs');let phase='boot';env.setPhase(phase);
const state=()=>page.evaluate(()=>{const a=A03.app,w=a.world,v=a.view;return {trace:A03.lifecycleTrace,phase:w.phase,time:w.time,tick:w.tick,runId:w.runId,rng:w.rngState,paused:w.paused,combat:JSON.stringify({entities:[...w.entities],wallet:w.wallet,stats:w.stats,expedition:w.expedition,statuses:w.statuses.snapshot(),specials:w.enemySpecials.snapshot(),account:w.starship.account},(_key,value)=>_key==='notice'||_key==='noticeUntil'?undefined:value instanceof Map?{map:[...value]}:value instanceof Set?{set:[...value]}:value),epoch:v.contextEpoch,keys:[...v.gpu.keys()].sort(),warmed:v.screenWarmed.size,validated:v.validatedPrograms.size,errors:v.modelErrors,entryPreparation:v.entryPreparation,gate:a.readiness.state,background:window.__SC2_REPORT__().background};});

try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:180000});await page.waitForFunction(()=>window.A03?.app&&!document.getElementById('scs-opening-visual'),null,{timeout:180000});
 // Fail required native requests, then retry through the existing loading screen.
 phase='required-resource-failure';env.setPhase(phase);let blocked=true;
 await page.route('**/*.glb',route=>blocked?route.abort('failed'):route.continue());
 for(const action of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await page.locator(`[data-action=${action}]:visible`).click();
 await page.waitForFunction(()=>A03.app.readiness.state.phase==='error',null,{timeout:240000});const failed=await state();assert.equal(failed.phase,'menu');assert.equal(failed.time,0);await shot('required-resource-failure');report.checks.push({name:'native-failure-keeps-world-unstarted',state:failed});
 phase='retry';env.setPhase(phase);blocked=false;await page.unroute('**/*.glb');await page.locator('[data-action=flow-retry]').click();await page.waitForFunction(()=>A03.app.readiness.state.phase==='ready',null,{timeout:240000});await shot('retry-ready');
 const retry=await state();assert.equal(retry.errors.length,0);assert.equal(retry.time,0);assert.ok(retry.warmed>0);assert.ok(retry.validated>0);report.checks.push({name:'native-retry-full-ready',state:retry});
 await save();console.log(JSON.stringify({phase:'retry-ready',checks:report.checks.length}));
 // Force one real entrance to wait before its current-assets stage; cancel it and
 // queue another using the same real coordinator, without starting a World run.
 phase='cancel-queued';env.setPhase(phase);
 await page.evaluate(()=>{
  const a=A03.app;A03.cleanRequest={...a.readiness.last.request};A03.lifecycleTrace=[];a.readiness.cancel();const old=A03.savedCurrent=a.view.prepareCurrentAssets.bind(a.view);let first=true;
  a.view.prepareCurrentAssets=async(...args)=>{if(first){first=false;A03.oldStarted=true;A03.lifecycleTrace.push('old-started');await new Promise(resolve=>A03.releaseOld=resolve);A03.lifecycleTrace.push('old-released');}const result=await old(...args);A03.lifecycleTrace.push('old-current-completed');return result;};
  A03.firstPrepare=a.readiness.prepare('reinforcement');
 });await page.waitForFunction(()=>A03.oldStarted);
 console.log(JSON.stringify({phase:'old-started'}));
 const blockedState=await page.evaluate(async()=>{
  const bounded=(promise,label)=>{let timer;return Promise.race([promise,new Promise((_resolve,reject)=>timer=setTimeout(()=>reject(Error('fixture wait '+label+'; '+JSON.stringify(A03.lifecycleTrace))),45000))]).finally(()=>clearTimeout(timer));};
  const a=A03.app,control=a.view.preparationControl;a.readiness.cancel();A03.secondPrepare=a.readiness.prepare('new',{race:a.hud.menuRace,campaignMap:a.readiness.last.request.campaignMap});
  await new Promise(r=>setTimeout(r,100));const result={sameControl:a.view.preparationControl===control,entry:a.view.entryPreparation,phase:a.readiness.state.phase,worldTime:a.world.time};
  A03.lifecycleTrace.push('second-started');a.readiness.cancel();A03.lifecycleTrace.push('second-cancelled');await bounded(A03.secondPrepare,'second');A03.lifecycleTrace.push('second-finished');result.afterCancelEntry=a.view.entryPreparation;result.afterCancelSameControl=a.view.preparationControl===control;A03.releaseOld();await bounded(A03.firstPrepare,'first');A03.lifecycleTrace.push('first-finished');await new Promise(r=>setTimeout(r,0));a.view.prepareCurrentAssets=A03.savedCurrent;return {...result,trace:A03.lifecycleTrace};
 });assert.equal(blockedState.sameControl,true);assert.equal(blockedState.afterCancelSameControl,true);assert.equal(blockedState.afterCancelEntry,true);assert.equal(blockedState.worldTime,0);report.checks.push({name:'cancelled-queued-entrance-preserves-owner',...blockedState});
 await save();console.log(JSON.stringify({phase:'cancel-completed',trace:blockedState.trace}));
 // Reload for a clean ordinary renderer before exercising real context recovery.
 phase='clean-reload';env.setPhase(phase);await page.reload({waitUntil:'domcontentloaded',timeout:180000});await page.waitForFunction(()=>window.A03?.app&&!document.getElementById('scs-opening-visual'),null,{timeout:180000});
 for(const action of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await page.locator(`[data-action=${action}]:visible`).click();await page.waitForFunction(()=>A03.app.readiness.state.phase==='ready',null,{timeout:240000});
 console.log(JSON.stringify({phase:'clean-reload-ready'}));
 await page.evaluate(()=>{const a=A03.app,commit=a.hud.onCommitFlow;a.hud.onCommitFlow=async()=>{await commit();a.world.paused=true;a.hud.update();a.hud.onCommitFlow=commit;};});await page.locator('[data-action=flow-continue]').click();await shot('before-context-loss');const before=await state();
 phase='actual-context-loss';env.setPhase(phase);await page.evaluate(()=>{A03.contextExtension=A03.app.view.renderer.getContext().getExtension('WEBGL_lose_context');if(!A03.contextExtension)throw Error('No WEBGL_lose_context');A03.contextExtension.loseContext();});await page.waitForFunction(()=>A03.app.view.renderer.getContext().isContextLost());await shot('actual-context-loss');
 phase='actual-context-restore';env.setPhase(phase);await page.evaluate(()=>A03.contextExtension.restoreContext());await page.waitForFunction(()=>!A03.app.view.renderer.getContext().isContextLost()&&!A03.app.readiness.state.kind&&!A03.app.view.entryPreparation&&A03.app.view.screenWarmed.size>0,null,{timeout:180000});
 const after=await state();assert.equal(after.epoch,before.epoch+1);for(const key of ['phase','time','tick','runId','rng','paused','keys','combat'])assert.deepEqual(after[key],before[key],key);assert.equal(after.errors.length,0);assert.ok(after.warmed>0);await shot('after-context-restore');report.checks.push({name:'actual-WebGL-context-restore',before,after});

 report.unexpectedErrors=report.errors.filter(e=>!['required-resource-failure','retry'].includes(e.phase));assert.deepEqual(report.unexpectedErrors,[]);report.pass=true;
}catch(e){report.failure=String(e.stack??e);report.failureState=await state().catch(error=>({error:String(error)}));await shot('failure').catch(()=>{});process.exitCode=1;}
finally{await env.close();}
