import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';
import {createGameServer} from './coze-web-server.mjs';
import {World} from '../src/simulation/world';
import {campaignTerrain} from '../src/data/campaign-map';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {encodeGraph} from '../src/persistence/graph-codec';

const out=process.argv[2],html=process.argv.find(a=>a.startsWith('--html='))?.slice(7),desktop=process.argv.includes('--desktop');
assert.ok(out?.startsWith('reports/local/mobile-settings-20261014/')&&!out.includes('..'));
await fs.mkdir(out,{recursive:true});await fs.access(out+'/result.json').then(()=>{throw Error('Evidence already exists');},e=>{if(e.code!=='ENOENT')throw e;});
await fs.copyFile(new URL(import.meta.url),out+'/runner.mts');
const release=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));
const server=createGameServer({webRoot:path.resolve('dist/web'),backendOptions:{config:{enabled:false}}});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const report:any={at:new Date().toISOString(),build:release,offline:!!html,desktop,method:'Actual local production Web or named offline HTML. Native settings, fullscreen, file caching, archive import/export and CDP touch/rotation in disposable Windows Chromium contexts. Native fixtures isolate timed events. Emulated viewports and input do not establish physical Android/iPhone/Safari acceptance.',errors:[],consoleErrors:[],httpErrors:[],navigations:[],screens:[],checks:[],rotations:[],exports:[],requests:[]};
if(html)report.html={path:html,sha256:createHash('sha256').update(await fs.readFile(html)).digest('hex')};
let browser:any,page:any,context:any,cdp:any,timer:ReturnType<typeof setInterval>|undefined,phase='boot';
const read=()=>page.evaluate(()=>(window as any).__SC2_REPORT__());
const stage=(name:string)=>{phase=name;console.log(JSON.stringify({stage:name,at:new Date().toISOString()}));};
async function shot(name:string){await page.screenshot({path:path.join(out,name+'.png')});report.screens.push(name+'.png');console.log('screenshot '+name);}
async function tab(id:string){await page.locator(`[data-action="settings-tab"][data-tab="${id}"]`).click();}
async function settingsFromPause(){await page.locator('.pause-actions [data-action="settings"]').click();}
async function settingsBack(){await page.locator('.settings-modal [data-action="settings-back"]').last().click();}
async function layout(name:string){
 const state=await page.evaluate(()=>{const b=document.querySelector('.settings-modal')!.getBoundingClientRect(),body=document.querySelector('.settings-body')!,r=(e:Element)=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {viewport:{width:visualViewport!.width,height:visualViewport!.height},modal:r(document.querySelector('.settings-modal')!),tabs:[...document.querySelectorAll('.settings-tabs button')].map(r),body:{scrollWidth:body.scrollWidth,clientWidth:body.clientWidth},visibleDownloadButtons:[...document.querySelectorAll('.download-actions button:not([hidden])')].map(e=>({...r(e),text:e.textContent}))};});
 assert.ok(state.modal.x>=-1&&state.modal.y>=-1&&state.modal.x+state.modal.width<=state.viewport.width+1&&state.modal.y+state.modal.height<=state.viewport.height+1,name+' modal within viewport');assert.ok(state.tabs.every((r:any)=>r.height>=43.9),name+' 44px tabs');assert.ok(state.body.scrollWidth<=state.body.clientWidth+1,name+' no horizontal overflow');(report.layouts??=[]).push({name,...state});
}
async function rotate(width:number,height:number,angle=width>height?90:0){
 const before=await page.evaluate(()=>{(window as any).__resizeMutations=[];return performance.now();});
 await page.setViewportSize({width,height});
 if(!desktop)await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true,screenOrientation:{type:width>height?(angle===270?'landscapeSecondary':'landscapePrimary'):'portraitPrimary',angle}});
 await page.waitForFunction(({width,height}:any)=>{const r=(window as any).__SC2_REPORT__?.().resolution,canvas=document.getElementById('battle')!.getBoundingClientRect();return r&&Math.abs(r.cssWidth-width)<1&&Math.abs(r.cssHeight-height)<1&&Math.abs(canvas.width-width)<1&&Math.abs(canvas.height-height)<1;},{width,height},{timeout:20000});
 const after=await page.evaluate(()=>({at:performance.now(),mutations:(window as any).__resizeMutations??[],orientation:screen.orientation?.type}));report.rotations.push({width,height,angle,observedMs:after.at-before,canvasMutations:after.mutations,orientation:after.orientation});
}
async function exportRun(label:string){
 const download=page.waitForEvent('download');await page.locator('[data-action="save-export"]').last().click();const file=await(await download).path(),raw=await fs.readFile(file,'utf8'),name=`${String(report.exports.length+1).padStart(2,'0')}-${label}.json`;await fs.writeFile(path.join(out,name),raw);report.exports.push(name);return readArchive(raw).bundle;
}
async function elapsed(seconds:number){const start=(await read()).time;await page.waitForFunction((target:number)=>(window as any).__SC2_REPORT__().time>=target,start+seconds,{timeout:60000});}
const cacheFiles=()=>page.evaluate(async()=>(await(await caches.open('sc2-resource-bytes-v1')).keys()).length);

