/** Real Chrome CacheStorage/SW recovery plus the rebuilt packed game's first
 * battle. Uses a temporary browser profile, loopback server and disabled backend.
 * node tools/verify-stability-browser-20261102.mjs [--cache-only]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {createBackend} from './backend/service.mjs';

const root=process.cwd(),out=path.resolve('reports/local/stability-fix-20261102'),packed=path.resolve('sites/size-optimized-site/public');await fs.mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),good=Buffer.from('verified real browser recovery payload'),key='assets/'+sha(good)+'.bin',pack='bundle-common-'+sha(good).slice(0,20)+'.bin';
const worker=await fs.readFile('tools/packed-sites-sw.js','utf8'),client=(await build({stdin:{contents:"import {ResourceCache} from './src/assets/persistent-cache';globalThis.clearResourceCache=()=>new ResourceCache().clear();",resolveDir:root,sourcefile:'cache-client.ts',loader:'ts'},bundle:true,write:false,format:'iife',target:'es2022'})).outputFiles[0].text;
const counts={},backend=createBackend({config:{enabled:false},maintenance:false});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wasm':'application/wasm'};
const report={date:'2026-11-02',workerSha256:sha(worker),scope:'Real Windows Chrome on isolated loopback origin; scripted Cache API faults and real CacheStorage; packed first battle/refresh. No physical iPhone or production services.',cache:[],game:null,errors:[],console:[],httpFailures:[]};
if(process.argv.includes('--game-only')){report.cache=JSON.parse(await fs.readFile(out+'/browser.json','utf8')).cache;report.cacheReusedFromEarlierSameWorkerRun=true;}
const server=createServer(async(req,res)=>{try{
 if(backend.handle(req,res))return;
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),fixture=/^\/audit\/([a-z-]+)\/(.*)$/.exec(pathname);
 if(fixture){const [,mode,file]=fixture;res.setHeader('Cache-Control','no-store');
  if(!file){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Local cache verification</title><script src="./client.js"></script>');return;}
  if(file==='client.js'){res.setHeader('Content-Type','text/javascript');res.end(client);return;}
  if(file==='sites-pack-index.js'){res.setHeader('Content-Type','text/javascript');res.end('self.SC2_PACK_INDEX='+JSON.stringify({[key]:[pack,0,good.length,'application/octet-stream',false]})+';');return;}
  if(file==='sites-sw.js'){
   const failure=mode.endsWith('-hang')?mode.slice(0,-5):null;
   const injection=failure?`const originalCaches=globalThis.caches;Object.defineProperty(globalThis,'caches',{value:{open:async name=>{if(${JSON.stringify(failure)}==='open')return new Promise(()=>{});const cache=await originalCaches.open(name);return new Proxy(cache,{get:(target,key)=>key===${JSON.stringify(failure)}?()=>new Promise(()=>{}):typeof target[key]==='function'?target[key].bind(target):target[key]});},delete:name=>originalCaches.delete(name)}});\n`:'';
   res.setHeader('Content-Type','text/javascript');res.end(injection+worker);return;
  }
  if(file==='assets/'+pack){counts[mode]=(counts[mode]||0)+1;res.setHeader('Content-Type','application/octet-stream');res.end(good);return;}
  res.writeHead(404).end();return;
 }
 if(!pathname.startsWith('/audit/')){
  const name=pathname.slice(1)||'index.html';if(name.split('/').some(p=>p==='..'||p.startsWith('.')||p.includes('\\')))throw Error('Invalid path');
  const bytes=await fs.readFile(path.join(packed,name));res.writeHead(200,{'Content-Type':mime[path.extname(name)]??'application/octet-stream','Cache-Control':['index.html','web-release.json','runtime-config.json','sites-sw.js'].includes(name)?'no-cache':'public, max-age=31536000, immutable'});res.end(bytes);return;
 }
 res.writeHead(404).end();
}catch(error){res.writeHead(error.code==='ENOENT'?404:500).end();}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const origin='http://127.0.0.1:'+server.address().port;
let browser,page,tick;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-proxy-server','--disable-audio-output','--disable-background-timer-throttling']});
 for(const mode of process.argv.includes('--game-only')?[]:['healthy','open-hang','keys-hang','match-hang','put-hang']){
  const context=await browser.newContext(),p=await context.newPage();
  try{
   await p.goto(origin+'/audit/'+mode+'/',{waitUntil:'load'});
   const result=await p.evaluate(async({key,pack,seed})=>{
    const packURL=new URL('assets/'+pack,location.href).href;
    if(seed)await(await caches.open('sc2-immutable-packs-v1')).put(packURL,new Response('bad cached bytes', {headers:{'X-SC2-Pack-Bytes':'16'}}));
    const registration=await navigator.serviceWorker.register('./sites-sw.js',{scope:'./'});await navigator.serviceWorker.ready;
    if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
    const start=performance.now(),a=await fetch(key),first=await a.text(),b=await fetch(key,{cache:'reload'}),second=await b.text();
    const metrics=()=>new Promise(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=e=>{channel.port1.close();resolve(e.data);};navigator.serviceWorker.controller.postMessage({type:'sc2-pack-metrics'},[channel.port2]);});
    const before=await metrics();localStorage.setItem('audit-player-save','keep');await(await caches.open('audit-player-save')).put(new URL('save',location.href),new Response('keep'));
    await globalThis.clearResourceCache();const after=await metrics(),names=await caches.keys();
    const preserved=localStorage.getItem('audit-player-save')==='keep'&&names.includes('audit-player-save');
    const c=await fetch(key),third=await c.text();await registration.unregister();
    return {statuses:[a.status,b.status,c.status],first,second,third,elapsedMs:performance.now()-start,before,after,cleared:!names.includes('sc2-immutable-packs-v1')&&!names.includes('sc2-resource-bytes-v1'),preserved};
   },{key,pack,seed:mode==='healthy'});
   assert.deepEqual(result.statuses,[200,200,200]);for(const field of ['first','second','third'])assert.equal(result[field],good.toString());assert.ok(result.cleared&&result.preserved);assert.equal(result.after.residentBytes,0);assert.equal(result.after.inflight,0);assert.ok(result.elapsedMs<15000);assert.equal(counts[mode],3);
   report.cache.push({mode,statuses:result.statuses,networkRequests:counts[mode],elapsedMs:Math.round(result.elapsedMs),cacheCleared:true,playerStatePreserved:true});console.log(JSON.stringify(report.cache.at(-1)));
  }finally{await context.close();}
 }
 if(!process.argv.includes('--cache-only')){
  const descriptor=JSON.parse(await fs.readFile(packed+'/web-release.json','utf8')),context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
  await context.addInitScript(()=>localStorage.setItem('sc2.graphics.v1',JSON.stringify({version:1,preset:'medium',tier:'medium',texture:'medium',probeVersion:1})));
  page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',error=>report.errors.push(error.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))report.httpFailures.push({url:r.url(),status:r.status()});});
  page.on('console',msg=>{if(['warning','error'].includes(msg.type())){report.console.push({type:msg.type(),text:msg.text()});console.log(JSON.stringify({console:msg.text()}));}});
  const read=()=>page.evaluate(()=>globalThis.__SC2_REPORT__()),click=action=>page.locator('[data-action="'+action+'"]:visible').first().click();
  const menu=async()=>{await page.waitForFunction(()=>globalThis.__SC2_REPORT__?.().phase==='menu'&&!document.getElementById('scs-opening-visual')||document.querySelector('.pack-loading')?.textContent==='游戏加载失败重试',null,{timeout:180000});assert.ok(await page.evaluate(()=>!!globalThis.__SC2_REPORT__),'Game startup failed: '+JSON.stringify(report.console));};
  const ready=async()=>{await page.waitForFunction(()=>['ready','error'].includes(globalThis.__SC2_REPORT__?.().readiness?.phase),null,{timeout:240000});const r=await read();assert.equal(r.readiness.phase,'ready',JSON.stringify(r.readiness));await click('flow-continue');};
  tick=setInterval(async()=>console.log(JSON.stringify({game:await page.evaluate(()=>{const r=globalThis.__SC2_REPORT__?.();return r?{phase:r.phase,time:r.time,readiness:r.readiness}:null;}).catch(()=>null)})),25000);
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await menu();assert.equal(await page.locator('meta[name="sc2-app-build"]').getAttribute('content'),descriptor.appBuildId);
  await click('settings');await page.locator('[data-action="settings-tab"][data-tab="downloads"]:visible').click();await click('download-clear');
  await page.waitForFunction(()=>document.querySelector('[data-download-status]')?.textContent?.startsWith('资源缓存已清理'),null,{timeout:150000});await click('settings-back');
  await page.screenshot({path:out+'/menu.png'});
  for(const action of ['menu-new','menu-race-next','menu-difficulty-next','menu-start'])await click(action);await ready();
  await page.waitForFunction(()=>globalThis.__SC2_REPORT__().phase==='battle'&&globalThis.__SC2_REPORT__().time>5,null,{timeout:120000});const battle=await read();
  assert.equal(battle.assetsPending,0);assert.equal(battle.sourceCombat.source.missing,0);assert.deepEqual(battle.errors,[]);await page.screenshot({path:out+'/battle.png'});
  await click('pause');await page.reload({waitUntil:'domcontentloaded'});await menu();assert.equal((await read()).save.canResume,true);await click('save-continue');await ready();
  await page.waitForFunction(()=>globalThis.__SC2_REPORT__().phase==='battle');await page.getByRole('button',{name:'继续',exact:true}).click();
  await page.waitForFunction(()=>globalThis.__SC2_REPORT__().phase==='battle'&&globalThis.__SC2_REPORT__().time>2);const resumed=await read();assert.equal(resumed.stage,1);assert.deepEqual(resumed.errors,[]);
  await page.setViewportSize({width:844,height:390});await page.screenshot({path:out+'/battle-mobile-layout.png'});
  report.game={appBuildId:descriptor.appBuildId,release:descriptor.release,firstBattle:{stage:battle.stage,time:battle.time,assetsPending:battle.assetsPending,missingEffects:battle.sourceCombat.source.missing},resume:{stage:resumed.stage,time:resumed.time},existingClearActionPassed:true,screens:['menu.png','battle.png','battle-mobile-layout.png'],physicalDevice:false};
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpFailures,[]);
 }
 report.complete=true;
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{clearInterval(tick);await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await backend.close();await fs.writeFile(out+'/browser.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
