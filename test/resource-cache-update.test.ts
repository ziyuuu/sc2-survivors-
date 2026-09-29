import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {HttpAssetStore,type HttpAssetManifest} from '../src/assets/http-store';
const digest=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
test('returning players reuse verified disk bytes across new stores and application releases',async()=>{
 const files=new Map<string,Response>(),original=globalThis.caches;
 Object.defineProperty(globalThis,'caches',{configurable:true,value:{open:async()=>({match:async(k:string)=>files.get(k)?.clone(),put:async(k:string,r:Response)=>{files.set(k,r.clone());},delete:async(k:string)=>files.delete(k)}),delete:async()=>{files.clear();return true;}}});
 try{const bytes=new TextEncoder().encode('unchanged model'),sha=digest(bytes),manifest:HttpAssetManifest={version:1,release:'first',assets:{model:{url:`assets/${sha}.glb`,bytes:bytes.length,sha256:sha,mime:'model/gltf-binary'}}};let requests=0;const request=async()=>{requests++;return new Response(bytes);};
  const first=new HttpAssetStore(manifest,'https://assets.example/',request);await first.prepare(['model']);assert.equal(requests,1);
  const second=new HttpAssetStore({...manifest,release:'second'},'https://assets.example/',request);await second.prepare(['model']);assert.equal(requests,1);assert.equal(second.metrics.cachedBytes,bytes.length);
  await second.cache.clear();assert.equal(files.size,0);await second.prepare(['model']);assert.equal(requests,1,'live prepared assets remain usable after disk cache clear');
  URL.revokeObjectURL(first.urls.model);URL.revokeObjectURL(second.urls.model);
 }finally{Object.defineProperty(globalThis,'caches',{configurable:true,value:original});}
});
test('pre-download creates no model blobs, resumes completed files and recovers a corrupt file alone',async()=>{
 const disk=new Map<string,ArrayBuffer>(),data=['one','two'].map(s=>new TextEncoder().encode(s)),rows=data.map(b=>({url:`assets/${digest(b)}.glb`,sha256:digest(b),bytes:b.length,mime:'model/gltf-binary'}));let requests=0;
 const manifest:HttpAssetManifest={version:1,release:'test',assets:{one:rows[0],two:rows[1]}};
 const store=new HttpAssetStore(manifest,'https://assets.example/',async input=>{requests++;const i=rows.findIndex(r=>String(input).endsWith(r.url));return new Response(data[i]);});
 store.cache.get=async h=>disk.get(h)??null;store.cache.put=async(h,b)=>{disk.set(h,b);return true;};store.cache.remove=async h=>{disk.delete(h);};
 await store.prefetch(['one'],()=>{},()=>false);assert.equal(requests,1);assert.deepEqual(store.urls,{});
 await store.prefetch(['one','two'],()=>{},()=>false);assert.equal(requests,2);disk.set(rows[0].sha256,new Uint8Array([1]).buffer);
 await store.prefetch(['one','two'],()=>{},()=>false);assert.equal(requests,3);await store.prepare(['one','two']);assert.equal(requests,3);for(const u of Object.values(store.urls))URL.revokeObjectURL(u);
});

test('normal loading and optional pre-download share an in-flight request',async()=>{
 const bytes=new TextEncoder().encode('concurrent-model'),sha=digest(bytes),disk=new Map<string,ArrayBuffer>();let requests=0,release!:()=>void;const gate=new Promise<void>(r=>release=r);
 const store=new HttpAssetStore({version:1,release:'same',assets:{model:{url:`assets/${sha}.glb`,bytes:bytes.length,sha256:sha,mime:'model/gltf-binary'}}},'https://assets.example/',async()=>{requests++;await gate;return new Response(bytes);});
 store.cache.get=async h=>disk.get(h)??null;store.cache.put=async(h,b)=>{disk.set(h,b);return true;};
 const playing=store.prepare(['model']);await new Promise(r=>setTimeout(r,1));const prefetch=store.prefetch(['model'],()=>{},()=>false);release();await Promise.all([playing,prefetch]);assert.equal(requests,1);URL.revokeObjectURL(store.urls.model);
});
