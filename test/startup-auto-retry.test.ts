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

test('byte LRU retains inflight deduplication and rejects oversize residency',async()=>{
 let calls=0;const context=vm.createContext({URL,AbortController,Response,Blob,DecompressionStream,Uint8Array,Error,Map,Promise,clearTimeout,setTimeout,importScripts:()=>{},
  self:{registration:{scope:'https://game.invalid/'},addEventListener:()=>{}},fetch:async()=>{calls++;await new Promise(r=>setTimeout(r,2));return new Response(new Uint8Array(8));}
 });vm.runInContext(await fs.readFile('tools/packed-sites-sw.js','utf8'),context);vm.runInContext('packLimit=12',context);
 await Promise.all([vm.runInContext("getBundle('one')",context),vm.runInContext("getBundle('one')",context),vm.runInContext("getBundle('two')",context)]);
 assert.equal(calls,2);assert.equal(vm.runInContext('resident',context),8);assert.equal(vm.runInContext('inflight.size',context),0);
 vm.runInContext('packLimit=4;trim()',context);await vm.runInContext("getBundle('big')",context);assert.equal(vm.runInContext('resident',context),0);assert.equal(vm.runInContext('bundles.size',context),0);
});

test('old and new immutable indexes remain distinct after a worker update',async()=>{
 const a='sites-pack-index.'+'a'.repeat(20)+'.js',b='sites-pack-index.'+'b'.repeat(20)+'.js';let calls=0;
 const context=vm.createContext({URL,AbortController,Response,Blob,DecompressionStream,Uint8Array,Error,Map,Promise,clearTimeout,setTimeout,importScripts:()=>{},self:{SC2_PACK_INDEX:{current:1},registration:{scope:'https://game.invalid/'},addEventListener:()=>{}},fetch:async(url:URL)=>{calls++;return new Response('self.SC2_PACK_INDEX='+JSON.stringify({resource:url.pathname.includes(a)?'old':'new'})+';');}});
 vm.runInContext(await fs.readFile('tools/packed-sites-sw.js','utf8'),context);
 assert.equal((await vm.runInContext(`indexFor('${a}')`,context)).resource,'old');assert.equal((await vm.runInContext(`indexFor('${b}')`,context)).resource,'new');assert.equal((await vm.runInContext(`indexFor('${a}')`,context)).resource,'old');assert.equal(calls,2);await assert.rejects(vm.runInContext("indexFor('../other.js')",context));
});

test('worker merges client budgets conservatively and lowers queued concurrency',async()=>{
 const context=vm.createContext({URL,AbortController,Response,Blob,DecompressionStream,Uint8Array,Error,Map,Set,Promise,clearTimeout,setTimeout,importScripts:()=>{},self:{registration:{scope:'https://game.invalid/'},clients:{matchAll:async()=>[{id:'one'},{id:'two'}]},addEventListener:()=>{}}});vm.runInContext(await fs.readFile('tools/packed-sites-sw.js','utf8'),context);
 await vm.runInContext("clientsBudget.set('one',{packBytes:48*1024**2,network:6,decode:2});clientsBudget.set('two',{packBytes:12*1024**2,network:1,decode:1});budgets()",context);assert.equal(vm.runInContext('networkLimit',context),1);assert.equal(vm.runInContext('decodeLimit',context),1);
 const values=await vm.runInContext(`(async()=>{networkLimit=3;let active=0,peakAfter=0;const tasks=Array.from({length:6},(_,i)=>lane(network,()=>networkLimit,async()=>{active++;if(i>=3)peakAfter=Math.max(peakAfter,active);await new Promise(r=>setTimeout(r,5));active--;}));networkLimit=1;await Promise.all(tasks);return peakAfter;})()`,context);assert.equal(values,1);
});
