import test from 'node:test';
import assert from 'node:assert/strict';
import {RecentCache} from '../src/ui/presentation/recent-cache';
import {EmbeddedAssetStore,restoreAssetPack} from '../src/assets/offline-pack';
import {createAssetPack} from '../tools/offline-pack.mjs';
import {MapPreview} from '../src/ui/presentation/map-preview';
import type {World} from '../src/simulation/world';

test('display cache keeps recent pages, bounds payload bytes and can regenerate evicted content',()=>{
 const cache=new RecentCache<string>(3,40,(k,v)=>2*(k.length+v.length));
 cache.set('a','aaa').set('b','bbb').set('c','ccc');assert.equal(cache.get('a'),'aaa');
 cache.set('d','ddd');assert.equal(cache.has('b'),false);assert.equal(cache.byteSize,24);
 cache.set('a','a');assert.equal(cache.byteSize,20);
 cache.set('oversize','x'.repeat(40));assert.equal(cache.has('oversize'),false);assert.equal(cache.size,3);
 cache.set('e','eeeee');assert.ok(cache.byteSize<=40);assert.equal(cache.size,3);
 cache.clear();assert.equal(cache.byteSize,0);cache.set('b','bbb');assert.equal(cache.get('b'),'bbb');
});

test('offline asset SHA rejects same-size corruption before publishing any new URL, then retries intact bytes',async()=>{
 const {pack}=createAssetPack([{id:'first',mime:'text/plain',bytes:Buffer.from('valid-first')},{id:'bad',mime:'text/plain',bytes:Buffer.from('same-size-data')}]);
 const clone=structuredClone(pack),sha=clone.assets.bad.sha256;clone.assets.bad.sha256='0'.repeat(64);
 const store=new EmbeddedAssetStore(clone);
 await assert.rejects(store.prepare(['first','bad']),/内容校验/);assert.deepEqual(store.urls,{});
 clone.assets.bad.sha256=sha;await store.prepare(['first','bad']);
 try{assert.equal(await(await fetch(store.urls.bad)).text(),'same-size-data');}finally{for(const u of Object.values(store.urls))URL.revokeObjectURL(u);}
});

test('same-size replacement bytes are rejected using the original manifest hash',async()=>{
 const {pack}=createAssetPack([{id:'text',mime:'text/plain',bytes:Buffer.from('hello')}]);
 const {pack:other}=createAssetPack([{id:'text',mime:'text/plain',bytes:Buffer.from('jello')}]);
 pack.chunks=other.chunks;
 await assert.rejects(new EmbeddedAssetStore(structuredClone(pack)).prepare(['text']),/内容校验/);
 await assert.rejects(restoreAssetPack(pack),/内容校验/);
});

test('legacy restore rejects a malformed or mismatched hash as well as wrong lengths',async()=>{
 for(const sha of ['','0'.repeat(64)]){
  const {pack}=createAssetPack([{id:'text',mime:'text/plain',bytes:Buffer.from('hello')}]);pack.assets.text.sha256=sha;
  await assert.rejects(restoreAssetPack(pack),/内容校验/);
 }
});

test('async previews bound in-flight work, reject a retired run, and survive unavailable UI storage',()=>{
 const descriptors=Object.fromEntries(['document','localStorage','FileReader'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const encodes:BlobCallback[]=[],readers:{result:string;onload:()=>void;onloadend:()=>void}[]=[];let writes=0,changes=0;
 const canvas={width:1440,height:900,getContext:()=>({clearRect(){},drawImage(){}}),toBlob:(cb:BlobCallback)=>{encodes.push(cb);}};
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>canvas}});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>null,setItem(){writes++;throw Error('quota');}}});
 Object.defineProperty(globalThis,'FileReader',{configurable:true,value:class {result='data:image/webp;base64,eA==';onload=()=>{};onloadend=()=>{};readAsDataURL(){readers.push(this);}}});
 try{
  const preview=new MapPreview(()=>changes++),w={phase:'battle',paused:true,runId:'one',tick:1,battlefield:{mapHash:'map'}} as World;
  const capture=()=>preview.capture(w,canvas as unknown as HTMLCanvasElement);
  capture();capture();assert.equal(encodes.length,1);assert.equal(writes,0);
  w.runId='two';encodes.shift()!(new Blob(['x']));readers[0].onload();readers[0].onloadend();assert.equal(preview.live(w),null);assert.equal(writes,0);
  capture();encodes.shift()!(new Blob(['x']));readers[1].onload();readers[1].onloadend();assert.equal(writes,1);assert.equal(changes,1);assert.ok(preview.live(w)?.startsWith('data:image/webp'));
  capture();assert.equal(encodes.length,0,'same paused frame does not encode again');
  w.tick++;capture();encodes.shift()!(null);w.tick++;capture();assert.equal(encodes.length,1,'null encoder result releases the slot');
 }finally{for(const [key,descriptor]of Object.entries(descriptors)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}
});
