importScripts('./sites-pack-index.js');
// Inflight identities are separate from the evictable byte LRU.
globalThis.performance?.setResourceTimingBufferSize?.(4096);
const inflight=new Map(),bundles=new Map(),clientsBudget=new Map();
// A bounded, hash-only disk cache avoids re-downloading a pack after memory LRU
// eviction. It never shares a namespace with player saves or resource IDB.
const PACK_CACHE='sc2-immutable-packs-v1',DISK_TIMEOUT=1000;
const diskLimit=256*1024**2,diskRows=new Map(),diskBypass=new Set(),packVersions=new Map();
let diskBytes=0,diskJob=Promise.resolve(),diskReady=null,diskEnabled=true,cacheEpoch=0;
async function bounded(work,ms,message){let timer;try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms);})]);}finally{clearTimeout(timer);}}
function disableDisk(epoch){if(epoch===cacheEpoch){diskEnabled=false;diskReady=null;}}
async function diskCache(){
 if(!diskEnabled||!globalThis.caches)return null;
 if(!diskReady){const epoch=cacheEpoch;
  diskReady=(async()=>{try{
   const cache=await bounded(caches.open(PACK_CACHE),DISK_TIMEOUT,'Pack cache open timeout');
   const rows=await bounded((async()=>{const rows=new Map();for(const key of await cache.keys()){const hit=await cache.match(key);rows.set(key.url,Number(hit?.headers.get('X-SC2-Pack-Bytes'))||0);}return rows;})(),DISK_TIMEOUT,'Pack cache index timeout');
   if(epoch!==cacheEpoch||!diskEnabled)return null;
   diskRows.clear();diskBytes=0;for(const [key,bytes]of rows){diskRows.set(key,bytes);diskBytes+=bytes;}return cache;
  }catch{disableDisk(epoch);return null;}})();
 }
 return diskReady;
}
async function diskRead(name,url){
 if(diskBypass.has(name))return null;const epoch=cacheEpoch,cache=await diskCache();if(!cache||epoch!==cacheEpoch||diskBypass.has(name))return null;
 try{const bytes=await bounded((async()=>{const hit=await cache.match(url);return hit?hit.arrayBuffer():null;})(),DISK_TIMEOUT,'Pack cache read timeout');return epoch===cacheEpoch&&diskEnabled&&!diskBypass.has(name)?bytes:null;}
 catch{disableDisk(epoch);return null;}
}
// The queue itself contains bounded jobs: a lost Cache API operation cannot
// hold later requests. Every continuation checks its captured cache generation.
function diskWork(work){const epoch=cacheEpoch,job=diskJob.then(async()=>{if(!diskEnabled||epoch!==cacheEpoch)return false;try{return await bounded(work(epoch),DISK_TIMEOUT,'Pack cache write timeout');}catch{disableDisk(epoch);return false;}});diskJob=job.then(()=>{});return job;}
async function forgetDiskPack(name){
 diskBypass.add(name);const url=new URL('./assets/'+name,self.registration.scope),cache=await diskCache();if(!cache)return;
 await diskWork(async epoch=>{await cache.delete(url);if(epoch===cacheEpoch){diskBytes-=diskRows.get(url.href)||0;diskRows.delete(url.href);}return true;});
}
async function rememberPack(name,url,bytes,valid){
 if(bytes.byteLength>diskLimit||!valid())return;const cache=await diskCache();if(!cache||!valid())return;
 await diskWork(async epoch=>{
  while(diskBytes-(diskRows.get(url.href)||0)+bytes.byteLength>diskLimit&&diskRows.size){
   if(!valid()||epoch!==cacheEpoch||!diskEnabled)return false;const [key,size]=diskRows.entries().next().value;await cache.delete(key);if(epoch!==cacheEpoch)return false;diskRows.delete(key);diskBytes-=size;
  }
  if(!valid()||epoch!==cacheEpoch||!diskEnabled)return false;
  await cache.put(url,new Response(bytes,{headers:{'X-SC2-Pack-Bytes':String(bytes.byteLength)}}));
  if(!valid()||epoch!==cacheEpoch||!diskEnabled)return false;
  diskBytes+=bytes.byteLength-(diskRows.get(url.href)||0);diskRows.set(url.href,bytes.byteLength);diskBypass.delete(name);return true;
 });
}
function dropMemory(name){const old=bundles.get(name);if(old){resident-=old.byteLength;bundles.delete(name);}}
function invalidatePack(name){
 packVersions.set(name,(packVersions.get(name)||0)+1);dropMemory(name);const old=inflight.get(name);inflight.delete(name);old?.controller.abort();
 return forgetDiskPack(name);
}
async function clearPacks(){
 const epoch=++cacheEpoch;for(const job of inflight.values())job.controller.abort();inflight.clear();bundles.clear();resident=0;diskRows.clear();diskBytes=0;diskBypass.clear();packVersions.clear();diskReady=null;diskJob=Promise.resolve();diskEnabled=false;
 try{if(globalThis.caches)await bounded(caches.delete(PACK_CACHE),DISK_TIMEOUT,'Pack cache clear timeout');if(epoch===cacheEpoch)diskEnabled=true;return true;}catch{return false;}
}
let resident=0,packLimit=12*1024**2,networkLimit=2,decodeLimit=1;
const metrics={bundleBodyBytes:0,networkTransferBytes:0,transferSamples:0,logicalBytes:0,gzipInputBytes:0,gzipOutputBytes:0,gzipMs:0,downloads:0,peakResident:0,peakInflight:0,peakDecode:0};
function trim(){while(resident>packLimit&&bundles.size){const key=bundles.keys().next().value;resident-=bundles.get(key).byteLength;bundles.delete(key);}}
const indexes=new Map();
async function indexFor(name){if(!name)return self.SC2_PACK_INDEX;if(!/^sites-pack-index\.[a-f0-9]{20}\.js$/.test(name))throw Error('Invalid resource index');let job=indexes.get(name);if(!job){job=(async()=>{const r=await fetch(new URL(name,self.registration.scope),{cache:'force-cache'});if(!r.ok)throw Error('Resource index unavailable');const text=await r.text();return JSON.parse(text.trim().replace(/^self\.SC2_PACK_INDEX=/,'').replace(/;$/,''));})();indexes.set(name,job);job.catch(()=>indexes.delete(name));}return job;}
const network={active:0,queue:[]},decode={active:0,queue:[]};
async function lane(state,limit,work){await new Promise(resolve=>{const enter=()=>{state.active++;resolve();};if(state.active<limit())enter();else state.queue.push(enter);});try{return await work();}finally{state.active--;while(state.queue.length&&state.active<limit())state.queue.shift()();}}
async function budgets(){const active=new Set((await self.clients.matchAll()).map(c=>c.id));for(const id of clientsBudget.keys())if(!active.has(id))clientsBudget.delete(id);const all=[...clientsBudget.values()];packLimit=Math.min(24*1024**2,...all.map(b=>b.packBytes));networkLimit=Math.min(4,...all.map(b=>b.network));decodeLimit=Math.min(2,...all.map(b=>b.decode));trim();}
self.addEventListener('message',event=>{
 if(event.data?.type==='sc2-runtime-budget'&&event.source?.id){const d=event.data;clientsBudget.set(event.source.id,{packBytes:Math.max(4*1024**2,Math.min(64*1024**2,Number(d.packBytes)||12*1024**2)),network:Math.max(1,Math.min(6,Number(d.network)||2)),decode:Math.max(1,Math.min(4,Number(d.decode)||1))});event.waitUntil(budgets());}
 if(event.data?.type==='sc2-pack-metrics')event.ports[0]?.postMessage({...metrics,residentBytes:resident,inflight:inflight.size,decodeActive:decode.active,packLimit,networkLimit,decodeLimit,diskBytes,diskLimit});
 if(event.data?.type==='sc2-pack-cache-clear')event.waitUntil(clearPacks().then(ok=>event.ports[0]?.postMessage({ok})));
 if(event.data?.type==='sc2-pack-invalidate')event.waitUntil((async()=>{try{const url=new URL(event.data.url);if(url.origin!==new URL(self.registration.scope).origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))throw Error('Invalid resource URL');const key=decodeURIComponent(url.pathname.slice(new URL(self.registration.scope).pathname.length)),row=(await indexFor(url.searchParams.get('sc2-index')))[key];if(row)await invalidatePack(row[0]);event.ports[0]?.postMessage({ok:true});}catch{event.ports[0]?.postMessage({ok:false});}})());
});
async function validPack(name,bytes){const match=/^(?:bundle-[a-z]+|gpu-textures)-([a-f0-9]{20})\.bin$/.exec(name);if(!match)return true;const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');return hash.startsWith(match[1]);}
async function getBundle(name,reload=false){
 let invalidation;
 if(reload){const current=inflight.get(name);if(current?.reload)return current.promise;invalidation=invalidatePack(name);}
 if(bundles.has(name)){const b=bundles.get(name);bundles.delete(name);bundles.set(name,b);return b;}
 if(inflight.has(name))return inflight.get(name).promise;
 const controller=new AbortController(),epoch=cacheEpoch,version=packVersions.get(name)||0,record={controller,reload,promise:null};
 const valid=()=>epoch===cacheEpoch&&version===(packVersions.get(name)||0)&&!controller.signal.aborted;
 const check=()=>{if(!valid())throw Error('Stale bundle request');};
 const p=lane(network,()=>networkLimit,async()=>{
  check();metrics.peakInflight=Math.max(metrics.peakInflight,network.active);const requestAt=globalThis.performance?.now()??0;let abort;
  try{const b=await bounded(Promise.race([(async()=>{
   await invalidation;check();
   const url=new URL('./assets/'+name,self.registration.scope),immutable=/^(?:bundle-[a-z]+|gpu-textures)-[a-f0-9]{20}\.bin$/.test(name);
   let refresh=reload;
   if(immutable&&!reload){const cached=await diskRead(name,url);check();if(cached){if(await validPack(name,cached)){check();return cached;}refresh=true;await forgetDiskPack(name);check();}}
   const r=await fetch(url,{signal:controller.signal,cache:refresh?'reload':immutable?'force-cache':'default'});if(!r.ok)throw Error('Bundle HTTP '+r.status);
   const bytes=await r.arrayBuffer();check();if(!await validPack(name,bytes))throw Error('Bundle integrity failed');check();
   if(immutable)await rememberPack(name,url,bytes,valid);check();return bytes;
  })(),new Promise((_,reject)=>{abort=()=>reject(Error('Bundle request cancelled'));controller.signal.addEventListener('abort',abort,{once:true});if(controller.signal.aborted)abort();})]),45000,'Bundle timeout');
   check();metrics.bundleBodyBytes+=b.byteLength;const timing=globalThis.performance?.getEntriesByName?.(new URL('./assets/'+name,self.registration.scope).href).at(-1);if(timing&&timing.startTime>=requestAt&&typeof timing.transferSize==='number'){metrics.networkTransferBytes+=timing.transferSize;metrics.transferSamples++;}metrics.downloads++;if(b.byteLength<=packLimit){dropMemory(name);bundles.set(name,b);resident+=b.byteLength;trim();metrics.peakResident=Math.max(metrics.peakResident,resident);}return b;
  }finally{if(abort)controller.signal.removeEventListener('abort',abort);controller.abort();}
 });record.promise=p;inflight.set(name,record);try{return await p;}finally{if(inflight.get(name)===record)inflight.delete(name);}
}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);if(u.origin!==self.location.origin)return;
 const prefix=new URL(self.registration.scope).pathname;if(!u.pathname.startsWith(prefix))return;
 const key=decodeURIComponent(u.pathname.slice(prefix.length)),indexName=u.searchParams.get('sc2-index');if(!indexName&&!self.SC2_PACK_INDEX[key])return;
 event.respondWith((async()=>{try{
  if(event.clientId&&!clientsBudget.has(event.clientId)){const client=await self.clients.get(event.clientId);client?.postMessage({type:'sc2-request-budget'});}
  const row=(await indexFor(indexName))[key];if(!row)return fetch(event.request);
  const [name,offset,length,mime,isGlb]=row,bundle=await getBundle(name,event.request.cache==='reload'||event.request.cache==='no-store');
  let bytes=bundle.slice(offset,offset+length);
  if(isGlb&&new Uint8Array(bytes)[0]===31&&new Uint8Array(bytes)[1]===139)bytes=await lane(decode,()=>decodeLimit,async()=>{metrics.peakDecode=Math.max(metrics.peakDecode,decode.active);const at=performance.now();metrics.gzipInputBytes+=bytes.byteLength;const expanded=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();metrics.gzipMs+=performance.now()-at;metrics.gzipOutputBytes+=expanded.byteLength;return expanded;});
  metrics.logicalBytes+=bytes.byteLength;return new Response(bytes,{headers:{'Content-Type':mime,'Cache-Control':'no-store'}});
 }catch{return new Response('Resource bundle unavailable',{status:502});}})());
});
