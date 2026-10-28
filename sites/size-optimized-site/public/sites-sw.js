importScripts("./sites-pack-index.0bb43ff1011a0ab1462d.js");
// Inflight identities are separate from the evictable byte LRU.
globalThis.performance?.setResourceTimingBufferSize?.(4096);
const inflight=new Map(),bundles=new Map(),clientsBudget=new Map();
// A bounded, hash-only disk cache avoids re-downloading a pack after memory LRU
// eviction. It never shares a namespace with player saves or resource IDB.
const diskLimit=256*1024**2,diskRows=new Map();let diskBytes=0,diskJob=Promise.resolve();
const diskReady=(async()=>{try{if(!globalThis.caches)return null;const cache=await caches.open('sc2-immutable-packs-v1');for(const key of await cache.keys()){const r=await cache.match(key),bytes=Number(r?.headers.get('X-SC2-Pack-Bytes'))||0;diskRows.set(key.url,bytes);diskBytes+=bytes;}return cache;}catch{return null;}})();
async function rememberPack(url,bytes){const cache=await diskReady;if(!cache||bytes.byteLength>diskLimit)return;diskJob=diskJob.then(async()=>{try{while(diskBytes+bytes.byteLength>diskLimit&&diskRows.size){const [key,size]=diskRows.entries().next().value;await cache.delete(key);diskRows.delete(key);diskBytes-=size;}await cache.put(url,new Response(bytes,{headers:{'X-SC2-Pack-Bytes':String(bytes.byteLength)}}));diskBytes+=bytes.byteLength-(diskRows.get(url)||0);diskRows.set(url,bytes.byteLength);}catch{}});await diskJob;}
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
});
async function getBundle(name){
 if(bundles.has(name)){const b=bundles.get(name);bundles.delete(name);bundles.set(name,b);return b;}
 if(inflight.has(name))return inflight.get(name);
 const p=lane(network,()=>networkLimit,async()=>{
  metrics.peakInflight=Math.max(metrics.peakInflight,network.active);const controller=new AbortController(),requestAt=globalThis.performance?.now()??0;let timer;
  try{const b=await Promise.race([(async()=>{const url=new URL('./assets/'+name,self.registration.scope),immutable=/^(?:bundle-[a-z]+|gpu-textures)-[a-f0-9]{20}\.bin$/.test(name),cache=immutable?await diskReady:null,hit=await cache?.match(url);if(hit)return hit.arrayBuffer();const r=await fetch(url,{signal:controller.signal,cache:immutable?'force-cache':'default'});if(!r.ok)throw Error('Bundle HTTP '+r.status);const bytes=await r.arrayBuffer();if(immutable)await rememberPack(url,bytes);return bytes;})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Bundle timeout'));},45000);})]);
   metrics.bundleBodyBytes+=b.byteLength;const timing=globalThis.performance?.getEntriesByName?.(new URL('./assets/'+name,self.registration.scope).href).at(-1);if(timing&&timing.startTime>=requestAt&&typeof timing.transferSize==='number'){metrics.networkTransferBytes+=timing.transferSize;metrics.transferSamples++;}metrics.downloads++;if(b.byteLength<=packLimit){bundles.set(name,b);resident+=b.byteLength;trim();metrics.peakResident=Math.max(metrics.peakResident,resident);}return b;
  }finally{clearTimeout(timer);controller.abort();}
 });inflight.set(name,p);try{return await p;}finally{inflight.delete(name);}
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
  const [name,offset,length,mime,isGlb]=row,bundle=await getBundle(name);
  let bytes=bundle.slice(offset,offset+length);
  if(isGlb&&new Uint8Array(bytes)[0]===31&&new Uint8Array(bytes)[1]===139)bytes=await lane(decode,()=>decodeLimit,async()=>{metrics.peakDecode=Math.max(metrics.peakDecode,decode.active);const at=performance.now();metrics.gzipInputBytes+=bytes.byteLength;const expanded=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();metrics.gzipMs+=performance.now()-at;metrics.gzipOutputBytes+=expanded.byteLength;return expanded;});
  metrics.logicalBytes+=bytes.byteLength;return new Response(bytes,{headers:{'Content-Type':mime,'Cache-Control':'no-store'}});
 }catch{return new Response('Resource bundle unavailable',{status:502});}})());
});
