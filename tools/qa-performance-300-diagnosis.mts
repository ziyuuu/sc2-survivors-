import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root=path.resolve(process.env.SC2_QA_DIR??'reports/local/performance-300-20261016/browser-r1');
const followup=process.env.SC2_QA_FOLLOWUP==='1';
await fs.mkdir(root,{recursive:true});
const report:any={started:new Date().toISOString(),method:'Native 300-enemy diagnostic fixture; independent Chrome, unchanged delivered bundle. CPU spans are inclusive. GPU queries are asynchronous and separate from the native baseline. Frozen one-factor ablations diagnose costs only, not proposed quality reductions.',samples:[],errors:[]};
report.build=JSON.parse(await fs.readFile('preview/difficulty-r2-20261016/build-inputs.json','utf8'));
report.bundleSha256=createHash('sha256').update(await fs.readFile('preview/difficulty-r2-20261016/main.js')).digest('hex');
const context=await chromium.launchPersistentContext(path.join(root,'profile'),{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1});
const page=context.pages()[0];page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
await page.addInitScript('window.__name = (value) => value;');
const cdp=await context.newCDPSession(page);
async function save(){await fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));}
async function sample(label:string,ms:number,gpu=false,profile=false){
 if(profile){await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');}
 const before=await page.evaluate(({gpu})=>{const d=(window as any).__P300__;d.start(gpu);return d.state();},{gpu});
 await page.waitForTimeout(ms);
 const after=await page.evaluate(()=>{const d=(window as any).__P300__;const result={state:d.state(),metrics:d.stop()};return result;});
 if(profile){const {profile:cpu}=await cdp.send('Profiler.stop');await fs.writeFile(path.join(root,label+'.cpuprofile'),JSON.stringify(cpu));await cdp.send('Profiler.disable');}
 const item={label,before,...after,wallMs:after.state.at-before.at,simulatedSeconds:after.state.time-before.time};report.samples.push(item);await save();
 console.log(JSON.stringify({label,wallMs:item.wallMs,sim:item.simulatedSeconds,fps:after.metrics.frames.length*1000/item.wallMs,enemies:after.state.enemies,debt:after.state.backlog,metrics:after.metrics.summary}));
}
try{
 await page.goto('http://127.0.0.1:4406/?gear=3',{timeout:120000});await page.waitForFunction(()=>!!(window as any).__DIFFICULTY_R2__,null,{timeout:180000});
 for(const selector of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(selector).click();
 for(let n=0;n<24;n++){try{await page.waitForFunction(()=>['ready','error'].includes((window as any).__DIFFICULTY_R2__.readiness.state.phase),null,{timeout:20000});break;}catch{console.log('Preparing original assets '+(n+1));}}
 await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>(window as any).__DIFFICULTY_R2__.world.phase==='battle');
 await page.evaluate(async()=>{const a=(window as any).__DIFFICULTY_R2__;await a.jump(18,'hell',true);a.focus();a.world.paused=false;a.world.changed();});
 report.device=await page.evaluate(()=>{const a=(window as any).__DIFFICULTY_R2__,gl=a.view.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return {userAgent:navigator.userAgent,renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),visible:!document.hidden,focus:document.hasFocus(),dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],timerQuery:!!gl.getExtension('EXT_disjoint_timer_query_webgl2')};});
 if(followup){
  const before=await page.evaluate(()=>{const a=(window as any).__DIFFICULTY_R2__;a.clearFrames();a.play();return {at:performance.now(),time:a.world.time,tick:a.world.tick};});
  await page.waitForTimeout(10000);
  report.uninstrumented=await page.evaluate((before)=>{const a=(window as any).__DIFFICULTY_R2__,after={at:performance.now(),time:a.world.time,tick:a.world.tick,backlog:a.driver.accumulator,frames:[...a.frames],enemies:a.summary().enemies};a.freeze();return {before,after,wallMs:after.at-before.at,simulatedSeconds:after.time-before.time};},before);
  await save();console.log('Uninstrumented native sample saved');
 }
 await page.evaluate(()=>{
  const a=(window as any).__DIFFICULTY_R2__,w=a.world,v=a.view,gl=v.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  let active=false,useGpu=false,current:any=null,last=0,sequence=0,queryActive=false,disjoint=0;let records:any[]=[],gpuRecords:any[]=[],pending:any[]=[];
  const totals:any={};
  const stat=(key:string,ms:number)=>{if(!active)return;const t=totals[key]??(totals[key]={calls:0,ms:0,max:0});t.calls++;t.ms+=ms;t.max=Math.max(t.max,ms);if(current)current.cpu[key]=(current.cpu[key]??0)+ms;};
  const poll=()=>{if(!ext||!pending.length)return;if(gl.getParameter(ext.GPU_DISJOINT_EXT)){disjoint++;for(const p of pending)gl.deleteQuery(p.q);pending=[];return;}pending=pending.filter(p=>{if(!gl.getQueryParameter(p.q,gl.QUERY_RESULT_AVAILABLE))return true;const ms=gl.getQueryParameter(p.q,gl.QUERY_RESULT)/1e6;gpuRecords.push({frame:p.frame,key:p.key,ms});gl.deleteQuery(p.q);return false;});};
  const wrap=(obj:any,key:string,name:string,gpu=false)=>{if(typeof obj?.[key]!=='function')return;const original=obj[key];obj[key]=function(...args:any[]){if(!active)return original.apply(this,args);const start=performance.now();let q:any=null;if(useGpu&&gpu&&ext&&!queryActive){q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);queryActive=true;}try{return original.apply(this,args);}finally{if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);queryActive=false;pending.push({q,key:name,frame:sequence});}stat(name,performance.now()-start);}};};
  wrap(w,'step','simulation.step');wrap(a.driver,'advance','simulation.advance');wrap(v,'prepareRosterAssets','assets.roster');wrap(a.hud,'afterRender','hud.afterRender');wrap(a.hud,'update','hud.update');
  for(const [key,method]of [['sourceCombatEffects','render'],['nonHeroEffects','render'],['protossEliteEffects','render'],['zergEliteEffects','render'],['terranEliteEffects','render'],['eliteSupportEffects','render'],['confirmedHeroes','render'],['zergHeroes','render'],['protossHeroes','render'],['fx','render'],['healthBars','end'],['friendlyLabels','update'],['equipmentDrops','render'],['cameraController','update'],['mapView','updateEnvironment']]as const)wrap(v[key],method,'view.'+key);
  wrap(v.sceneShadows,'prepare','view.shadowPrepare');wrap(v.contact,'render','draw.contact',true);wrap(v,'renderScene','view.renderScene');
  for(const [i,pass]of v.heroComposer.passes.entries())wrap(pass,'render','draw.pass'+i+'.'+pass.constructor.name,true);
  for(const [key,obj]of [['contacts',w.contacts],['hash',w.hash],['navigation',w.navigation]]as const)for(const method of ['resolve','rebuild','update'])wrap(obj,method,'simulation.'+key+'.'+method);
  const originalRender=v.render;v.renderer.info.autoReset=false;
  v.render=function(...args:any[]){if(!active)return originalRender.apply(this,args);poll();const now=performance.now();if(current){current.end=now;records.push(current);}sequence++;current={frame:sequence,at:now,interval:last?now-last:null,cpu:{},steps:a.driver.lastSteps,backlog:a.driver.accumulator,uploads:{calls:0,bytes:0},draw:{}};last=now;v.renderer.info.reset();const start=performance.now();const result=originalRender.apply(this,args);stat('view.render',performance.now()-start);current.draw={...v.renderer.info.render};return result;};
  for(const name of ['texImage2D','texSubImage2D']as const){const original=gl[name].bind(gl);gl[name]=(...args:any[])=>{if(active&&current){current.uploads.calls++;const width=typeof args[4]==='number'?args[4]:0,height=typeof args[5]==='number'?args[5]:0,format=name==='texSubImage2D'?args[6]:args[6],type=args[7];const components=format===gl.RGBA?4:format===gl.RGB?3:format===gl.RG?2:1,bytes=type===gl.FLOAT||type===gl.UNSIGNED_INT?4:type===gl.HALF_FLOAT||type===gl.UNSIGNED_SHORT?2:1;if(name==='texSubImage2D')current.uploads.bytes+=width*height*components*bytes;else{const data=args.find((x:any)=>ArrayBuffer.isView(x));current.uploads.bytes+=data?.byteLength??0;}}return original(...args);};}
  const state=()=>({at:performance.now(),time:w.time,tick:w.tick,rng:w.rngState,backlog:a.driver.accumulator,discard:a.driver.discardedBacklogSeconds,phase:w.phase,decision:w.requiresPlayerDecision,assetsPending:v.assetsPending,enemies:[...w.entities.values()].filter((u:any)=>u.owner==='zerg'&&u.hp>0).length,queue:w.ambientBacklog.length,entities:w.entities.size,visible:!document.hidden,focus:document.hasFocus()});
  const frozenState=()=>JSON.stringify({time:w.time,tick:w.tick,rng:w.rngState,units:[...w.entities.values()].map((u:any)=>[u.id,u.x,u.z,u.hp,u.action]),flights:w.weaponFlights,effects:w.effects,visual:w.visualEvents});
  const start=(gpu:boolean)=>{active=false;for(const p of pending)gl.deleteQuery(p.q);pending=[];records=[];gpuRecords=[];current=null;last=0;sequence=0;disjoint=0;for(const key of Object.keys(totals))delete totals[key];useGpu=gpu;active=true;};
  const stop=()=>{poll();active=false;if(current){current.end=performance.now();records.push(current);current=null;}return {frames:records,gpu:gpuRecords,disjoint,pendingQueries:pending.length,summary:totals};};
  (window as any).__P300__={start,stop,state,frozenState,originalRender,setActive:(value:boolean)=>{active=value;},setGpu:(value:boolean)=>{useGpu=value;}};
 });
 if(followup){
  await page.waitForTimeout(1000);
  report.frozenFingerprint=createHash('sha256').update(await page.evaluate(()=>(window as any).__P300__.frozenState())).digest('hex');
  for(const mode of ['frozen-uninstrumented-a','frozen-instrumented','frozen-uninstrumented-b']){
   if(mode==='frozen-instrumented'){await sample(mode,4500);continue;}
   const before=await page.evaluate(()=>{const a=(window as any).__DIFFICULTY_R2__,d=(window as any).__P300__;d.setActive(false);a.clearFrames();return performance.now();});await page.waitForTimeout(4500);
   const after=await page.evaluate(()=>({at:performance.now(),frames:[...(window as any).__DIFFICULTY_R2__.frames]}));(report.overhead??=[]).push({mode,wallMs:after.at-before,frames:after.frames});await save();
  }
  await sample('frozen-gpu-confirmation',4500,true);
  report.materialWrites=await page.evaluate(()=>{
   const a=(window as any).__DIFFICULTY_R2__,p=a.view.sourceCombatEffects.player,rows:any[]=[],undo:Function[]=[];
   for(const [key,b]of p.batches){const s=b.surface,original=s.write,phases=new Map<string,number>(),row={key,calls:0,exactPhases:0,hasLayers:!!s.prepared?.source?.layers,layerCount:Object.keys(s.prepared?.source?.layers??{}).length};rows.push(row);s.write=function(index:number,pose:any,context:any){row.calls++;const key=JSON.stringify([pose,context]);phases.set(key,(phases.get(key)??0)+1);row.exactPhases=phases.size;return original.call(this,index,pose,context);};undo.push(()=>{s.write=original;});}
   const before=(window as any).__P300__.frozenState();a.view.render(0,1);for(const fn of undo)fn();return {stateExact:before===(window as any).__P300__.frozenState(),calls:rows.reduce((n,r)=>n+r.calls,0),exactPhases:rows.reduce((n,r)=>n+r.exactPhases,0),batches:rows.filter(r=>r.calls).sort((a,b)=>b.calls-a.calls)};
  });
  report.render=await page.evaluate(()=>(window as any).__DIFFICULTY_R2__.view.report());await page.screenshot({path:path.join(root,'native-300.png')});
  report.frozenFingerprintAfter=createHash('sha256').update(await page.evaluate(()=>(window as any).__P300__.frozenState())).digest('hex');report.finished=new Date().toISOString();report.passed=report.errors.length===0&&report.frozenFingerprint===report.frozenFingerprintAfter;await save();
 }else{
 await page.evaluate(()=>{const a=(window as any).__DIFFICULTY_R2__;a.play();});await sample('native-baseline',10000);
 await sample('native-cpu-profile',7000,false,true);
 report.freezeBefore=await page.evaluate(()=>{const a=(window as any).__DIFFICULTY_R2__,d=(window as any).__P300__;const s=d.state();a.freeze();return s;});
 await page.waitForTimeout(1500);report.frozenFingerprint=createHash('sha256').update(await page.evaluate(()=>(window as any).__P300__.frozenState())).digest('hex');
 await page.screenshot({path:path.join(root,'native-300.png')});report.render=await page.evaluate(()=>(window as any).__DIFFICULTY_R2__.view.report());
 await sample('frozen-full-gpu',5000,true,true);
 for(const variant of ['half-resolution','no-contact','no-shadow','no-bloom','no-draw','full-repeat']){
  await page.evaluate((variant)=>{const a=(window as any).__DIFFICULTY_R2__,v=a.view,d=(window as any).__P300__;d.restore?.();d.restore=null;
   if(variant==='half-resolution'){const old=v.renderer.getPixelRatio();v.renderer.setPixelRatio(old*.5);d.restore=()=>v.renderer.setPixelRatio(old);}
   if(variant==='no-contact'){const old=v.contact.enabled;v.contact.enabled=false;d.restore=()=>{v.contact.enabled=old;};}
   if(variant==='no-shadow'){const old=v.renderer.shadowMap.enabled;v.renderer.shadowMap.enabled=false;d.restore=()=>{v.renderer.shadowMap.enabled=old;};}
   if(variant==='no-bloom'){const p=v.heroComposer.passes[2],old=p.enabled;p.enabled=false;d.restore=()=>{p.enabled=old;};}
   if(variant==='no-draw'){const old=v.renderScene;v.renderScene=()=>{};d.restore=()=>{v.renderScene=old;};}
  },variant);
  await page.waitForTimeout(700);await sample('frozen-'+variant,3500,variant!=='no-draw');
 }
 report.frozenFingerprintAfter=createHash('sha256').update(await page.evaluate(()=>(window as any).__P300__.frozenState())).digest('hex');
 await page.evaluate(()=>{const a=(window as any).__DIFFICULTY_R2__,d=(window as any).__P300__;d.restore?.();d.savedView=a.view.render;d.savedHud=a.hud.afterRender;a.view.render=()=>{};a.hud.afterRender=()=>{};a.play();});
 await sample('native-simulation-only',6000,false,true);
 await page.evaluate(()=>{const a=(window as any).__DIFFICULTY_R2__,d=(window as any).__P300__;a.freeze();a.view.render=d.savedView;a.hud.afterRender=d.savedHud;});
 report.finished=new Date().toISOString();report.passed=report.errors.length===0&&report.frozenFingerprint===report.frozenFingerprintAfter;
 }
}catch(e){report.failure=String(e instanceof Error?e.stack:e);process.exitCode=1;}finally{await save();await context.close();}
