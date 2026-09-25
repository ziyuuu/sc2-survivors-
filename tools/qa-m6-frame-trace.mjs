import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';

const race=process.argv.includes('--race')?process.argv[process.argv.indexOf('--race')+1]:'protoss';
if(!['terran','zerg','protoss'].includes(race))throw Error('Invalid race');
const headed=process.argv.includes('--headed'),keepTrace=process.argv.includes('--keep-trace'),hideMap=process.argv.includes('--hide-map'),hideUnits=process.argv.includes('--hide-units'),clearOnly=process.argv.includes('--clear-only'),warmReal=process.argv.includes('--warm-real'),warmEach=process.argv.includes('--warm-each'),warmScreen=process.argv.includes('--warm-screen'),settle=process.argv.includes('--settle'),basicUnits=process.argv.includes('--basic-units'),noBoneShader=process.argv.includes('--no-bone-shader');
const hideModel=process.argv.includes('--hide-model')?process.argv[process.argv.indexOf('--hide-model')+1]:null;
if(hideModel&&!/^[a-z0-9_.]+$/.test(hideModel))throw Error('Invalid model ID');
const seconds=Number(process.argv.includes('--seconds')?process.argv[process.argv.indexOf('--seconds')+1]:8);
if(!Number.isFinite(seconds)||seconds<1||seconds>60)throw Error('Invalid duration');
const out='reports/local/m6-frame-trace-'+race+(headed?'-headed':'')+(hideMap?'-no-map':'')+(hideUnits?'-no-units':'')+(hideModel?'-no-'+hideModel.replaceAll('.','-'):'')+(clearOnly?'-clear-only':'')+(warmReal?'-warm-real':'')+(warmEach?'-warm-each':'')+(warmScreen?'-warm-screen':'')+(settle?'-settle':'')+(basicUnits?'-basic-units':'')+(noBoneShader?'-no-bone-shader':'');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:!headed});
const report={at:new Date().toISOString(),race,headed,hideMap,hideUnits,hideModel,clearOnly,warmReal,warmEach,warmScreen,settle,basicUnits,noBoneShader,seconds,rafGaps:[],longTasks:[],events:[],gpuTasks:[],errors:[]};
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const page=await context.newPage(),cdp=await context.newCDPSession(page);
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto('http://127.0.0.1:5173/');
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
 await page.locator('[data-action=menu-new]').click();
 await page.locator('[data-action=menu-race][data-race='+race+']').click();
 await page.locator('[data-action=menu-race-next]').click();
 await page.locator('[data-action=menu-difficulty-next]').click();
 await page.locator('[data-action=menu-start]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});
 if(warmReal||warmEach||warmScreen)report.warmup=await page.evaluate(async mode=>{
  const view=window.__SC2_DEBUG__?.view;if(!view)throw Error('View unavailable');
  const entries=[...view.gpu.entries()].flatMap(([key,batch])=>batch.meshes.map(mesh=>({key,mesh}))),meshes=entries.map(entry=>entry.mesh),renderer=view.renderer;
  const original=renderer.setRenderTarget.bind(renderer);
  renderer.setRenderTarget=(target,...args)=>{if(target?.width===1&&target?.height===1){if(mode==='screen')return original(null,...args);target.setSize(view.canvas.width,view.canvas.height);}return original(target,...args);};
  const draws=[];const start=performance.now();try{if(mode==='each'||mode==='screen'){for(const {key,mesh} of entries){await view.prewarmBatches([mesh]);draws.push({key,calls:renderer.info.render.calls});renderer.getContext().finish();}}else{await view.prewarmBatches(meshes);draws.push({key:'all',calls:renderer.info.render.calls});renderer.getContext().finish();}}finally{renderer.setRenderTarget=original;}
  return {ms:performance.now()-start,meshes:meshes.length,keys:[...new Set(entries.map(entry=>entry.key))],draws,width:view.canvas.width,height:view.canvas.height};
 },warmScreen?'screen':warmEach?'each':'real');
 if(settle)await page.waitForTimeout(500);
 if(hideMap){const hidden=await page.evaluate(()=>{const map=window.__SC2_DEBUG__?.view?.mapView;if(!map)return false;map.setVisible(false);return true;});if(!hidden)throw Error('Map view unavailable for diagnostic ablation');}
 if(basicUnits)await page.evaluate(()=>{const view=window.__SC2_DEBUG__?.view;if(!view?.shadows)throw Error('Basic material unavailable');for(const batch of view.gpu.values())for(const mesh of batch.meshes)mesh.material=view.shadows.material;});
 if(noBoneShader)await page.evaluate(()=>{const view=window.__SC2_DEBUG__?.view;if(!view)throw Error('View unavailable');for(const batch of view.gpu.values())for(const mesh of batch.meshes){const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];mesh.material=materials.map(material=>{const clone=material.clone();clone.onBeforeCompile=()=>{};clone.customProgramCacheKey=()=> 'diagnostic-plain';return clone;});if(mesh.material.length===1)mesh.material=mesh.material[0];}});
 if(hideUnits||hideModel)await page.evaluate(model=>{const view=window.__SC2_DEBUG__?.view;if(!view)throw Error('View unavailable');const render=view.renderer.render.bind(view.renderer);view.renderer.render=(scene,camera)=>{const hidden=[];for(const [key,batch] of view.gpu)if(!model||key===model||key.startsWith(model+'.'))for(const mesh of batch.meshes)if(mesh.visible){mesh.visible=false;hidden.push(mesh);}try{return render(scene,camera);}finally{for(const mesh of hidden)mesh.visible=true;}};},hideUnits?null:hideModel);
 if(clearOnly)await page.evaluate(()=>{const view=window.__SC2_DEBUG__?.view;if(!view)throw Error('View unavailable');const gl=view.renderer.getContext();view.render=()=>{gl.clearColor(.05,.08,.11,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);};});
 await page.evaluate(()=>{
  const p=window.__traceFrame={last:0,gaps:[],longTasks:[],stepSpikes:[],renderSpikes:[]};
  const {world:w,view:v}=window.__SC2_DEBUG__;
  const step=w.step.bind(w),render=v.render.bind(v);
  w.step=(...args)=>{const at=performance.now();try{return step(...args);}finally{const ms=performance.now()-at;if(ms>10)p.stepSpikes.push({at,ms});}};
  v.render=(...args)=>{const at=performance.now();try{return render(...args);}finally{const ms=performance.now()-at;if(ms>10)p.renderSpikes.push({at,ms});}};
  new PerformanceObserver(list=>{for(const event of list.getEntries())p.longTasks.push({at:event.startTime,ms:event.duration});}).observe({entryTypes:['longtask']});
  const frame=at=>{if(p.last&&at-p.last>20)p.gaps.push({at,ms:at-p.last,elapsed:w.stageElapsed,actors:[...w.entities.values()].filter(u=>u.hp>0).map(u=>u.unitType),pods:w.pods.filter(x=>['falling','active','opening'].includes(x.status)).map(x=>x.unitType),economic:[...w.economicTargets.values()].filter(x=>x.status==='active').map(x=>x.kind),drawCalls:v.renderer.info.render.calls,programs:v.renderer.info.programs?.length});p.last=at;if(!p.done)requestAnimationFrame(frame);};requestAnimationFrame(frame);
 });
 await cdp.send('Tracing.start',{categories:'toplevel,devtools.timeline,blink,cc,gpu,viz,renderer.scheduler',transferMode:'ReturnAsStream'});
 await page.locator('[data-action=flow-continue]').click();
 await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='battle',null,{timeout:30000});
 await page.waitForTimeout(seconds*1000);
 const captured=await page.evaluate(()=>{window.__traceFrame.done=true;return window.__traceFrame;});
 Object.assign(report,{rafGaps:captured.gaps,longTasks:captured.longTasks,stepSpikes:captured.stepSpikes,renderSpikes:captured.renderSpikes});
 report.drawCalls=await page.evaluate(()=>window.__SC2_REPORT__().drawCalls);
 const completed=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
 await cdp.send('Tracing.end');
 const {stream}=await completed;
 let data='';
 for(;;){const chunk=await cdp.send('IO.read',{handle:stream,size:1024*1024});data+=chunk.base64Encoded?Buffer.from(chunk.data,'base64').toString('utf8'):chunk.data;if(chunk.eof)break;}
 await cdp.send('IO.close',{handle:stream});
 if(keepTrace)await fs.writeFile(out+'/trace.json',data);
 const trace=JSON.parse(data);
 const durationEvents=trace.traceEvents.filter(event=>event.ph==='X'&&event.dur);
 report.events=durationEvents.filter(event=>event.dur>=20000).map(event=>({
  name:event.name,cat:event.cat,ms:event.dur/1000,at:event.ts/1000,pid:event.pid,tid:event.tid
 })).sort((a,b)=>b.ms-a.ms).slice(0,80);
 report.gpuTasks=durationEvents.filter(event=>event.name==='GpuChannel::ExecuteDeferredRequest').sort((a,b)=>b.dur-a.dur).slice(0,8).map(task=>({
  ms:task.dur/1000,at:task.ts/1000,nested:durationEvents.filter(event=>event!==task&&event.pid===task.pid&&event.tid===task.tid&&event.ts>=task.ts&&event.ts+event.dur<=task.ts+task.dur&&event.dur>=500).sort((a,b)=>b.dur-a.dur).slice(0,10).map(event=>({name:event.name,ms:event.dur/1000}))
 }));
 report.traceBytes=Buffer.byteLength(data);
 await context.close();
}catch(error){report.failure=String(error?.stack??error);process.exitCode=1;}
finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({race,headed,hideMap,hideUnits,hideModel,clearOnly,warmReal,warmEach,warmScreen,basicUnits,noBoneShader,warmup:report.warmup,drawCalls:report.drawCalls,gaps:report.rafGaps,stepSpikes:report.stepSpikes,renderSpikes:report.renderSpikes,longTasks:report.longTasks,gpuTasks:report.gpuTasks,events:report.events.slice(0,8),traceBytes:report.traceBytes,failure:report.failure??null}));}
