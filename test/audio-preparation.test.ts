import test from 'node:test';import assert from 'node:assert/strict';
import {AudioEffects} from '../src/render/effects/audio';
import {configurePlatformAssetUrl} from '../src/assets/manifest';
import {runtimeBudget} from '../src/platform/graphics-profile';
import {SOUND_DATA} from '../src/render/effects/audio-source-data';

function fixture(t:any){
 const g=globalThis as any,old={packed:g.__SC2_PACKED_GRAPHICS__,media:g.matchMedia,fetch:g.fetch};
 g.__SC2_PACKED_GRAPHICS__=true;g.matchMedia=()=>({matches:true});configurePlatformAssetUrl(id=>'https://audio.invalid/'+id);
 let decodes=0,fail=false;const fetched:string[]=[];
 g.fetch=async(url:string)=>{fetched.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};};
 const audio=new AudioEffects();audio.context={decodeAudioData:async()=>{decodes++;if(fail){fail=false;throw Error('injected decode failure');}return {length:6*1024**2,numberOfChannels:1};}} as any;
 t.after(()=>{g.__SC2_PACKED_GRAPHICS__=old.packed;g.matchMedia=old.media;g.fetch=old.fetch;configurePlatformAssetUrl(null);});
 return {audio,fetched,get decodes(){return decodes;},fail(){fail=true;}};
}

test('repeated gates retain the bounded audio working set instead of cycling evicted PCM',async t=>{
 const f=fixture(t),plan={combat:[],dialogue:[]};assert.equal(runtimeBudget().pcmBytes,32*1024**2);
 await f.audio.prepareBanks(plan);assert.equal(f.decodes,2);assert.equal(f.audio.buffers.size,1);assert(f.audio.pcmBytes()<=runtimeBudget().pcmBytes);
 const retained=[...f.audio.buffers.entries()];for(let i=0;i<3;i++)await f.audio.prepareBanks(plan);
 assert.equal(f.decodes,2);assert.deepEqual([...f.audio.buffers.entries()],retained);
 // A previously validated but evicted clip still reloads when actually needed.
 assert(!f.audio.buffers.has('alert'));await f.audio.ensureDecoded('alert');assert.equal(f.decodes,3);assert(f.audio.buffers.has('alert'));
 await f.audio.prepareBanks(plan);assert.equal(f.decodes,3);assert(f.audio.buffers.has('alert'));
});

test('new sound banks are prepared once and failed decodes remain retryable',async t=>{
 const f=fixture(t),plan={combat:[],dialogue:[]};f.fail();await assert.rejects(f.audio.prepareBanks(plan),/decode failure/);
 await f.audio.prepareBanks(plan);assert.equal(f.decodes,3);await f.audio.prepareBanks(plan);assert.equal(f.decodes,3);
 const bank='melee:Marine_AttackLaunch',extended={combat:[bank],dialogue:[]};assert(SOUND_DATA.banks[bank]);
 await f.audio.prepareBanks(extended);assert.equal(f.decodes,4);await f.audio.prepareBanks(extended);assert.equal(f.decodes,4);
});

test('cancellation cannot validate an unprepared clip and retries preserve successful work',async t=>{
 const f=fixture(t),plan={combat:[],dialogue:[]};let cancelled=false;
 await assert.rejects(f.audio.prepareBanks(plan,()=>{cancelled=true;},()=>cancelled),/已取消/);assert.equal(f.decodes,1);
 await f.audio.prepareBanks(plan);assert.equal(f.decodes,2);await f.audio.prepareBanks(plan);assert.equal(f.decodes,2);
});

test('a failed later playback invalidates earlier preparation so the gate retries that clip',async t=>{
 const f=fixture(t),plan={combat:[],dialogue:[]};await f.audio.prepareBanks(plan);assert(!f.audio.buffers.has('alert'));
 f.fail();await assert.rejects(f.audio.ensureDecoded('alert'),/decode failure/);assert.equal(f.decodes,3);
 await f.audio.prepareBanks(plan);assert.equal(f.decodes,4);assert(f.audio.buffers.has('alert'));
 await f.audio.prepareBanks(plan);assert.equal(f.decodes,4);
});

test('run reset keeps audio validation while a fresh audio session verifies its own clips',async t=>{
 const f=fixture(t),plan={combat:[],dialogue:[]};await f.audio.prepareBanks(plan);f.audio.reset();await f.audio.prepareBanks(plan);assert.equal(f.decodes,2);
 const fresh=new AudioEffects();fresh.context=f.audio.context;await fresh.prepareBanks(plan);assert.equal(f.decodes,4);
});
