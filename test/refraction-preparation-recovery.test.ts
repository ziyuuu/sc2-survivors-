import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ScreenRefraction} from '../src/render/scene/screen-refraction';
import {displacementFrame} from '../src/render/effects/source/displacement';
import {BackgroundPreparation} from '../src/app/background-preparation';
import {AssetReadinessCoordinator} from '../src/app/asset-readiness';

function fixture(){
 const camera=new THREE.PerspectiveCamera(),root=new THREE.Group(),material=new THREE.MeshBasicMaterial(),mesh=new THREE.Mesh(new THREE.PlaneGeometry(),material);root.add(mesh);
 const pass=new ScreenRefraction(new THREE.Scene(),camera),prior={},calls:{root:THREE.Object3D;resolve:()=>void;reject:(e:Error)=>void}[]=[];
 let target:unknown=prior,renders=0,lost=false,privateDisposals=0,liveDisposals=0,targetDisposals=0;
 const seen=new Set<unknown>();material.addEventListener('dispose',()=>liveDisposals++);
 const renderer:any={getContext:()=>({isContextLost:()=>lost}),getRenderTarget:()=>target,setRenderTarget:(value:THREE.WebGLRenderTarget)=>{target=value;if(value&&value!==prior&&!seen.has(value)){seen.add(value);value.addEventListener('dispose',()=>targetDisposals++);}},compileAsync:(prepared:THREE.Object3D)=>{assert.notEqual(prepared,root);const m=(prepared.children[0] as THREE.Mesh).material as THREE.Material;assert.notEqual(m,material);m.addEventListener('dispose',()=>privateDisposals++);return new Promise<void>((resolve,reject)=>calls.push({root:prepared,resolve,reject}));},render:(drawn:THREE.Object3D)=>{assert.equal(drawn,root);renders++;}};
 return {pass,root,renderer,calls,lose:()=>lost=true,state:()=>({renders,privateDisposals,liveDisposals,targetDisposals,targetRestored:target===prior}),dispose:()=>{pass.dispose();material.dispose();mesh.geometry.dispose();}};
}
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};

test('refraction deadline releases an optional lane, disposes private state and ignores late compilation',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=fixture(),lane=new BackgroundPreparation(()=>0,()=>true),depth=displacementFrame.depth.value,size=displacementFrame.size.value.clone();
 try{
  lane.select([{key:'refraction',run:()=>f.pass.prepare(f.renderer,f.root)}]);lane.tick();await flush();assert.equal(lane.busy,true);
  assert.equal(f.state().targetRestored,true);t.mock.timers.tick(60000);await flush();assert.equal(lane.busy,false);assert.deepEqual(lane.report().failed,['refraction']);
  assert.deepEqual(f.state(),{renders:0,privateDisposals:1,liveDisposals:0,targetDisposals:1,targetRestored:true});
  const release=await lane.enter();const retry=f.pass.prepare(f.renderer,f.root);f.calls[1].resolve();await retry;release();assert.equal(f.state().renders,1);
  f.calls[0].resolve();await flush();assert.equal(f.state().renders,1);assert.equal(lane.report().held,0);assert.equal(displacementFrame.depth.value,depth);assert.ok(displacementFrame.size.value.equals(size));
 }finally{f.dispose();}
});

test('required cancel drains refraction and the same entrance can retry without the old compile finishing',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=fixture(),lane=new BackgroundPreparation(()=>0,()=>true);
 const view:any={initialAssetsLoaded:true,modelErrors:[],preparationKey:'test',waitForPendingAssets:async()=>{},compilePresentation:async()=>{},warmPresentationBatches:async()=>0};
 view.prepareCurrentAssets=()=>{const control=view.preparationControl;return f.pass.prepare(f.renderer,f.root,{cancelled:()=>control.cancelled()});};
 const gate=new AssetReadinessCoordinator({expedition:{race:'terran'}} as any,view,undefined,lane);let ready=0;gate.onReady=()=>ready++;
 try{
  const old=gate.prepare('reinforcement');await flush();gate.cancel();const next=gate.retry();t.mock.timers.tick(16);await flush();
  assert.equal(await old,false);assert.equal(f.calls.length,2);f.calls[1].resolve();assert.equal(await next,true);assert.equal(ready,1);assert.equal(lane.report().held,0);
  f.calls[0].reject(Error('late failed compiler'));await flush();assert.equal(ready,1);assert.equal(f.state().renders,1);
 }finally{f.dispose();}
});

test('context loss, disposal, abort and synchronous compile failure cannot draw or retain private refraction state',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const mode of ['context','epoch','dispose','signal','throw']){const f=fixture(),signal=new AbortController();try{
  if(mode==='throw')f.renderer.compileAsync=()=>{throw Error('compile failed');};
  const pending=f.pass.prepare(f.renderer,f.root,{signal:signal.signal}),failed=assert.rejects(pending);
  if(mode==='context')f.lose();if(mode==='epoch')f.pass.invalidatePreparation();if(mode==='dispose')f.pass.dispose();if(mode==='signal')signal.abort();t.mock.timers.tick(16);await failed;
  f.calls[0]?.resolve();await flush();assert.equal(f.state().renders,0);assert.equal(f.state().liveDisposals,0);assert.equal(f.state().targetDisposals,1);assert.equal(f.state().targetRestored,true);
 }finally{f.dispose();}}
});
