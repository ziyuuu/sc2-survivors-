import test from 'node:test';
import assert from 'node:assert/strict';
import {connectPackedWorker} from '../tools/packed-startup.mjs';
import {clearPackedResourceCache,PackedWorkerUpdateError} from '../src/assets/packed-cache';
import {ResourceCache} from '../src/assets/persistent-cache';

const root='https://packed.invalid/',target=root+'sites-sw.'+'a'.repeat(20)+'.js';
function worker(url=target,options:{silent?:boolean;protocol?:number;clearOk?:boolean;onClear?:()=>void}={}){
 const item:any=new EventTarget();item.scriptURL=url;item.state='activated';item.clears=0;
 item.postMessage=(data:any,ports:MessagePort[])=>{
  if(options.silent)return;
  if(data.type==='sc2-pack-capabilities')ports[0].postMessage({protocol:options.protocol??1,cacheClear:true,versionedIndexes:true});
  if(data.type==='sc2-pack-cache-clear'){item.clears++;options.onClear?.();ports[0].postMessage({ok:options.clearOk!==false});}
 };
 return item;
}
function globals(t:any,active:any,ensure?:()=>Promise<unknown>){
 const prior=new Map(['navigator','caches','__SC2_ENSURE_PACK_WORKER__'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const hub:any=new EventTarget();hub.controller=active;hub.registerCalls=[];hub.register=async(url:string,options:any)=>{hub.registerCalls.push({url,options});return {active:hub.controller};};
 const deleted:string[]=[],cacheNames=new Set(['sc2-immutable-packs-v1','sc2-resource-bytes-v1','player-save-cache']);
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:hub}});
 Object.defineProperty(globalThis,'caches',{configurable:true,value:{delete:async(name:string)=>{deleted.push(name);return cacheNames.delete(name);}}});
 Object.defineProperty(globalThis,'__SC2_ENSURE_PACK_WORKER__',{configurable:true,value:ensure});
 t.after(()=>{for(const [key,value]of prior){if(value)Object.defineProperty(globalThis,key,value);else delete (globalThis as any)[key];}});
 return {hub,deleted,cacheNames};
}

test('bootstrap waits for the requested worker to control the page even when an old registration is ready',async t=>{
 const old=worker(root+'sites-sw.js',{silent:true}),current=worker(),h=globals(t,old);
 let finished=false;
 h.hub.register=async(url:string,options:any)=>{h.hub.registerCalls.push({url,options});return {active:current};};
 const connecting=connectPackedWorker(target,root,500).then(value=>{finished=true;return value;});
 await new Promise(r=>setTimeout(r,10));assert.equal(finished,false);
 h.hub.controller=current;h.hub.dispatchEvent(new Event('controllerchange'));
 assert.equal(await connecting,current);assert.deepEqual(h.hub.registerCalls,[{url:target,options:{scope:root,updateViaCache:'none'}}]);
});

test('bootstrap rejects an activated script that has no capability protocol',async t=>{
 globals(t,worker(target,{silent:true}));await assert.rejects(connectPackedWorker(target,root,25),/协议确认超时/);
});

test('bootstrap observes an already-active worker that is still activating when registration resolves',async t=>{
 const current=worker();current.state='activating';globals(t,current);
 const connecting=connectPackedWorker(target,root,200);await new Promise(r=>setTimeout(r,10));
 current.state='activated';current.dispatchEvent(new Event('statechange'));assert.equal(await connecting,current);
});

test('bootstrap rejects false capabilities and a controller swap before its handshake completes',async t=>{
 const current=worker(),h=globals(t,current);
 current.postMessage=(_data:any,ports:MessagePort[])=>{h.hub.controller=worker(root+'sites-sw.js');ports[0].postMessage({protocol:1,cacheClear:true,versionedIndexes:true});};
 await assert.rejects(connectPackedWorker(target,root,100),/版本不兼容/);
 h.hub.controller=worker(target,{protocol:0});await assert.rejects(connectPackedWorker(target,root,100),/版本不兼容/);
});

test('bootstrap bounds registration failure and never unregisters the existing worker',async t=>{
 const old=worker(root+'sites-sw.js',{silent:true}),h=globals(t,old);
 h.hub.register=()=>new Promise(()=>{});
 await assert.rejects(connectPackedWorker(target,root,20),/连接超时/);assert.equal(h.hub.controller,old);assert.deepEqual(h.deleted,[]);
});

test('an obsolete silent controller is upgraded before resource clearing; unrelated player cache remains',async t=>{
 const old=worker(root+'sites-sw.js',{silent:true}),current=worker();let upgrades=0;
 const h=globals(t,old,async()=>{upgrades++;h.hub.controller=current;return current;});
 await new ResourceCache(20).clear();assert.equal(upgrades,1);assert.equal(old.clears,0);assert.equal(current.clears,1);
 assert.deepEqual(h.deleted,['sc2-resource-bytes-v1']);assert(h.cacheNames.has('player-save-cache'));
});

test('a current capable worker clears without unnecessary registration or upgrade',async t=>{
 const current=worker();globals(t,current,async()=>{throw Error('Must not upgrade');});
 await clearPackedResourceCache(50);assert.equal(current.clears,1);
});

test('failed or ineffective upgrade preserves resource bytes and never claims a clear',async t=>{
 const old=worker(root+'sites-sw.js',{silent:true}),h=globals(t,old,async()=>{throw Error('offline');});
 await assert.rejects(new ResourceCache(10).clear(),PackedWorkerUpdateError);assert.deepEqual(h.deleted,[]);
 Object.defineProperty(globalThis,'__SC2_ENSURE_PACK_WORKER__',{configurable:true,value:async()=>old});
 await assert.rejects(new ResourceCache(10).clear(),PackedWorkerUpdateError);assert.deepEqual(h.deleted,[]);assert.equal(old.clears,0);
});

test('an unresponsive upgrade callback is bounded and later clear remains retryable',async t=>{
 const old=worker(root+'sites-sw.js',{silent:true}),h=globals(t,old,()=>new Promise(()=>{}));
 await assert.rejects(new ResourceCache(10).clear(),PackedWorkerUpdateError);assert.deepEqual(h.deleted,[]);
 const current=worker();h.hub.controller=current;await new ResourceCache(50).clear();assert.equal(current.clears,1);
});

test('cache deletion rejection is reported as clear failure instead of an update or permission diagnosis',async t=>{
 const current=worker(target,{clearOk:false}),h=globals(t,current);
 await assert.rejects(new ResourceCache(50).clear(),error=>error instanceof Error&&!(error instanceof PackedWorkerUpdateError)&&error.message==='资源包缓存未能清理');
 assert.deepEqual(h.deleted,[]);
});

test('a controller switch during acknowledged clearing also clears the replacement before success',async t=>{
 const replacement=worker(root+'sites-sw.'+'b'.repeat(20)+'.js');let h:ReturnType<typeof globals>;
 const first=worker(target,{onClear:()=>{h.hub.controller=replacement;}});h=globals(t,first);
 await new ResourceCache(50).clear();assert.equal(first.clears,1);assert.equal(replacement.clears,1);assert.deepEqual(h.deleted,['sc2-resource-bytes-v1']);
});

test('a non-packed page clears only its two resource namespaces without requiring a worker',async t=>{
 const h=globals(t,null);await new ResourceCache(50).clear();assert.deepEqual(h.deleted,['sc2-immutable-packs-v1','sc2-resource-bytes-v1']);assert(h.cacheNames.has('player-save-cache'));
});
