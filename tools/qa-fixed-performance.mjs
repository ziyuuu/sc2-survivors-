import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import {createGameServer} from './coze-web-server.mjs';

const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const root='reports/local/fixed-performance-20261006',label=arg('--label','baseline-profile'),out=root+'/'+label,dev=process.argv.includes('--dev'),profile=process.argv.includes('--profile');
const seconds=Number(arg('--seconds','30')),repeat=Number(arg('--repeat','1')),races=arg('--races','terran,zerg,protoss').split(','),webRoot=arg('--web-root','dist/web');
assert.match(label,/^[a-z0-9-]+$/);assert.ok(seconds>=5&&seconds<=180&&repeat>=1&&repeat<=3);assert.ok(races.every(r=>['terran','zerg','protoss'].includes(r)));
await fs.mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const stats=a=>{const b=[...a].sort((a,b)=>a-b),q=p=>b[Math.min(b.length-1,Math.floor(b.length*p))]??null;return {count:b.length,mean:b.length?b.reduce((n,v)=>n+v,0)/b.length:null,p50:q(.5),p95:q(.95),p99:q(.99),max:b.at(-1)??null,over20Percent:b.length?b.filter(n=>n>20).length/b.length*100:null};};
function summarizeCPU(cpu){const nodes=new Map(cpu.nodes.map(n=>[n.id,n])),parents=new Map(),self=new Map(),inclusive=new Map();for(const n of cpu.nodes)for(const child of n.children??[])parents.set(child,n.id);for(let i=0;i<cpu.samples.length;i++){let id=cpu.samples[i],us=cpu.timeDeltas[i];self.set(id,(self.get(id)??0)+us);while(id!==undefined){inclusive.set(id,(inclusive.get(id)??0)+us);id=parents.get(id);}}const top=m=>[...m].sort((a,b)=>b[1]-a[1]).slice(0,60).map(([id,us])=>({name:nodes.get(id).callFrame.functionName,url:nodes.get(id).callFrame.url.split('?')[0],line:nodes.get(id).callFrame.lineNumber+1,ms:Math.round(us/100)/10}));return {self:top(self),inclusive:top(inclusive)};}
const report={at:new Date().toISOString(),label,dev,profile,seconds,repeat,method:'Frozen schema26 UI-stage diagnostic archives, original stage16 clock and current map; same initial roster and targets. These fixtures contain stationary high-health diagnostic targets, not natural enemy pressure or earned campaign saves. Public menu import and resume; no in-battle state grants, locks or manual stepping. First ten seconds included. Screenshots outside frame sampling. Instrumented development CPU/submit costs are separate from production frame measurements.',host:{cpu:os.cpus()[0]?.model,cores:os.cpus().length,ram:os.totalmem(),platform:process.platform},runs:[],errors:[]};
let server,browser;
try{
 if(dev){
  const files=['src/simulation/combat/team-auras.ts','src/render/units/animated-batch.ts','src/render/loaders/sc2-materials.ts','src/render/scene/battle-renderer.ts','src/render/units/friendly-labels.ts'],overrides=new Map();
  if(process.argv.includes('--baseline-dev'))for(const file of files)overrides.set(file,execFileSync('git',['show','1f7ef85051dbea038fad4d56248214a568322098:'+file],{encoding:'utf8'}));
  report.runtimeSources=[];for(const file of files)report.runtimeSources.push({file,baselineOverride:overrides.has(file),sha256:sha(overrides.get(file)??await fs.readFile(file))});
  server=await createServer({configFile:false,root:process.cwd(),plugins:[{name:'fixed-baseline-source',enforce:'pre',load(id){return overrides.get(path.relative(process.cwd(),id.split('?')[0]).replaceAll('\\','/'))??null;}}],cacheDir:'.cache/fixed-performance-vite',optimizeDeps:{entries:['index.html']},server:{host:'127.0.0.1',port:12194,strictPort:true,hmr:false,watch:{ignored:['**/.cache/**','**/reports/**','**/dist/**','**/deploy/**']}}});await server.listen();
 }
 else{server=createGameServer({webRoot:path.resolve(webRoot),assetRoot:path.resolve('dist/web')});await new Promise(r=>server.listen(0,'127.0.0.1',r));report.release=JSON.parse(await fs.readFile(webRoot+'/web-release.json','utf8'));}
 const url=dev?'http://127.0.0.1:12194/':`http://127.0.0.1:${server.address().port}/`;
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-precise-memory-info']});report.chrome=browser.version();
 for(const race of races)for(let trial=1;trial<=repeat;trial++){
  const id=race+'-'+trial,fixture=arg('--fixture',`reports/local/ui-integration-20261006/full-roster-third/web/${race}-1.json`),bytes=await fs.readFile(fixture),context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true}),page=await context.newPage();
  const run={id,fixture,sha256:sha(bytes),errors:[]};report.runs.push(run);page.setDefaultTimeout(30000);page.on('pageerror',e=>run.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')run.errors.push(m.text());});console.log(JSON.stringify({loading:id,fixture}));
  try{
   await page.goto(url,{timeout:240000});await page.waitForFunction(()=>window.__SC2_REPORT__?.().phase==='menu',null,{timeout:240000});assert.equal(await page.evaluate(()=>!!window.__SC2_DEBUG__),dev);
   await page.locator('[data-action=menu-load]').click();const chooser=page.waitForEvent('filechooser');await page.locator('[data-action=menu-load-file]').click();await(await chooser).setFiles(path.resolve(fixture));await page.locator('[data-action=menu-load-ready]').click();await page.waitForFunction(()=>['ready','error'].includes(window.__SC2_REPORT__?.().readiness.phase),null,{timeout:240000});const readiness=await page.evaluate(()=>window.__SC2_REPORT__().readiness);assert.equal(readiness.phase,'ready',readiness.error);await page.locator('[data-action=flow-continue]').click();
   run.before=await page.evaluate(()=>window.__SC2_REPORT__());await page.screenshot({path:out+'/'+id+'-paused.png'});
   run.gpu=await page.evaluate(()=>{const gl=document.querySelector('canvas#battle').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):null,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null};});
   await page.evaluate(({dev,seconds})=>{
    const p=window.__fixedPerf={active:false,done:false,start:0,last:0,frames:[],first10:[],longTasks:[],steps:[],renders:[],draws:[],triangles:[],gpuMs:[],samples:[],gpuDisjoint:0,gpuSupported:false,resizeCalls:0,domMutations:0};
    new PerformanceObserver(list=>{if(p.active)for(const e of list.getEntries())if(e.startTime>=p.start)p.longTasks.push({at:e.startTime-p.start,ms:e.duration});}).observe({entryTypes:['longtask']});
    if(dev){const {world:w,view:v}=window.__SC2_DEBUG__,step=w.step.bind(w),render=v.render.bind(v),gl=v.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),queries=[];p.gpuSupported=!!ext;v.renderer.info.autoReset=false;
     const resize=v.resize.bind(v);v.resize=(...args)=>{if(p.active)p.resizeCalls++;return resize(...args);};new MutationObserver(rows=>{if(p.active)p.domMutations+=rows.length;}).observe(document.querySelector('#interface'),{subtree:true,attributes:true,childList:true,characterData:true});
     w.step=(...args)=>{if(!p.active)return step(...args);const t=performance.now();const result=step(...args);p.steps.push(performance.now()-t);return result;};
     v.render=(...args)=>{if(!p.active)return render(...args);const t=performance.now();v.renderer.info.reset();const query=ext&&queries.length<8?gl.createQuery():null;if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);const result=render(...args);if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);queries.push(query);}p.renders.push(performance.now()-t);p.draws.push(v.renderer.info.render.calls);p.triangles.push(v.renderer.info.render.triangles);if(ext){if(gl.getParameter(ext.GPU_DISJOINT_EXT)){p.gpuDisjoint++;for(const q of queries)gl.deleteQuery(q);queries.length=0;}while(queries.length&&gl.getQueryParameter(queries[0],gl.QUERY_RESULT_AVAILABLE)){const q=queries.shift();p.gpuMs.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}}return result;};
    }
    const observe=now=>{if(p.active){if(p.last){const delta=now-p.last;p.frames.push(delta);if(now-p.start<=10000)p.first10.push(delta);}p.last=now;if(now-p.start>=seconds*1000){p.active=false;p.done=true;}}if(!p.done)requestAnimationFrame(observe);};requestAnimationFrame(observe);
   },{dev,seconds});
   const cdp=profile?await context.newCDPSession(page):null;if(cdp){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
   await page.locator('#overlay [data-action=pause]').click();await page.evaluate(()=>{const p=window.__fixedPerf;p.start=performance.now();p.active=true;});
   const start=Date.now();while(true){const sample=await page.evaluate(()=>{const r=window.__SC2_REPORT__(),p=window.__fixedPerf;const row={at:performance.now()-p.start,time:r.time,phase:r.phase,entities:r.entities,debt:r.simulationBacklogSeconds,discarded:r.discardedSimulationBacklogSeconds,pending:r.assetsPending};p.samples.push(row);return {done:p.done,...row};});if(sample.done)break;if(Date.now()-start>seconds*1000+60000)throw Error('Sample timed out');await page.waitForTimeout(500);}
   if(cdp){const {profile:cpu}=await cdp.send('Profiler.stop');await fs.writeFile(out+'/'+id+'-cpu.json',JSON.stringify(cpu));run.cpu=summarizeCPU(cpu);await cdp.detach();}
   const raw=await page.evaluate(()=>window.__fixedPerf);await fs.writeFile(out+'/'+id+'-raw.json',JSON.stringify(raw));run.after=await page.evaluate(()=>window.__SC2_REPORT__());run.frames=stats(raw.frames);run.first10=stats(raw.first10);run.steps=stats(raw.steps);run.renders=stats(raw.renders);run.draws=stats(raw.draws);run.triangles=stats(raw.triangles);run.gpuMs=stats(raw.gpuMs);run.gpuSupported=raw.gpuSupported;run.gpuDisjoint=raw.gpuDisjoint;run.maxDebt=Math.max(...raw.samples.map(s=>s.debt));run.combatSeconds=run.after.time-run.before.time;run.longTasks=raw.longTasks;run.samples=raw.samples;
   await page.screenshot({path:out+'/'+id+'-battle.png'});await page.locator('#topbar [data-action=pause]').click();
   if(dev&&process.argv.includes('--isolate-drops')){
    run.visualIsolation=await page.evaluate(async()=>{const {world:w,view:v}=window.__SC2_DEBUG__,{encodeGraph}=await import('/src/persistence/graph-codec.ts');window.__fixedVisual={draw:v.renderScene.bind(v),state:JSON.stringify(encodeGraph(w.captureRun().state)),masks:[]};document.querySelector('#overlay').style.visibility='hidden';return {method:'Paused diagnostic rendering only after timing. Original scene versus large-pickup layer hidden, then bloom disabled; all toggles restored. No shipping effects changed.',pickups:w.pickups.length,materials:[...v.pickups.batches].map(([kind,meshes])=>({kind,parts:meshes.map(m=>({count:m.count,material:(Array.isArray(m.material)?m.material:[m.material]).map(a=>({name:a.name,emissive:a.emissive?.toArray(),intensity:a.emissiveIntensity,transparent:a.transparent,blending:a.blending,sc2:a.userData.sc2}))}))}))};});
    await page.waitForTimeout(120);await page.screenshot({path:out+'/'+id+'-isolate-original.png'});
    await page.evaluate(()=>{const v=window.__SC2_DEBUG__.view,p=window.__fixedVisual;v.renderScene=()=>{const meshes=v.pickups.batches.get('large')??[],saved=meshes.map(m=>m.visible);meshes.forEach(m=>m.visible=false);try{p.draw();}finally{meshes.forEach((m,i)=>m.visible=saved[i]);}};});await page.waitForTimeout(120);await page.screenshot({path:out+'/'+id+'-isolate-no-large-pickups.png'});
    await page.evaluate(()=>{const v=window.__SC2_DEBUG__.view;v.renderScene=window.__fixedVisual.draw;v.heroComposer.passes[1].enabled=false;});await page.waitForTimeout(120);await page.screenshot({path:out+'/'+id+'-isolate-no-bloom.png'});
    run.visualIsolation.exactState=await page.evaluate(async()=>{const {world:w,view:v}=window.__SC2_DEBUG__,{encodeGraph}=await import('/src/persistence/graph-codec.ts');v.renderScene=window.__fixedVisual.draw;v.heroComposer.passes[1].enabled=true;document.querySelector('#overlay').style.visibility='';return JSON.stringify(encodeGraph(w.captureRun().state))===window.__fixedVisual.state;});assert.equal(run.visualIsolation.exactState,true);
   }
   const downloaded=page.waitForEvent('download');await page.locator('[data-action=save-export]').click();await(await downloaded).saveAs(out+'/'+id+'-after.json');assert.deepEqual(run.errors,[]);run.passed=true;
   console.log(JSON.stringify({id,frames:run.frames,step:run.steps.p95,render:run.renders.p95,draws:run.draws.p95,maxDebt:run.maxDebt,combatSeconds:run.combatSeconds}));
  }catch(e){run.failure=String(e.stack??e);report.errors.push(id+': '+e.message);await page.screenshot({path:out+'/'+id+'-failure.png'}).catch(()=>{});console.error(run.failure);}
  finally{await context.close();await fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));}
 }
 if(report.errors.length)process.exitCode=1;else report.passed=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}
finally{await fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));await browser?.close();if(dev)await server?.close();else if(server)await new Promise(r=>server.close(r));}
