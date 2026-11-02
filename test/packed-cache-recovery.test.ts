import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash,webcrypto} from 'node:crypto';
import {HttpAssetStore} from '../src/assets/http-store';
import {ResourceCache} from '../src/assets/persistent-cache';

const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),good=new TextEncoder().encode('verified pack resource'),bad=new TextEncoder().encode('corrupt! pack resource');
const pack='bundle-common-'+sha(good).slice(0,20)+'.bin',key='assets/'+sha(good)+'.bin',base='https://packed.invalid/',packURL=base+'assets/'+pack;
const text=await fs.readFile('tools/packed-sites-sw.js','utf8'),never=()=>new Promise<any>(()=>{});
function cacheFixture(mode='healthy',seed=false){
 const spaces=new Map<string,Map<string,{bytes:Uint8Array;headers:any}>>(),deleted:string[]=[],calls:string[]=[];
 const rows=(name:string)=>{if(!spaces.has(name))spaces.set(name,new Map());return spaces.get(name)!;};
 if(seed)rows('sc2-immutable-packs-v1').set(packURL,{bytes:bad,headers:{'X-SC2-Pack-Bytes':String(bad.length)}});
 const caches:any={async open(name:string){calls.push('open');if(name==='sc2-immutable-packs-v1'&&mode==='open-hang')return never();if(mode==='open-reject')throw Error('cache rejected');const data=rows(name);return {
  async keys(){calls.push('keys');if(mode==='keys-hang')return never();return [...data.keys()].map(url=>new Request(url));},
  async match(input:any){calls.push('match');if(mode==='match-hang')return never();if(mode==='match-reject')throw Error('cache match failed');const found=data.get(String(input?.url??input));return found?new Response(found.bytes,{headers:found.headers}):undefined;},
  async put(input:any,response:Response){calls.push('put');if(mode==='put-hang')return never();data.set(String(input?.url??input),{bytes:new Uint8Array(await response.arrayBuffer()),headers:Object.fromEntries(response.headers)});},
  async delete(input:any){calls.push('delete');if(mode==='delete-hang')return never();return data.delete(String(input?.url??input));}
 };},async delete(name:string){deleted.push(name);if(mode==='clear-hang')return never();return spaces.delete(name);}};
 return {caches,spaces,deleted,calls};
}
function worker(disk=cacheFixture(),fetcher:typeof fetch=async()=>new Response(good)){
 const listeners:Record<string,Function>={},requests:any[]=[],timers:number[]=[];
 const self:any={SC2_PACK_INDEX:{[key]:[pack,0,good.length,'application/octet-stream',false]},registration:{scope:base},location:{origin:new URL(base).origin},clients:{get:async()=>null,matchAll:async()=>[]},addEventListener:(type:string,fn:Function)=>listeners[type]=fn};
 const context=vm.createContext({self,importScripts:()=>{},URL,Request,Response,Blob,AbortController,DecompressionStream,performance,crypto:webcrypto,caches:disk.caches,setTimeout:(fn:any,ms:number)=>{timers.push(ms);return setTimeout(fn,ms===1000?10:ms);},clearTimeout,fetch:async(input:any,init:any)=>{requests.push({url:String(input),cache:init?.cache,signal:init?.signal});return fetcher(input,init);}});
 vm.runInContext(text,context);
 const request:typeof fetch=async(input:any,init:any)=>{let result:Promise<Response>|undefined;listeners.fetch({request:new Request(input,init),respondWith:(p:Promise<Response>)=>result=p});assert.ok(result);return result;};
 const postMessage=(data:any,ports:MessagePort[])=>listeners.message({data,ports,waitUntil:(job:Promise<unknown>)=>{job.catch(()=>{});}});
 return {context,request,requests,timers,postMessage,get:(reload=false)=>vm.runInContext(`getBundle(${JSON.stringify(pack)},${reload})`,context) as Promise<ArrayBuffer>,state:()=>vm.runInContext('({resident,inflight:inflight.size,networkActive:network.active,diskEnabled,diskBytes})',context),disk};
}
function withGlobals(t:any,sw:ReturnType<typeof worker>){
 const cache=Object.getOwnPropertyDescriptor(globalThis,'caches'),nav=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'caches',{configurable:true,value:sw.disk.caches});Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{controller:{postMessage:sw.postMessage}}}});
 t.after(()=>{if(cache)Object.defineProperty(globalThis,'caches',cache);else delete (globalThis as any).caches;if(nav)Object.defineProperty(globalThis,'navigator',nav);else delete (globalThis as any).navigator;});
}
const store=(sw:ReturnType<typeof worker>)=>new HttpAssetStore({version:1,release:'test',assets:{one:{url:key,bytes:good.length,sha256:sha(good),mime:'application/octet-stream'}}},base,sw.request,1000);

