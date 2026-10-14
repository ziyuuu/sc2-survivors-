import test from 'node:test';
import assert from 'node:assert/strict';
import {toggleNativeFullscreen,fullscreenState,fullscreenLabel,bindGameViewport} from '../src/ui/mobile/viewport';

test('fullscreen follows standard/prefixed document state and reports denied requests without inventing full screen',async()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');let entered=0,exited=0;
 const doc:any={fullscreenElement:null,documentElement:{requestFullscreen:async()=>{entered++;doc.fullscreenElement=doc.documentElement;}},exitFullscreen:async()=>{exited++;doc.fullscreenElement=null;}};
 Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 try{
  assert.equal(fullscreenState().supported,true);assert.equal(await toggleNativeFullscreen(),true);assert.equal(fullscreenLabel(),'退出全屏');
  assert.equal(await toggleNativeFullscreen(),true);assert.equal(exited,1);assert.equal(fullscreenState().active,false);
  doc.documentElement.requestFullscreen=async()=>{throw Error('permission denied');};assert.equal(await toggleNativeFullscreen(),false);assert.equal(fullscreenState().active,false);assert.equal(entered,1);
  delete doc.documentElement.requestFullscreen;assert.equal(fullscreenState().supported,false);assert.equal(await toggleNativeFullscreen(),false);
  doc.documentElement.webkitRequestFullscreen=()=>{doc.webkitFullscreenElement=doc.documentElement;};doc.webkitExitFullscreen=()=>{doc.webkitFullscreenElement=null;};
  assert.equal(await toggleNativeFullscreen(),true);assert.equal(fullscreenState().active,true);assert.equal(await toggleNativeFullscreen(),true);assert.equal(fullscreenState().active,false);
  doc.webkitFullscreenEnabled=false;assert.equal(fullscreenState().supported,false);assert.equal(await toggleNativeFullscreen(),false);
 }finally{old?Object.defineProperty(globalThis,'document',old):Reflect.deleteProperty(globalThis,'document');}
});

function viewportHarness(){
 const names=['window','document','requestAnimationFrame','cancelAnimationFrame','performance'] as const,old=names.map(k=>Object.getOwnPropertyDescriptor(globalThis,k));
 const viewport=Object.assign(new EventTarget(),{width:390,height:844,offsetLeft:0,offsetTop:0});
 const win=Object.assign(new EventTarget(),{innerWidth:390,innerHeight:844,devicePixelRatio:2,visualViewport:viewport,screen:{orientation:new EventTarget()}});
 const styles=new Map<string,string>(),doc=Object.assign(new EventTarget(),{documentElement:{style:{setProperty:(k:string,v:string)=>styles.set(k,v)}}});
 let next=0,now=0,resets=0;const commits:{width:string|undefined;height:string|undefined;at:number}[]=[],frames=new Map<number,FrameRequestCallback>();
 const values=[win,doc,(cb:FrameRequestCallback)=>{frames.set(++next,cb);return next;},(id:number)=>frames.delete(id),{now:()=>now}];
 names.forEach((k,i)=>Object.defineProperty(globalThis,k,{value:values[i],configurable:true}));
 const stop=bindGameViewport(()=>commits.push({width:styles.get('--game-width'),height:styles.get('--game-height'),at:now}),()=>resets++);
 const frame=(ms:number)=>{now=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(cb=>cb(now));};
 return {win,doc,viewport,styles,frames,commits,frame,resets:()=>resets,dispose(){stop();names.forEach((k,i)=>old[i]?Object.defineProperty(globalThis,k,old[i]!):Reflect.deleteProperty(globalThis,k));}};
}

test('rotation discards intermediate sizes, commits matching width/height once, and ignores duplicate settled events',()=>{
 const h=viewportHarness();try{
  h.frame(0);assert.equal(h.commits.length,1);
  h.viewport.width=540;h.viewport.height=700;h.win.dispatchEvent(new Event('orientationchange'));h.viewport.dispatchEvent(new Event('resize'));h.doc.dispatchEvent(new Event('fullscreenchange'));h.frame(16);
  assert.equal(h.styles.get('--game-width'),'390px');assert.equal(h.frames.size,1);
  h.viewport.width=844;h.viewport.height=390;h.viewport.dispatchEvent(new Event('resize'));h.frame(32);h.frame(112);
  assert.deepEqual(h.commits.at(-1),{width:'844px',height:'390px',at:112});assert.equal(h.commits.length,2);assert.equal(h.resets(),3,'old gestures clear at transition and at the new coordinate boundary');
  h.frame(260);const resets=h.resets();for(let i=0;i<8;i++)h.win.dispatchEvent(new Event('resize'));h.frame(500);
  assert.equal(h.commits.length,2);assert.equal(h.resets(),resets);assert.equal(h.frames.size,0);
 }finally{h.dispose();}
});

test('late rotation size without a second browser event and visual viewport offsets reach the same committed viewport',()=>{
 const h=viewportHarness();try{
  h.frame(0);h.win.dispatchEvent(new Event('orientationchange'));h.frame(16);h.frame(170);
  h.viewport.width=844;h.viewport.height=390;h.viewport.offsetTop=30;h.viewport.offsetLeft=12;h.frame(185);h.frame(245);
  assert.equal(h.styles.get('--game-width'),'844px');assert.equal(h.styles.get('--game-height'),'390px');assert.equal(h.styles.get('--game-left'),'12px');assert.equal(h.styles.get('--game-top'),'30px');
  h.viewport.offsetTop=0;h.viewport.dispatchEvent(new Event('scroll'));h.frame(260);h.frame(350);assert.equal(h.styles.get('--game-top'),'0px');
 }finally{h.dispose();}
});

test('continuous chrome resizing is bounded; layout-only updates do not cancel player input',()=>{
 const h=viewportHarness();try{
  h.frame(0);h.viewport.height=800;h.win.dispatchEvent(new Event('resize'));
  for(let at=20;at<=240;at+=20){h.viewport.height--;h.viewport.dispatchEvent(new Event('resize'));h.frame(at);}
  assert.equal(h.commits.length,2);assert.equal(h.commits[1].at,240);
  h.frame(400);const resets=h.resets();h.doc.dispatchEvent(new Event('sc2-hud-layout'));h.frame(420);assert.equal(h.resets(),resets);
  h.dispose();h.win.dispatchEvent(new Event('resize'));h.doc.dispatchEvent(new Event('webkitfullscreenchange'));assert.equal(h.frames.size,0);
 }finally{h.dispose();}
});
