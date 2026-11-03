/** Local Chrome reproduction of the observed legacy worker, upgrade and clear.
 * node tools/verify-cache-worker-upgrade-20261103.mjs [--fixtures-only|--game-only]
 * Uses local test profiles, real UI and a pinned stale SW route. Never deploys.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {packedLauncher} from './packed-startup.mjs';
import {createBackend} from './backend/service.mjs';

const out=path.resolve('reports/local/cache-worker-fix-20261103'),base=path.resolve('sites/size-optimized-site/public'),candidate=path.resolve('dist/cache-worker-fix-20261103/packed');
await fs.mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const legacy=execFileSync('git',['show','26b87a1:sites/size-optimized-site/public/sites-sw.js'],{maxBuffer:1024*1024});
const legacyIndex=execFileSync('git',['show','26b87a1:sites/size-optimized-site/public/sites-pack-index.js'],{maxBuffer:2*1024*1024});
assert.equal(sha(legacy),'777a07c5f18c0c4184f9ded53fd363610d0404e053ed3ddbfc3d9ad98db7a9f9');
const baselineFiles=new Map(['index.html','web-release.json','sites-sw.js','sites-pack-index.js'].map(name=>[name,execFileSync('git',['show','b18410e58642d61b94390f2a20d6cc73e8f3428e:sites/size-optimized-site/public/'+name],{maxBuffer:4*1024*1024})]));
const baselineRelease=JSON.parse(baselineFiles.get('web-release.json')),baselineManifest=JSON.parse(await fs.readFile(base+'/'+baselineRelease.manifest,'utf8'));
const packedIndex=JSON.parse((await fs.readFile(base+'/sites-pack-index.js','utf8')).trim().replace(/^self\.SC2_PACK_INDEX=/,'').replace(/;$/,''));
const gpuFallbacks=new Map(Object.values(baselineManifest.gpuTextures??{}).map(row=>[row.url,row]));
// Coze already serves 43 standalone KTX2 fallbacks. The Git snapshot keeps
// their identical bytes in packs, so reproduce that deployed fallback here.
async function baseFile(name){if(baselineFiles.has(name))return baselineFiles.get(name);try{return await fs.readFile(path.join(base,name));}catch(e){
 if(e.code!=='ENOENT'||!gpuFallbacks.has(name))throw e;const row=packedIndex[name],asset=gpuFallbacks.get(name);assert(row);
 const bytes=(await fs.readFile(path.join(base,'assets',row[0]))).subarray(row[1],row[1]+row[2]);assert.equal(sha(bytes),asset.sha256);return bytes;
}}
const source=await fs.readFile('tools/packed-sites-sw.js','utf8'),payload=Buffer.from('cache upgrade proof'),resource='assets/'+sha(payload)+'.bin',bundle='bundle-common-'+sha(payload).slice(0,20)+'.bin';
const index='self.SC2_PACK_INDEX='+JSON.stringify({[resource]:[bundle,0,payload.length,'application/octet-stream',false]})+';',indexName='sites-pack-index.'+sha(index).slice(0,20)+'.js';
const fixtureWorkers=new Map(['bootstrap','recover','unavailable','clear-failure'].map(mode=>{
 const injection=mode==='clear-failure'?"const originalCacheStorage=globalThis.caches;Object.defineProperty(globalThis,'caches',{value:{open:name=>originalCacheStorage.open(name),delete:name=>name==='sc2-immutable-packs-v1'?Promise.reject(Error('injected cache failure')):originalCacheStorage.delete(name)}});\n":'';
 const bytes=injection+source.replace("'./sites-pack-index.js'",JSON.stringify('./'+indexName));return [mode,{bytes,name:'sites-sw.'+sha(bytes).slice(0,20)+'.js'}];
}));
const fixtureClient=(await build({stdin:{sourcefile:'worker-proof.ts',loader:'ts',resolveDir:process.cwd(),contents:`
import {ResourceCache} from './src/assets/persistent-cache';
import {ResourceDownloads} from './src/app/resource-downloads';
import {connectPackedWorker} from './tools/packed-startup.mjs';
globalThis.__SC2_ENSURE_PACK_WORKER__=()=>connectPackedWorker(new URL(globalThis.workerProofFile,location.href).href,new URL('./',location.href).href,3000);
globalThis.runCacheProof=async()=>{const task=new ResourceDownloads(()=>({cache:new ResourceCache(750),manifest:{version:1,release:'proof',assets:{}},prefetch:async()=>{}}));task.setAllowed(true);await task.clear();return {...task.state};};
`},bundle:true,write:false,format:'iife',target:'es2022'})).outputFiles[0].text;
const backend=createBackend({config:{enabled:false},maintenance:false}),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wasm':'application/wasm'};
let gameMode='baseline',allowFixtureUpdate=false,blockGameWorker=false;
const report={date:'2026-11-03',scope:'Local Windows Chrome; exact observed historical SW plus deliberate CDN/update/storage faults; isolated test data. Not a live deployment or physical iPhone test.',legacySha256:sha(legacy),fixtures:[],game:null,pageErrors:[],httpFailures:[],expectedFaults:[]};
const server=createServer(async(req,res)=>{try{
 if(backend.handle(req,res))return;
 const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname).slice(1),fixture=/^_cache-upgrade\/([a-z-]+)\/(.*)$/.exec(name);
 const send=(bytes,type='text/javascript',cache='no-store')=>{res.writeHead(200,{'Content-Type':type,'Cache-Control':cache});res.end(bytes);};
 if(fixture){const [,mode,file]=fixture,worker=fixtureWorkers.get(mode);if(!worker){res.writeHead(404).end();return;}
  if(!file){send('<!doctype html><meta name="viewport" content="width=device-width"><main id="interface"></main><script>globalThis.workerProofFile='+JSON.stringify(worker.name)+'</script><script src="./client.js"></script>','text/html');return;}
  if(file==='client.js'){send(fixtureClient);return;}
  if(file==='sites-sw.js'){send(legacy,'text/javascript','public, max-age=31536000, immutable');return;}
  if(file===worker.name){if(mode==='unavailable'&&!allowFixtureUpdate){res.writeHead(404).end('Missing worker');return;}send(worker.bytes);return;}
  if(file==='sites-pack-index.js'||file===indexName){send(index);return;}
  if(file==='assets/'+bundle){send(payload,'application/octet-stream');return;}
  if(file==='assets/launcher.js'){send(packedLauncher('proof.js.gz',indexName,worker.name));return;}
  if(file==='assets/proof.js.gz'){send(gzipSync('globalThis.cacheBootstrapRan=true;'),'application/octet-stream');return;}
  res.writeHead(404).end();return;
 }
 if(!name||name==='index.html'){send(gameMode==='candidate'?await fs.readFile(candidate+'/index.html'):await baseFile('index.html'),'text/html','no-cache');return;}
 if(name==='sites-sw.js'){send(gameMode==='baseline'?await baseFile(name):legacy,'text/javascript','public, max-age=31536000, immutable');return;}
 if(name==='sites-pack-index.js'){send(gameMode==='baseline'?await baseFile(name):legacyIndex,'text/javascript','public, max-age=31536000, immutable');return;}
 if(blockGameWorker&&/^sites-sw\.[a-f0-9]{20}\.js$/.test(name)){res.writeHead(404).end('Injected update failure');return;}
 if(name.split('/').some(part=>part==='..'||part.startsWith('.')||part.includes('\\')))throw Error('Invalid local path');
 const bytes=gameMode==='candidate'?await fs.readFile(path.join(candidate,name)).catch(e=>{if(e.code!=='ENOENT')throw e;return baseFile(name);}):await baseFile(name);
 send(bytes,mime[path.extname(name)]??'application/octet-stream',['web-release.json','runtime-config.json'].includes(name)?'no-cache':'public, max-age=31536000, immutable');
}catch(e){res.writeHead(e.code==='ENOENT'?404:500).end(String(e.code??'local probe error'));}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin='http://127.0.0.1:'+server.address().port;
let browser,page,tick;

async function protectedState(p){return p.evaluate(async()=>{
 const request=indexedDB.open('sc2-survivors-saves',1),db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 const values=await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots'),store=tx.objectStore('snapshots'),rows=[];for(const key of ['current','backup1','backup2']){const r=store.get(key);r.onsuccess=()=>rows.push([key,r.result??null]);}tx.oncomplete=()=>resolve(rows.sort());tx.onerror=()=>reject(tx.error);});db.close();
 const bytes=new TextEncoder().encode(JSON.stringify(values)),digest=await crypto.subtle.digest('SHA-256',bytes);
 const hit=await(await caches.open('cache-upgrade-player-preserve')).match(new URL('/proof-player-save',location.href));
 return {saveSlotsSha256:[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join(''),localValue:localStorage.getItem('cache-upgrade-player-preserve'),unrelatedCacheValue:await hit?.text(),hasCurrent:values.some(([key,value])=>key==='current'&&typeof value==='string')};
 });}
async function protect(p,seedSlots=false){await p.evaluate(async seed=>{
 localStorage.setItem('cache-upgrade-player-preserve','keep');await(await caches.open('cache-upgrade-player-preserve')).put(new URL('/proof-player-save',location.href),new Response('keep'));
 if(seed){const r=indexedDB.open('sc2-survivors-saves',1);r.onupgradeneeded=()=>r.result.createObjectStore('snapshots');const db=await new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite');for(const key of ['current','backup1','backup2'])tx.objectStore('snapshots').put('test-'+key,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
 },seedSlots);}
async function forceLegacy(p,scope){await p.evaluate(async scope=>{
 await navigator.serviceWorker.register(scope+'sites-sw.js',{scope,updateViaCache:'none'});await navigator.serviceWorker.ready;
 },scope);await p.waitForFunction(scope=>navigator.serviceWorker.controller?.scriptURL===new URL(scope+'sites-sw.js',location.href).href,scope,{timeout:20000});}

try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-audio-output','--disable-background-timer-throttling']});
 if(!process.argv.includes('--game-only'))for(const mode of fixtureWorkers.keys()){
  const context=await browser.newContext(),p=await context.newPage(),scope=origin+'/_cache-upgrade/'+mode+'/';
  try{
   await p.goto(scope);await protect(p,true);await forceLegacy(p,scope);await p.evaluate(async key=>{await fetch(key);await(await caches.open('sc2-resource-bytes-v1')).put(new URL('/proof-resource',location.href),new Response('resource'));},resource);
   const before=await protectedState(p),worker=fixtureWorkers.get(mode);let state;
   if(mode==='bootstrap'){
    await p.evaluate(()=>{const script=document.createElement('script');script.type='module';script.src='./assets/launcher.js';document.body.append(script);});await p.waitForFunction(()=>globalThis.cacheBootstrapRan===true);state=await p.evaluate(()=>globalThis.runCacheProof());
   }else state=await p.evaluate(()=>globalThis.runCacheProof());
   assert.deepEqual(await protectedState(p),before);
   if(mode==='unavailable'){
    assert.equal(state.phase,'error');assert.equal(state.message,'资源服务更新失败，请刷新后重试。');report.expectedFaults.push({mode,message:state.message});
    assert(await p.evaluate(async()=>(await caches.keys()).includes('sc2-resource-bytes-v1')));allowFixtureUpdate=true;state=await p.evaluate(()=>globalThis.runCacheProof());assert.deepEqual(await protectedState(p),before);
   }
   if(mode==='clear-failure'){assert.equal(state.phase,'error');assert.equal(state.message,'资源缓存清理失败，请稍后重试。');assert(await p.evaluate(async()=>(await caches.keys()).includes('sc2-resource-bytes-v1')));}
   else {assert.equal(state.phase,'idle');assert.match(state.message,/资源缓存已清理/);assert.equal(await p.evaluate(async()=>(await caches.keys()).includes('sc2-resource-bytes-v1')),false);}
   assert.equal(await p.evaluate(()=>navigator.serviceWorker.controller.scriptURL),scope+worker.name);
   report.fixtures.push({mode,passed:true,finalPhase:state.phase,protectedStateUnchanged:true,worker:worker.name});console.log(JSON.stringify(report.fixtures.at(-1)));
  }finally{await context.close();}
 }
 if(!process.argv.includes('--fixtures-only')){
  const expected=JSON.parse(await fs.readFile(candidate+'/web-release.json','utf8')),context=await browser.newContext({viewport:{width:1280,height:720}});
  await context.addInitScript(()=>{if(!localStorage.getItem('sc2.graphics.v1'))localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:'medium',tier:'medium',texture:'medium',probeVersion:1}));});
  page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>report.pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))report.httpFailures.push({url:r.url(),status:r.status(),injectedUpdateFailure:blockGameWorker});});
  const read=()=>page.evaluate(()=>globalThis.__SC2_REPORT__()),click=action=>page.locator('[data-action="'+action+'"]:visible').first().click();
  const menu=()=>page.waitForFunction(()=>globalThis.__SC2_REPORT__?.().phase==='menu'&&!document.getElementById('scs-opening-visual'),null,{timeout:180000});
  const ready=async()=>{await page.waitForFunction(()=>['ready','error'].includes(globalThis.__SC2_REPORT__?.().readiness.phase),null,{timeout:240000});const r=await read();assert.equal(r.readiness.phase,'ready',JSON.stringify(r.readiness));await click('flow-continue');};
  const clear=async expectedMessage=>{await click('download-clear');await page.waitForFunction(message=>document.querySelector('[data-download-status]')?.textContent?.startsWith(message),expectedMessage,{timeout:90000});};
  tick=setInterval(async()=>console.log(JSON.stringify({game:await page.evaluate(()=>{const r=globalThis.__SC2_REPORT__?.();return r?{phase:r.phase,time:r.time,readiness:r.readiness,download:document.querySelector('[data-download-status]')?.textContent}:null;}).catch(()=>null)})),25000);
  await page.goto(origin+'/');await menu();assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL),origin+'/sites-sw.js');
  for(const action of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await click(action);await ready();
  await page.waitForFunction(()=>globalThis.__SC2_REPORT__().phase==='battle'&&globalThis.__SC2_REPORT__().time>3);await click('pause');await page.waitForFunction(()=>{const s=globalThis.__SC2_REPORT__().save;return s.savedAt>0&&!s.busy;});await protect(page);const before=await protectedState(page);assert(before.hasCurrent);
  // Create a real checkpoint with the complete baseline, then reproduce the
  // observed stale controller/CDN before updating the entry. The obsolete index
  // alone does not contain every resource needed to create a new current game.
  gameMode='legacy';await forceLegacy(page,origin+'/');
  gameMode='candidate';await page.reload({waitUntil:'domcontentloaded'});await menu();assert.equal(await page.locator('meta[name="sc2-app-build"]').getAttribute('content'),expected.appBuildId);assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL),origin+'/'+expected.packedWorker);assert.deepEqual(await protectedState(page),before);assert.equal((await read()).save.canResume,true);
  await click('settings');await page.locator('[data-action="settings-tab"][data-tab="downloads"]:visible').click();await clear('资源缓存已清理');assert.deepEqual(await protectedState(page),before);
  await forceLegacy(page,origin+'/');await clear('资源缓存已清理');assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL),origin+'/'+expected.packedWorker);assert.deepEqual(await protectedState(page),before);
  await forceLegacy(page,origin+'/');blockGameWorker=true;await clear('资源服务更新失败，请刷新后重试。');assert.deepEqual(await protectedState(page),before);
  for(const viewport of [{width:1280,height:720},{width:844,height:390},{width:390,height:844}]){await page.setViewportSize(viewport);await page.waitForTimeout(500);await page.screenshot({path:out+'/update-failure-'+viewport.width+'.png'});}
  blockGameWorker=false;await clear('资源缓存已清理');assert.deepEqual(await protectedState(page),before);
  const actualWorker=context.serviceWorkers().find(w=>w.url()===origin+'/'+expected.packedWorker);assert(actualWorker);
  await actualWorker.evaluate(()=>{globalThis.qaOriginalDelete=CacheStorage.prototype.delete;CacheStorage.prototype.delete=function(name){return name==='sc2-immutable-packs-v1'?Promise.reject(Error('injected disk rejection')):globalThis.qaOriginalDelete.call(this,name);};});
  await clear('资源缓存清理失败，请稍后重试。');assert.deepEqual(await protectedState(page),before);
  for(const viewport of [{width:1280,height:720},{width:844,height:390},{width:390,height:844}]){await page.setViewportSize(viewport);await page.waitForTimeout(500);await page.screenshot({path:out+'/clear-failure-'+viewport.width+'.png'});}
  await actualWorker.evaluate(()=>{CacheStorage.prototype.delete=globalThis.qaOriginalDelete;delete globalThis.qaOriginalDelete;});await clear('资源缓存已清理');assert.deepEqual(await protectedState(page),before);
  await page.setViewportSize({width:1280,height:720});await click('settings-back');await click('save-continue');await ready();
  const resume=page.getByRole('button',{name:'继续',exact:true});if(await resume.count())await resume.click();await page.waitForFunction(()=>globalThis.__SC2_REPORT__().phase==='battle'&&globalThis.__SC2_REPORT__().time>2,null,{timeout:120000});const after=await read();assert.equal(after.stage,1);assert.equal(after.assetsPending,0);assert.deepEqual(after.errors,[]);await page.screenshot({path:out+'/resumed-battle.png'});
  report.game={appBuildId:expected.appBuildId,packedWorker:expected.packedWorker,legacyToCurrentStartup:true,samePageLegacyRecovery:true,updateFailureAndRetry:true,clearFailureAndRetry:true,protectedState:before,checkpointRestored:{stage:after.stage,time:after.time},viewports:['1280x720','844x390','390x844'],quality:'medium in isolated test profile',physicalDevice:false};assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.httpFailures.filter(r=>!r.injectedUpdateFailure),[]);await context.close();
 }
 report.complete=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;await page?.screenshot({path:out+'/browser-failure.png'}).catch(()=>{});}
finally{clearInterval(tick);await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await backend.close();await fs.writeFile(out+(process.argv.includes('--fixtures-only')?'/browser-fixtures.json':'/browser-upgrade.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
