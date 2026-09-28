import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import {createHash} from 'node:crypto';

const arg=(name,fallback)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:fallback;
const seconds=Number(arg('--seconds','200')),repeat=Number(arg('--repeat','1'));
const races=arg('--races','terran,zerg,protoss').split(','),mode=arg('--mode','complete');
const out=arg('--output','reports/local/autonomous-performance');
const profile=process.argv.includes('--profile');
if(!Number.isFinite(seconds)||seconds<10||seconds>2000||!Number.isInteger(repeat)||repeat<1||repeat>3||races.some(r=>!['terran','zerg','protoss'].includes(r))||!['complete','energy-saving'].includes(mode)||!/^reports\/local\/[a-z0-9-]+$/.test(out))throw Error('Invalid arguments');
await fs.mkdir(out,{recursive:true});
const stats=a=>{const s=[...a].sort((a,b)=>a-b),q=p=>s[Math.min(s.length-1,Math.floor(s.length*p))]??null;return {count:s.length,p50:q(.5),p95:q(.95),p99:q(.99),max:s.at(-1)??null,over20:s.filter(x=>x>20).length,over20Percent:s.length?s.filter(x=>x>20).length/s.length*100:null};};
const report={at:new Date().toISOString(),method:'Visible Chrome 1440x900 DPR1, menu-created Normal zero-talent seed89241. Public-action controller, real 60Hz app driver; UI Continue uses resource coordinator. No grants, stat edits, manual World stepping or excluded first ten seconds. First development window has no premarked target, unlike headless matrix. Render timings are battle-only; longTasksAllPhases includes loading. Transition frames are separately retained. Segment debt is sampled before transitions, not proof that driver reset loses no debt. Failed early runs are incomplete stage coverage, not campaign acceptance.',host:{cpu:os.cpus()[0]?.model,ram:os.totalmem()},mode,seconds,repeat,cpuProfile:profile,controllerSHA256:createHash('sha256').update(await fs.readFile('tools/qa-campaign-controller.ts')).digest('hex'),runs:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false,args:['--enable-precise-memory-info']});
report.chrome=browser.version();
try{
 for(const race of races)for(let trial=1;trial<=repeat;trial++){
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  await context.addInitScript(mode=>localStorage.setItem('sc2.animationMode',mode),mode);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const cdp=profile?await context.newCDPSession(page):null;
  await page.goto('http://127.0.0.1:5173');
  await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
  for(const selector of ['[data-action=menu-new]',`[data-action=menu-race][data-race=${race}]`,'[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(selector).click();
  await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});
  await page.evaluate(async race=>{
   const {createCampaignController,BUILDS}=await import('/tools/qa-campaign-controller.ts');
   const {writeArchive}=await import('/src/persistence/archive.ts');
   const {world:w,view:v}=window.__SC2_DEBUG__;
   const p=window.__autonomousPerf={frames:[],steps:[],renders:[],spikes:[],longTasks:[],transitions:[],segments:[],segment:null,stages:{},last:0,lastStage:0,lastElapsed:0,nextThink:0,done:false,started:0,peakEntities:0,peakBodies:0,peakDrawCalls:0,maxDebt:0,controller:null,error:null};
   // Menu-created RunConfig is never replaced just to seed a controller target.
   // Unlike the headless matrix, its first development window has no premarked target.
   const startController=()=>{if(!p.controller){p.controller=createCampaignController(w,BUILDS.find(b=>b.race===race),undefined,{advanceIntermission:false});p.controller.configure();}};
   p.exportCheckpoint=()=>({archive:writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()}),config:w.runConfig,stage:w.stage,phase:w.phase,events:p.controller?.events??[]});
   const active=()=>w.phase==='battle'&&!w.paused&&!w.requiresPlayerDecision&&!window.__SC2_REPORT__().readiness.kind&&!v.assetsPending;
   const step=w.step.bind(w),render=v.render.bind(v);
   w.step=(...a)=>{const start=performance.now();try{if(w.phase==='battle'){startController();if(w.time>=p.nextThink){p.controller.think();p.nextThink=w.time+.25;}}return step(...a);}catch(e){p.error=String(e.stack??e);throw e;}finally{p.steps.push(performance.now()-start);}};
   v.render=(...a)=>{const start=performance.now(),battle=p.started&&active();try{return render(...a);}finally{if(battle)p.renders.push(performance.now()-start);}};
   new PerformanceObserver(list=>{if(!p.done&&p.started)for(const e of list.getEntries())if(e.startTime>=p.started)p.longTasks.push({at:e.startTime-p.started,ms:e.duration});}).observe({entryTypes:['longtask']});
   const frame=now=>{
    if(p.started&&!p.done){
     const r=window.__SC2_REPORT__();
     p.peakEntities=Math.max(p.peakEntities,w.entities.size);p.peakBodies=Math.max(p.peakBodies,w.allies().length);p.peakDrawCalls=Math.max(p.peakDrawCalls,v.renderer.info.render.calls);p.maxDebt=Math.max(p.maxDebt,r.simulationBacklogSeconds);
     if(active()){
      const s=p.stages[w.stage]??={frames:[],first10:[],startTime:w.time,endTime:w.time};s.endTime=w.time;
      if(!p.segment){p.segment={stage:w.stage,startWall:now,startTime:w.time,startDebt:r.simulationBacklogSeconds,endWall:now,endTime:w.time,endDebt:r.simulationBacklogSeconds,maxDebt:r.simulationBacklogSeconds};p.segments.push(p.segment);}
      Object.assign(p.segment,{endWall:now,endTime:w.time,endDebt:r.simulationBacklogSeconds,maxDebt:Math.max(p.segment.maxDebt,r.simulationBacklogSeconds)});
      if(p.last){const dt=now-p.last;p.frames.push(dt);s.frames.push(dt);if(p.lastElapsed<10)s.first10.push(dt);if(dt>20)p.spikes.push({at:now-p.started,dt,stage:w.stage,elapsed:w.stageElapsed,entities:w.entities.size});}p.last=now;p.lastStage=w.stage;p.lastElapsed=w.stageElapsed;
     }else{
      if(p.last)p.transitions.push({at:now-p.started,dt:now-p.last,fromStage:p.lastStage,fromElapsed:p.lastElapsed,toPhase:w.phase,assetsPending:v.assetsPending,decision:w.requiresPlayerDecision});
      if(p.segment)p.segment.endedByTransition=true;
      p.last=0;p.segment=null;
     }
     if(!r.readiness.kind&&!v.assetsPending){try{if(w.phase==='battle'){startController();p.controller.decisions();}else if(w.phase==='reward'){startController();p.controller.intermission();}}catch(e){p.error=String(e.stack??e);p.done=true;}}
    }
    if(!p.done)requestAnimationFrame(frame);
   };requestAnimationFrame(frame);
  },race);
  await page.evaluate(()=>{window.__autonomousPerf.started=performance.now();});
  if(cdp){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
  await page.locator('[data-action=flow-continue]').click();
  const start=Date.now(),savedStages=new Set();
  while(Date.now()-start<seconds*1000){
   const r=await page.evaluate(()=>({phase:window.__SC2_REPORT__().phase,ready:window.__SC2_REPORT__().readiness,error:window.__autonomousPerf.error}));
   if(r.error)throw Error(r.error);
   if(['lost','won'].includes(r.phase))break;
   if(r.ready.phase==='error')throw Error(r.ready.error);
   if(r.ready.phase==='ready')await page.locator('[data-action=flow-continue]').click();
   else if(r.phase==='reward'&&!r.ready.kind){
    const checkpoint=await page.evaluate(()=>{const w=window.__SC2_DEBUG__.world;return [3,9,15,18].includes(w.stage)?window.__autonomousPerf.exportCheckpoint():null;});
    if(checkpoint&&!savedStages.has(checkpoint.stage)){
     savedStages.add(checkpoint.stage);const file=out+`/${race}-${trial}-reward-${checkpoint.stage}.json`;
     await fs.writeFile(file,checkpoint.archive);
     await fs.writeFile(file+'.provenance.json',JSON.stringify({method:report.method,controllerSHA256:report.controllerSHA256,config:checkpoint.config,stage:checkpoint.stage,phase:checkpoint.phase,archiveSHA256:createHash('sha256').update(checkpoint.archive).digest('hex'),historySHA256:createHash('sha256').update(JSON.stringify(checkpoint.events)).digest('hex')},null,2));
    }
    const next=page.locator('[data-action=skip]');if(await next.count())await next.click();
   }
   await page.waitForTimeout(250);
  }
  const data=await page.evaluate(()=>{const p=window.__autonomousPerf,{world:w,view:v}=window.__SC2_DEBUG__,gl=v.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');p.done=true;return {phase:w.phase,stage:w.stage,time:w.time,frames:p.frames,steps:p.steps,renders:p.renders,stages:p.stages,spikes:p.spikes,longTasksAllPhases:p.longTasks,transitions:p.transitions,segments:p.segments,peakEntities:p.peakEntities,peakBodies:p.peakBodies,peakDrawCalls:p.peakDrawCalls,maxDebt:p.maxDebt,finalDebt:window.__SC2_REPORT__().simulationBacklogSeconds,effectsDropped:v.fx.stats.dropped,heap:performance.memory?.usedJSHeapSize,events:p.controller?.events,error:p.error,gpu:gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER)};});
  const run={race,trial,...data,frames:stats(data.frames),steps:stats(data.steps),renders:stats(data.renders),stages:Object.fromEntries(Object.entries(data.stages).map(([k,s])=>[k,{...s,frames:stats(s.frames),first10:stats(s.first10)}])),errors};
  if(cdp){const {profile:cpu}=await cdp.send('Profiler.stop');await fs.writeFile(out+`/${race}-${trial}-cpu.json`,JSON.stringify(cpu));await cdp.send('Profiler.disable');}
  report.runs.push(run);await fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({race,trial,phase:run.phase,stage:run.stage,time:run.time,frames:run.frames,maxDebt:run.maxDebt,errors}));
  await context.close();
 }
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;console.error(report.failure);}
finally{await fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));await browser.close();}
