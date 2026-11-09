import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioEffects} from '../src/render/effects/audio';

function fixture(t:any,stored:string|null=null){
 const g=globalThis as any,previous={storage:g.localStorage,context:g.AudioContext};let raw=stored,starts=0,resumes=0,contexts=0;
 const value={value:1,setValueAtTime(){},exponentialRampToValueAtTime(){}};
 g.localStorage={getItem:()=>raw,setItem:(_key:string,v:string)=>{raw=v;}};
 g.AudioContext=class {currentTime=0;destination={};constructor(){contexts++;}resume(){resumes++;return Promise.resolve();}createGain(){return {gain:{...value},connect(){return this;},disconnect(){}};}createOscillator(){return {frequency:{...value},type:'sine',connect(){return this;},disconnect(){},start(){starts++;},stop(){},onended:null};}};
 t.after(()=>{g.localStorage=previous.storage;g.AudioContext=previous.context;});
 return {get starts(){return starts;},get resumes(){return resumes;},get contexts(){return contexts;}};
}
test('menu button sound works on the first gesture without battle preparation or an asset fetch',t=>{const f=fixture(t),a=new AudioEffects();assert.equal(a.interfaceVolume,.25);assert.equal(a.context,null);a.interfaceCue();assert.equal(f.contexts,1);assert.equal(f.resumes,1);assert.equal(f.starts,1);assert.equal(a.buffers.size,0);a.interfaceCue();assert.equal(f.contexts,1);assert.equal(f.starts,2);});
test('saved mute and nonzero preferences survive; master mute suppresses all interface voices',t=>{const f=fixture(t,JSON.stringify({master:.4,battle:.6,interface:0})),a=new AudioEffects();assert.equal(a.interfaceVolume,0);a.interfaceCue();assert.equal(f.starts,0);a.setMix(.4,.6,.7);const b=new AudioEffects();assert.equal(b.interfaceVolume,.7);b.interfaceCue();assert.equal(f.starts,1);b.setMix(0,.6,.7);b.interfaceCue();assert.equal(f.starts,1);});
