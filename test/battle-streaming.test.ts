import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {AnimatedBatch} from '../src/render/units/animated-batch';

test('a prepared hidden apparition becomes visible only when live instances arrive',()=>{
 const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial(),4);mesh.visible=false;
 const batch=Object.assign(Object.create(AnimatedBatch.prototype),{meshes:[],apparitionMeshes:[mesh],materialSurfaces:[],count:3,apparitionCount:1});
 batch.end();assert.equal(mesh.visible,true);assert.equal(mesh.count,3);
 batch.apparitionCount=0;batch.end();assert.equal(mesh.visible,false);assert.equal(mesh.count,0);
 batch.apparitionCount=1;batch.count=2;batch.end();assert.equal(mesh.visible,true);assert.equal(mesh.count,2);
 mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();
});

for(const fail of [false,true])test(`detached warmup draws one prepared submesh and restores renderer state${fail?' after failure':''}`,async()=>{
 const root=new THREE.Scene(),live=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),previous=new THREE.WebGLRenderTarget(4,4),seen:number[]=[];let target:THREE.WebGLRenderTarget|null=previous;
 const meshes=Array.from({length:3},()=>new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial(),2));for(const mesh of meshes){mesh.count=0;root.add(mesh);}const colors=meshes.map(m=>m.material),pose=camera.matrixWorld.clone();
 const renderer={shadowMap:{autoUpdate:true,needsUpdate:true},getRenderTarget:()=>target,setRenderTarget:(value:THREE.WebGLRenderTarget|null)=>{target=value;},initTexture:()=>{},render:(scene:THREE.Scene)=>{const visible=scene.children.filter(n=>n instanceof THREE.Mesh&&n.visible);seen.push(visible.length);assert.equal(visible.length,1,'zero-count future meshes must not enter shader compilation');if(fail)throw Error('test draw failure');}};
 const view=Object.assign(Object.create(BattleRenderer.prototype),{scene:live,camera,renderer,sceneShadows:{prepare(){},depth:{depthFor:()=>new THREE.MeshDepthMaterial()}},contact:{prepare(){}},filterTextures(){},compileDetached:async()=>{},waitForGpu:async()=>{}});
 const warm=view.warmDetachedBatches(root,meshes,async()=>{});if(fail)await assert.rejects(warm,/test draw failure/);else await warm;
 assert.ok(seen.length>0);assert.equal(target,previous);assert.deepEqual(meshes.map(m=>m.material),colors);assert.ok(meshes.every(m=>!m.visible&&m.count===0));assert.ok(camera.matrixWorld.equals(pose));
 for(const mesh of meshes){mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}previous.dispose();
});

for(const mode of ['valid','invalid','uniform-failure'] as const)test(`background shader first use validates links and restores diagnostics: ${mode}`,async()=>{
 const programs:any[]=[],debug={checkShaderErrors:true};let checked=0,uniforms=0;
 const gl={LINK_STATUS:1,isContextLost:()=>false,getProgramParameter:()=>{checked++;return mode!=='invalid';},getProgramInfoLog:()=> 'actual link failure'};
 const renderer={info:{programs},debug,getContext:()=>gl},view=Object.assign(Object.create(BattleRenderer.prototype),{renderer,validatedPrograms:new Set(),waitForGpu:async()=>{},compilePresentation:async()=>{programs.push({id:1,program:{},isReady:()=>true,getUniforms:()=>{uniforms++;assert.equal(debug.checkShaderErrors,false);if(mode==='uniform-failure')throw Error('uniform failure');}});}});
 const work=view.compileDetached(new THREE.Scene(),new THREE.Camera(),new THREE.Scene(),async()=>{});
 if(mode==='valid'){await work;assert.ok(view.validatedPrograms.has(1));}else{await assert.rejects(work,mode==='invalid'?/actual link failure/:/uniform failure/);assert.equal(view.validatedPrograms.size,0);}
 assert.equal(checked,1);assert.equal(uniforms,mode==='invalid'?0:1);assert.equal(debug.checkShaderErrors,true);
});
