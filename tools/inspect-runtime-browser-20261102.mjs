/** Finite runtime audit for 8d680ac. Isolated build, Chrome profile and HTTP origin.
 * Does not change product sources, published assets or real player saves.
 * node tools/inspect-runtime-browser-20261102.mjs [--no-build] [--policy-only|--normal-only|--continuation-only]
 * Browser fault cases assert observed baseline defects, not desired behavior.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createServer} from 'node:http';
import {build} from 'vite';
import {chromium} from '@playwright/test';
import {packedLauncher} from './packed-startup.mjs';
import {createBackend} from './backend/service.mjs';

const out=path.resolve('reports/local/runtime-audit-20261102/browser'),packed=path.resolve('sites/size-optimized-site/public');
const sha=b=>createHash('sha256').update(b).digest('hex'),read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
await fs.mkdir(out+'/assets',{recursive:true});
const descriptor=await read(packed+'/web-release.json'),manifest=await read(packed+'/'+descriptor.manifest),proof=await read(packed+'/compressed-resource-provenance.json');
if(!process.argv.includes('--no-build')){
 await build({base:'./',publicDir:false,plugins:[{name:'runtime-audit-expose',enforce:'pre',transform(code,id){
  if(id.replaceAll('\\','/').endsWith('/src/main.ts')){assert.ok(code.includes('startGame().catch('));return code.replace('startGame().catch(','startGame(1801).then(app=>{globalThis.__RUNTIME_APP__=app;}).catch(');}
 }}],build:{outDir:out+'/build',emptyOutDir:true,minify:true,target:'es2022'}});
 const built=await fs.readFile(out+'/build/index.html','utf8'),entry=built.match(/src="\.\/([^" ]+\.js)"/)[1],css=built.match(/href="\.\/([^" ]+\.css)"/)[1];
 let code=await fs.readFile(out+'/build/'+entry,'utf8'),references=0;
 for(const [id,a] of Object.entries(proof.sources))if(a.mime==='model/gltf-binary'&&a.sha256!==manifest.assets[id].sha256){references+=code.split(a.sha256).length-1;code=code.replaceAll(a.sha256,manifest.assets[id].sha256);}
 const payload=gzipSync(code),name='runtime-audit.'+sha(payload).slice(0,16)+'.js.gz',sw=await fs.readFile(packed+'/sites-sw.js','utf8');
 const index=(await fs.readdir(packed)).find(f=>/^sites-pack-index\.[a-f0-9]+\.js$/.test(f)&&sw.includes(f));assert.ok(index);
 await fs.writeFile(out+'/assets/'+name,payload);await fs.writeFile(out+'/assets/audit-launcher.js',packedLauncher(name,index).replace("scope:'../'","scope:new URL('../',import.meta.url).href"));
 await fs.copyFile(out+'/build/'+css,out+'/'+css);
 const production=await fs.readFile(packed+'/index.html','utf8');await fs.writeFile(out+'/index.html',production.replace(/src="\.\/assets\/index-[^"]+\.js"/,'src="./assets/audit-launcher.js"').replace(/href="\.\/assets\/index-[^"]+\.css"/,'href="./'+css+'"'));
 await fs.writeFile(out+'/diagnostic-build.json',JSON.stringify({baseline:'8d680ac',originalAppBuildId:descriptor.appBuildId,release:descriptor.release,seed:1801,entrySha256:sha(payload),modelIdentityReferences:references,onlyTransform:'Expose returned app and fixed initial map seed; source gameplay unchanged'},null,2));
}
const report={date:'2026-11-02',build:await read(out+'/diagnostic-build.json'),scope:'Windows Chrome headless, isolated origin/profile, medium graphics; finite lifecycle checks; diagnostic stage end and injected browser policy clearly labelled',cases:[],pageErrors:[],httpFailures:[],console:[]};
const backend=createBackend({config:{enabled:false},maintenance:false}),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{try{
 if(backend.handle(req,res))return;
 let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);const denied=name.startsWith('denied/');if(denied)name=name.slice(7);
 name||='index.html';if(name.split('/').some(p=>p==='..'||p.startsWith('.')||p.includes('\\')))throw Error('Invalid path');
 const bytes=await fs.readFile(path.join(out,name)).catch(e=>{if(e.code!=='ENOENT')throw e;return fs.readFile(path.join(packed,name));});
 res.setHeader('Content-Type',mime[path.extname(name)]??'application/octet-stream');res.setHeader('Cache-Control','no-cache');if(denied)res.setHeader('Permissions-Policy','gamepad=()');res.end(bytes);
}catch(error){res.writeHead(error.code==='ENOENT'?404:500).end();}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const origin='http://127.0.0.1:'+server.address().port;
let browser,page,tick,mode='';
const add=result=>{report.cases.push(result);console.log(JSON.stringify(result));};
const readState=()=>page.evaluate(()=>{const a=globalThis.__RUNTIME_APP__;if(!a)return null;const {world:w,view:v,session:s,readiness:r,driver:d}=a,audio=globalThis.__SC2_REPORT__?.().audio;return {phase:w.phase,stage:w.stage,rewardRound:w.rewardRound,time:w.time,paused:w.paused,runId:w.runId,revision:w.revision,readiness:r.state,save:s.report(),contextEpoch:v.contextEpoch,assetsPending:v.assetsPending,errors:v.report().errors,frames:v.renderer.info.render.frame,worldListeners:w.listeners.size,profileListeners:w.permanentProfile.listeners.size,entities:w.entities.size,gpuModels:v.gpu.size,geometry:v.renderer.info.memory.geometries,textures:v.renderer.info.memory.textures,programs:v.renderer.info.programs?.length,backlog:d.accumulator,discarded:d.discardedBacklogSeconds,dom:document.querySelectorAll('*').length,audio:audio&&{pcmBytes:audio.pcmBytes,originalDecoded:audio.originalDecoded,decode:audio.decode,activeVoices:audio.activeVoices,errors:audio.errors,music:audio.music}};});
const click=action=>page.locator('[data-action="'+action+'"]:visible').first().click();
const ready=async()=>{await page.waitForFunction(()=>['ready','error'].includes(globalThis.__RUNTIME_APP__?.readiness.state.phase),null,{timeout:180000});const s=await readState();assert.equal(s.readiness.phase,'ready',JSON.stringify(s.readiness));await click('flow-continue');await page.waitForFunction(()=>['battle','reward','won','endless-ready'].includes(globalThis.__RUNTIME_APP__?.world.phase)&&!globalThis.__RUNTIME_APP__?.readiness.state.kind);};
const advance=async seconds=>{const before=await readState();await page.waitForFunction(t=>globalThis.__RUNTIME_APP__?.world.time>=t,before.time+seconds,{timeout:60000});return readState();};
const newGame=async()=>{for(const action of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await click(action);await ready();};
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-audio-output','--disable-background-timer-throttling']});
 tick=setInterval(async()=>console.log(JSON.stringify({progress:mode,state:await readState().catch(()=>null)})),25000);
 if(!process.argv.includes('--policy-only')){
  mode='normal';const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});await context.addInitScript(()=>localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:'medium',tier:'medium',texture:'medium',probeVersion:1})));
  page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>report.pageErrors.push({mode,message:e.message}));page.on('response',r=>{if(r.status()>=400)report.httpFailures.push({mode,status:r.status(),url:r.url()});});page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')report.console.push({mode,type:m.type(),text:m.text()});});
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>globalThis.__RUNTIME_APP__&&!document.getElementById('scs-opening-visual'),null,{timeout:180000});await page.screenshot({path:out+'/menu.png'});
  await newGame();let s=await advance(process.argv.includes('--continuation-only')?2:10);if(!process.argv.includes('--continuation-only')){add({name:'ordinary-first-battle',state:s});await page.screenshot({path:out+'/battle.png'});
  await page.keyboard.down('KeyD');await page.waitForTimeout(900);await page.keyboard.up('KeyD');await click('pause');const p0=await readState();await page.waitForTimeout(1300);const p1=await readState();assert.equal(p1.time,p0.time);await page.getByRole('button',{name:'继续',exact:true}).click();s=await advance(2);add({name:'keyboard-and-pause',pausedTime:p0.time,resumedTime:s.time,framesWhilePaused:p1.frames-p0.frames});
  const beforeOffline=await readState();await context.setOffline(true);await page.waitForTimeout(3500);const duringOffline=await readState();await context.setOffline(false);assert.ok(duringOffline.time>beforeOffline.time);s=await advance(1);add({name:'offline-active-battle',before:beforeOffline.time,during:duringOffline.time,after:s.time,errors:s.errors});
  const cdp=await context.newCDPSession(page);await page.evaluate(()=>{globalThis.__VISIBILITY_EVENTS__=[];document.addEventListener('visibilitychange',()=>globalThis.__VISIBILITY_EVENTS__.push({hidden:document.hidden,state:document.visibilityState}));});
  const visibleBefore=await readState();await cdp.send('Page.setWebLifecycleState',{state:'frozen'});await page.waitForTimeout(1600);await cdp.send('Page.setWebLifecycleState',{state:'active'});await page.waitForTimeout(200);const visibleAfter=await readState(),visibilityEvents=await page.evaluate(()=>globalThis.__VISIBILITY_EVENTS__);
  add({name:'cdp-freeze-restore',before:visibleBefore.time,after:visibleAfter.time,paused:visibleAfter.paused,events:visibilityEvents});
  if(!visibleAfter.paused){await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});const b=await readState();await page.waitForTimeout(1100);const c=await readState();assert.equal(b.time,c.time);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});add({name:'synthetic-hidden-handler',before:b.time,after:c.time,paused:c.paused});}
  await page.getByRole('button',{name:'继续',exact:true}).click();await advance(1);
  await page.evaluate(()=>{const gl=globalThis.__RUNTIME_APP__.view.renderer.getContext();globalThis.__AUDIT_CONTEXT_LOSS__=gl.getExtension('WEBGL_lose_context');globalThis.__AUDIT_CONTEXT_LOSS__.loseContext();});await page.waitForFunction(()=>globalThis.__RUNTIME_APP__.view.contextEpoch>0);const lost=await readState();await page.waitForTimeout(250);await page.evaluate(()=>globalThis.__AUDIT_CONTEXT_LOSS__.restoreContext());await page.waitForFunction(()=>!globalThis.__RUNTIME_APP__.readiness.state.kind&&globalThis.__RUNTIME_APP__.view.assetsPending===0,null,{timeout:180000});const restored=await readState();if(restored.paused)await page.getByRole('button',{name:'继续',exact:true}).click();s=await advance(2);assert.deepEqual(s.errors,[]);add({name:'webgl-extension-loss-restore',lossEpoch:lost.contextEpoch,lostReadiness:lost.readiness,restoredEpoch:s.contextEpoch,time:s.time,errors:s.errors});await page.screenshot({path:out+'/context-restored.png'});
  const cycles=[];for(let i=0;i<3;i++){await click('pause');const before=await readState();await click('restart');await page.waitForFunction(()=>globalThis.__RUNTIME_APP__.world.phase==='menu');await click('save-continue');await page.waitForFunction(()=>globalThis.__RUNTIME_APP__.world.phase==='battle');await page.getByRole('button',{name:'继续',exact:true}).click();const after=await advance(2);assert.equal(after.runId,before.runId);assert.equal(after.worldListeners,before.worldListeners);assert.equal(after.profileListeners,before.profileListeners);cycles.push({i,before,after});}add({name:'three-menu-live-resume-cycles',cycles});
  }
  await page.evaluate(()=>globalThis.__RUNTIME_APP__.world.endStage());await page.waitForFunction(()=>globalThis.__RUNTIME_APP__.world.phase==='reward');await page.waitForFunction(()=>!globalThis.__RUNTIME_APP__.session.busy);const reward=await readState();assert.ok(!reward.save.message.startsWith('保存失败'));await page.screenshot({path:out+'/intermission.png'});if(reward.rewardRound==='building'){await click('skip');await page.waitForFunction(()=>globalThis.__RUNTIME_APP__.world.rewardRound==='random');}await click('skip');await page.waitForFunction(()=>globalThis.__RUNTIME_APP__.world.phase==='battle'&&globalThis.__RUNTIME_APP__.world.stage===2&&!globalThis.__RUNTIME_APP__.readiness.state.kind,null,{timeout:180000});s=await advance(2);add({name:'diagnostic-end-stage-real-advance',reward,stage2:s});
  await click('pause');await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>globalThis.__RUNTIME_APP__&&!document.getElementById('scs-opening-visual'),null,{timeout:180000});assert.equal((await readState()).save.canResume,true);await click('save-continue');await ready();const loadedCheckpoint=await readState();assert.equal(loadedCheckpoint.phase,'reward');assert.equal(loadedCheckpoint.stage,1);assert.equal(loadedCheckpoint.rewardRound,'random');await click('skip');await page.waitForFunction(()=>globalThis.__RUNTIME_APP__.world.phase==='battle'&&globalThis.__RUNTIME_APP__.world.stage===2&&!globalThis.__RUNTIME_APP__.readiness.state.kind,null,{timeout:180000});s=await advance(2);add({name:'reload-checkpoint-resume',loadedCheckpoint,state:s});
  await click('pause');await click('restart');await newGame();s=await advance(3);assert.equal(s.stage,1);add({name:'new-run-after-resume',state:s});assert.deepEqual(report.pageErrors.filter(e=>e.mode==='normal'),[]);await context.close();
 }
 if(!process.argv.includes('--normal-only')){
  mode='gamepad-policy';const context=await browser.newContext({viewport:{width:1280,height:720}});await context.addInitScript(()=>localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:'medium',tier:'medium',texture:'medium',probeVersion:1})));
  page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);report.pageErrors.push({mode,message:e.message});});await page.goto(origin+'/denied/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>globalThis.__RUNTIME_APP__,null,{timeout:180000});
  const measure=()=>page.evaluate(()=>{const a=globalThis.__RUNTIME_APP__;let gamepad;try{navigator.getGamepads();gamepad='ok';}catch(e){gamepad={name:e.name,message:e.message};}return {frames:a.view.renderer.info.render.frame,time:a.world.time,phase:a.world.phase,gamepad,policy:document.featurePolicy?.allowsFeature('gamepad')};});
  const first=await measure();await page.waitForTimeout(1800);const second=await measure();assert.equal(first.gamepad.name,'SecurityError');assert.equal(second.frames,first.frames);assert.ok(errors.some(e=>e.includes('getGamepads')));add({name:'gamepad-policy-kills-raf',first,second,errors});await page.screenshot({path:out+'/policy-stopped.png'});await context.close();
 }
 report.complete=true;
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{clearInterval(tick);await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await backend.close();const filename=process.argv.includes('--continuation-only')?'browser-continuation.json':process.argv.includes('--policy-only')?'browser-policy.json':'browser.json';await fs.writeFile(out+'/'+filename,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({complete:report.complete,cases:report.cases.map(c=>c.name),failure:report.failure,pageErrors:report.pageErrors,httpFailures:report.httpFailures}));
