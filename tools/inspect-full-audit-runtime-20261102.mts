/** Diagnostic counterexamples for 8d680ac, not regression acceptance tests.
 * Run: node --import tsx --test tools/inspect-full-audit-runtime-20261102.mts
 * Uses synthetic browser/audio/worker failures; never opens player data. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {BackgroundPreparation} from '../src/app/background-preparation';
import {AssetReadinessCoordinator} from '../src/app/asset-readiness';
import {AudioEffects} from '../src/render/effects/audio';
import {configurePlatformAssetUrl} from '../src/assets/manifest';
import {audioDecodeLane} from '../src/platform/preparation-budget';
import {loadHttpAssets,httpStore} from '../src/assets/http-store';
import {configureGpuTextures,gpuTexture,gpuTextureReport,releaseGpuDecoder} from '../src/render/loaders/gpu-textures';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const flush=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
const g=globalThis as any;
function browser(t:any){
 const originals=new Map<string,PropertyDescriptor|undefined>();
 const set=(key:string,value:unknown)=>{originals.set(key,Object.getOwnPropertyDescriptor(g,key));Object.defineProperty(g,key,{configurable:true,writable:true,value});};
 set('__SC2_PACKED_GRAPHICS__',true);set('matchMedia',()=>({matches:true}));
 t.after(()=>{configurePlatformAssetUrl(null);for(const [key,value]of originals)if(value)Object.defineProperty(g,key,value);else delete g[key];});
 return set;
}
function fakeView(){return {initialAssetsLoaded:true,modelErrors:[],preparationKey:'audit',prepareCurrentAssets:async()=>{},waitForPendingAssets:async()=>{},compilePresentation:async()=>{},warmPresentationBatches:async()=>0};}

test('AUDIT: a hung audio decode survives cancellation and prevents the next entrance',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const set=browser(t);
 configurePlatformAssetUrl(id=>'https://audit.invalid/'+id);
 set('fetch',async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}));
 let finishDecode!:(buffer:any)=>void,decodes=0;
 const audio=new AudioEffects();
 audio.context={decodeAudioData:()=>{decodes++;return decodes===1?new Promise(resolve=>{finishDecode=resolve;}):Promise.resolve({length:8,numberOfChannels:1});}} as any;
 const background=new BackgroundPreparation(()=>0,()=>true),view=fakeView();
 const gate=new AssetReadinessCoordinator({expedition:{race:'terran'},entities:new Map(),stage:1} as any,view as any,audio,background);
 let firstDone=false;const first=gate.prepare('reinforcement').then(value=>{firstDone=true;return value;});await flush();
 assert.equal(gate.state.phase,'audio');assert.equal(audioDecodeLane.report().active,1);
 gate.cancel();const retry=gate.retry();await flush();t.mock.timers.tick(120001);await flush();
 assert.equal(await retry,false);assert.equal(firstDone,false);assert.equal(gate.state.phase,'error');
 assert.equal(background.report().held,2);assert.equal(decodes,1);
 console.log(JSON.stringify({case:'audio-hang',afterSimulatedMs:120001,firstDone,phase:gate.state.phase,error:gate.state.error,held:background.report().held,audioLane:audioDecodeLane.report()}));
 // Resolve only for cleanup: recovery requires the original decode to finish.
 finishDecode({length:8,numberOfChannels:1});assert.equal(await first,false);await flush();
 assert.equal(background.report().held,0);assert.equal(await gate.retry(),true);
});

test('AUDIT: a KTX2 worker error never rejects the decoder or releases its optional lane',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const set=browser(t);
 const pub=path.join(root,'sites/size-optimized-site/public');
 const release=JSON.parse(await fs.readFile(path.join(pub,'web-release.json'),'utf8'));
 const manifest=JSON.parse(await fs.readFile(path.join(pub,release.manifest),'utf8'));
 const [imageHash,row]=Object.entries(manifest.gpuTextures)[0] as [string,any];
 const index=JSON.parse((await fs.readFile(path.join(pub,'sites-pack-index.js'),'utf8')).trim().replace(/^self\.SC2_PACK_INDEX=/,'').replace(/;$/,''));
 const [bundle,offset,length,,gz]=index[row.url];
 const packed=await fs.readFile(path.join(pub,'assets',bundle)),part=packed.subarray(offset,offset+length);
 const payload=gz?gunzipSync(part):part;
 assert.equal(createHash('sha256').update(payload).digest('hex'),row.sha256);
 const bytes=payload.buffer.slice(payload.byteOffset,payload.byteOffset+payload.byteLength);
 const interfaceRoot={innerHTML:'',querySelector:()=>null};
 set('location',new URL('https://audit.invalid/'));
 set('ProgressEvent',class extends Event {constructor(type:string,init:any){super(type);Object.assign(this,init);}});
 set('document',{baseURI:'https://audit.invalid/',dispatchEvent:()=>true,querySelector:(selector:string)=>selector.includes('sc2-asset-manifest')?{content:'asset-manifest.json'}:null,getElementById:()=>interfaceRoot});
 set('fetch',async(input:any)=>{
  const url=String(input?.url??input);
  if(url.endsWith('/asset-manifest.json'))return new Response(JSON.stringify({version:1,release:'audit',assets:{},gpuTextures:{[imageHash]:row}}));
  if(url.endsWith('/runtime-config.json'))return new Response('{}');
  return new Response(url.endsWith('.wasm')?new Uint8Array(8):'/* injected decoder worker fails below */');
 });
 const workers:any[]=[];
 class FailedWorker {
  listeners=new Map<string,((event:any)=>void)[]>();terminated=false;errors=0;
  constructor(){workers.push(this);}
  addEventListener(type:string,listener:(event:any)=>void){this.listeners.set(type,[...(this.listeners.get(type)??[]),listener]);}
  postMessage(message:any){if(message.type==='transcode')queueMicrotask(()=>{this.errors++;for(const listener of this.listeners.get('error')??[])listener({message:'injected worker runtime failure'});});}
  terminate(){this.terminated=true;}
 }
 set('Worker',FailedWorker);
 await loadHttpAssets();httpStore()!.gpuTextureBytes=async()=>bytes.slice(0);
 configureGpuTextures({extensions:{has:(name:string)=>name==='EXT_texture_compression_bptc'}} as any);
 const background=new BackgroundPreparation(()=>0,()=>true);let settled=false;
 background.select([{key:'ktx',run:async()=>{try{return await gpuTexture(imageHash);}finally{settled=true;}}}]);background.tick();
 // Response body consumption uses real microtasks; let its stream finish first.
 for(let i=0;i<10&&!workers.length;i++)await new Promise<void>(resolve=>setImmediate(resolve));await flush();
 assert.equal(workers.length,1);assert.equal(workers[0].errors,1);
 assert.equal(workers[0].listeners.has('error'),false);
 const entering=assert.rejects(background.enter(undefined,120000),/等待超时/);
 t.mock.timers.tick(120001);await flush();await entering;
 assert.equal(settled,false);assert.equal(gpuTextureReport().active,1);assert.equal(releaseGpuDecoder(),false);
 assert.equal(background.busy,true);assert.equal(background.report().held,1);
 console.log(JSON.stringify({case:'ktx-worker-error',afterSimulatedMs:120001,workerErrors:workers[0].errors,errorHandlerInstalled:workers[0].listeners.has('error'),settled,background:background.report(),decoder:gpuTextureReport(),releaseSucceeded:releaseGpuDecoder()}));
 // Inject an explicit protocol rejection to free the original hung task after observation.
 for(const listener of workers[0].listeners.get('message')??[])listener({data:{type:'error',error:'audit cleanup',data:{}}});
 await flush();assert.equal(background.busy,false);assert.equal(gpuTextureReport().active,0);releaseGpuDecoder();
});
