import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BattleRenderer} from '../src/render/scene/battle-renderer';

test('shader compilation uses gameplay HDR and releases the target before asynchronous completion or failure',async()=>{
 const prior={},hdr={},scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();let current=prior,resolve!:()=>void;
 const pending=new Promise<void>(r=>resolve=r),view:any={heroComposer:{readBuffer:hdr},renderer:{getRenderTarget:()=>current,setRenderTarget:(v:any)=>current=v,compileAsync(){assert.equal(current,hdr);return pending;}}};
 const result=(BattleRenderer.prototype as any).compilePresentation.call(view,scene,camera);
 // The entrance now wraps compilation with a deadline; the fulfilled value and
 // immediate render-target restoration remain the contract.
 assert.equal(current,prior);let complete=false;result.then(()=>complete=true);await Promise.resolve();assert.equal(complete,false);resolve();assert.equal(await result,undefined);
 view.renderer.compileAsync=()=>{throw Error('compile failure');};
 assert.throws(()=>(BattleRenderer.prototype as any).compilePresentation.call(view,scene,camera),/compile failure/);assert.equal(current,prior);
});

test('shader deadline rejects a stalled compile without retaining the HDR target or accepting its late completion',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const prior={},hdr={},scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();let current=prior,finish!:(value:unknown)=>void,completed=0;
 const view:any={heroComposer:{readBuffer:hdr},renderer:{getRenderTarget:()=>current,setRenderTarget:(v:any)=>current=v,compileAsync:()=>new Promise(resolve=>finish=resolve)}};
 const result=(BattleRenderer.prototype as any).compilePresentation.call(view,scene,camera);result.then(()=>completed++,()=>{});
 assert.equal(current,prior);const failure=assert.rejects(result,/着色器编译等待超时/);t.mock.timers.tick(60000);await failure;
 finish(scene);await Promise.resolve();assert.equal(completed,0);assert.equal(current,prior);
});

function fixture(fail=false,lost=false){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),meshes=Array.from({length:9},(_,i)=>{const geometry=new THREE.BufferGeometry();geometry.setAttribute('unitPose',new THREE.InstancedBufferAttribute(new Float32Array(48),4));const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial(),12);mesh.count=i+1;mesh.visible=i%2===0;mesh.setMatrixAt(0,new THREE.Matrix4().makeTranslation(i,2,3));scene.add(mesh);return mesh;});
 camera.position.set(3,4,5);const target={id:'previous'},drawn:number[][]=[];let current:any=target,completed=0;
 const hdr={id:'actual-half-float-target'};
 const view:any={scene,camera,world:{starship:{enabled:false}},equipmentDrops:{root:new THREE.Group(),meshes:[]},heroComposer:{readBuffer:hdr},preparePresentationSize(){},gpu:new Map(meshes.map((mesh,i)=>[String(i),{meshes:[mesh],allMeshes:[mesh]}])),screenWarmed:new Set(),sceneShadows:{prepare(){}},contact:{prepare(){}},cameraController:{pose(){camera.position.set(0,0,0);}},renderer:{getRenderTarget:()=>current,setRenderTarget:(v:any)=>current=v,getContext:()=>({isContextLost:()=>lost}),
  render(){assert.equal(current,hdr);drawn.push(meshes.flatMap((m,i)=>m.visible?[i]:[]));if(fail&&drawn.length===2)throw Error('pipeline failed');}},warmLightingFrame(){completed++;}};
 return {view,meshes,camera,drawn,target,get current(){return current;},get completed(){return completed;}};
}

test('presentation prewarm exercises every material in the gameplay HDR target, completes output once and restores state',async()=>{
 const before=globalThis.requestAnimationFrame;globalThis.requestAnimationFrame=callback=>{queueMicrotask(()=>callback(0));return 0;};
 try{const f=fixture(),matrices=f.meshes.map(m=>Array.from(m.instanceMatrix.array));
  assert.equal(await BattleRenderer.prototype.warmPresentationBatches.call(f.view),9);
  assert.deepEqual(f.drawn.flat(),[0,1,2,3,4,5,6,7,8]);assert.ok(f.drawn.every(group=>group.length<=8));assert.equal(f.completed,1);assert.equal(f.view.screenWarmed.size,9);
  assert.equal(f.current,f.target);assert.deepEqual(f.camera.position.toArray(),[3,4,5]);
  f.meshes.forEach((m,i)=>{assert.equal(m.count,i+1);assert.equal(m.visible,i%2===0);assert.deepEqual(Array.from(m.instanceMatrix.array),matrices[i]);});
 }finally{globalThis.requestAnimationFrame=before;}
});

test('failed or context-lost prewarming never publishes ready batches and restores the original visibility',async()=>{
 const before=globalThis.requestAnimationFrame;globalThis.requestAnimationFrame=callback=>{queueMicrotask(()=>callback(0));return 0;};
 try{for(const lost of [false,true]){const f=fixture(!lost,lost);await assert.rejects(BattleRenderer.prototype.warmPresentationBatches.call(f.view),lost?/上下文丢失/:/pipeline failed/);assert.equal(f.view.screenWarmed.size,0);assert.equal(f.current,f.target);f.meshes.forEach((m,i)=>assert.equal(m.visible,i%2===0));assert.deepEqual(f.camera.position.toArray(),[3,4,5]);}}
 finally{globalThis.requestAnimationFrame=before;}
});
