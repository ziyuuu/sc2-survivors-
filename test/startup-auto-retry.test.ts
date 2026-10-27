import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {HttpAssetStore} from '../src/assets/http-store';
import {retryAssetPreparation} from '../src/assets/preparation-wait';

test('menu retry retains verified resources and recovers a transient failed request',async()=>{
 const items=Array.from({length:6},(_,i)=>{const bytes=Buffer.from('menu-'+i),sha256=createHash('sha256').update(bytes).digest('hex');return {bytes,entry:{url:`assets/${sha256}.bin`,bytes:bytes.length,sha256,mime:'application/octet-stream'}};});
 const calls=new Map<string,number>();let failed=false;
 const store=new HttpAssetStore({version:1,release:'retry',assets:Object.fromEntries(items.map((x,i)=>[String(i),x.entry]))},'https://assets.invalid/',async input=>{
  const url=String(input);calls.set(url,(calls.get(url)??0)+1);const index=items.findIndex(x=>url.endsWith(x.entry.url));
  if(index===0&&!failed){failed=true;return new Response('',{status:502});}return new Response(items[index].bytes);
 });store.cache.get=async()=>null;store.cache.put=async()=>true;
 const delays:number[]=[];
 await retryAssetPreparation(()=>store.prepare(items.map((_,i)=>String(i))),()=>{},async ms=>{delays.push(ms);});
 assert.deepEqual(delays,[1000]);assert.equal(Object.keys(store.urls).length,6);
 for(let i=0;i<items.length;i++){assert.equal(calls.get('https://assets.invalid/'+items[i].entry.url),i===0?2:1);URL.revokeObjectURL(store.urls[String(i)]);}
});

test('permanent failures use three delayed automatic retries then release recovery control',async()=>{
 let calls=0;const seen:number[]=[],delays:number[]=[];
 await assert.rejects(retryAssetPreparation(async()=>{calls++;throw Error('offline');},attempt=>seen.push(attempt),async ms=>{delays.push(ms);}),/offline/);
 assert.equal(calls,4);assert.deepEqual(seen,[1,2,3]);assert.deepEqual(delays,[1000,2000,4000]);
});

test('packed resource stalled body is aborted, discarded, and a later retry downloads fresh bytes',async()=>{
 let calls=0,firstSignal:AbortSignal|undefined,lateBody!:(v:ArrayBuffer)=>void;
 const context=vm.createContext({URL,AbortController,Response,Blob,DecompressionStream,Uint8Array,Error,Map,Promise,clearTimeout,
  setTimeout:(fn:()=>void)=>setTimeout(fn,5),importScripts:()=>{},
  self:{registration:{scope:'https://game.invalid/'},addEventListener:()=>{}},
  fetch:async(_url:URL,init:RequestInit)=>{calls++;if(calls===1){firstSignal=init.signal as AbortSignal;return {ok:true,arrayBuffer:()=>new Promise<ArrayBuffer>(resolve=>lateBody=resolve)};}return new Response(new Uint8Array([4,5,6]));}
 });
 vm.runInContext(await fs.readFile('tools/packed-sites-sw.js','utf8'),context);
 await assert.rejects(vm.runInContext("getBundle('bundle-000.bin')",context),/timeout/);assert.ok(firstSignal?.aborted);
 const bytes=await vm.runInContext("getBundle('bundle-000.bin')",context);assert.deepEqual([...new Uint8Array(bytes)],[4,5,6]);assert.equal(calls,2);
 lateBody(new Uint8Array([0]).buffer);await Promise.resolve();
 assert.deepEqual([...new Uint8Array(await vm.runInContext("getBundle('bundle-000.bin')",context))],[4,5,6]);assert.equal(calls,2);
});

test('touch-device resource cache keeps at most four bundle buffers',async()=>{
 let message:((e:{data:unknown})=>void)|undefined,calls=0;
 const context=vm.createContext({URL,AbortController,Response,Blob,DecompressionStream,Uint8Array,Error,Map,Promise,clearTimeout,setTimeout,importScripts:()=>{},
  self:{registration:{scope:'https://game.invalid/'},addEventListener:(kind:string,listener:typeof message)=>{if(kind==='message')message=listener;}},
  fetch:async()=>{calls++;return new Response(new Uint8Array([1,2,3]));}
 });vm.runInContext(await fs.readFile('tools/packed-sites-sw.js','utf8'),context);message!({data:{type:'sc2-pack-memory-limit',entries:4}});
 for(let i=0;i<7;i++)await vm.runInContext(`getBundle('bundle-${i}.bin')`,context);
 assert.equal(vm.runInContext('bundles.size',context),4);assert.equal(calls,7);
 await vm.runInContext("getBundle('bundle-0.bin')",context);assert.equal(calls,8);assert.equal(vm.runInContext('bundles.size',context),4);
});
