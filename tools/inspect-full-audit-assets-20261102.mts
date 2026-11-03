/** Read-only fault injection for the 2026-11-02 code audit at 8d680ac.
 * This asserts the current defects; it is not a desired-behavior regression test.
 * node --import tsx tools/inspect-full-audit-assets-20261102.mts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash,webcrypto} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {HttpAssetStore} from '../src/assets/http-store';
import {retryAssetPreparation,waitForAsset} from '../src/assets/preparation-wait';

const source=await fs.readFile('tools/packed-sites-sw.js','utf8');
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const good=new TextEncoder().encode('full-audit-resource'),bad=new TextEncoder().encode('bad cached resource');
const pack='bundle-common-'+sha(good).slice(0,20)+'.bin';
const key='assets/'+sha(good)+'.bin',base='https://full-audit.invalid/';
const indexName='sites-pack-index.'+'a'.repeat(20)+'.js';
const index={[key]:[pack,0,good.length,'application/octet-stream',false]};
type Fetcher=(input:any,init?:RequestInit)=>Promise<Response>;

function worker(fetcher:Fetcher){
 const events:Record<string,Function>={},calls:{url:string;cache?:RequestCache;hasSignal:boolean}[]=[],timers:number[]=[];
 const self:any={SC2_PACK_INDEX:index,registration:{scope:base},location:{origin:new URL(base).origin},clients:{get:async()=>null,matchAll:async()=>[]},addEventListener:(type:string,fn:Function)=>events[type]=fn};
 const context=vm.createContext({self,importScripts:()=>{},URL,Request,Response,Blob,AbortController,DecompressionStream,crypto:webcrypto,performance,
  setTimeout:(fn:any,ms:number)=>{timers.push(ms);return setTimeout(fn,ms);},clearTimeout,
  fetch:async(input:any,init?:RequestInit)=>{calls.push({url:String(input),cache:init?.cache,hasSignal:!!init?.signal});return fetcher(input,init);}
 });
 vm.runInContext(source,context);
 const request:typeof fetch=async(input:any,init:any)=>{
  let response:Promise<Response>|undefined;
  events.fetch({request:new Request(input,init),respondWith:(job:Promise<Response>)=>response=job});
  assert.ok(response,'Fixture URL must be intercepted by production worker');
  return response;
 };
 const state=()=>vm.runInContext('({indexes:indexes.size,inflight:inflight.size,network:network.active,resident})',context);
 return {context,calls,timers,request,state};
}
const client=(sw:ReturnType<typeof worker>)=>{
 const store=new HttpAssetStore({version:1,release:'audit-fixture',assets:{one:{url:key,bytes:good.length,sha256:sha(good),mime:'application/octet-stream'}}},base,sw.request,1000);
 // The verified resource cache is empty; only the browser's separate HTTP
 // cache is the controlled faulty layer in the test below.
 store.cache.get=async()=>null;store.cache.put=async()=>true;
 return store;
};

const result:any={baseline:'8d680ac',scope:'synthetic network/cache with actual current SW and HttpAssetStore; no browser or player data',checks:[]};

// An immutable index's fetch hangs once, then the network becomes healthy.
// All later resource requests still share the first never-settling Promise.
{
 let healthy=false;
 const sw=worker(async input=>{
  if(String(input).endsWith(indexName))return healthy?new Response('self.SC2_PACK_INDEX='+JSON.stringify(index)+';'):new Promise(()=>{});
  return new Response(good);
 });
 const resource=base+key+'?sc2-index='+indexName;
 await assert.rejects(waitForAsset(sw.request(resource),'fixture client',30),/超时/);
 healthy=true;
 await assert.rejects(waitForAsset(sw.request(resource,{cache:'reload'}),'fixture client',30),/超时/);
 await vm.runInContext('clearPacks()',sw.context);
 await assert.rejects(waitForAsset(sw.request(resource,{cache:'reload'}),'fixture client',30),/超时/);
 assert.equal(sw.calls.length,1);assert.equal(sw.calls[0].hasSignal,false);
 assert.equal(sw.state().indexes,1);assert.equal(sw.timers.length,0);
 // Control: a new worker using the same healthy transport succeeds immediately.
 const fresh=worker(async input=>String(input).endsWith(indexName)?new Response('self.SC2_PACK_INDEX='+JSON.stringify(index)+';'):new Response(good));
 assert.equal((await fresh.request(resource)).status,200);
 result.checks.push({id:'index-hang',confirmed:true,retriesAfterNetworkRecovered:2,networkRequests:sw.calls.length,swTimeouts:sw.timers,clearLeavesStalledIndex:sw.state().indexes===1,freshWorkerStatus:200});
}

// The browser HTTP cache has a 200 response with wrong pack bytes. The
// origin can supply good bytes, but only when the request bypasses that cache.
{
 const sw=worker(async(_input,init)=>new Response(init?.cache==='reload'?good:bad));
 const store=client(sw),retries:number[]=[];
 await assert.rejects(retryAssetPreparation(()=>store.prepare(['one']),attempt=>retries.push(attempt),async()=>{}),/502/);
 assert.deepEqual(retries,[1,2,3]);assert.equal(store.urls.one,undefined);
 assert.deepEqual(sw.calls.map(row=>row.cache),Array(4).fill('force-cache'));
 await vm.runInContext('clearPacks()',sw.context);
 await assert.rejects(store.prepare(['one']),/502/);
 assert.equal(sw.calls.at(-1)?.cache,'force-cache');
 assert.equal((await sw.request(base+key,{cache:'reload'})).status,200);
 await store.prepare(['one']);assert.ok(store.urls.one);URL.revokeObjectURL(store.urls.one);
 result.checks.push({id:'http-cache-bad-pack',confirmed:true,automaticAttempts:4,cacheModes:sw.calls.map(row=>row.cache),clearAndRetryFailed:true,explicitReloadRecovers:true});
}

// Locate the active immutable entry and compare its generated worker with
// the template to ensure findings apply to the checked-in shipping snapshot.
{
 const dir='sites/size-optimized-site/public/',release=JSON.parse(await fs.readFile(dir+'web-release.json','utf8'));
 const html=await fs.readFile(dir+'index.html','utf8');
 const launcherPath=html.match(/<script type="module"[^>]*src="\.\/([^\"]+\.js)"/)?.[1];
 assert.ok(launcherPath);const launcher=await fs.readFile(dir+launcherPath,'utf8');
 const currentIndex=launcher.match(/__SC2_PACK_INDEX_FILE__="([^\"]+)"/)?.[1];assert.ok(currentIndex);
 const normalize=(s:string)=>s.replace(/importScripts\([^;]+;/,'importScripts();').replace(/\r/g,'');
 assert.equal(normalize(await fs.readFile(dir+'sites-sw.js','utf8')),normalize(source));
 result.snapshot={appBuildId:release.appBuildId,resourceRelease:release.release,launcher:launcherPath,index:currentIndex,workerMatches:true};
}
if(process.argv.includes('--verify-snapshot')){
 const dir='sites/size-optimized-site/public/',release=JSON.parse(await fs.readFile(dir+'web-release.json','utf8'));
 const manifestBytes=await fs.readFile(dir+release.manifest),manifest=JSON.parse(manifestBytes.toString());
 const indexBytes=await fs.readFile(dir+result.snapshot.index),index=JSON.parse(indexBytes.toString().trim().replace(/^self\.SC2_PACK_INDEX=/,'').replace(/;$/,''));
 const proof=JSON.parse(await fs.readFile(dir+'compressed-resource-provenance.json','utf8'));
 assert.equal(proof.packedManifestSha256,sha(manifestBytes));assert.equal(proof.packIndexSha256,sha(indexBytes));
 assert.equal(proof.sourceRelease,sha(JSON.stringify(proof.sources)));assert.equal(proof.sourceRelease,release.sourceWebRelease);
 assert.equal(proof.packedRelease,manifest.release);assert.equal(manifest.release,release.release);
 assert.ok(result.snapshot.index.includes(sha(indexBytes).slice(0,20)));
 const launcher=await fs.readFile(dir+result.snapshot.launcher,'utf8');assert.ok(result.snapshot.launcher.includes(sha(launcher).slice(0,16)));
 const codeName=launcher.match(/new URL\('\.\/(sc2-entry\.[a-f0-9]+\.js\.gz)'/)?.[1];assert.ok(codeName);
 const code=await fs.readFile(dir+'assets/'+codeName);assert.equal(sha(code),release.compressedEntrySha256);assert.ok(codeName.includes(sha(code).slice(0,16)));
 const records:any[]=[...Object.values(manifest.assets).flatMap((a:any)=>[a,...Object.values(a.variants??{})]),...Object.values(manifest.gpuTextures??{})];
 const unique:any[]=[...new Map(records.map(r=>[r.url,r])).values()].sort((a:any,b:any)=>(index[a.url]?.[0]??a.url).localeCompare(index[b.url]?.[0]??b.url));
 let bundleName='',bundle:Buffer|null=null,packCount=0,verifiedBytes=0;
 for(const row of unique){
  const item=index[row.url];let data:Buffer;
  if(item){
   const [name,offset,length,mime,compressed]=item;
   if(name!==bundleName){bundle=await fs.readFile(dir+'assets/'+name);bundleName=name;packCount++;const expected=/-([a-f0-9]{20})\.bin$/.exec(name);assert.ok(expected);assert.ok(sha(bundle).startsWith(expected[1]),name);}
   assert.ok(Number.isSafeInteger(offset)&&offset>=0&&Number.isSafeInteger(length)&&length>=0&&offset+length<=bundle!.length,row.url);
   assert.equal(mime,row.mime);data=bundle!.subarray(offset,offset+length);if(compressed&&data[0]===31&&data[1]===139)data=gunzipSync(data);
  }else data=await fs.readFile(dir+row.url);
  assert.equal(data.length,row.bytes,row.url);assert.equal(sha(data),row.sha256,row.url);verifiedBytes+=data.length;
 }
 result.snapshot={...result.snapshot,payloadsVerified:unique.length,packsVerified:packCount,logicalVerifiedBytes:verifiedBytes,entryAndProvenanceVerified:true};
}
console.log(JSON.stringify(result,null,2));