test('bad disk pack is evicted and redownloaded; HTTP verification receives correct bytes',async t=>{
 const sw=worker(cacheFixture('healthy',true));withGlobals(t,sw);const client=store(sw);
 await client.prepare(['one']);assert.equal(sw.requests.length,1);assert.equal(sw.requests[0].cache,'reload');assert.deepEqual(new Uint8Array(await (await fetch(client.urls.one)).arrayBuffer()),good);
 assert.deepEqual(sw.disk.spaces.get('sc2-immutable-packs-v1')!.get(packURL)!.bytes,good);URL.revokeObjectURL(client.urls.one);
 const restarted=worker(sw.disk);assert.deepEqual(new Uint8Array(await restarted.get()),good);assert.equal(restarted.requests.length,0);
});

test('client validation evicts bad memory data, reloads the pack, and invalid final downloads are never cached',async t=>{
 let wrong=false;const sw=worker(undefined,async()=>new Response(wrong?bad:good));withGlobals(t,sw);
 vm.runInContext(`bundles.set(${JSON.stringify(pack)},new Uint8Array(${JSON.stringify([...bad])}).buffer);resident=${bad.length};`,sw.context);
 const client=store(sw);await client.prepare(['one']);assert.equal(sw.requests.length,1);assert.equal(sw.requests[0].cache,'reload');URL.revokeObjectURL(client.urls.one);
 wrong=true;assert.equal((await sw.request(base+key,{cache:'reload'})).status,502);assert.equal(sw.state().resident,0);assert.ok(!sw.disk.spaces.get('sc2-immutable-packs-v1')?.has(packURL));
 wrong=false;assert.equal((await sw.request(base+key,{cache:'reload'})).status,200);
});

test('reload supersedes a stalled older request, shares simultaneous retries and blocks late memory/disk publication',async()=>{
 let late!:(b:ArrayBuffer)=>void,started!:()=>void;const ready=new Promise<void>(r=>started=r);
 const sw=worker(undefined,async()=>{if(!late){started();return {ok:true,arrayBuffer:()=>new Promise<ArrayBuffer>(r=>late=r)} as Response;}return new Response(good);});
 const old=sw.get(),rejected=assert.rejects(old,/cancelled|Stale/);await ready;while(!late)await Promise.resolve();
 const [a,b]=await Promise.all([sw.get(true),sw.get(true)]);await rejected;assert.deepEqual(new Uint8Array(a),good);assert.deepEqual(new Uint8Array(b),good);assert.equal(sw.requests.length,2);assert.equal(sw.requests[1].cache,'reload');assert.ok(sw.requests[0].signal.aborted);
 late(bad.buffer);await new Promise(r=>setTimeout(r,5));assert.deepEqual(new Uint8Array(await sw.get()),good);assert.deepEqual(sw.disk.spaces.get('sc2-immutable-packs-v1')!.get(packURL)!.bytes,good);assert.equal(sw.state().inflight,0);
});

test('optional cache open, keys, match, write and eviction stalls degrade to valid network data',async()=>{
 for(const mode of ['open-hang','open-reject','keys-hang','match-hang','match-reject','put-hang','delete-hang']){
  const sw=worker(cacheFixture(mode,mode==='delete-hang'));
  assert.deepEqual(new Uint8Array(await sw.get(mode==='delete-hang')),good,mode);assert.deepEqual(new Uint8Array(await sw.get(true)),good,mode);
  assert.equal(sw.requests.length,2,mode);assert.equal(sw.state().inflight,0);assert.equal(sw.state().networkActive,0);assert.equal(sw.state().diskEnabled,false,mode);assert.ok(sw.timers.includes(1000),mode);
 }
});

test('the existing clear action clears both resource layers and cancels old inflight work without touching player caches',async t=>{
 const disk=cacheFixture();disk.spaces.set('player-save-cache',new Map());let late!:(b:ArrayBuffer)=>void;
 const sw=worker(disk,async()=>{if(!late)return {ok:true,arrayBuffer:()=>new Promise<ArrayBuffer>(r=>late=r)} as Response;return new Response(good);});withGlobals(t,sw);
 const old=sw.get(),failed=assert.rejects(old,/cancelled|Stale/);while(!late)await Promise.resolve();await new ResourceCache(1000).clear();await failed;
 assert.deepEqual(disk.deleted,['sc2-immutable-packs-v1','sc2-resource-bytes-v1']);assert.ok(disk.spaces.has('player-save-cache'));assert.equal(sw.state().resident,0);
 late(bad.buffer);await new Promise(r=>setTimeout(r,5));assert.equal(sw.state().resident,0);assert.deepEqual(new Uint8Array(await sw.get()),good);assert.equal(sw.requests.length,2);
});

test('failed clear reports failure while bypassing the stalled disk; an obsolete silent worker cannot claim success',async t=>{
 const sw=worker(cacheFixture('clear-hang'));withGlobals(t,sw);await assert.rejects(new ResourceCache(200).clear(),/未能清理/);assert.equal(sw.state().diskEnabled,false);assert.deepEqual(new Uint8Array(await sw.get()),good);
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{controller:{postMessage(){}}}}});await assert.rejects(new ResourceCache(10).clear(),/等待超时/);
});
