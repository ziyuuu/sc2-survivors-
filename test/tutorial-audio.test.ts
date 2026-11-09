import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioEffects} from '../src/render/effects/audio';
function fixture(t:any){
 const previous=(globalThis as any).localStorage;(globalThis as any).localStorage={getItem:()=>null,setItem(){}};t.after(()=>{(globalThis as any).localStorage=previous;});
 let starts=0,stops=0,disconnected=0;const a=new AudioEffects(),gain={value:1,setValueAtTime(){},linearRampToValueAtTime(){}};
 a.context={currentTime:10,destination:{},resume:async()=>{},createGain:()=>({gain:{...gain},connect(){return this;},disconnect(){disconnected++;}}),createBufferSource:()=>({buffer:null,onended:null,connect(){return this;},disconnect(){disconnected++;},start(...args:unknown[]){starts++;assert.deepEqual(args,[0,0,.75]);},stop(){stops++;}})} as any;
 a.buffers.set('test',{duration:3} as AudioBuffer);
 return {a,get starts(){return starts;},get stops(){return stops;}};
}
const settle=async()=>{for(let n=0;n<5;n++)await Promise.resolve();};
test('short original tutorial cue starts once through interface volume and stops synchronously on cancel',async t=>{const f=fixture(t),stop=f.a.tutorialCue('test',.75);await settle();assert.equal(f.starts,1);assert.equal(f.a.played.get('tutorial:test'),1);stop();assert.equal(f.stops,1);});
test('cancel while decoding prevents a stale tutorial voice from starting',async t=>{const f=fixture(t);let ready!:()=>void;(f.a as any).ensureDecoded=()=>new Promise<void>(r=>{ready=r;});const stop=f.a.tutorialCue('test',.75);stop();ready();await settle();assert.equal(f.starts,0);});
test('muted master or interface volume does not start a tutorial voice or require audio to progress',async t=>{const f=fixture(t);f.a.setMix(0,1,1);f.a.tutorialCue('test',.75);f.a.setMix(1,1,0);f.a.tutorialCue('test',.75);await settle();assert.equal(f.starts,0);});
