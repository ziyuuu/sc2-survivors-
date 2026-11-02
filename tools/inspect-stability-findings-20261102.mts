/** Historical audit of fabfb4a: assertions demonstrate reported defects, not fixes.
 * Run: node --import tsx tools/inspect-stability-findings-20261102.mts
 * No browser/GPU, player data, shared build output, network, or production edits.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {ScreenRefraction} from '../src/render/scene/screen-refraction';
import {BackgroundPreparation} from '../src/app/background-preparation';
import {AssetReadinessCoordinator} from '../src/app/asset-readiness';
import {HttpAssetStore} from '../src/assets/http-store';

const root=path.resolve('.'),output='reports/qa/stability-recheck-20261102.json';
const digest=(bytes:any)=>createHash('sha256').update(bytes).digest('hex');
const never=()=>new Promise<any>(()=>{});
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
const inputs=['src/render/scene/screen-refraction.ts','src/app/background-preparation.ts','src/app/asset-readiness.ts','src/assets/http-store.ts','src/assets/persistent-cache.ts','tools/packed-sites-sw.js','sites/size-optimized-site/public/sites-sw.js','tools/update-compressed-game.mjs'];
const sourceHashes=Object.fromEntries(await Promise.all(inputs.map(async f=>[f,digest(await fs.readFile(f))])));
const report:any={date:'2026-11-02',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),method:'Independent Node fault injection against current source; mock renderer and Cache API; actual updater subprocess with isolated synthetic manifests.',sourceHashes,findings:{},limits:['Cloud thread read failed (timeout / single turn over size limit); original cloud report and script were not retrieved.','No actual GPU stall, Safari/iPhone, OS freeze, live cache corruption, or live deployment tested.','SW 45000 ms timers are shortened to 25 ms in the test host; source code remains unchanged.','Synthetic updater resources test identity policy; no visual or GLB decode claim.']};

function shaderFixture(){
 let finish!:()=>void,current:any={prior:true},renders=0,lost=false,disposed=0;
 const prior=current,compile=new Promise<void>(r=>finish=r),targets=new Set<any>();
 const renderer:any={getRenderTarget:()=>current,setRenderTarget:(v:any)=>{current=v;if(v&&v!==prior&&!targets.has(v)){targets.add(v);v.addEventListener('dispose',()=>disposed++);}},compileAsync:()=>compile,render:()=>{renders++;},getContext:()=>({isContextLost:()=>lost})};
 const pass=new ScreenRefraction(new THREE.Scene(),new THREE.PerspectiveCamera());
 return {renderer,pass,run:()=>pass.prepare(renderer,new THREE.Group()),finish:()=>finish(),lose:()=>lost=true,state:()=>({targetRestored:current===prior,renders,disposed})};
}

// Both the background drain and the real required entrance retain ownership.
{
 const f=shaderFixture(),lane=new BackgroundPreparation(()=>performance.now(),()=>true);
 lane.select([{key:'stalled-refraction',run:f.run}]);lane.tick();await settle();
 const controller=new AbortController(),cancelled=lane.enter(controller.signal,25);controller.abort();
 await assert.rejects(cancelled,/已取消/);await assert.rejects(lane.enter(undefined,25),/等待超时/);
 const blocked=lane.report(),before=f.state();assert.equal(blocked.busy,true);assert.equal(blocked.held,2);assert.equal(before.disposed,0);assert.equal(before.targetRestored,true);
 f.lose();f.finish();await settle();assert.equal(f.state().renders,1);assert.equal(f.state().disposed,1);assert.equal(lane.report().held,0);
 f.pass.dispose();
 const g=shaderFixture(),requiredLane=new BackgroundPreparation(()=>performance.now(),()=>true),enter=requiredLane.enter.bind(requiredLane);
 requiredLane.enter=(signal?:AbortSignal)=>enter(signal,25);
 const view:any={initialAssetsLoaded:true,modelErrors:[],prepareCurrentAssets:g.run,waitForPendingAssets:async()=>{},compilePresentation:async()=>{},warmPresentationBatches:async()=>0};
 const gate=new AssetReadinessCoordinator({expedition:{race:'terran'}} as any,view,undefined,requiredLane);
 let oldSettled=false,ready=0;gate.onReady=()=>ready++;
 const old=gate.prepare('reinforcement').then(v=>{oldSettled=true;return v;});await settle();gate.cancel();
 assert.equal(await gate.retry(),false);const requiredBlocked={oldSettled,held:requiredLane.report().held,error:gate.state.error};
 assert.equal(oldSettled,false);assert.equal(requiredBlocked.held,2);assert.match(requiredBlocked.error??'',/等待超时/);
 g.finish();assert.equal(await old,false);await settle();assert.equal(requiredLane.report().held,0);assert.equal(ready,0);g.pass.dispose();
 report.findings.shader={confirmed:true,optional:{busy:blocked.busy,held:blocked.held,...before},required:requiredBlocked,lateResolution:{rendersAfterContextMarkedLost:1,readyPublished:ready,drained:true},interpretation:'The JS lane remains blocked as long as compileAsync remains pending. Cancellation clears the UI, not the underlying work. Normal main-scene compilePresentation has a timeout; this refraction path does not.'};
}

const good=Buffer.from('known valid resource bytes'),bad=Buffer.from('known WRONG resource bytes'),hash=digest(good),key='assets/'+hash+'.bin',pack='bundle-models-0123456789abcdef0123.bin',origin='https://audit.invalid/',packURL=origin+'assets/'+pack;
const workerText=await fs.readFile('sites/size-optimized-site/public/sites-sw.js','utf8'),template=await fs.readFile('tools/packed-sites-sw.js','utf8');
assert.equal(workerText.replace(/^importScripts\([^\n]+\);/,"importScripts('./sites-pack-index.js');").replaceAll('\r\n','\n'),template.replaceAll('\r\n','\n'));
function cacheSystem(mode='healthy',seedBad=false){
 const spaces=new Map<string,Map<string,{bytes:Uint8Array;headers:any}>>(),deletes:string[]=[],opened:string[]=[];
 const space=(name:string)=>{if(!spaces.has(name))spaces.set(name,new Map());return spaces.get(name)!;};
 if(seedBad)space('sc2-immutable-packs-v1').set(packURL,{bytes:bad,headers:{'X-SC2-Pack-Bytes':String(bad.length)}});
 const cache={
  async open(name:string){opened.push(name);if(name==='sc2-immutable-packs-v1'&&mode==='open-hang')return never();if(name==='sc2-immutable-packs-v1'&&mode==='open-reject')throw Error('storage unavailable');const rows=space(name);return {
   async keys(){if(mode==='keys-hang')return never();return [...rows.keys()].map(url=>new Request(url));},
   async match(input:any){if(mode==='match-hang')return never();if(mode==='match-reject')throw Error('cache read failed');const row=rows.get(String(input?.url??input));return row?new Response(row.bytes,{headers:row.headers}):undefined;},
   async put(input:any,response:Response){if(mode==='put-hang')return never();rows.set(String(input?.url??input),{bytes:new Uint8Array(await response.arrayBuffer()),headers:Object.fromEntries(response.headers)});},
   async delete(input:any){return rows.delete(String(input?.url??input));}
  };},
  async delete(name:string){deletes.push(name);return spaces.delete(name);}
 };
 return {cache,spaces,deletes,opened};
}
function worker(disks:ReturnType<typeof cacheSystem>,networkBody=good){
 const listeners:Record<string,Function>={},timers:number[]=[],networkRequests:any[]=[],clientRequests:any[]=[];
 const self:any={SC2_PACK_INDEX:{[key]:[pack,0,good.length,'application/octet-stream',false]},registration:{scope:origin},location:{origin:new URL(origin).origin},clients:{get:async()=>null,matchAll:async()=>[]},addEventListener:(name:string,fn:Function)=>listeners[name]=fn};
 const context=vm.createContext({self,importScripts:()=>{},URL,Response,Request,Blob,AbortController,DecompressionStream,performance,caches:disks.cache,setTimeout:(fn:any,ms:number)=>{timers.push(ms);return setTimeout(fn,Math.min(ms,25));},clearTimeout,fetch:async(input:any,init:any)=>{networkRequests.push({url:String(input),cache:init?.cache});return new Response(networkBody);}});
 vm.runInContext(workerText,context,{filename:'sites-sw.js'});
 async function request(input:any,init:any={}){const req=new Request(input,init);clientRequests.push({url:req.url,cache:req.cache});let response:Promise<Response>|undefined;listeners.fetch({request:req,respondWith:(p:Promise<Response>)=>response=p});assert.ok(response,'SW must intercept synthetic indexed resource');return response!;}
 return {request,networkRequests,clientRequests,timers,metrics:()=>vm.runInContext('({resident,inflight:inflight.size,networkActive:network.active,diskBytes})',context)};
}
function httpStore(sw:ReturnType<typeof worker>){return new HttpAssetStore({version:1,release:'synthetic-audit',assets:{sample:{url:key,bytes:good.length,sha256:hash,mime:'application/octet-stream'}}},origin,sw.request as any,250);}

// Cache API is entirely in memory; ResourceCache.clear() executes its real code.
const originalCaches=Object.getOwnPropertyDescriptor(globalThis,'caches');
try{
 const disks=cacheSystem('healthy',true);Object.defineProperty(globalThis,'caches',{value:disks.cache,configurable:true,writable:true});
 const sw=worker(disks),store=httpStore(sw);
 await assert.rejects(store.prepare(['sample']),/文件校验失败/);await assert.rejects(store.prepare(['sample']),/文件校验失败/);
 await store.cache.clear();await assert.rejects(store.prepare(['sample']),/文件校验失败/);
 const restarted=worker(disks);await assert.rejects(httpStore(restarted).prepare(['sample']),/文件校验失败/);
 assert.equal(sw.networkRequests.length+restarted.networkRequests.length,0);assert.deepEqual(sw.clientRequests.map(r=>r.cache),['default','reload','default','reload','default','reload']);
 assert.deepEqual(disks.deletes,['sc2-resource-bytes-v1']);assert.ok(disks.spaces.has('sc2-immutable-packs-v1'));
 report.findings.corruptPack={confirmed:true,clientAttemptsBeforeRestart:sw.clientRequests.map(r=>r.cache),clientAttemptsAfterRestart:restarted.clientRequests.map(r=>r.cache),networkRequests:0,clearDeletedNamespaces:disks.deletes,badDiskPackSurvivesClearAndWorkerRestart:true,memory:sw.metrics(),interpretation:'Client integrity check rejects the bytes, but retry/reload cannot bypass or evict either SW pack cache. This is a persistent recovery failure conditional on bad cached bytes, not evidence that the deployed packs are currently corrupt.'};
 // A cold-cache invalid 200 response can also seed both caches before validation.
 const poisonedDisks=cacheSystem();Object.defineProperty(globalThis,'caches',{value:poisonedDisks.cache,configurable:true,writable:true});const poisoned=worker(poisonedDisks,bad);
 await assert.rejects(httpStore(poisoned).prepare(['sample']),/文件校验失败/);assert.equal(poisoned.networkRequests.length,1);assert.ok(poisonedDisks.spaces.get('sc2-immutable-packs-v1')?.has(packURL));
 report.findings.corruptPack.coldInvalidResponse={networkRequests:1,cachedBeforeClientValidation:true};
 const cases:any[]=[];
 for(const mode of ['healthy','open-reject','open-hang','keys-hang','match-hang','match-reject','put-hang']){
  const disks=cacheSystem(mode),sw=worker(disks),statuses=[];
  for(let i=0;i<2;i++)statuses.push((await sw.request(origin+key,{cache:i?'reload':'default'})).status);
  const succeeds=mode==='healthy'||mode==='open-reject';assert.deepEqual(statuses,succeeds?[200,200]:[502,502]);
  assert.equal(sw.networkRequests.length,succeeds?1:mode==='put-hang'?2:0);
  cases.push({mode,statuses,networkRequests:sw.networkRequests.length,sourceTimerMs:[...new Set(sw.timers)],...sw.metrics()});
 }
 report.findings.optionalDisk={confirmed:true,cases,interpretation:'Rejected open() correctly degrades to network. A pending open()/keys()/match() does not. Requests return 502 on the outer 45-second deadline and release the SW network lane, but retries reuse the unresolved initialization or cache operation. Pending put() can discard an already downloaded result.'};
}finally{if(originalCaches)Object.defineProperty(globalThis,'caches',originalCaches);else delete (globalThis as any).caches;}

// Run the real update utility only against a small new temporary fixture.
{
 const parent=path.join(root,'reports/local/stability-recheck-20261102');await fs.mkdir(parent,{recursive:true});const folder=await fs.mkdtemp(path.join(parent,'update-'));
 const packedDir=path.join(folder,'packed'),webDir=path.join(folder,'web');await fs.mkdir(path.join(packedDir,'assets'),{recursive:true});await fs.mkdir(path.join(webDir,'assets'),{recursive:true});
 try{
  const oldModel=Buffer.from('old compressed model content'),newModel=Buffer.from('new model same stable asset ID with changed content'),oldTexture=Buffer.from('old texture'),newTexture=Buffer.from('new texture changed same ID');
  const record=(data:Buffer,ext:string,mime:string)=>({url:'assets/'+digest(data)+'.'+ext,bytes:data.length,sha256:digest(data),mime});
  const packed={version:1,release:'old-resources',assets:{model:record(oldModel,'glb','model/gltf-binary'),texture:record(oldTexture,'png','image/png')}};
  const fresh={version:1,release:'new-resources',assets:{model:record(newModel,'glb','model/gltf-binary'),texture:record(newTexture,'png','image/png')}};
  const writeJSON=(base:string,name:string,value:any)=>fs.writeFile(path.join(base,name),JSON.stringify(value));
  await writeJSON(packedDir,'old-manifest.json',packed);await writeJSON(webDir,'new-manifest.json',fresh);
  await writeJSON(packedDir,'web-release.json',{manifest:'old-manifest.json',release:'old-resources',appBuildId:'old-code'});
  await writeJSON(webDir,'web-release.json',{manifest:'new-manifest.json',release:'new-resources',appBuildId:'new-code',runSchema:26});
  await fs.writeFile(path.join(packedDir,'sites-pack-index.js'),'self.SC2_PACK_INDEX={};');
  await fs.writeFile(path.join(webDir,'index.html'),'<meta name="sc2-asset-manifest" content="./new-manifest.json"><script type="module" src="./assets/entry.js"></script><link rel="stylesheet" href="./assets/style.css">');
  await fs.writeFile(path.join(webDir,'assets/entry.js'),'globalThis.materialIdentity="'+fresh.assets.model.sha256+'";');await fs.writeFile(path.join(webDir,'assets/style.css'),'body{}');
  for(const [base,manifest,values]of [[packedDir,packed,[oldModel,oldTexture]],[webDir,fresh,[newModel,newTexture]]] as const)for(const [i,row]of Object.values(manifest.assets).entries())await fs.writeFile(path.join(base,row.url),values[i]);
  const result=spawnSync(process.execPath,['tools/update-compressed-game.mjs',packedDir,webDir],{cwd:root,encoding:'utf8',timeout:15000});assert.equal(result.status,0,result.stderr);
  const summary=JSON.parse(result.stdout.trim()),code=gunzipSync(await fs.readFile(path.join(packedDir,summary.entry))).toString();
  assert.ok(code.includes(packed.assets.model.sha256));assert.ok(!code.includes(fresh.assets.model.sha256));const after=JSON.parse(await fs.readFile(path.join(packedDir,'web-release.json'),'utf8'));
  assert.equal(after.appBuildId,'new-code');assert.equal(after.release,'old-resources');assert.equal(after.sourceWebRelease,'new-resources');
  await writeJSON(webDir,'new-manifest.json',{...fresh,assets:{...fresh.assets,extra:fresh.assets.texture}});
  const extra=spawnSync(process.execPath,['tools/update-compressed-game.mjs',packedDir,webDir],{cwd:root,encoding:'utf8',timeout:15000});assert.notEqual(extra.status,0);assert.match(extra.stderr,/Resource IDs changed/);
  report.findings.updater={confirmed:true,changedContentSameIdsAccepted:result.status===0,newModelHashRewrittenToOldPackedHash:true,oldTextureRetained:true,metadata:{appBuildId:after.appBuildId,resourceRelease:after.release,sourceWebRelease:after.sourceWebRelease},addedIdRejected:true,interpretation:'The updater checks ID sets, not a verified source-to-compressed provenance map. Different hashes are normal for compression, but changed source content is indistinguishable and accepted. This does not establish an existing deployed mismatch.'};
 }finally{
  const resolved=await fs.realpath(folder),resolvedParent=await fs.realpath(parent);assert.ok(resolved.startsWith(resolvedParent+path.sep));assert.equal(path.dirname(resolved),resolvedParent);await fs.rm(resolved,{recursive:true,force:true});await fs.rmdir(parent).catch(()=>{});
 }
}
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({report:output,confirmed:Object.keys(report.findings),sourceFiles:inputs.length}));
