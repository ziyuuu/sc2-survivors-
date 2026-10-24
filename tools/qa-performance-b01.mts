import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
const run=process.env.SC2_B01_RUN??'run-1',folder='performance-b01-20261019',root=path.resolve('reports/local/performance-b01-20261019',run),port=process.env.SC2_B01_PORT??'4435';
await fs.mkdir(root,{recursive:true});await fs.copyFile('tools/qa-performance-b01.mts',path.join(root,'runner.mts'));
const hash=(s:any)=>createHash('sha256').update(s).digest('hex');
const report:any={started:new Date().toISOString(),run,method:'Fixed seed529 / Char (actual recipe in fixture.json run.runConfig.campaignMap) / Terran blue fixture / hell18 / friends health-locked / 960 exact steps with one native render per step. Current production boot, UI, simulation and renderer. Diagnostic, not natural campaign. No performance optimization.',build:JSON.parse(await fs.readFile('preview/'+folder+'/build-inputs.json','utf8')),host:{platform:os.platform(),release:os.release(),arch:os.arch(),cpu:os.cpus()[0],logicalCpus:os.cpus().length,memoryBytes:os.totalmem(),node:process.version},samples:[],errors:[],requestFailures:[]};
const context=await chromium.launchPersistentContext(path.join(root,'profile'),{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1});
const page=context.pages()[0],assets=new Set<string>();
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),failure:r.failure()}));
page.on('response',r=>{const u=new URL(r.url()),assetAt=u.pathname.indexOf('/assets/');if(assetAt>=0)assets.add(decodeURIComponent(u.pathname.slice(assetAt)));if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
await page.addInitScript('window.__name=(v)=>v;localStorage.setItem("sc2.renderQuality","native");localStorage.setItem("sc2.ordinaryEffects","full");localStorage.setItem("sc2.heroEffects","full");localStorage.setItem("sc2.animationMode","complete");');
const save=()=>fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));
const snapshot=()=>page.evaluate(()=>{const a=(window as any).__DIFFICULTY_R2__;return JSON.stringify(a.snapshot(),(_k,v)=>v instanceof Map?{__map:[...v]}:v instanceof Set?{__set:[...v]}:v);});
async function sample(label:string,ms:number,instrumented:boolean,live=false){
 const before=await page.evaluate(({instrumented,live})=>{const a=(window as any).__DIFFICULTY_R2__,p=(window as any).__B01__;if(live)a.play();p.start(instrumented);return p.state();},{instrumented,live});
 await page.waitForTimeout(ms);
 const end=await page.evaluate(()=>{const a=(window as any).__DIFFICULTY_R2__,p=(window as any).__B01__,after=p.state(),metrics=p.stop();a.freeze();return {after,metrics,afterDiagnosticFreeze:p.state()};});
 report.samples.push({label,instrumented,live,before,...end,wallMs:end.after.at-before.at,simulatedSeconds:end.after.time-before.time,backlogDelta:end.after.backlog-before.backlog,discardedDelta:end.after.discarded-before.discarded});await save();console.log(JSON.stringify({run,label,frames:end.metrics.frames.length,wallMs:end.after.at-before.at,sim:end.after.time-before.time,backlog:end.after.backlog,discarded:end.after.discarded-before.discarded}));
}
try{
 await page.goto(`http://127.0.0.1:${port}/${folder}/?gear=3`,{timeout:120000});await page.waitForFunction(()=>!!(window as any).__DIFFICULTY_R2__,null,{timeout:180000});
 for(const selector of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(selector).click();
 for(let i=0;i<30;i++){try{await page.waitForFunction(()=>['ready','error'].includes((window as any).__DIFFICULTY_R2__.readiness.state.phase),null,{timeout:15000});break;}catch{console.log(run+' loading '+i);}}
 await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>(window as any).__DIFFICULTY_R2__.world.phase==='battle');
 await page.evaluate(async()=>{const a=(window as any).__DIFFICULTY_R2__;a.freeze();await a.jump(18,'hell',true);a.focus();a.view.setCameraMode('fixed');a.view.setCameraPitch(50);a.view.setCameraZoom(.9);a.world.paused=false;const v=a.view,render=v.render;let remaining=960;v.render=function(...args:any[]){if(remaining>0){a.world.step();remaining--;}return render.apply(this,args);};(window as any).__PREP_B01__={remaining:()=>remaining,restore:()=>v.render=render};});
 for(let i=0;i<40;i++){try{await page.waitForFunction(()=>(window as any).__PREP_B01__.remaining()===0,null,{timeout:15000});break;}catch{console.log(run+' steps remaining '+await page.evaluate(()=>(window as any).__PREP_B01__.remaining()));}}
 if(await page.evaluate(()=>(window as any).__PREP_B01__.remaining()))throw Error('960 steps incomplete');
 await page.evaluate(()=>{(window as any).__PREP_B01__.restore();});
 const sanity=await page.evaluate(()=>{const a=(window as any).__DIFFICULTY_R2__,w=a.world;return {validClock:Number.isFinite(w.time)&&Number.isFinite(w.tick),enemies:a.summary().enemies,remaining:(window as any).__PREP_B01__.remaining()};});
 if(!sanity.validClock||sanity.enemies<250||sanity.enemies>300||sanity.remaining!==0)throw Error('Invalid dense fixture: '+JSON.stringify(sanity));
 const raw=await snapshot();await fs.writeFile(path.join(root,'fixture.json'),raw);report.fixtureHash=hash(raw);
 report.fixture=await page.evaluate(()=>{const a=(window as any).__DIFFICULTY_R2__,v=a.view,gl=v.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return {summary:a.summary(),driver:{backlog:a.driver.accumulator,discarded:a.driver.discardedBacklogSeconds},device:{userAgent:navigator.userAgent,gpu:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:e?gl.getParameter(e.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),webgl:gl.getParameter(gl.VERSION),timerQuery:!!gl.getExtension('EXT_disjoint_timer_query_webgl2'),viewport:[innerWidth,innerHeight],drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],dpr:devicePixelRatio,visible:!document.hidden,focus:document.hasFocus(),headless:true,quality:['sc2.renderQuality','sc2.ordinaryEffects','sc2.heroEffects','sc2.animationMode'].map(k=>[k,localStorage.getItem(k)])}};});
 await page.screenshot({path:path.join(root,'fixture.png')});await save();
 await page.evaluate(()=>{
  const a=(window as any).__DIFFICULTY_R2__,w=a.world,v=a.view,d=a.driver,gl=v.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  let active=false,detail=false,last=0,disjoint=0,frames:any[]=[],gpu:any[]=[],pending:any[]=[],cpu:any={},draw:any[]=[],uploads:any={};
  const wrap=(obj:any,key:string,name:string)=>{const original=obj[key];obj[key]=function(...args:any[]){if(!active||!detail)return original.apply(this,args);const at=performance.now();try{return original.apply(this,args);}finally{const t=cpu[name]??(cpu[name]={calls:0,totalMs:0,maxMs:0});const ms=performance.now()-at;t.calls++;t.totalMs+=ms;t.maxMs=Math.max(t.maxMs,ms);}};};
  wrap(w,'step','simulation.step');wrap(d,'advance','simulation.advance');wrap(a.hud,'afterRender','hud.afterRender');
  const poll=()=>{if(!ext)return;if(gl.getParameter(ext.GPU_DISJOINT_EXT)){disjoint++;for(const p of pending)gl.deleteQuery(p.q);pending=[];return;}pending=pending.filter(p=>{if(!gl.getQueryParameter(p.q,gl.QUERY_RESULT_AVAILABLE))return true;gpu.push({frame:p.frame,ms:gl.getQueryParameter(p.q,gl.QUERY_RESULT)/1e6});gl.deleteQuery(p.q);return false;});};
  const original=v.render;
  v.render=function(...args:any[]){if(!active)return original.apply(this,args);const at=performance.now();let q:any=null;if(detail){poll();v.renderer.info.reset();q=ext&&pending.length<8?gl.createQuery():null;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);}
   const start=performance.now(),result=original.apply(this,args),end=performance.now();if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push({q,frame:frames.length});}
   frames.push({at,interval:last?at-last:null,...(detail?{renderCpuMs:end-start}:{}),steps:d.lastSteps,backlog:d.accumulator,time:w.time,tick:w.tick});last=at;if(detail)draw.push({...v.renderer.info.render});return result;};
  const tex=gl.texSubImage2D,buffer=gl.bufferSubData;
  gl.texSubImage2D=function(...args:any[]){if(active&&detail&&args[7]===gl.FLOAT&&args[8] instanceof Float32Array){uploads.floatTextureCalls++;uploads.floatTextureBytes+=args[4]*args[5]*(args[6]===gl.RG?2:args[6]===gl.RED?1:4)*4;}return tex.apply(this,args);};
  gl.bufferSubData=function(...args:any[]){const data=args[2];if(active&&detail&&ArrayBuffer.isView(data)){uploads.bufferCalls++;uploads.bufferBytes+=(args[4]??(data.length-(args[3]??0)))*data.BYTES_PER_ELEMENT;}return buffer.apply(this,args);};
  const state=()=>({at:performance.now(),time:w.time,tick:w.tick,rng:w.rngState,backlog:d.accumulator,discarded:d.discardedBacklogSeconds,phase:w.phase,paused:w.paused,decision:w.requiresPlayerDecision,assetsPending:v.assetsPending,readiness:a.readiness.state.kind,enemies:[...w.entities.values()].filter((u:any)=>u.owner==='zerg'&&u.hp>0).length,visible:!document.hidden,focus:document.hasFocus()});
  (window as any).__B01__={state,start:(instrumented:boolean)=>{detail=instrumented;last=0;frames=[];gpu=[];cpu={};draw=[];disjoint=0;uploads={floatTextureCalls:0,floatTextureBytes:0,bufferCalls:0,bufferBytes:0};v.renderer.info.autoReset=!detail;active=true;},stop:()=>{if(detail)poll();active=false;const pendingQueries=pending.length;for(const p of pending)gl.deleteQuery(p.q);pending=[];v.renderer.info.autoReset=true;return {frames,gpu,cpu,draw,uploads,disjoint,pendingQueries};}};
 });
 await page.waitForTimeout(1500);
 await sample('frozen-low-probe-a',6000,false);
 await sample('frozen-cpu-gpu',8000,true);
 await sample('frozen-low-probe-b',6000,false);
 const after=await snapshot();await fs.writeFile(path.join(root,'frozen-after.json'),after);report.frozenStateExact=raw===after;
 await sample('native-low-probe',10000,false,true);
 await sample('native-cpu-gpu-following-window',8000,true,true);
 report.final=await page.evaluate(()=>(window as any).__DIFFICULTY_R2__.summary());
 await page.screenshot({path:path.join(root,'native-end.png')});
 report.passed=report.errors.length===0&&report.frozenStateExact&&report.samples.every((s:any)=>s.metrics.frames.length>1&&s.before.visible&&s.after.visible)&&report.samples.filter((s:any)=>s.instrumented).every((s:any)=>s.metrics.gpu.length>0&&s.metrics.disjoint===0);
}catch(e){report.failure=String(e instanceof Error?e.stack:e);await page.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});process.exitCode=1;}finally{
 report.finished=new Date().toISOString();await save();await context.close();
 const manifest=[];for(const url of [...assets].sort()){const file='public'+url;try{const b=await fs.readFile(file);manifest.push({url,file,bytes:b.length,sha256:hash(b)});}catch(e){manifest.push({url,file,error:String(e)});}}
 await fs.writeFile(path.join(root,'requested-assets.json'),JSON.stringify(manifest,null,2));report.assetManifest={count:manifest.length,sha256:hash(JSON.stringify(manifest))};await save();if(!report.passed)process.exitCode=1;
}
