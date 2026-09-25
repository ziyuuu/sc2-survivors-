import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';

const out='reports/local/m6-first-use';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={at:new Date().toISOString(),runs:[]};
try{
 for(const race of (process.argv.includes('--races')?process.argv[process.argv.indexOf('--races')+1].split(','):['terran','protoss','zerg'])){
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1}),page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});
  await page.locator('[data-action=menu-new]').click();await page.locator(`[data-action=menu-race][data-race=${race}]`).click();await page.locator('[data-action=menu-race-next]').click();await page.locator('[data-action=menu-difficulty-next]').click();await page.locator('[data-action=menu-start]').click();await page.waitForFunction(()=>window.__SC2_REPORT__?.().readiness?.phase==='ready',null,{timeout:240000});
  await page.evaluate(()=>{
   const {world:w,view:v}=window.__SC2_DEBUG__,p=window.__m6Trace={start:performance.now(),frames:[],renders:[],steps:[],loads:[],longTasks:[],gl:[],programsAtReady:v.renderer.info.programs?.map(x=>({id:x.id,name:x.name,cacheKey:x.cacheKey})),last:0,done:false};
   const gl=v.renderer.getContext(),infoLog=gl.getProgramInfoLog.bind(gl),draw=v.renderer.renderBufferDirect.bind(v.renderer);
   gl.getProgramInfoLog=(program)=>{const at=performance.now(),value=infoLog(program),ms=performance.now()-at;p.gl.push({at,ms,programs:v.renderer.info.programs?.length});return value;};
   v.renderer.renderBufferDirect=(camera,scene,geometry,material,object,group)=>{const at=performance.now(),before=v.renderer.info.programs?.length;try{return draw(camera,scene,geometry,material,object,group);}finally{const ms=performance.now()-at;if(ms>10||v.renderer.info.programs?.length!==before){let parent=object,path=[];while(parent){path.push(parent.name||parent.type);parent=parent.parent;}p.gl.push({at,ms,material:material.type,materialName:material.name,object:object.name,objectType:object.type,geometry:geometry.type,path,programs:v.renderer.info.programs?.length});}}};
   const render=v.render.bind(v),step=w.step.bind(w),load=v.ensureUnitVariant.bind(v);
   v.render=(...args)=>{const at=performance.now();try{return render(...args);}finally{const ms=performance.now()-at;if(ms>12)p.renders.push({at,ms,models:v.gpu.size,programs:v.renderer.info.programs?.length,drawCalls:v.renderer.info.render.calls,entities:[...w.entities.values()].map(e=>e.unitType)});}};
   w.step=(...args)=>{const at=performance.now();try{return step(...args);}finally{const ms=performance.now()-at;if(ms>12)p.steps.push({at,ms,entities:w.entities.size});}};
   v.ensureUnitVariant=(key,type)=>{const at=performance.now();const result=load(key,type);p.loads.push({key,at});result.then(ok=>{p.loads.find(x=>x.key===key&&x.at===at).done=performance.now();p.loads.find(x=>x.key===key&&x.at===at).ok=ok;});return result;};
   new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!p.done)p.longTasks.push({at:entry.startTime,ms:entry.duration});}).observe({entryTypes:['longtask']});
   const frame=at=>{if(p.last){const ms=at-p.last;if(ms>20)p.frames.push({at,ms,models:v.gpu.size,assetsPending:v.assetsPending,entities:w.entities.size,phase:w.phase});}p.last=at;if(!p.done)requestAnimationFrame(frame);};requestAnimationFrame(frame);
  });
  await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
  await page.locator('[data-action=flow-continue]').click();await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='battle');await page.waitForTimeout(11000);
  const snapshot=await page.evaluate(()=>{window.__m6Trace.done=true;return {...window.__m6Trace,programsAfter:window.__SC2_DEBUG__.view.renderer.info.programs?.map(x=>({id:x.id,name:x.name,cacheKey:x.cacheKey})),report:window.__SC2_REPORT__()};});
  const profile=(await cdp.send('Profiler.stop')).profile;await fs.writeFile(`${out}/${race}.cpuprofile`,JSON.stringify(profile));
  const nodes=new Map(profile.nodes.map(node=>[node.id,node])),counts=new Map();for(const id of profile.samples??[])counts.set(id,(counts.get(id)??0)+1);
  const hot=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,25).map(([id,count])=>({count,...nodes.get(id)?.callFrame}));
  const run={race,frames:snapshot.frames,renders:snapshot.renders,steps:snapshot.steps,loads:snapshot.loads,longTasks:snapshot.longTasks,gl:snapshot.gl,programsAtReady:snapshot.programsAtReady,programsAfter:snapshot.programsAfter,hot,phase:snapshot.report.phase,errors};report.runs.push(run);
  console.log(JSON.stringify({race,frames:run.frames,renders:run.renders,longTasks:run.longTasks,gl:run.gl.filter(x=>x.ms>1),programsAtReady:run.programsAtReady?.length,newPrograms:run.programsAfter?.filter(x=>!run.programsAtReady.some(y=>y.id===x.id)),loads:run.loads.filter(x=>x.done-x.at>20),hot:hot.slice(0,10),errors}));
  await context.close();await fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));
 }
}catch(error){report.failure=String(error?.stack??error);process.exitCode=1;console.error(report.failure);}
finally{await fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));await browser.close();}
