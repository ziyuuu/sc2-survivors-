import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
const mode=process.env.SC2_B02_MODE??'normal-terran',run=process.env.SC2_B02_RUN??mode+'-1',folder='performance-b02-20261019',root=path.resolve('reports/local',folder,run);
await fs.mkdir(root,{recursive:true});await fs.copyFile('tools/qa-performance-b02.mts',path.join(root,'runner.mts'));
const hash=(s:any)=>createHash('sha256').update(s).digest('hex');
const report:any={started:new Date().toISOString(),mode,run,build:JSON.parse(await fs.readFile('preview/'+folder+'/build-inputs.json','utf8')),host:{platform:os.platform(),release:os.release(),cpu:os.cpus()[0],logicalCpus:os.cpus().length,memoryBytes:os.totalmem()},samples:[],checkpoints:[],errors:[],requestFailures:[],method:mode.startsWith('normal')?'Native new run, empty account, normal rules and economy, automated public-action controller. Preparation steps accelerated in batches with native World.step and render; measurement uses real-time driver. Not a human or uninterrupted real-time campaign.':'Synthetic diagnostic construction, health lock and target HP overrides explicitly in fixture source; native simulation, combat, renderer and lifecycle. Not natural gameplay.'};
report.profile={path:path.resolve(process.env.SC2_B02_PROFILE??path.join(root,'profile')),reused:!!process.env.SC2_B02_PROFILE};
const context=await chromium.launchPersistentContext(report.profile.path,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1});
const page=context.pages()[0],assets=new Set<string>();page.setDefaultTimeout(120000);
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),failure:r.failure()}));page.on('response',r=>{const u=new URL(r.url()),at=u.pathname.indexOf('/assets/');if(at>=0)assets.add(decodeURIComponent(u.pathname.slice(at)));if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
await page.addInitScript('window.__name=(v)=>v;localStorage.setItem("sc2.renderQuality","native");localStorage.setItem("sc2.ordinaryEffects","full");localStorage.setItem("sc2.heroEffects","full");localStorage.setItem("sc2.animationMode","complete");');
const save=()=>fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));
const call=(method:string,args:any[]=[])=>page.evaluate(async({method,args})=>{const a=(window as any).__B02__,parts=method.split('.'),obj=parts.length===2?a[parts[0]]:a;return await obj[parts.at(-1)!](...args);},{method,args});
async function checkpoint(label:string,screen=false){const data=await call('checkpoint'),raw=await call('snapshot');await fs.writeFile(path.join(root,label+'.state.json'),raw);report.checkpoints.push({label,...data,snapshot:{file:label+'.state.json',sha256:hash(raw)}});if(screen)await page.screenshot({path:path.join(root,label+'.png')});await save();console.log(JSON.stringify({run,checkpoint:label,state:data.state}));return data;}
async function sample(label:string,live:boolean,ms=4000,instrumented=true){
 const frozenBefore=live?null:await call('snapshot');const before=await call('startMeasure',[instrumented,live]);await page.waitForTimeout(ms);const end=await call('stopMeasure');const frozenAfter=live?null:await call('snapshot');
 report.samples.push({label,live,instrumented,before,...end,frozenStateExact:live?null:frozenBefore===frozenAfter,wallMs:end.after.at-before.at,simulatedSeconds:end.after.time-before.time,backlogDelta:end.after.backlog-before.backlog,discardedDelta:end.after.discarded-before.discarded});await save();console.log(JSON.stringify({run,sample:label,frames:end.metrics.frames.length,sim:end.after.time-before.time,gpu:end.metrics.gpu.length}));
}
try{
 await page.goto(`http://127.0.0.1:4436/${folder}/`,{timeout:120000});await page.waitForFunction(()=>!!(window as any).__B02__,null,{timeout:180000});
 const race=mode.startsWith('normal-')?mode.slice(7):'terran';
 for(const selector of ['[data-action=menu-new]',`[data-action=menu-race][data-race=${race}]`,'[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(selector).click();
 for(let i=0;i<30;i++){try{await page.waitForFunction(()=>['ready','error'].includes((window as any).__B02__.readiness.state.phase),null,{timeout:15000});break;}catch{console.log(run+' loading '+i);}}
 await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>(window as any).__B02__.world.phase==='battle');await call('freeze');report.device=await call('device');
 if(mode.startsWith('normal-')){
  const initial=await call('initCampaign');report.initial=initial;if(initial.state.items!==0||initial.state.lock.enabled||initial.state.difficulty!=='normal')throw Error('Invalid natural-rule initial state');
  // Browser keyboard response is a separate measurement with controller disabled during input.
  report.input=await page.evaluate(async()=>{const a=(window as any).__B02__,w=a.world;return {before:{x:w.anchor.x,z:w.anchor.z},time:w.time,at:performance.now(),physical:false};});
  await page.keyboard.press('Escape');report.input.escape=await page.evaluate(()=>({paused:(window as any).__B02__.world.paused,at:performance.now(),dialogs:document.querySelector('#interface')?.textContent?.slice(0,300)}));await page.keyboard.press('Escape');
  for(let stage=1;stage<=3;stage++){
   await checkpoint(`stage-${stage}-begin`,stage===1);await sample(`stage-${stage}-quiet`,false,2500);
   await call('fast',[{untilCombat:true,maxTicks:1800,renderEvery:30}]);await checkpoint(`stage-${stage}-onset`);await sample(`stage-${stage}-combat-low`,true,4000,false);await sample(`stage-${stage}-combat-detail`,true,4000);
   await call('fast',[{untilStageElapsed:35,maxTicks:4800,renderEvery:30}]);await checkpoint(`stage-${stage}-sustain`,true);await sample(`stage-${stage}-sustain`,true,4000);
   await call('fast',[{untilReward:true,maxTicks:18000,renderEvery:30}]);const ended=await checkpoint(`stage-${stage}-end`,stage===3);if(ended.state.phase!=='reward')throw Error('Natural controller did not complete stage '+stage+': '+ended.state.phase);await sample(`stage-${stage}-end`,false,2500);if(stage<3)await call('nextStage');
  }
 }else{
  const cases=process.env.SC2_B02_CASES?process.env.SC2_B02_CASES.split(','):mode==='dense'?['melee-300','ranged-300']:mode==='lifecycle'?['medical','psionic']:mode==='special'?['random-elite','boss','main-hive']:mode==='equipment'?['carrier-attributes','carrier-equipment']:[mode];
  for(const name of cases){await call('fixtures.setup',[name]);await checkpoint(name+'-begin',true);await sample(name+'-begin',false,2500);await call('fast',[{ticks:60,renderEvery:4}]);await checkpoint(name+'-onset');await sample(name+'-onset',true,4000);
   await call('fast',[{ticks:name.includes('carrier')?1200:300,renderEvery:12}]);await checkpoint(name+'-sustain',true);await sample(name+'-sustain-low',true,4000,false);await sample(name+'-sustain',true,5000);
   if(name==='medical'){await call('fixtures.stop',['full-health']);await checkpoint(name+'-heal-stop');await call('fast',[{ticks:1200,renderEvery:30}]);await checkpoint(name+'-heal-ended',true);await sample(name+'-heal-ended',false,3000);await call('fixtures.redamage');await call('fast',[{ticks:60,renderEvery:4}]);await checkpoint(name+'-repeat');await sample(name+'-repeat',true,4000);await call('fixtures.stop',['sources-dead']);await checkpoint(name+'-sources-dead',true);}
   if(name==='psionic'){await call('fixtures.stop',['sources-dead']);await checkpoint(name+'-sources-dead',true);}
   await call('fixtures.stop',['all-combat']);await checkpoint(name+'-stop');await sample(name+'-ending',true,3000);await call('fast',[{ticks:2400,renderEvery:30}]);await checkpoint(name+'-ended',true);await sample(name+'-ended',false,3000);
  }
 }
 report.trace=await call('trace');report.passed=report.errors.length===0&&report.samples.every((s:any)=>s.metrics.frames.length>1&&s.before.visible&&s.after.visible&&Number.isFinite(s.after.time)&&s.discardedDelta===0)&&report.samples.filter((s:any)=>s.instrumented).every((s:any)=>s.metrics.gpu.length>0&&s.metrics.disjoint===0);
}catch(e){report.failure=String(e instanceof Error?e.stack:e);await page.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});console.error(report.failure);process.exitCode=1;}finally{report.finished=new Date().toISOString();await save();await context.close();const manifest=[];for(const url of [...assets].sort()){const file='public'+url;try{const b=await fs.readFile(file);manifest.push({url,file,bytes:b.length,sha256:hash(b)});}catch(e){manifest.push({url,file,error:String(e)});}}await fs.writeFile(path.join(root,'requested-assets.json'),JSON.stringify(manifest,null,2));report.assetManifest={count:manifest.length,sha256:hash(JSON.stringify(manifest))};await save();if(!report.passed)process.exitCode=1;}
