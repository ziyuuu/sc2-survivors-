import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {chromium} from '@playwright/test';
const stableCapture=process.env.SC2_STABLE_CAPTURE==='1';
const mode=process.argv[2]??'candidate',run=process.argv[3]??mode+'-1',revision=process.env.SC2_BATCH_REVISION??'',folder='performance-s07-20261020',root=path.resolve('reports/local',folder,run);await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const report={mode,run,build:JSON.parse(await fs.readFile('preview/'+folder+'-'+mode+revision+'/build-inputs.json')),samples:[],checkpoints:[],screens:[],errors:[],requests:[],scenarios:[]},hash=x=>createHash('sha256').update(x).digest('hex');
report.profile={path:process.env.SC2_X_PROFILE??root+'/profile',reused:!!process.env.SC2_X_PROFILE};
const attached=process.env.SC2_ATTACH_EXISTING==='1'?await chromium.connectOverCDP('http://127.0.0.1:9338'):null;const context=attached?attached.contexts()[0]:await chromium.launchPersistentContext(report.profile.path,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1,args:['--remote-debugging-port=9338']}),page=context.pages()[0];page.setDefaultTimeout(90000);
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('requestfailed',r=>report.requests.push({url:r.url(),error:r.failure()?.errorText}));
await page.addInitScript(()=>{for(const [k,v]of [['sc2.renderQuality','native'],['sc2.ordinaryEffects','full'],['sc2.heroEffects','full'],['sc2.animationMode','complete']])localStorage.setItem(k,v);});
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2)),call=(method,args=[])=>page.evaluate(async({method,args})=>{const a=window.__B02__,parts=method.split('.'),obj=parts.length===2?a[parts[0]]:a;return obj[parts.at(-1)](...args);},{method,args});
const shot=async name=>{const file=root+'/'+name+'.png',before=await call('snapshot');
 // The completed fixed scene is already drawn. Stop submitting identical WebGL frames while Chrome copies it.
 if(!stableCapture)await page.evaluate(()=>{const v=window.__B02__.view;window.__S07CaptureRender=v.render;v.render=()=>{};});
 try{await page.screenshot({path:file});}finally{await page.evaluate(()=>{const v=window.__B02__.view;v.render=window.__S07CaptureRender;delete window.__S07CaptureRender;});}
 assert.equal(await call('snapshot'),before);report.captureMethod=stableCapture?'Settle only the fixed camera with its production update(dt=100), render(dt=0,alpha=1), then suspend duplicate submissions before checkpoint and screenshot. No World advancement; restore render afterward.':'Copy the already-rendered fixed scene while temporarily suspending duplicate WebGL submissions; restore renderer before further steps or all timing windows.';
 report.screens.push({file,sha256:hash(await fs.readFile(file))});await save();};
const checkpoint=async name=>{
 if(stableCapture)await page.evaluate(()=>{const a=window.__B02__,v=a.view,w=a.world,before=a.snapshot();v.cameraController.update({x:w.anchor.x,y:v.ground(w.anchor),z:w.anchor.z},100,false);v.render(0,1);window.__S07CaptureRender=v.render;v.render=()=>{};if(a.snapshot()!==before)throw Error('Camera settling changed World');});
 const state=await call('snapshot'),data=await call('checkpoint'),heap=await page.evaluate(()=>performance.memory?.usedJSHeapSize??null);await fs.writeFile(root+'/'+name+'.state.json',state);report.checkpoints.push({name,...data,heap,stateFile:name+'.state.json',sha256:hash(state)});await save();};
try{
 if(!attached){await page.goto('http://127.0.0.1:4436/'+folder+'-'+mode+revision+'/',{timeout:120000});await page.waitForFunction(()=>window.__S07__,null,{timeout:180000});
 for(const s of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(s).click();
 const start=Date.now();report.loadingProgress=[];let last='';while(true){const state=await page.evaluate(()=>({at:performance.now(),...window.__B02__.readiness.state,pending:window.__B02__.view.assetsPending}));report.loadingProgress.push(state);await save();const key=state.phase+':'+state.label+':'+state.done;if(key!==last){console.log('Loading '+state.phase+' '+state.label+' '+state.done+'/'+state.total);last=key;}if(state.phase==='ready')break;if(state.phase==='error')throw Error(state.error);if(Date.now()-start>600000)throw Error('Required loading timeout, progress retained');await page.waitForTimeout(5000);}
 await page.locator('[data-action=flow-continue]').click();await call('freeze');report.device=await call('device');console.log('Ready '+run);}else{await call('freeze');report.device=await call('device');report.attachedFrom='Retained S07 browser; every fixture reset before formal checkpoints';}

 for(const name of ['dense','elites','traversal','baneling','temporary']){
  const initial=await page.evaluate(name=>window.__S07__.setup(name),name);report.scenarios.push({name,initial});
  if(name==='dense')assert.equal(initial.enemies,300);
  await checkpoint(name+'-initial');await shot(name+'-initial');
  const ticks=name==='baneling'||name==='temporary'?900:name==='elites'?360:120;
  const end=await page.evaluate(ticks=>window.__S07__.advance(ticks),ticks);report.scenarios.at(-1).end=end;
  if(name==='temporary'){assert.equal(end.source.shots,1);assert.ok(end.source.hp<=0);}
  if(name==='baneling')assert.ok(end.source.shots>=2);
  if(name==='elites')assert.ok(end.friends.every(u=>u.shots>0));
  if(name==='traversal')assert.ok(end.friends.some((u,i)=>Math.hypot(u.x-initial.friends[i].x,u.z-initial.friends[i].z)>1));
  await checkpoint(name+'-end');await shot(name+'-end');console.log('Verified '+name+' '+ticks+' ticks');
 }
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);console.error(e);await page.screenshot({path:root+'/failure.png'}).catch(()=>{});process.exitCode=1;}finally{await save();if(process.exitCode&&process.env.SC2_DEBUG_HOLD==='1'){console.log('Retaining failed browser for bounded diagnosis on port 9338');for(let i=0;i<600;i++){if(await fs.stat(root+'/close').catch(()=>null))break;await new Promise(r=>setTimeout(r,1000));}}await context.close();}
console.log(JSON.stringify({mode,run,pass:report.pass,errors:report.errors,requests:report.requests.length}));
