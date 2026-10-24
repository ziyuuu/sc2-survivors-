import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';

const run=process.argv[2]??'visual-candidate-r1',variant=process.argv[3]??'candidate-r1',root=path.resolve('reports/local/performance-d02-medium-20261021',run),web=path.resolve(variant==='baseline'?'preview/performance-a03-20261021-r2':'preview/performance-d02-medium-20261021-'+variant);
const hash=b=>createHash('sha256').update(b).digest('hex');
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
const build=JSON.parse(await fs.readFile(web+'/build-inputs.json')),assets=JSON.parse(await fs.readFile('reports/local/performance-a03-20261021/asset-files-r2.json'));
for(const f of build.outputs)assert.equal(hash(await fs.readFile(f.file)),f.sha256,f.file);
const report={run,variant,build,scope:'A03/A02 frozen production baseline with explicit candidate medium-quality changes. Normal menu, easy terran, empty account, Char seed529, ordinary time/production/waves. No health lock, one-hit, injected units, equipment, cash or stage jumps. Sample the first real player shot with live enemies after 3/20/32 seconds, not preselected empty lull endpoints. Same naturally reached paused World compared using existing full/medium setters. GPU intervals are frozen rendering, not live FPS gains or full campaign acceptance.',progress:[],scenes:[],screens:[],errors:[],failedRequests:[],served:[],requests:[]};
let phase='boot',context,page,timer;
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),sha=url.pathname.match(/^\/assets\/([a-f0-9]{64})\.[a-z0-9]+$/)?.[1];
 if(sha){const f=assets[sha];if(!f){res.writeHead(404);res.end();return;}report.requests.push({phase,sha,bytes:f.bytes});res.writeHead(200,{'Content-Type':f.mime,'Content-Length':f.bytes,'Cache-Control':'public,max-age=31536000,immutable'});createReadStream(f.source).pipe(res);return;}
 const name=url.pathname==='/'?'index.html':url.pathname.slice(1);if(!['index.html','main.js','main.css','current.json','runtime-config.json'].includes(name)){res.writeHead(404);res.end();return;}
 const b=await fs.readFile(path.join(web,name));res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/html','Cache-Control':'no-store'});res.end(b);
}catch(e){report.errors.push({phase,server:String(e)});res.writeHead(500);res.end();}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const base=`http://127.0.0.1:${server.address().port}/`;report.base=base;
async function shot(name){
 const file=root+'/'+name+'.png';await page.screenshot({path:file});report.screens.push({name,file,sha256:hash(await fs.readFile(file))});await save();
}
async function canvasShot(name){
 const data=await page.evaluate(()=>D02.capture()),file=root+'/'+name+'.png';await fs.writeFile(file,Buffer.from(data.split(',')[1],'base64'));report.screens.push({name,file,sha256:hash(await fs.readFile(file)),scope:'Raw game canvas at unchanged paused World; excludes pause/UI overlay.'});await save();
}
try{
 context=await chromium.launchPersistentContext(root+'/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:1});
 page=context.pages()[0]??await context.newPage();page.setDefaultTimeout(60000);report.browser=context.browser()?.version();
 const pending=[];page.on('response',r=>{if(new URL(r.url()).pathname==='/main.js')pending.push(r.body().then(b=>report.served.push({url:r.url(),bytes:b.length,sha256:hash(b)})));});
 page.on('pageerror',e=>report.errors.push({phase,message:e.message}));page.on('console',m=>{if(m.type()==='error')report.errors.push({phase,message:m.text()});});page.on('requestfailed',r=>report.failedRequests.push({phase,url:r.url(),message:r.failure()?.errorText}));
 await context.addInitScript(()=>{for(const [k,v]of Object.entries({'sc2.renderQuality':'native','sc2.ordinaryEffects':'full','sc2.heroEffects':'full','sc2.animationMode':'complete','sc2.combatDetail':'full','sc2.newGameDifficulty':'easy'}))localStorage.setItem(k,v);});
 timer=setInterval(async()=>{try{const p=await page.evaluate(()=>({ready:window.A03?.app?.readiness.state,time:window.A03?.app?.world.time,phase:window.A03?.app?.world.phase,enemies:window.A03?.app?.world.enemyCount(),paused:window.A03?.app?.world.paused}));report.progress.push({phase,at:new Date().toISOString(),...p});console.log(JSON.stringify({work:phase,...p}));await save();}catch{}},15000);
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:180000});await page.waitForFunction(()=>window.A03?.app&&!document.getElementById('scs-opening-visual'),null,{timeout:240000});await shot('menu');
 for(const selector of ['[data-action=menu-new]','[data-action=menu-race][data-race=terran]','[data-action=menu-race-next]','[data-action=menu-difficulty][data-difficulty=easy]','[data-action=menu-difficulty-next]','[data-action=menu-start]'])await page.locator(selector+':visible').click();
 phase='loading';await page.waitForFunction(()=>['ready','error'].includes(A03.app.readiness.state.phase),null,{timeout:420000});assert.equal(await page.evaluate(()=>A03.app.readiness.state.phase),'ready');await shot('ready');
 await page.evaluate(()=>{const a=A03.app,commit=a.hud.onCommitFlow;a.hud.onCommitFlow=()=>{commit();a.world.paused=true;a.hud.update();a.hud.onCommitFlow=commit;};});
 await page.locator('[data-action=flow-continue]:visible').click();await page.waitForFunction(()=>A03.app.world.phase==='battle'&&A03.app.world.paused);
 report.initial=await page.evaluate(()=>({world:A03.selectRunData(A03.app.world),resolution:A03.app.view.report().resolution,settings:A03.app.view.combatPreset}));
 await page.evaluate(()=>{
  const a=A03.app,w=a.world,v=a.view,gl=v.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');if(!ext)throw Error('GPU timer unavailable');
  __SC2_DEBUG__.healthLock(false);__SC2_DEBUG__.oneHit(false);__SC2_DEBUG__.speed=1;
  const originalHealth=__SC2_DEBUG__.healthLock,originalOneHit=__SC2_DEBUG__.oneHit;
  __SC2_DEBUG__.healthLock=enabled=>{if(enabled)throw Error('D02 forbids health lock');return originalHealth(false);};__SC2_DEBUG__.oneHit=enabled=>{if(enabled)throw Error('D02 forbids one-hit');return originalOneHit(false);};
  const nativeStep=w.step,nativeRender=v.render,frame=()=>new Promise(r=>requestAnimationFrame(r));let target=Infinity,active=false,previous=0,live=[],shotTrigger=null;
  const shots=()=>w.allies().reduce((sum,u)=>sum+(u.shotSequence??0),0);
  const peaks={enemies:0,queue:0,entities:0},counts=()=>({time:w.time,tick:w.tick,phase:w.phase,stage:w.stage,paused:w.paused,enemies:w.enemyCount(),allies:w.allies().length,queue:w.ambientBacklog.length,kills:w.stats.kills,entities:w.entities.size,shots:shots(),shotTrigger,flights:w.weaponFlights.length,visualEvents:w.visualEvents.length,health:w.allies().map(u=>({id:u.id,hp:u.hp,maxHp:u.maxHp})),assetsPending:v.assetsPending,backlog:a.driver.accumulator,discarded:a.driver.discardedBacklogSeconds});
  w.step=function(...args){const previousShots=shots(),out=nativeStep.apply(this,args);peaks.enemies=Math.max(peaks.enemies,w.enemyCount());peaks.queue=Math.max(peaks.queue,w.ambientBacklog.length);peaks.entities=Math.max(peaks.entities,w.entities.size);const fired=shots()>previousShots;if(w.time+1e-8>=target&&w.enemyCount()>0&&fired||w.phase!=='battle'){shotTrigger={time:w.time,previousShots,shots:shots(),fired};active=false;w.paused=true;a.hud.update();}return out;};
  v.render=function(...args){const at=performance.now(),out=nativeRender.apply(this,args);if(active){live.push({at,interval:previous?at-previous:null,renderCpuMs:performance.now()-at,time:w.time,tick:w.tick,enemies:w.enemyCount(),backlog:a.driver.accumulator,assetsPending:v.assetsPending});previous=at;}return out;};
  const liveRender=v.render;
  const snapshot=()=>JSON.stringify({run:A03.selectRunData(w),statuses:w.statuses.snapshot(),specials:w.enemySpecials.snapshot(),visualEvents:w.visualEvents,account:w.starship.account},(_k,val)=>val instanceof Map?{map:[...val]}:val instanceof Set?{set:[...val]}:val);
  const camera=()=>({matrix:v.camera.matrixWorld.elements.slice(),projection:v.camera.projectionMatrix.elements.slice(),position:v.camera.position.toArray(),mode:v.cameraMode,output:v.cameraOutput});
  const settings=()=>({preset:v.combatPreset,quality:v.quality,animation:v.animationMode,ordinary:v.nonHeroEffects.quality,hero:v.fx.heroQuality,decoration:v.sourceCombatEffects.player.decorationFraction,contact:v.contact.report(),shadow:v.sceneShadows.report(),resolution:v.report().resolution,camera:camera(),source:v.sourceCombatEffects.report(),refraction:v.refraction.report(),simpleShadowInstances:v.shadows.count,bloom:v.heroComposer.passes.map(p=>({type:p.constructor.name,enabled:p.enabled,strength:p.strength,radius:p.radius,size:p.resolution?.toArray?.(),bright:p.renderTargetBright?[p.renderTargetBright.width,p.renderTargetBright.height]:null}))});
  window.D02={counts,snapshot,settings,
   device:()=>{const x=gl.getExtension('WEBGL_debug_renderer_info');return {userAgent:navigator.userAgent,renderer:x?gl.getParameter(x.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),viewport:[innerWidth,innerHeight],dpr:devicePixelRatio};},
   resume(seconds){target=seconds;live=[];previous=0;shotTrigger=null;v.setCombatPreset('full');w.paused=false;active=true;a.hud.update();return counts();},
   live:()=>({frames:live,counts:counts(),peaks:{...peaks}}),
   capture(){nativeRender.call(v,0,1);return v.renderer.domElement.toDataURL('image/png');},
   setPreset(preset){v.setCombatPreset(preset);nativeRender.call(v,0,1);a.hud.update();return settings();},
   async measure(preset,frames=24,warmup=10){
    if(!w.paused||w.phase!=='battle')throw Error('Scene must be naturally reached battle then paused');
    const before=snapshot();v.setCombatPreset(preset);v.render=()=>{};const pending=[],gpu=[],cpu=[];let disjoint=0;
    const poll=()=>{if(gl.getParameter(ext.GPU_DISJOINT_EXT)){disjoint++;throw Error('GPU disjoint');}for(let i=pending.length-1;i>=0;i--)if(gl.getQueryParameter(pending[i].q,gl.QUERY_RESULT_AVAILABLE)){const p=pending.splice(i,1)[0];gpu.push({frame:p.frame,ms:gl.getQueryParameter(p.q,gl.QUERY_RESULT)/1e6});gl.deleteQuery(p.q);}};
    try{
     for(let i=0;i<warmup;i++){nativeRender.call(v,0,1);await frame();}const cameraBefore=JSON.stringify(camera());
     for(let i=0;i<frames;i++){if(gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY))throw Error('GPU query already active');const q=gl.createQuery(),at=performance.now();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);try{nativeRender.call(v,0,1);}finally{gl.endQuery(ext.TIME_ELAPSED_EXT);}cpu.push(performance.now()-at);pending.push({q,frame:i});gl.flush();await frame();poll();}
     const deadline=performance.now()+10000;while(pending.length&&performance.now()<deadline){await frame();poll();}
     if(pending.length||gpu.length!==frames||snapshot()!==before||JSON.stringify(camera())!==cameraBefore)throw Error('Incomplete measurement or changed World/camera');gpu.sort((x,y)=>x.frame-y.frame);
     return {preset,frames,warmup,gpu,cpu,settings:settings(),counts:counts(),disjoint,pending:pending.length,stateExact:true,cameraExact:true};
    }finally{for(const p of pending)gl.deleteQuery(p.q);v.render=liveRender;}
   },
   cleanup(){w.step=nativeStep;v.render=nativeRender;v.setCombatPreset('full');__SC2_DEBUG__.healthLock=originalHealth;__SC2_DEBUG__.oneHit=originalOneHit;return counts();}
  };
 });
 report.device=await page.evaluate(()=>D02.device());await save();
 for(const seconds of [3,20,32]){
  phase='ordinary-live-'+seconds;const start=Date.now();await page.evaluate(seconds=>D02.resume(seconds),seconds);
  await page.waitForFunction(()=>A03.app.world.paused,null,{timeout:300000});const live=await page.evaluate(()=>D02.live());report.progress.push({phase,wallMs:Date.now()-start,live});await save();
  assert.equal(live.counts.phase,'battle','Ordinary run ended before intended sample');assert.ok(live.counts.time+1e-6>=seconds);assert.ok(live.counts.enemies>0&&live.counts.shotTrigger?.fired);assert.equal(live.counts.assetsPending,0);
  const state=await page.evaluate(()=>D02.snapshot());await fs.writeFile(root+`/t${seconds}.state.json`,state);const scene={seconds,counts:live.counts,stateSha256:hash(state),pairs:[]};report.scenes.push(scene);
  phase='paired-'+seconds;
  for(let round=0;round<6;round++){
   const row={round,order:round%2?['medium','full']:['full','medium'],windows:[]};
   for(const preset of row.order){const result=await page.evaluate(preset=>D02.measure(preset),preset);row.windows.push(result);if(round===0)await canvasShot(`t${seconds}-${preset}`);}
   assert.deepEqual(row.windows[0].settings.camera,row.windows[1].settings.camera);scene.pairs.push(row);await save();console.log(JSON.stringify({phase,round,enemies:scene.counts.enemies,windows:row.windows.map(w=>({preset:w.preset,samples:w.gpu.length}))}));
  }
  await page.evaluate(()=>D02.setPreset('full'));await canvasShot(`t${seconds}-full-restored`);assert.equal(await page.evaluate(()=>D02.snapshot()),state);scene.restoredStateExact=true;assert.equal(await page.evaluate(()=>D02.settings().shadow.enabled),true);assert.equal(await page.evaluate(()=>D02.settings().contact.enabled),true);await save();
 }
 phase='final';report.final=await page.evaluate(()=>({counts:D02.cleanup(),settings:D02.settings(),report:__SC2_REPORT__()}));await shot('final-paused');
 await Promise.all(pending);assert.equal(report.served.length,1);assert.equal(report.served[0].sha256,build.outputs.find(x=>x.file.endsWith('/main.js')).sha256);assert.equal(report.errors.length,0,JSON.stringify(report.errors));assert.equal(report.final.settings.preset,'full');report.pass=true;
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;if(page){report.failureText=await page.locator('body').innerText().catch(()=>null);await shot('failure').catch(()=>{});}}
finally{clearInterval(timer);await context?.close();server.closeAllConnections();await new Promise(r=>server.close(r));await save();console.log(JSON.stringify({run,pass:report.pass,scenes:report.scenes.length,screens:report.screens.length,errors:report.errors.length,failure:report.failure}));}
