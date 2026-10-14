import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ResourceDownloads,raceDownloadIds} from '../src/app/resource-downloads';
import {HttpAssetStore} from '../src/assets/http-store';
import {BackgroundPreparation} from '../src/app/background-preparation';
import {ASSETS} from '../src/assets/manifest';
import {racePreloadModels,modelPreloadAssets} from '../src/app/race-preload';
import {RESCUE_PRESENTATION} from '../src/data/economy';
import {RACES} from '../src/data/races';
import {displayAssetModelKey} from '../src/render/materials/elite-visual';

const flush=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
async function until(check:()=>boolean){for(let i=0;i<200&&!check();i++)await flush();assert.ok(check(),'asynchronous resource operation settled');}
function downloadStore(){
 const data=Array.from({length:7},(_,i)=>new TextEncoder().encode('resource '+i)),rows=data.map(bytes=>{const hash=createHash('sha256').update(bytes).digest('hex');return {url:'assets/'+hash+'.glb',bytes:bytes.length,sha256:hash,mime:'model/gltf-binary'};});
 const disk=new Map<string,ArrayBuffer>(),pending:(()=>void)[]=[],requested:string[]=[];
 const store=new HttpAssetStore({version:1,release:'test',assets:Object.fromEntries(rows.map((row,i)=>['texture.'+i,row]))},'https://resource.invalid/',async input=>{const id=rows.findIndex(row=>String(input).endsWith(row.url));requested.push('texture.'+id);await new Promise<void>(resolve=>pending.push(resolve));return new Response(data[id]);});
 store.cache.get=async hash=>disk.get(hash)??null;store.cache.put=async(hash,bytes)=>{disk.set(hash,bytes);return true;};store.cache.persist=async()=>true;store.cache.clear=async()=>{disk.clear();};
 return {store,disk,pending,requested,release:()=>{pending.splice(0).forEach(release=>release());}};
}

test('download ownership survives tab changes; closing stops new requests, resumes missing files and clears only bytes',async()=>{
 const h=downloadStore(),task=new ResourceDownloads(()=>h.store);task.setAllowed(true);
 assert.equal(task.size('all','terran').files,7);let updates=0;task.onChange=()=>updates++;
 const first=task.start('all','terran');await until(()=>h.requested.length===3);assert.equal(task.busy,true);
 task.setAllowed(true);assert.equal(task.state.phase,'running','another settings tab retains the task');task.setAllowed(false);assert.equal(task.state.phase,'stopping');h.release();await first;
 assert.equal(task.state.phase,'stopped');assert.equal(h.requested.length,3);assert.equal(h.disk.size,3);assert.equal(task.state.done,30);assert.deepEqual(h.store.urls,{});
 task.setAllowed(true);const second=task.start('all','terran');for(let i=0;i<200&&task.busy;i++){h.release();await flush();}assert.equal(task.busy,false);await second;
 assert.equal(h.requested.length,7);assert.equal(task.state.phase,'complete');assert.equal(h.disk.size,7);assert.equal(task.state.done,task.state.total);assert.ok(updates>7);
 await task.clear();assert.equal(h.disk.size,0);assert.equal(task.state.done,0);assert.equal(task.state.phase,'idle');
});

test('cancelling while an optional decode drains starts no download; a required entrance remains independent',async()=>{
 let finish!:()=>void;const lane=new BackgroundPreparation(()=>0,()=>true);lane.select([{key:'optional',run:()=>new Promise<void>(resolve=>{finish=resolve;})}]);lane.tick();await flush();
 const h=downloadStore(),task=new ResourceDownloads(()=>h.store);task.holdOptional=()=>lane.suspendOptional();task.setAllowed(true);const downloading=task.start('all','terran');task.setAllowed(false);
 const entering=lane.enter();finish();const release=await entering;await downloading;assert.equal(h.requested.length,0);assert.equal(task.state.phase,'stopped');release();assert.equal(lane.report().held,0);
});

test('a rejected persistent write never becomes completed download progress and can retry',async()=>{
 const h=downloadStore(),task=new ResourceDownloads(()=>h.store);task.setAllowed(true);h.store.cache.warning='浏览器缓存已满';h.store.cache.put=async()=>false;
 const failed=task.start('all','terran');await until(()=>h.requested.length===3);h.release();await failed;assert.equal(task.state.phase,'error');assert.equal(task.state.done,0);assert.match(task.state.message,/缓存已满/);assert.deepEqual(h.store.urls,{});
});

test('stop during disk lookup does not start a new network request or count missing bytes as saved',async()=>{
 const h=downloadStore(),task=new ResourceDownloads(()=>h.store);let release!:()=>void,lookups=0;const pending=new Promise<void>(resolve=>{release=resolve;});
 h.store.cache.get=async()=>{lookups++;await pending;return null;};task.setAllowed(true);const running=task.start('all','terran');await until(()=>lookups===3);task.stop();release();await running;
 assert.equal(h.requested.length,0);assert.equal(task.state.done,0);assert.equal(task.state.phase,'stopped');
});

test('each race bundle includes real roster forms/deaths, rescue lifecycles, map and shared effect dependencies',()=>{
 const ids=[...ASSETS.keys()];
 for(const race of RACES){const selected=new Set(raceDownloadIds(race,ids)),rescue=RESCUE_PRESENTATION[race];
  const models=[...racePreloadModels(race)].map(([key,type])=>[displayAssetModelKey(key),type] as const);
  for(const id of modelPreloadAssets(models))assert.ok(selected.has(id),race+': '+id);
  for(const key of [rescue.workerModel,rescue.workerModel+'.death',rescue.carrierModel,rescue.carrierBirthModel,rescue.carrierDeathModel])if(key)assert.ok(selected.has('model.'+key),race+': '+key);
  for(const id of ids.filter(id=>id.startsWith('combat-fx.')||ASSETS.get(id)?.kind==='map-model'||id.startsWith('model.fort.')))assert.ok(selected.has(id),race+': '+id);
 }
});
