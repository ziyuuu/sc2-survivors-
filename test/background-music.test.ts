import test from 'node:test';
import assert from 'node:assert/strict';
import {BackgroundMusic} from '../src/render/effects/background-music';
import {AudioEffects} from '../src/render/effects/audio';
import {ASSETS} from '../src/assets/manifest';

const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function fixture(t:any,prepare:(ids:string[])=>Promise<unknown>=async()=>{}){
 t.mock.timers.enable({apis:['setTimeout']});
 let creates=0,plays=0,resumes=0,loads=0,urlSuffix='',rejectPlay=false;
 const requested:string[][]=[];
 const media={src:'',currentTime:0,duration:120,paused:true,readyState:1,loop:false,preload:'',
  play(){plays++;if(rejectPlay)return Promise.reject(Error('NotAllowedError'));this.paused=false;return Promise.resolve();},
  pause(){this.paused=true;},load(){loads++;this.currentTime=0;},setAttribute(){},removeAttribute(){},addEventListener(){}};
 const ramps:number[]=[];
 const node={gain:{value:0,cancelAndHoldAtTime(){},setValueAtTime(v:number){ramps.push(v);},linearRampToValueAtTime(v:number){ramps.push(v);}},connect(){return this;},disconnect(){}};
 const context={currentTime:0,createMediaElementSource(){return node;},createGain(){return node;},resume(){resumes++;return Promise.resolve();}};
 const music=new BackgroundMusic(()=>({context,output:node} as any),
  {prepare:ids=>{requested.push(ids);return prepare(ids);},url:id=>'blob:'+id+urlSuffix},()=>{creates++;return media as any;});
 t.after(()=>music.dispose());
 return {music,media,requested,ramps,get creates(){return creates;},get plays(){return plays;},get resumes(){return resumes;},get loads(){return loads;},
  set rejectPlay(v:boolean){rejectPlay=v;},set urlSuffix(v:string){urlSuffix=v;},
  async settle(){t.mock.timers.tick(300);await flush();}};
}
test('music waits for a gesture, streams only the requested song and keeps one voice across menu pages',async t=>{
 const f=fixture(t);f.music.setPhase('menu');assert.equal(f.creates,0);assert.deepEqual(f.requested,[]);
 f.music.unlock();await f.settle();assert.equal(f.creates,1);assert.deepEqual(f.requested,[['music.menu']]);
 f.media.currentTime=19;const starts=f.music.report().starts;
 for(let n=0;n<10;n++){f.music.setPhase('menu');f.music.unlock();}
 await f.settle();assert.equal(f.music.report().starts,starts);assert.equal(f.media.currentTime,19);assert.ok(f.media.loop);
 assert.equal(f.music.report().playing,true);assert.equal(f.creates,1);
});
test('intermission and results share a song; battle and battle pause stay silent',async t=>{
 const f=fixture(t);f.music.setPhase('menu');f.music.unlock();await f.settle();f.media.currentTime=17;
 f.music.setPhase('reward');assert.equal(f.music.report().track,'menu');await f.settle();
 assert.equal(f.music.report().track,'intermission');assert.equal(f.creates,1);const starts=f.music.report().starts;
 for(const phase of ['won','endless-ready','finished','lost'] as const)f.music.setPhase(phase);
 await f.settle();assert.equal(f.music.report().starts,starts);
 f.music.setPhase('battle');await f.settle();assert.equal(f.music.report().playing,false);
 f.music.unlock();await f.settle();assert.equal(f.music.report().playing,false);
 f.music.setPhase('menu');await f.settle();assert.equal(f.media.currentTime,17);
});
test('hide and mute stop immediately and resume at the same position',async t=>{
 const f=fixture(t);f.music.setPhase('menu');f.music.unlock();await f.settle();f.media.currentTime=23;
 f.music.setVisible(false);assert.equal(f.media.paused,true);f.music.unlock();assert.equal(f.media.paused,true);
 const resumes=f.resumes;f.music.setVisible(true);await f.settle();assert.equal(f.media.paused,false);assert.equal(f.media.currentTime,23);assert.ok(f.resumes>resumes);
 f.music.setEnabled(false);assert.equal(f.media.paused,true);f.music.setEnabled(true);await f.settle();
 assert.equal(f.media.paused,false);assert.equal(f.media.currentTime,23);
});
test('a slow menu load cannot start after battle entry or after backgrounding',async t=>{
 let release!:()=>void;const f=fixture(t,()=>new Promise<void>(resolve=>{release=resolve;}));
 f.music.setPhase('menu');f.music.unlock();await f.settle();
 f.music.setPhase('battle');await f.settle();release();await flush();assert.equal(f.music.report().playing,false);
 f.music.setPhase('reward');await flush();f.music.setVisible(false);release();await flush();
 assert.equal(f.music.report().playing,false);assert.equal(f.music.report().starts,0);
});
test('rapid menu reward battle changes do not leave an old fade callback restarting music',async t=>{
 const f=fixture(t);f.music.setPhase('menu');f.music.unlock();await f.settle();
 f.music.setPhase('reward');f.music.setPhase('menu');f.music.setPhase('battle');await f.settle();
 assert.equal(f.music.report().playing,false);assert.equal(f.music.report().track,'menu');assert.equal(f.creates,1);
});
test('rejected playback waits for a new gesture instead of retrying each frame',async t=>{
 const f=fixture(t);f.rejectPlay=true;f.music.setPhase('menu');f.music.unlock();await f.settle();
 const plays=f.plays;assert.ok(f.music.report().errors.length);
 for(let n=0;n<60;n++)f.music.setPhase('menu');await f.settle();assert.equal(f.plays,plays);
 f.rejectPlay=false;f.music.unlock();await f.settle();assert.equal(f.music.report().playing,true);
});
test('a refreshed asset URL after a quality change preserves the stopped music position',async t=>{
 const f=fixture(t);f.music.setPhase('menu');f.music.unlock();await f.settle();f.media.currentTime=31;
 f.music.setVisible(false);f.urlSuffix='-new';f.music.setVisible(true);await f.settle();
 assert.equal(f.media.src,'blob:music.menu-new');assert.equal(f.media.currentTime,31);
});
test('saved master/interface mute and explicit music level survive later three-argument mixer calls',t=>{
 const g=globalThis as any,old=g.localStorage;let raw=JSON.stringify({master:0,battle:.6,interface:0});
 g.localStorage={getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;}};t.after(()=>g.localStorage=old);
 const a=new AudioEffects();assert.equal(a.musicVolume,.15);assert.equal(a.masterVolume,0);assert.equal(a.interfaceVolume,0);
 a.setMix(.8,.6,0,.37);a.setMix(.7,.5,.1);assert.equal(a.musicVolume,.37);
 const b=new AudioEffects();assert.equal(b.musicVolume,.37);assert.equal(b.masterVolume,.7);
 b.setMix(.7,.5,.1,0);assert.equal(new AudioEffects().musicVolume,0);assert.equal(b.music.report().enabled,false);
});
test('combat preloading never decodes the long music catalog',async t=>{
 const g=globalThis as any,previous={fetch:g.fetch,context:g.AudioContext},saved=[...ASSETS];let decodes=0;
 t.after(()=>{g.fetch=previous.fetch;g.AudioContext=previous.context;ASSETS.clear();for(const [id,row]of saved)ASSETS.set(id,row);});
 ASSETS.clear();ASSETS.set('music.menu',{id:'music.menu',kind:'music',status:'available',required:true,url:'music.mp3'});
 ASSETS.set('audio.alert',{id:'audio.alert',kind:'audio',status:'available',required:true,url:'alert.wav'});
 g.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
 g.AudioContext=class{decodeAudioData(){decodes++;return Promise.resolve({length:2,numberOfChannels:1});}};
 const a=new AudioEffects();await a.preload();assert.equal(decodes,1);assert.deepEqual([...a.buffers.keys()],['alert']);
});
