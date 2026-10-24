import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {encode85} from '../src/assets/base85.mjs';
import {EmbeddedAssetStore,restoreEmbeddedContainerChunksAsync,type AssetPack} from '../src/assets/offline-pack';
import {createAssetPack} from '../tools/offline-pack.mjs';
import {waitForAsset,fetchAsset} from '../src/assets/preparation-wait';
import {HttpAssetStore} from '../src/assets/http-store';
import {ResourceCache} from '../src/assets/persistent-cache';
import {BackgroundPreparation} from '../src/app/background-preparation';
import {AssetReadinessCoordinator} from '../src/app/asset-readiness';
const pause=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');

test('L02 yielded container parsing feeds the unchanged decoder with exact original bytes and shared parts',async()=>{
 const assets=[{id:'one',mime:'test',bytes:Buffer.alloc(3205056,7)},{id:'alias',mime:'test',bytes:Buffer.alloc(3205056,7)},{id:'tail',mime:'test',bytes:Buffer.from([3,2,1])}];
 const {pack}=createAssetPack(assets),metadata={...pack,container:'chunks-v1' as const,chunks:pack.chunks.map(c=>({...c,data:''}))} as AssetPack;
 await restoreEmbeddedContainerChunksAsync(metadata,pack.chunks.map((c,index)=>({index,payload:JSON.stringify(c)})));
 const store=new EmbeddedAssetStore(metadata);await store.prepare(['one']);await store.prepare(['alias','tail']);
 try{for(const asset of assets)assert.equal(sha(new Uint8Array(await(await fetch(store.urls[asset.id])).arrayBuffer())),sha(asset.bytes));}finally{for(const url of Object.values(store.urls))URL.revokeObjectURL(url);}
});
test('L02 asynchronous container validates the same metadata and reports completed original chunks',async()=>{
 const c={encoding:'raw' as const,bytes:1,storedBytes:1,data:encode85(new Uint8Array([42]))};
 const pack=():AssetPack=>({version:2,container:'chunks-v1',chunks:[{...c,data:''},{...c,data:''}],assets:{}});
 const parts=[0,1].map(index=>({index,payload:JSON.stringify(c)})),seen:number[]=[];
 const p=pack();await restoreEmbeddedContainerChunksAsync(p,parts,done=>seen.push(done));assert.equal(seen.at(-1),2);assert.ok(seen.every(n=>n>0&&n<=2));assert.deepEqual(p.chunks,[c,c]);
 await assert.rejects(restoreEmbeddedContainerChunksAsync(pack(),parts.slice(0,1)),/缺失/);
 await assert.rejects(restoreEmbeddedContainerChunksAsync(pack(),[parts[0],parts[0]]),/编号/);
 await assert.rejects(restoreEmbeddedContainerChunksAsync(pack(),[{index:0,payload:JSON.stringify({...c,bytes:2})}]),/元数据/);
});
test('L02 parser preserves its result when native scheduler yielding is available',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'scheduler'),clock=performance.now;let yields=0,time=0;
 Object.defineProperty(globalThis,'scheduler',{configurable:true,value:{yield:async()=>{yields++;}}});performance.now=()=>time+=10;
 try{
  const c={encoding:'raw' as const,bytes:1,storedBytes:1,data:encode85(new Uint8Array([42]))},p:AssetPack={version:2,container:'chunks-v1',chunks:[{...c,data:''},{...c,data:''}],assets:{}};
  await restoreEmbeddedContainerChunksAsync(p,[0,1].map(index=>({index,payload:JSON.stringify(c)})));assert.ok(yields>0);assert.deepEqual(p.chunks,[c,c]);
 }finally{performance.now=clock;if(original)Object.defineProperty(globalThis,'scheduler',original);else delete (globalThis as any).scheduler;}
});
test('L02 body timeout aborts its request, does not authorize a partial asset, and retries the same hash',async()=>{
 const bytes=new TextEncoder().encode('verified after timeout'),hash=sha(bytes);let calls=0,signal:AbortSignal|undefined,finishBody!:(b:ArrayBuffer)=>void;
 const store=new HttpAssetStore({version:1,release:'l02',assets:{model:{sha256:hash,bytes:bytes.length,mime:'application/octet-stream',url:`assets/${hash}.bin`}}},'https://assets.invalid/',async(_input,init)=>{
  signal=init?.signal as AbortSignal;calls++;return calls===1?{ok:true,arrayBuffer:()=>new Promise<ArrayBuffer>(resolve=>finishBody=resolve)} as Response:new Response(bytes);
 },15);
 store.cache.get=async()=>null;store.cache.put=async()=>true;
 await assert.rejects(store.prepare(['model']),/超时/);assert.ok(signal?.aborted);assert.equal(store.urls.model,undefined);assert.equal(store.metrics.files,0);
 finishBody(new Uint8Array([0]).buffer);await pause();assert.equal(store.metrics.files,0);
 await store.prepare(['model']);assert.equal(calls,2);assert.equal(store.metrics.files,1);assert.equal(sha(new Uint8Array(await(await fetch(store.urls.model)).arrayBuffer())),hash);URL.revokeObjectURL(store.urls.model);
});
test('L02 header timeout and explicit wait cancellation settle without accepting late results',async()=>{
 let signal:AbortSignal|undefined;
 await assert.rejects(fetchAsset(async(_input,init)=>{signal=init?.signal as AbortSignal;return new Promise<Response>(()=>{});},'https://assets.invalid/',{},r=>r.text(),10),/超时/);assert.ok(signal?.aborted);
 const controller=new AbortController(),p=waitForAsset(new Promise<void>(()=>{}),'lane',1000,controller.signal);controller.abort();await assert.rejects(p,/取消/);
 await assert.rejects(waitForAsset(Promise.reject(null),'failure'),e=>e===null);
});
test('L02 cancelled or timed-out lane tickets keep successors behind the real old task',async()=>{
 for(const cancel of [true,false]){
  const lane=new BackgroundPreparation(()=>0,()=>true);let finish!:()=>void;
  lane.select([{key:'old',run:()=>new Promise<void>(resolve=>finish=resolve)}]);lane.tick();await pause();
  const controller=new AbortController(),first=lane.enter(controller.signal,10);if(cancel)controller.abort();await assert.rejects(first,cancel?/取消/:/超时/);
  let acquired=false;const next=lane.enter(undefined,1000).then(release=>{acquired=true;return release;});await pause();assert.equal(acquired,false);assert.equal(lane.report().held,2);
  finish();const release=await next;assert.equal(lane.report().held,1);release();release();assert.equal(lane.report().held,0);
 }
});
test('L02 cancelling a queued readiness request never clears the active request renderer controls',async()=>{
 const lane=new BackgroundPreparation(()=>0,()=>true);let finish!:()=>void;
 const view:any={initialAssetsLoaded:true,modelErrors:[],preparationKey:'same',prepareCurrentAssets:()=>new Promise<void>(resolve=>finish=resolve),waitForPendingAssets:async()=>{},compilePresentation:async()=>{},warmPresentationBatches:async()=>0};
 const gate=new AssetReadinessCoordinator({expedition:{race:'terran'}} as any,view,undefined,lane);
 const old=gate.prepare('reinforcement');while(!finish)await pause();const control=view.preparationControl;
 const queued=gate.prepare('reinforcement');gate.cancel();assert.equal(await queued,false);assert.equal(view.entryPreparation,true);assert.equal(view.preparationControl,control);
 finish();assert.equal(await old,false);await pause();assert.equal(view.entryPreparation,false);assert.equal(lane.report().held,0);assert.equal(gate.readyToken,null);
});
test('L02 cache waits degrade to usable bytes, blocked opens close late connections and retry',async()=>{
 const oldCaches=globalThis.caches,oldIDB=globalThis.indexedDB;let request:any,opens=0,closed=0;
 Object.defineProperty(globalThis,'caches',{configurable:true,value:{open:async()=>({put:async()=>{},match:()=>new Promise(()=>{})})}});
 Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:{open:()=>{opens++;return request={};}}});
 try{
  const cache=new ResourceCache(10,0);assert.equal(await cache.get('x'),null);assert.match(cache.warning!,/缓存/);
  const pending=cache.put('x',new Uint8Array([1]).buffer,'test','r');while(!request)await pause();request.onblocked();assert.equal(await pending,true);
  request.result={close:()=>closed++};request.onsuccess();assert.equal(closed,1);
  request=undefined;await cache.task('t','r',[],'running',0);assert.equal(opens,2);
  request.result={close:()=>closed++};request.onsuccess();assert.equal(closed,2);
 }finally{Object.defineProperty(globalThis,'caches',{configurable:true,value:oldCaches});Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:oldIDB});}
});
test('L02 a stalled cache service is skipped for later assets until its retry window',async()=>{
 const original=globalThis.caches;let opens=0;
 Object.defineProperty(globalThis,'caches',{configurable:true,value:{open:()=>{opens++;return new Promise(()=>{});}}});
 try{
  const cache=new ResourceCache(10,1000);assert.equal(await cache.get('one'),null);
  for(let i=0;i<12;i++){assert.equal(await cache.get(String(i)),null);assert.equal(await cache.put(String(i),new ArrayBuffer(1),'test','r'),false);}
  assert.equal(opens,1,'required assets must not each repeat the failed optional cache wait');
 }finally{Object.defineProperty(globalThis,'caches',{configurable:true,value:original});}
});
test('L02 index versionchange closes the resource database; a stalled transaction aborts without blocking play',async()=>{
 const original=globalThis.indexedDB;let request:any,opens=0,closed=0,aborts=0;
 const db:any={close:()=>closed++,transaction:()=>({objectStore:()=>({put:()=>{}}),abort:()=>aborts++})};
 Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:{open:()=>{opens++;request={};queueMicrotask(()=>{request.result=db;request.onsuccess();});return request;}}});
 try{
  const cache=new ResourceCache(10);await cache.task('t','r',[],'running',0);assert.equal(aborts,1);assert.ok(cache.warning);
  db.onversionchange();assert.equal(closed,1);await cache.task('t','r',[],'failed',0);assert.equal(opens,2);assert.equal(aborts,2);
 }finally{Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:original});}
});
