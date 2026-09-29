import test from 'node:test';
import assert from 'node:assert/strict';
import {toggleNativeFullscreen,bindGameViewport} from '../src/ui/mobile/viewport';

test('native fullscreen failure is explicit; entry and exit follow actual document state',async()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');let entered=0,exited=0;
 const doc={fullscreenElement:null as unknown,documentElement:{requestFullscreen:async()=>{entered++;}},exitFullscreen:async()=>{exited++;}};
 Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 try{assert.equal(await toggleNativeFullscreen(),true);assert.equal(entered,1);doc.fullscreenElement={};assert.equal(await toggleNativeFullscreen(),true);assert.equal(exited,1);doc.fullscreenElement=null;doc.documentElement.requestFullscreen=async()=>{throw new Error('gesture or iframe permission missing');};assert.equal(await toggleNativeFullscreen(),false);assert.equal(entered,1);}finally{if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');}
});

test('rotation and address-bar resizing coalesce, reset active input clocks, and detach cleanly',()=>{
 const keys=['window','document','requestAnimationFrame','cancelAnimationFrame'] as const,old=keys.map(k=>Object.getOwnPropertyDescriptor(globalThis,k));
 const win=Object.assign(new EventTarget(),{visualViewport:Object.assign(new EventTarget(),{width:390,height:844})}),styles=new Map<string,string>(),doc=Object.assign(new EventTarget(),{documentElement:{style:{setProperty:(k:string,v:string)=>styles.set(k,v)}}});let next=1,resets=0,resizes=0;const frames=new Map<number,FrameRequestCallback>();
 const values=[win,doc,(cb:FrameRequestCallback)=>{const id=next++;frames.set(id,cb);return id;},(id:number)=>frames.delete(id)];keys.forEach((k,i)=>Object.defineProperty(globalThis,k,{value:values[i],configurable:true}));
 try{const stop=bindGameViewport(()=>resizes++,()=>resets++);const flush=()=>{const all=[...frames.values()];frames.clear();all.forEach(f=>f(0));};flush();assert.equal(resizes,1);win.visualViewport.width=844;win.visualViewport.height=390;win.dispatchEvent(new Event('orientationchange'));win.visualViewport.dispatchEvent(new Event('resize'));doc.dispatchEvent(new Event('fullscreenchange'));assert.equal(frames.size,1);flush();assert.equal(resets,2);assert.equal(styles.get('--game-width'),'844px');assert.equal(styles.get('--game-height'),'390px');stop();win.dispatchEvent(new Event('resize'));assert.equal(frames.size,0);}finally{keys.forEach((k,i)=>old[i]?Object.defineProperty(globalThis,k,old[i]!):Reflect.deleteProperty(globalThis,k));}
});