try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files']});
 report.browser=browser.version();context=await browser.newContext({viewport:desktop?{width:1280,height:720}:{width:375,height:812},deviceScaleFactor:1,hasTouch:!desktop,isMobile:!desktop});
 await context.addInitScript('window.__name=(value)=>value;');if(html)await context.setOffline(true);
 page=await context.newPage();page.setDefaultTimeout(60000);cdp=await context.newCDPSession(page);
 page.on('pageerror',(e:Error)=>{report.errors.push(e.message);console.log('pageerror '+e.message);});page.on('console',(m:any)=>{if(m.type()==='error')report.consoleErrors.push(m.text());});page.on('framenavigated',(frame:any)=>{if(frame===page.mainFrame())report.navigations.push(frame.url());});
 page.on('response',(r:any)=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()});});page.on('request',(r:any)=>{if(/^https?:/.test(r.url()))report.requests.push({url:r.url(),phase,at:Date.now()});});
 await page.goto(html?pathToFileURL(path.resolve(html)).href:'http://127.0.0.1:'+(server.address() as any).port,{waitUntil:'domcontentloaded',timeout:600000});
 await page.locator('.game-footer [data-action="settings"]').click({timeout:300000});
 await page.evaluate(()=>{(window as any).__resizeMutations=[];new MutationObserver(records=>{for(const r of records)(window as any).__resizeMutations.push({name:r.attributeName,value:(r.target as Element).getAttribute(r.attributeName!),at:performance.now()});}).observe(document.getElementById('battle')!,{attributes:true,attributeFilter:['width','height']});});
 stage('settings');await tab('graphics');await layout('graphics');await shot('graphics');
 await page.locator('[data-action="fullscreen"]').click();await page.waitForFunction(()=>!!document.fullscreenElement);assert.equal((await page.locator('[data-action="fullscreen"]').innerText()).trim(),'退出全屏');await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(()=>document.querySelector('[data-action="fullscreen"]')?.textContent?.includes('进入全屏'));report.checks.push('actual-native-fullscreen-entry-and-system-exit');
 await page.locator('[data-setting="text-scale"]').selectOption('1.5');await context.emulateMedia?.({reducedMotion:'reduce'});await page.emulateMedia({reducedMotion:'reduce'});await tab('downloads');await layout('downloads-large-text');await shot('downloads-large-text');await tab('graphics');await page.locator('[data-setting="text-scale"]').selectOption('1');await page.emulateMedia({reducedMotion:'no-preference'});await tab('downloads');
 if(html){for(const action of ['download-race','download-all','download-clear'])assert.equal(await page.locator(`[data-action="${action}"]`).isDisabled(),true);assert.match(await page.locator('[data-resource-downloads]').innerText(),/无需预下载/);report.checks.push('offline-embedded-resource-controls-disabled');}
 else if(!desktop){
  stage('cache-stop-and-tabs');await page.locator('[data-action="download-all"]').click();await page.waitForFunction(()=>Number(document.querySelector<HTMLProgressElement>('[data-resource-downloads] progress')?.value)>0,null,{timeout:300000});
  await tab('graphics');assert.ok((await read()).background.held>0);await tab('downloads');assert.equal(await page.locator('[data-action="download-stop"]').isVisible(),true);await rotate(812,375);await layout('downloading-landscape');await shot('downloading-landscape');
  await page.locator('[data-action="download-stop"]').click();await page.waitForFunction(()=>document.querySelector('[data-download-status]')?.textContent?.includes('已停止'));const stopped=await page.locator('[data-download-progress]').innerText();assert.ok(await cacheFiles()>0);report.cacheStop={stopped,files:await cacheFiles()};
  // Actual Cache.put rejection, confined to this disposable browser context.
  await page.evaluate(()=>{(window as any).__cachePut=Cache.prototype.put;Cache.prototype.put=async()=>{throw new DOMException('QA quota rejection','QuotaExceededError');};});await page.locator('[data-action="download-all"]').click();await page.waitForFunction(()=>document.querySelector('[data-download-status]')?.textContent?.includes('再次下载可重试'),null,{timeout:300000});await shot('cache-write-failure');report.checks.push('actual-cache-write-failure-ui');await page.evaluate(()=>{Cache.prototype.put=(window as any).__cachePut;});
  stage('cache-resume-complete');await page.locator('[data-action="download-all"]').click();await page.waitForFunction(()=>document.querySelector('[data-download-status]')?.textContent?.includes('预下载完成'),null,{timeout:600000});assert.equal(await cacheFiles(),release.fileCount);report.cacheComplete={files:await cacheFiles(),progress:await page.locator('[data-download-progress]').innerText()};await shot('cache-complete');report.checks.push('real-full-resource-download-completed-and-resumed');
 }
 if(!desktop){
  await rotate(375,812);await tab('graphics');await layout('portrait-restored');await settingsBack();
  const world=new World({race:'terran',seed:529,waves:false,terrain:campaignTerrain({version:3,seed:529,theme:'industrial'})});assert.ok(world.start());for(const p of Object.values(world.expedition.production))p.enabled={};world.economicTargets.clear();world.pods=[];world.pickups=[];world.rewardDrops=[];(world as any).eventPlan=[];(world as any).nextEvent=0;world.nextFreePodAt=world.nextEliteGrowthAt=world.nextMercenaryAt=world.nextTankSupportAt=1e9;world.paused=true;
  const fixture=path.resolve(out,'native-fixture.json');await fs.writeFile(fixture,writeArchive({profile:world.permanentProfile.exportJSON(),run:world.captureRun()}));
  stage('native-loading-rotation');await page.locator('.main-actions [data-action="menu-load"]').click();const chooser=page.waitForEvent('filechooser');await page.locator('[data-action="menu-load-file"]').click();await(await chooser).setFiles(fixture);await page.locator('[data-action="menu-load-ready"]').click();
  await page.waitForFunction(()=>!!(window as any).__SC2_REPORT__().readiness.kind);await rotate(812,375);await shot('loading-landscape');await rotate(375,812);
  let old='';timer=setInterval(()=>{void read().then((r:any)=>{const label=r.readiness?.label;if(label!==old){old=label;console.log('loading '+label);}}).catch(()=>{});},2000);
  await page.waitForFunction(()=>['ready','error'].includes((window as any).__SC2_REPORT__().readiness.phase),null,{timeout:900000});clearInterval(timer);const ready=await read();assert.equal(ready.readiness.phase,'ready',JSON.stringify(ready.readiness));assert.deepEqual(ready.errors,[]);assert.equal(ready.assetsPending,0);assert.equal(ready.sourceCombat.source.ready,true);report.ready=ready;await shot('native-ready');await page.locator('[data-action="flow-continue"]').click();
  stage('paused-native-state');await page.locator('[data-action="pause-saves"]').click();const before=await exportRun('before');await page.locator('[data-action="resource-downloads"]').click();assert.equal(await page.locator('[data-tab="downloads"]').getAttribute('aria-pressed'),'true');report.checks.push('archive-shortcut-opens-settings-download-tab');
  if(!html){await page.locator('[data-action="download-clear"]').click();await page.waitForFunction(()=>document.querySelector('[data-download-status]')?.textContent?.includes('资源缓存已清理'));assert.equal(await cacheFiles(),0);await shot('cache-cleared');report.checks.push('resource-cache-clear-with-live-battle');}
  if(!html){
   // Browser visibility adapter only; World/renderer/session use their real listeners.
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.locator('[data-action="download-all"]').isDisabled(),true);
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete (document as any).hidden;});await page.waitForFunction(()=>!document.querySelector<HTMLButtonElement>('[data-action="download-all"]')?.disabled);await shot('visible-download-controls');report.checks.push('visibility-adapter-restores-paused-download-controls');
  }
  await tab('graphics');await page.locator('[data-setting="camera-zoom"]').fill('143');await page.locator('[data-setting="camera-pitch"]').fill('45');await page.locator('[data-setting="camera-mode"]').selectOption('auto');
  await rotate(812,375);assert.equal(await page.locator('[data-setting="camera-zoom"]').inputValue(),'100');await page.locator('[data-setting="camera-zoom"]').fill('110');await page.locator('[data-setting="camera-pitch"]').fill('55');await page.locator('[data-setting="camera-mode"]').selectOption('cinematic');await shot('landscape-camera-settings');
  await rotate(375,812);assert.equal(await page.locator('[data-setting="camera-zoom"]').inputValue(),'143');assert.equal(await page.locator('[data-setting="camera-pitch"]').inputValue(),'45');assert.equal(await page.locator('[data-setting="camera-mode"]').inputValue(),'auto');await page.locator('[data-action="camera-zoom-reset"]').click();
  await rotate(844,390,270);assert.equal(await page.locator('[data-setting="camera-zoom"]').inputValue(),'110');assert.equal(await page.locator('[data-setting="camera-mode"]').inputValue(),'cinematic');await page.locator('[data-action="camera-zoom-reset"]').click();await rotate(390,844);await layout('paused-portrait');await shot('paused-portrait');report.checks.push('orientation-camera-preferences-preserved');
  const duplicate=await page.evaluate(async()=>{(window as any).__resizeMutations=[];for(let i=0;i<20;i++)dispatchEvent(new Event('resize'));await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));return (window as any).__resizeMutations;});assert.deepEqual(duplicate,[]);report.checks.push('unchanged-resize-burst-does-not-reallocate-canvas');
  await settingsBack();await page.locator('[data-action="pause-saves"]').click();const after=await exportRun('after-settings-rotation-clear');assert.deepEqual(encodeGraph(after.run),encodeGraph(before.run));assert.deepEqual(after.profile,before.profile);report.checks.push('exact-native-world-profile-rng-time-through-paused-settings');await page.locator('[data-action="archives-back"]').last().click();
  stage('touch-after-rotation');await settingsFromPause();await tab('controls');await page.locator('[data-setting="touch"]').selectOption('joystick');await settingsBack();await page.locator('.pause-actions [data-action="pause"]').click();await elapsed(.3);
  const stick=await page.locator('#joystick').boundingBox();assert.ok(stick);const x=stick.x+stick.width/2,y=stick.y+stick.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+stick.width*.3,y}]});await elapsed(.3);assert.notEqual(await page.locator('#joystick').evaluate((e:HTMLElement)=>e.style.getPropertyValue('--stick-x')),'0px');
  await rotate(844,390);assert.equal(await page.locator('#joystick').evaluate((e:HTMLElement)=>e.style.getPropertyValue('--stick-x')),'0px');await elapsed(1);const settled=(await read()).camera.target;await elapsed(.5);const stable=(await read()).camera.target;assert.ok(Math.hypot(stable[0]-settled[0],stable[2]-settled[2])<.01,'no residual movement after rotation');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});report.checks.push('active-touch-joystick-cleared-on-rotation');await shot('battle-landscape');
  await page.locator('#topbar [data-action="pause"]').click();await settingsFromPause();await tab('controls');await page.locator('[data-setting="touch"]').selectOption('tap');await settingsBack();await page.locator('.pause-actions [data-action="pause"]').click();await rotate(390,844);await page.touchscreen.tap(250,300);await page.waitForFunction(()=>(window as any).__SC2_REPORT__().order?.kind==='move');report.touchOrder=(await read()).order;await shot('battle-portrait-tap');report.checks.push('native-touch-move-after-round-trip-rotation');
  await page.locator('#topbar [data-action="pause"]').click();await page.locator('[data-action="pause-saves"]').click();report.finalExport=await exportRun('after-touch');await page.locator('[data-action="archives-back"]').last().click();
 }
 report.final=await read();assert.equal(report.navigations.length,1,'rotation does not navigate/reload');assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);if(html)assert.equal(report.requests.length,0);report.completed=true;
}catch(error){report.completed=false;report.failure=String((error as Error).stack??error);report.failedPhase=phase;report.failureState=await read().catch(()=>null);await page?.screenshot({path:path.join(out,'failure.png'),timeout:15000}).catch(()=>{});process.exitCode=1;}
finally{clearInterval(timer);report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise<void>(resolve=>server.close(()=>resolve()));console.log(JSON.stringify({completed:report.completed,failedPhase:report.failedPhase,failure:report.failure,checks:report.checks,screens:report.screens.length,errors:report.errors},null,2));}
