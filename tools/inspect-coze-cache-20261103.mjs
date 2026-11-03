/** Observe the existing cache-clear UI in this task's isolated Chrome profile.
 * node tools/inspect-coze-cache-20261103.mjs profile-terran-<timestamp> [--worker-only]
 * No production mutation, no player profiles, no fault injection.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const profile=process.argv[2];assert(/^profile-terran-\d+$/.test(profile));
const out=path.resolve('reports/local/coze-live-check-20261103'),profilePath=path.join(out,profile);assert((await fs.lstat(profilePath)).isDirectory());
const report={date:'2026-11-03',scope:'Existing test-only profile; actual public site; observer wrappers preserve browser API return values; no fault injection.',attempts:[],pageErrors:[]};
let context,page,tick;
try{
 context=await chromium.launchPersistentContext(profilePath,{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1280,height:720},args:['--no-proxy-server','--disable-audio-output','--disable-background-timer-throttling']});
 if(process.argv.includes('--worker-only')){
  page=context.pages()[0];await page.goto('https://sc-survivors.coze.site/runtime-config.json');
  report.registration=await page.evaluate(async()=>({controller:navigator.serviceWorker.controller?.scriptURL,registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>({scope:r.scope,active:r.active?.scriptURL,waiting:r.waiting?.scriptURL,installing:r.installing?.scriptURL}))}));
  report.workerState=[];for(const worker of context.serviceWorkers())report.workerState.push({url:worker.url(),state:await worker.evaluate(()=>({clearPacks:typeof clearPacks,indexFor:typeof indexFor,diskCache:typeof diskCache,scope:registration.scope,packIndexSize:Object.keys(self.SC2_PACK_INDEX??{}).length}))});
  const cdp=await context.browser().newBrowserCDPSession();const targets=await cdp.send('Target.getTargets');const target=targets.targetInfos.find(t=>t.type==='service_worker'&&t.url==='https://sc-survivors.coze.site/sites-sw.js');
  if(target){
   const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:false});let nextId=1;const pending=new Map(),scripts=[];
   cdp.on('Target.receivedMessageFromTarget',e=>{if(e.sessionId!==sessionId)return;const m=JSON.parse(e.message);if(m.method==='Debugger.scriptParsed')scripts.push(m.params);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}});
   const send=(method,params={})=>new Promise((resolve,reject)=>{const id=nextId++;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP observation timed out'));},10000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id,method,params})}).catch(reject);});
   await send('Debugger.enable');const script=scripts.find(s=>s.url==='https://sc-survivors.coze.site/sites-sw.js');assert(script,'Installed worker script observed');const source=await send('Debugger.getScriptSource',{scriptId:script.scriptId});await fs.writeFile(out+'/installed-worker.js',source.scriptSource);report.installedScript={url:script.url,characters:source.scriptSource.length,hasClearProtocol:source.scriptSource.includes('sc2-pack-cache-clear'),hasMetricsProtocol:source.scriptSource.includes('sc2-pack-metrics')};await cdp.send('Target.detachFromTarget',{sessionId});
  }
  report.metricsMessage=await page.evaluate(()=>new Promise(resolve=>{const c=new MessageChannel();const finish=value=>{clearTimeout(timer);c.port1.close();c.port2.close();resolve(value);},timer=setTimeout(()=>finish({timeout:true}),6000);c.port1.onmessage=e=>finish({timeout:false,metrics:e.data});navigator.serviceWorker.controller?.postMessage({type:'sc2-pack-metrics'},[c.port2]);}));
  report.browserFetch=await page.evaluate(async()=>{const rows=[];for(const p of ['/sites-sw.js','/web-release.json','/api/config']){const r=await fetch(p,{cache:'no-store'}),b=await r.arrayBuffer(),text=new TextDecoder().decode(b);rows.push({path:p,status:r.status,bytes:b.byteLength,sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join(''),hasClear:text.includes('sc2-pack-cache-clear'),cacheControl:r.headers.get('cache-control'),build:p.endsWith('.json')?JSON.parse(text).appBuildId:undefined});}return rows;});
  report.complete=true;
 }else{
 await context.addInitScript(()=>{
  const trace=globalThis.__COZE_CACHE_TRACE__=[];const log=(type,data={})=>trace.push({at:performance.now(),type,...data});
  const post=ServiceWorker.prototype.postMessage;ServiceWorker.prototype.postMessage=function(message,...rest){if(message?.type==='sc2-pack-cache-clear')log('sw-clear-post');return post.call(this,message,...rest);};
  const OriginalChannel=MessageChannel;globalThis.MessageChannel=function(){const c=new OriginalChannel();c.port1.addEventListener('message',e=>{if(typeof e.data?.ok==='boolean')log('channel-reply',{ok:e.data.ok});});c.port1.start();return c;};globalThis.MessageChannel.prototype=OriginalChannel.prototype;
  const remove=CacheStorage.prototype.delete;CacheStorage.prototype.delete=function(name){log('cache-delete-start',{name});return remove.call(this,name).then(value=>{log('cache-delete-end',{name,value});return value;},e=>{log('cache-delete-error',{name,error:String(e)});throw e;});};
  const transaction=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(stores,...rest){const tx=transaction.call(this,stores,...rest);if(this.name==='sc2-resource-downloads-v1'&&Array.isArray(stores)&&stores.length===2){log('index-transaction-start');for(const type of ['complete','error','abort'])tx.addEventListener(type,()=>log('index-'+type,{error:tx.error?.message}));}return tx;};
 });
 page=context.pages()[0];page.on('pageerror',e=>report.pageErrors.push(e.message));
 const snapshot=()=>page.evaluate(()=>{const r=globalThis.__SC2_REPORT__?.();return {status:document.querySelector('[data-download-status]')?.textContent,phase:r?.phase,time:r?.time,save:r?.save,background:r?.background?{busy:r.background.busy,held:r.background.held,pending:r.background.pending,completed:r.background.completed,lastEvents:r.background.events.slice(-3)}:null,trace:globalThis.__COZE_CACHE_TRACE__};});
 tick=setInterval(async()=>console.log(JSON.stringify({cacheProbe:await snapshot().catch(()=>null)})),25000);
 await page.goto('https://sc-survivors.coze.site/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>globalThis.__SC2_REPORT__?.().phase==='menu'&&!document.getElementById('scs-opening-visual'),null,{timeout:240000});
 const click=action=>page.locator('[data-action="'+action+'"]:visible').first().click();
 await click('settings');await page.locator('[data-action="settings-tab"][data-tab="downloads"]:visible').click();
 const before=await snapshot(),began=Date.now();await click('download-clear');
 await page.waitForFunction(()=>/已清理|未允许/.test(document.querySelector('[data-download-status]')?.textContent??''),null,{timeout:135000});
 const after=await snapshot();report.attempts.push({where:'menu',elapsedMs:Date.now()-began,before,after,success:after.status?.startsWith('资源缓存已清理')});await page.screenshot({path:out+'/cache-probe.png'});
 report.complete=true;
 }
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;await page?.screenshot({path:out+'/cache-probe-failure.png'}).catch(()=>{});}
finally{clearInterval(tick);await context?.close();await fs.writeFile(out+(process.argv.includes('--worker-only')?'/worker-probe.json':'/cache-probe.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
