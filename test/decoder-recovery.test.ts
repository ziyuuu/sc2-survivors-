/** Finite faults use the real readiness coordinator and installed decoder. No player storage. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {BackgroundPreparation} from '../src/app/background-preparation';
import {AssetReadinessCoordinator} from '../src/app/asset-readiness';
import {AudioEffects} from '../src/render/effects/audio';
import {configurePlatformAssetUrl} from '../src/assets/manifest';
import {audioDecodeLane} from '../src/platform/preparation-budget';
import {GuardedKTX2Loader,GPU_DECODE_TIMEOUT} from '../src/render/loaders/guarded-ktx2-loader';

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

test('cancelled hung audio decode releases the entrance and cannot overwrite a successful retry',async t=>{
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
 gate.cancel();const retry=gate.retry();await flush();
 assert.equal(await retry,true);assert.equal(await first,false);assert.equal(firstDone,true);assert.equal(gate.state.phase,'ready');
 assert.equal(background.report().held,0);assert.equal(audioDecodeLane.report().active,0);assert.ok(decodes>1);
 const current=audio.buffers.get('alert');assert.ok(current);finishDecode({length:16,numberOfChannels:2});await flush();assert.equal(audio.buffers.get('alert'),current);

});

for(const stalled of ['fetch','body','decode'] as const)test(`audio ${stalled} has a deadline and ignores late completion`,async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const set=browser(t);configurePlatformAssetUrl(id=>'https://audio-deadline.invalid/'+id);
 let healthy=false,late!:(value:any)=>void;
 set('fetch',async()=>!healthy&&stalled==='fetch'?new Promise(resolve=>{late=resolve;}):({ok:true,arrayBuffer:()=>!healthy&&stalled==='body'?new Promise(resolve=>{late=resolve;}):Promise.resolve(new ArrayBuffer(4))}));
 const audio=new AudioEffects(),good={length:8,numberOfChannels:1};audio.context={decodeAudioData:()=>!healthy&&stalled==='decode'?new Promise(resolve=>{late=resolve;}):Promise.resolve(good)} as any;
 const failure=assert.rejects(audio.ensureDecoded('alert'),/超时/);await flush();assert.equal(typeof late,'function');t.mock.timers.tick(60001);await flush();await failure;
 assert.equal(audio.buffers.has('alert'),false);assert.equal(audioDecodeLane.report().active,0);healthy=true;await audio.ensureDecoded('alert');assert.equal(audio.buffers.get('alert'),good);
 late(stalled==='fetch'?{ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}:stalled==='body'?new ArrayBuffer(8):{length:32,numberOfChannels:2});await flush();assert.equal(audio.buffers.get('alert'),good);
});
test('cancelling one audio waiter preserves another consumer of the same immutable clip',async t=>{
 const set=browser(t);configurePlatformAssetUrl(id=>'https://audio-consumers.invalid/'+id);set('fetch',async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}));
 const audio=new AudioEffects(),abort=new AbortController();let finish!:(value:any)=>void,decodes=0;audio.context={decodeAudioData:()=>{decodes++;return new Promise(resolve=>{finish=resolve;});}} as any;
 const first=assert.rejects(audio.ensureDecoded('alert',abort.signal),/取消/);await flush();const second=audio.ensureDecoded('alert');abort.abort();await first;assert.equal(audioDecodeLane.report().active,1);
 const buffer={length:8,numberOfChannels:1};finish(buffer);await second;assert.equal(decodes,1);assert.equal(audio.buffers.get('alert'),buffer);assert.equal(audioDecodeLane.report().active,0);
});
for(const event of ['messageerror','timeout'] as const)test(`KTX worker ${event} retires its generation and allows a fresh decoder`,async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const listeners=new Map<string,Function[]>();let terminated=false;
 const worker={addEventListener:(type:string,fn:Function)=>listeners.set(type,[...(listeners.get(type)??[]),fn]),postMessage:()=>{},terminate:()=>{terminated=true;}} as unknown as Worker;
 const loader=new GuardedKTX2Loader();loader.workerPool.setWorkerCreator(()=>worker);const failure=assert.rejects(loader.workerPool.postMessage({type:'transcode'},[]));
 if(event==='messageerror')for(const fn of listeners.get(event)??[])fn({});else t.mock.timers.tick(GPU_DECODE_TIMEOUT+1);
 await failure;assert.equal(loader.disposed,true);assert.equal(terminated,true);
 const next=new GuardedKTX2Loader();let message:(event:any)=>void=()=>{};next.workerPool.setWorkerCreator(()=>({addEventListener:(type:string,fn:(event:any)=>void)=>{if(type==='message')message=fn;},postMessage:()=>queueMicrotask(()=>message({data:'fresh'})),terminate:()=>{}} as unknown as Worker));
 assert.equal((await next.workerPool.postMessage({},[])).data,'fresh');next.dispose();
});
test('KTX initialization timeout rejects parse preparation and retires late worker resources',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const set=browser(t);const waiting:{url:string;resolve:(value:Response)=>void}[]=[];
 set('fetch',(request:any)=>new Promise(resolve=>waiting.push({url:String(request.url??request),resolve})));
 const loader=new GuardedKTX2Loader().setTranscoderPath('https://decoder-init-timeout.invalid/');
 const failure=assert.rejects(loader.init(),/超时/);await flush();assert.equal(waiting.length,2);t.mock.timers.tick(GPU_DECODE_TIMEOUT+1);await failure;assert.equal(loader.disposed,true);
 set('ProgressEvent',class extends Event{constructor(type:string,init:any){super(type);Object.assign(this,init);}});
 for(const job of waiting)job.resolve(new Response(job.url.endsWith('.wasm')?new Uint8Array(8):'/* delayed init */'));
 await loader.transcoderPending;await flush();assert.equal(loader.workerSourceURL,'');assert.equal(loader.transcoderBinary,null);assert.equal(loader.workerPool.workers.length,0);
 await assert.rejects(loader.init(),/retired/);
});
