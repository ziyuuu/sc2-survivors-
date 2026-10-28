/** Isolated entry diagnostics. WebKit on Windows is not a physical iOS test. */
import {chromium,webkit} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {installRuntimeMemoryTrace,instrumentPreparation,captureRuntimeMemoryInventory} from './runtime-memory-inventory.mjs';
const origin=process.argv[2]??'http://127.0.0.1:18884',engine=process.argv[3]??'chromium',label=process.argv[4]??'baseline',tier=process.argv[5]??'medium';
const renderOnly=process.argv.includes('--render-only'),predownload=process.argv.includes('--predownload'),reenter=process.argv.includes('--reenter');
if(renderOnly)assert(engine==='webkit'&&origin.endsWith('/quality-lab.html'),'Render-only requires the local WebKit harness');
const output=process.env.SC2_ENTRY_QA_OUTPUT??'reports/local/safari-20261028';await fs.mkdir(output,{recursive:true});
const peak=process.argv.includes('--peak');
const server=peak?await chromium.launchServer({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--enable-precise-memory-info','--disable-background-timer-throttling']}):null;
const memorySampler=server?spawn('python',['tools/sample-browser-memory.py',String(server.process().pid),`${output}/${label}-process-memory.jsonl`],{stdio:'ignore'}):null;
const browser=server?await chromium.connect(server.wsEndpoint()):await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{headless:true}:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-background-timer-throttling']});
const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true});
const offline=origin.startsWith('file:');if(offline)await context.setOffline(true);
const noCompressed=process.argv.includes('--no-compressed');
const inventory=process.argv.includes('--inventory');
if(inventory)await context.addInitScript(installRuntimeMemoryTrace);
await context.addInitScript(({tier,noCompressed})=>{
 globalThis.__name=v=>v;
 Object.defineProperty(navigator,'deviceMemory',{get:()=>undefined});Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>6});
 localStorage.setItem('sc2.graphics.v1',JSON.stringify(tier==='auto'?{version:1,preset:'auto',tier:'medium',texture:'medium',probeVersion:1}:{version:1,preset:tier,tier,texture:tier}));
 const random=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=b=>b instanceof Uint32Array&&b.length===1?(b[0]=529,b):random(b);
 const records=[],contexts=[];globalThis.__ENTRY_GL__=()=>({contexts:contexts.length,lost:contexts.filter(c=>c.isContextLost()).length,textures:records.filter(r=>!r.deleted).length,estimatedBytes:records.reduce((n,r)=>n+(r.deleted?0:r.bytes),0),peakBytes:globalThis.__ENTRY_GL_PEAK__??0,largest:records.filter(r=>!r.deleted).sort((a,b)=>b.bytes-a.bytes).slice(0,15).map(({bytes,width,height,format,source})=>({bytes,width,height,format,source}))});
 const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){const gl=original.apply(this,args);if(!gl||!['webgl','webgl2','experimental-webgl'].includes(args[0])||contexts.includes(gl))return gl;contexts.push(gl);
  if(noCompressed){const extension=gl.getExtension.bind(gl);gl.getExtension=name=>['WEBGL_compressed_texture_astc','EXT_texture_compression_bptc'].includes(name)?null:extension(name);}
  const textures=new Map(),bound=new Map();let unit=0;const wrap=(name,fn)=>{const f=gl[name].bind(gl);gl[name]=function(...a){const r=f(...a);fn(a,r);return r;};};
  wrap('createTexture',(_,t)=>{const r={bytes:0,width:0,height:0,source:'',deleted:false};records.push(r);textures.set(t,r);});
  wrap('activeTexture',a=>unit=a[0]);wrap('bindTexture',a=>bound.set(unit+':'+a[0],a[1]));wrap('deleteTexture',a=>{const r=textures.get(a[0]);if(r)r.deleted=true;});
  const update=(a,storage)=>{const target=a[0]>=gl.TEXTURE_CUBE_MAP_POSITIVE_X&&a[0]<=gl.TEXTURE_CUBE_MAP_NEGATIVE_Z?gl.TEXTURE_CUBE_MAP:a[0],r=textures.get(bound.get(unit+':'+target));if(!r)return;
   const image=!storage&&(a.length===6?a[5]:a.length>=9&&typeof a[8]==='object'?a[8]:null),w=storage?a[3]:a.length===6?image?.width:a[3],h=storage?a[4]:a.length===6?image?.height:a[4],format=a[2];
   if(!Number.isFinite(w*h))return;const bpp=[36492,36493,37808,37840,37496,37497,33779,35919].includes(format)?1:format===gl.RGBA32F?16:format===gl.RGBA16F?8:format===gl.RGB32F?12:format===gl.RGB16F?6:format===gl.RGB8?3:format===gl.R8?1:4;
   const bytes=w*h*bpp*(target===gl.TEXTURE_CUBE_MAP?6:1)*(storage&&a[1]>1?4/3:1);if(storage||a[1]===0){r.bytes=bytes;r.width=w;r.height=h;r.format=format;r.source=image?.src??'';}
   globalThis.__ENTRY_GL_PEAK__=Math.max(globalThis.__ENTRY_GL_PEAK__??0,records.reduce((n,r)=>n+(r.deleted?0:r.bytes),0));
  };
  wrap('texImage2D',a=>update(a,false));if(gl.texStorage2D)wrap('texStorage2D',a=>update(a,true));
  this.addEventListener('webglcontextlost',()=>{for(const record of textures.values())record.deleted=true;textures.clear();bound.clear();});
  return gl;
 };
},{tier,noCompressed});
const page=await context.newPage();page.setDefaultTimeout(180000);const errors=[],failures=[],samples=[];let frameTiming=null;
const networkRequests=[];if(offline)page.on('request',r=>{if(/^https?:/.test(r.url()))networkRequests.push(r.url());});
page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('page-crash'));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/')&&!r.url().endsWith('favicon.ico'))failures.push({status:r.status(),url:r.url()});});
const sample=async tag=>{const value=await page.evaluate(()=>({phase:globalThis.__SC2_REPORT__?.().phase,readiness:globalThis.__SC2_REPORT__?.().readiness,graphics:globalThis.__SC2_REPORT__?.().graphics,assets:globalThis.__SC2_REPORT__?.().embeddedAssets,gl:globalThis.__ENTRY_GL__?.(),heap:performance.memory?.usedJSHeapSize,time:globalThis.__SC2_REPORT__?.().time}));samples.push({tag,unixMs:Date.now(),...value});console.log(JSON.stringify({tag,phase:value.phase,readiness:value.readiness?.phase,bytes:value.gl?.estimatedBytes,textures:value.gl?.textures,heap:value.heap}));return value;};
const peakSamples=[];let peakBusy=false;const cdp=peak?await context.newCDPSession(page):null;
const peakTick=peak?setInterval(async()=>{if(peakBusy)return;peakBusy=true;try{const heap=await cdp.send('Runtime.getHeapUsage'),state=await page.evaluate(()=>({phase:globalThis.__SC2_REPORT__?.().readiness?.phase,gl:globalThis.__ENTRY_GL__?.()}));peakSamples.push({unixMs:Date.now(),...heap,...state});}catch{}finally{peakBusy=false;}},500):null;
const tick=setInterval(()=>sample('loading').catch(()=>{}),20000),click=a=>page.locator(`[data-action="${a}"]:visible`).first().click();
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>globalThis.__SC2_REPORT__?.().phase==='menu'&&!document.getElementById('scs-opening-visual'),null,{timeout:300000});await sample('menu');
 if(inventory){assert(origin.endsWith('/quality-lab.html'),'Inventory needs the local harness');await page.evaluate(instrumentPreparation);}
 if(renderOnly)await page.evaluate(()=>{if(typeof AudioContext!=='undefined')throw Error('Web Audio is available: use the full test');const audio=globalThis.__QUALITY_APP__.readiness.audio;audio.prepareBanks=async()=>{};audio.start=async()=>{};audio.native.ensureAsset=undefined;});
 if(predownload){await click('settings');await page.locator('[data-action="settings-tab"][data-tab="downloads"]').click();await click('download-race');await page.waitForFunction(()=>document.querySelector('[data-download-status]')?.textContent?.includes('预下载完成'),null,{timeout:600000});await sample('predownload');await click('settings-back');}
 for(const a of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await click(a);
 await page.waitForFunction(()=>['ready','error'].includes(globalThis.__SC2_REPORT__().readiness.phase),null,{timeout:600000});const ready=await sample('ready');assert.equal(ready.readiness.phase,'ready');
 if(inventory)await fs.writeFile(`${output}/${label}-inventory.json`,JSON.stringify(await page.evaluate(captureRuntimeMemoryInventory),null,2));
 await page.evaluate(()=>{const rows=[];globalThis.__ENTRY_FRAMES__=rows;globalThis.__ENTRY_FRAMES_ACTIVE__=true;let previous;const tick=time=>{if(!globalThis.__ENTRY_FRAMES_ACTIVE__)return;if(previous!==undefined)rows.push(time-previous);previous=time;requestAnimationFrame(tick);};requestAnimationFrame(tick);});
 await click('flow-continue');await page.waitForFunction(()=>globalThis.__SC2_REPORT__().time>5,null,{timeout:180000});
 frameTiming=await page.evaluate(()=>{globalThis.__ENTRY_FRAMES_ACTIVE__=false;const rows=globalThis.__ENTRY_FRAMES__.sort((a,b)=>a-b);return {scope:'first five simulation seconds after ready',count:rows.length,p50:rows[Math.floor(rows.length*.5)],p95:rows[Math.floor(rows.length*.95)],max:rows.at(-1)};});
 await page.screenshot({path:`${output}/${engine}-${label}-${tier}-battle.png`});await click('pause');await sample('battle');
 if(origin.endsWith('/quality-lab.html')){const details=await page.evaluate(()=>({textures:globalThis.__QUALITY_APP__.localTextureInventory(),report:globalThis.__SC2_REPORT__()}));await fs.writeFile(`${output}/${engine}-${label}-${tier}-details.json`,JSON.stringify(details,null,2));}
 await page.screenshot({path:`${output}/${engine}-${label}-${tier}.png`});
 if(process.argv.includes('--postprocess')){
  assert(inventory,'Postprocess diagnostics require inventory');const states=[];
  for(const detail of ['full','low','full','medium']){
   const changed=await page.evaluate(detail=>{const {view,world}=globalThis.__QUALITY_APP__,before=JSON.stringify(world.captureRun());view.setCombatDetail(detail);view.warmLightingFrame();view.render(.016,1);return {detail,worldUnchanged:JSON.stringify(world.captureRun())===before,gl:globalThis.__ENTRY_GL__()};},detail);
   assert(changed.worldUnchanged,'Effects change mutated simulation');states.push({...changed,inventory:await page.evaluate(captureRuntimeMemoryInventory)});
   await page.screenshot({path:`${output}/${label}-effects-${states.length}-${detail}.png`});
   const canvas=await page.evaluate(()=>{const v=globalThis.__QUALITY_APP__.view;v.renderScene();return v.canvas.toDataURL('image/png').split(',')[1];});
   await fs.writeFile(`${output}/${label}-canvas-${states.length}-${detail}.png`,Buffer.from(canvas,'base64'));
   if(process.argv.includes('--assert-released')){
    const targets=states.at(-1).inventory.targets,off=targets.filter(t=>detail!=='full'&&/^(contact|refraction)/.test(t.name)||detail==='low'&&t.name.startsWith('bloom.'));
    assert(off.every(t=>!t.textureAllocated&&!t.depthTextureAllocated&&!t.framebufferAllocated),'Disabled effects retained GPU targets');
   }
  }
  await fs.writeFile(`${output}/${label}-postprocess.json`,JSON.stringify(states,null,2));
  if(process.argv.includes('--assert-released')){
   await page.evaluate(()=>{const v=globalThis.__QUALITY_APP__.view;v.setCombatDetail('low');v.warmLightingFrame();});
   for(const [width,height]of [[390,844],[844,390]]){await page.setViewportSize({width,height});await page.waitForTimeout(200);await page.evaluate(()=>globalThis.__QUALITY_APP__.view.warmLightingFrame());const r=await page.evaluate(captureRuntimeMemoryInventory);assert(r.targets.filter(t=>/^(contact|refraction|bloom)/.test(t.name)).every(t=>!t.textureAllocated&&!t.framebufferAllocated),'Resize reallocated disabled effect');}
   await page.evaluate(()=>{const v=globalThis.__QUALITY_APP__.view;v.setCombatDetail('full');v.warmLightingFrame();});
   await page.evaluate(()=>{globalThis.__QA_CONTEXT_RESTORED__=false;const v=globalThis.__QUALITY_APP__.view;v.canvas.addEventListener('webglcontextrestored',()=>globalThis.__QA_CONTEXT_RESTORED__=true,{once:true});const ext=v.renderer.getContext().getExtension('WEBGL_lose_context');if(!ext)throw Error('No context loss extension');ext.loseContext();setTimeout(()=>ext.restoreContext(),200);});
   await page.waitForFunction(()=>globalThis.__QA_CONTEXT_RESTORED__&&!globalThis.__QUALITY_APP__.readiness.blocking,null,{timeout:300000});
   assert.notEqual(await page.evaluate(()=>globalThis.__QUALITY_APP__.readiness.state.phase),'error','Production restoration gate failed');
   await page.evaluate(()=>globalThis.__QUALITY_APP__.view.renderScene());
   const restored=await page.evaluate(captureRuntimeMemoryInventory);assert.equal((await page.evaluate(()=>globalThis.__ENTRY_GL__())).lost,0);assert(restored.targets.filter(t=>/^(contact|refraction|bloom)/.test(t.name)).every(t=>t.textureAllocated),'Context restore missed required effects');
   const image=await page.evaluate(()=>{const v=globalThis.__QUALITY_APP__.view;v.renderScene();return v.canvas.toDataURL('image/png').split(',')[1];});await fs.writeFile(`${output}/${label}-canvas-restored.png`,Buffer.from(image,'base64'));
   await fs.writeFile(`${output}/${label}-restored.json`,JSON.stringify({restored,errors},null,2));
  }
 }
 if(process.argv.includes('--settle')){
  assert(cdp,'Settling metrics require --peak');
  await page.waitForTimeout(20000);await sample('settled');
  await cdp.send('HeapProfiler.collectGarbage');await page.waitForTimeout(2000);await sample('after-explicit-gc');
 }
 if(reenter){
  await click('restart');await page.waitForFunction(()=>globalThis.__SC2_REPORT__().phase==='menu');await sample('returned-menu');
  for(const a of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await click(a);
  await page.waitForFunction(()=>['ready','error'].includes(globalThis.__SC2_REPORT__().readiness.phase),null,{timeout:600000});
  assert.equal((await sample('second-ready')).readiness.phase,'ready');await click('flow-continue');
  await page.waitForFunction(()=>globalThis.__SC2_REPORT__().time>3);await click('pause');const second=await sample('second-battle');
  assert.equal(second.gl.lost,0);assert(second.gl.estimatedBytes<ready.gl.estimatedBytes*1.10,'Second entry unexpectedly grew live texture allocation');
 }
 if(process.argv.includes('--unit-cache')){
  assert(origin.endsWith('/quality-lab.html'),'Cache checks require the local harness');const {verifyRetainedUnitAssets}=await import('./verify-retained-unit-assets.mjs');await verifyRetainedUnitAssets(page,output);
 }
 if(process.argv.includes('--scene-scope')){
  assert(origin.endsWith('/quality-lab.html'),'Scene scope checks require the local harness');
  const {verifySceneScope}=await import('./verify-battle-scene-scope.mjs');await verifySceneScope(page,output);
 }
 if(process.argv.includes('--combat-scope')){
  assert(origin.endsWith('/quality-lab.html'),'Combat scope checks require the local harness');const {verifyScopedCombatAssets}=await import('./verify-scoped-combat-assets.mjs');await verifyScopedCombatAssets(page,output);
 }
 if(process.argv.includes('--equipment-scope')){
  assert(origin.endsWith('/quality-lab.html'),'Equipment check requires the local harness');const {verifyScopedEquipmentAssets}=await import('./verify-scoped-combat-assets.mjs');await verifyScopedEquipmentAssets(page,output);
 }
 if(process.argv.includes('--campaign-three')){
  assert(origin.endsWith('/quality-lab.html'),'Campaign check requires the local harness');const {verifyThreeStageEntry}=await import('./verify-three-stage-entry.mjs');await verifyThreeStageEntry(page,output);
 }
 if(noCompressed){const gpu=samples.find(s=>s.tag==='battle').graphics.textures.gpu;assert.equal(gpu.supported,false);assert.equal(gpu.loaded,0);}
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);if(offline)assert.deepEqual(networkRequests,[],'Offline entry requested the network');
}catch(e){errors.push(String(e));await sample('failure').catch(()=>{});process.exitCode=1;}
finally{clearInterval(tick);if(peakTick)clearInterval(peakTick);if(peak)await fs.writeFile(`${output}/${label}-peaks.json`,JSON.stringify({note:'Windows owned browser tree private commit; CDP heap/backingStorage and GL estimates overlap. Not physical iOS or total GPU RAM.',peakSamples},null,2));await fs.writeFile(`${output}/${engine}-${label}-${tier}.json`,JSON.stringify({engine,label,tier,renderOnly,predownload,reenter,offline,networkRequests:offline?networkRequests:undefined,physicalAppleDevice:false,frameTiming,samples,errors,failures},null,2));await context.close();await browser.close();if(server)await server.close();if(memorySampler)await new Promise(r=>memorySampler.exitCode!==null?r():memorySampler.once('exit',r));}
