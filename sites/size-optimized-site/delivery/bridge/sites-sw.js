importScripts('./sites-pack-index.js');
const bundles=new Map();
let maxBundles=16;
self.addEventListener('message',event=>{if(event.data?.type==='sc2-pack-memory-limit'&&event.data.entries===4){maxBundles=4;while(bundles.size>maxBundles)bundles.delete(bundles.keys().next().value);}});
async function getBundle(name){
 let p=bundles.get(name);
 if(p){bundles.delete(name);bundles.set(name,p);return p;}
 p=(async()=>{
  const controller=new AbortController();
  let timer;
  try{
   // Bound both headers and body. A rejected job must leave the map so a later
   // client retry cannot attach to the same permanently stalled download.
   return await Promise.race([
    (async()=>{const r=await fetch(new URL('./assets/'+name,self.registration.scope),{signal:controller.signal});if(!r.ok)throw Error('Bundle HTTP '+r.status);return r.arrayBuffer();})(),
    new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Bundle timeout'));},45000);})
   ]);
  }finally{clearTimeout(timer);controller.abort();}
 })();
 bundles.set(name,p);
 p.catch(()=>{if(bundles.get(name)===p)bundles.delete(name);});
 while(bundles.size>maxBundles)bundles.delete(bundles.keys().next().value);
 return p;
}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);if(u.origin!==self.location.origin)return;
 const prefix=new URL(self.registration.scope).pathname;if(!u.pathname.startsWith(prefix))return;
 const row=self.SC2_PACK_INDEX[decodeURIComponent(u.pathname.slice(prefix.length))];if(!row)return;
 event.respondWith((async()=>{
  try{
   const [name,offset,length,mime,isGlb]=row,bundle=await getBundle(name);
   let bytes=bundle.slice(offset,offset+length);
   if(isGlb){const h=new Uint8Array(bytes);if(h[0]===31&&h[1]===139)bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
   return new Response(bytes,{headers:{'Content-Type':mime,'Cache-Control':'no-store'}});
  }catch{return new Response('Resource bundle unavailable',{status:502});}
 })());
});
