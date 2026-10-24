import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const run=process.argv[2]??'1',variant=process.argv[3]??'candidate-r1',folder='performance-l02-20261020-'+variant,root=path.resolve('reports/local/performance-l02-20261020',`lifecycle-${run}`);
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const hash=x=>createHash('sha256').update(x).digest('hex'),report={run,build:JSON.parse(await fs.readFile(`preview/${folder}/build-inputs.json`)),checks:[],screens:[],errors:[],failedRequests:[]};let context,page,phase='boot';
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
const shot=async name=>{const file=root+'/'+name+'.png';await page.screenshot({path:file});report.screens.push({name,file,sha256:hash(await fs.readFile(file))});await save();};
const state=()=>page.evaluate(()=>{const a=L02.app,w=a.world,v=a.view;return {trace:L02.lifecycleTrace,phase:w.phase,time:w.time,tick:w.tick,runId:w.runId,rng:w.rngState,paused:w.paused,combat:JSON.stringify({entities:[...w.entities],wallet:w.wallet,stats:w.stats,expedition:w.expedition,statuses:w.statuses.snapshot(),specials:w.enemySpecials.snapshot(),account:w.starship.account},(_key,value)=>value instanceof Map?{map:[...value]}:value instanceof Set?{set:[...value]}:value),epoch:v.contextEpoch,keys:[...v.gpu.keys()].sort(),warmed:v.screenWarmed.size,validated:v.validatedPrograms.size,errors:v.modelErrors,entryPreparation:v.entryPreparation,gate:a.readiness.state,background:window.__SC2_REPORT__().background};});
try{
 context=await chromium.launchPersistentContext(root+'/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1});page=context.pages()[0];page.setDefaultTimeout(60000);
 page.on('pageerror',e=>report.errors.push({phase,message:e.message}));page.on('console',m=>{if(m.type()==='error')report.errors.push({phase,message:m.text()});});page.on('requestfailed',r=>report.failedRequests.push({phase,url:r.url(),error:r.failure()?.errorText}));
 const served=[];page.on('response',r=>{if(new URL(r.url()).pathname.endsWith('/main.js'))served.push(r.body().then(b=>({url:r.url(),sha256:hash(b)})));});
 await page.goto(`http://127.0.0.1:4439/${folder}/`,{waitUntil:'domcontentloaded',timeout:180000});await page.waitForFunction(()=>window.L02?.app&&!document.getElementById('scs-opening-visual'),null,{timeout:180000});
 report.served=await Promise.all(served);assert.ok(report.served.some(s=>s.sha256===report.build.outputs.find(o=>o.file.endsWith('/main.js')).sha256));
 // Fail required native requests, then retry through the existing loading screen.
 phase='required-resource-failure';let blocked=true;
 await page.route('**/*.glb',route=>blocked?route.abort('failed'):route.continue());
 for(const action of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await page.locator(`[data-action=${action}]:visible`).click();
 await page.waitForFunction(()=>L02.app.readiness.state.phase==='error',null,{timeout:240000});const failed=await state();assert.equal(failed.phase,'menu');assert.equal(failed.time,0);await shot('required-resource-failure');report.checks.push({name:'native-failure-keeps-world-unstarted',state:failed});
 phase='retry';blocked=false;await page.unroute('**/*.glb');await page.locator('[data-action=flow-retry]').click();await page.waitForFunction(()=>L02.app.readiness.state.phase==='ready',null,{timeout:240000});await shot('retry-ready');
 const retry=await state();assert.equal(retry.errors.length,0);assert.equal(retry.time,0);assert.ok(retry.warmed>0);assert.ok(retry.validated>0);report.checks.push({name:'native-retry-full-ready',state:retry});
 await save();console.log(JSON.stringify({phase:'retry-ready',checks:report.checks.length}));
 // Force one real entrance to wait before its current-assets stage; cancel it and
 // queue another using the same real coordinator, without starting a World run.
 phase='cancel-queued';
 await page.evaluate(()=>{
  const a=L02.app;L02.cleanRequest={...a.readiness.last.request};L02.lifecycleTrace=[];a.readiness.cancel();const old=L02.savedCurrent=a.view.prepareCurrentAssets.bind(a.view);let first=true;
  a.view.prepareCurrentAssets=async(...args)=>{if(first){first=false;L02.oldStarted=true;L02.lifecycleTrace.push('old-started');await new Promise(resolve=>L02.releaseOld=resolve);L02.lifecycleTrace.push('old-released');}const result=await old(...args);L02.lifecycleTrace.push('old-current-completed');return result;};
  L02.firstPrepare=a.readiness.prepare('reinforcement');
 });await page.waitForFunction(()=>L02.oldStarted);
 console.log(JSON.stringify({phase:'old-started'}));
 const blockedState=await page.evaluate(async()=>{
  const bounded=(promise,label)=>{let timer;return Promise.race([promise,new Promise((_resolve,reject)=>timer=setTimeout(()=>reject(Error('fixture wait '+label+'; '+JSON.stringify(L02.lifecycleTrace))),45000))]).finally(()=>clearTimeout(timer));};
  const a=L02.app,control=a.view.preparationControl;a.readiness.cancel();L02.secondPrepare=a.readiness.prepare('new',{race:a.hud.menuRace,campaignMap:a.readiness.last.request.campaignMap});
  await new Promise(r=>setTimeout(r,100));const result={sameControl:a.view.preparationControl===control,entry:a.view.entryPreparation,phase:a.readiness.state.phase,worldTime:a.world.time};
  L02.lifecycleTrace.push('second-started');a.readiness.cancel();L02.lifecycleTrace.push('second-cancelled');await bounded(L02.secondPrepare,'second');L02.lifecycleTrace.push('second-finished');result.afterCancelEntry=a.view.entryPreparation;result.afterCancelSameControl=a.view.preparationControl===control;L02.releaseOld();await bounded(L02.firstPrepare,'first');L02.lifecycleTrace.push('first-finished');await new Promise(r=>setTimeout(r,0));a.view.prepareCurrentAssets=L02.savedCurrent;return {...result,trace:L02.lifecycleTrace};
 });assert.equal(blockedState.sameControl,true);assert.equal(blockedState.afterCancelSameControl,true);assert.equal(blockedState.afterCancelEntry,true);assert.equal(blockedState.worldTime,0);report.checks.push({name:'cancelled-queued-entrance-preserves-owner',...blockedState});
 await save();console.log(JSON.stringify({phase:'cancel-completed',trace:blockedState.trace}));
 // Reload for a clean ordinary renderer before exercising real context recovery.
 phase='clean-reload';await page.reload({waitUntil:'domcontentloaded',timeout:180000});await page.waitForFunction(()=>window.L02?.app&&!document.getElementById('scs-opening-visual'),null,{timeout:180000});
 for(const action of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await page.locator(`[data-action=${action}]:visible`).click();await page.waitForFunction(()=>L02.app.readiness.state.phase==='ready',null,{timeout:240000});
 console.log(JSON.stringify({phase:'clean-reload-ready'}));
 await page.evaluate(()=>{const a=L02.app,commit=a.hud.onCommitFlow;a.hud.onCommitFlow=()=>{commit();a.world.paused=true;a.hud.update();a.hud.onCommitFlow=commit;};});await page.locator('[data-action=flow-continue]').click();await shot('before-context-loss');const before=await state();
 phase='actual-context-loss';await page.evaluate(()=>{L02.contextExtension=L02.app.view.renderer.getContext().getExtension('WEBGL_lose_context');if(!L02.contextExtension)throw Error('No WEBGL_lose_context');L02.contextExtension.loseContext();});await page.waitForFunction(()=>L02.app.view.renderer.getContext().isContextLost());await shot('actual-context-loss');
 phase='actual-context-restore';await page.evaluate(()=>L02.contextExtension.restoreContext());await page.waitForFunction(()=>!L02.app.view.renderer.getContext().isContextLost()&&!L02.app.readiness.state.kind&&!L02.app.view.entryPreparation&&L02.app.view.screenWarmed.size>0,null,{timeout:180000});
 const after=await state();assert.equal(after.epoch,before.epoch+1);for(const key of ['phase','time','tick','runId','rng','paused','keys','combat'])assert.deepEqual(after[key],before[key],key);assert.equal(after.errors.length,0);assert.ok(after.warmed>0);await shot('after-context-restore');report.checks.push({name:'actual-WebGL-context-restore',before,after});
 phase='GPU-fence-timeout-fixture';
 const gpu=await page.evaluate(async()=>{
  const v=L02.app.view,gl=v.renderer.getContext(),wait=gl.clientWaitSync.bind(gl),remove=gl.deleteSync.bind(gl),now=performance.now.bind(performance);let calls=0,deleted=0;const start=now();let error='';
  gl.clientWaitSync=()=>gl.TIMEOUT_EXPIRED;gl.deleteSync=f=>{deleted++;return remove(f);};performance.now=()=>start+(calls++?31000:0);
  try{await v.waitForGpu();}catch(e){error=String(e);}finally{gl.clientWaitSync=wait;gl.deleteSync=remove;performance.now=now;}
  await v.waitForGpu();return {error,deleted,contextLost:gl.isContextLost()};
 });assert.match(gpu.error,/超时/);assert.equal(gpu.deleted,1);assert.equal(gpu.contextLost,false);report.checks.push({name:'fence-timeout-injected-clock-then-real-fence',...gpu});
 report.unexpectedErrors=report.errors.filter(e=>!['required-resource-failure','retry'].includes(e.phase));assert.deepEqual(report.unexpectedErrors,[]);report.pass=true;
}catch(e){report.failure=String(e.stack??e);if(page){report.failureState=await state().catch(error=>({error:String(error)}));await shot('failure').catch(()=>{});}process.exitCode=1;}
finally{await save();await context?.close();console.log(JSON.stringify({pass:report.pass,checks:report.checks.length,errors:report.errors.length,failure:report.failure}));}
