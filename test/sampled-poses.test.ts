import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {preparePoseData,preparePoseDataAsync,yieldPreparation} from '../src/render/units/sampled-poses';
import {AnimatedBatch} from '../src/render/units/animated-batch';

function source(){
 const scene=new THREE.Group(),bone=new THREE.Bone();bone.name='Root';scene.add(bone);
 for(const [name,x]of [['Ref_Weapon',.5],['Ref_Weapon Left',-.2],['Ref_Weapon Right',.2]]as const){const node=new THREE.Object3D();node.name=name;node.position.set(x,.5,0);bone.add(node);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Array(12).fill(0),4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
 const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshStandardMaterial());scene.add(mesh);scene.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton([bone]));
 const animations=[new THREE.AnimationClip('Stand',1,[new THREE.VectorKeyframeTrack('Root.position',[0,1],[0,0,0,0,0,0])]),new THREE.AnimationClip('Attack',2,[new THREE.VectorKeyframeTrack('Root.position',[0,2],[0,0,0,2,0,0])])];
 return {gltf:{scene,animations}as unknown as GLTF,bone};
}
test('one native 24 Hz pose grid retains endpoint bones and distinct weapon sockets',()=>{
 const {gltf}=source(),data=preparePoseData(gltf,1),attack=data.clips.get('Attack')!,palette=[...data.palettes.values()][0];
 assert.equal(attack.frames,49);assert.equal(attack.duration,2);assert.equal(data.totalFrames,74);
 assert.equal(THREE.DataUtils.fromHalfFloat(palette.packed[attack.offset*16+12]),0);
 assert.equal(THREE.DataUtils.fromHalfFloat(palette.packed[(attack.offset+48)*16+12]),2);
 const left=data.weaponTracks.get('Attack:Left')!,right=data.weaponTracks.get('Attack:Right')!;
 assert.equal(left.length,49);assert.equal(right.length,49);assert.ok(Math.abs(left[0].x+.7)<1e-12);assert.ok(Math.abs(right[48].x-1.7)<1e-12);
 assert.equal(data.nodes.length,1);assert.equal(data.boneCount,1);
});
test('sliced preparation yields and reports completion without changing atlas words or sockets',async()=>{
 const a=preparePoseData(source().gltf,1),updates:number[]=[],b=await preparePoseDataAsync([source().gltf,1],{sliceMs:0,yield:async()=>{},progress:(done,total)=>{assert.ok(done<=total);updates.push(done);}});
 assert.deepEqual([...a.palettes.values()].map(p=>p.packed),[...b.palettes.values()].map(p=>p.packed));
 assert.deepEqual(a.weaponTracks,b.weaponTracks);assert.deepEqual(a.normalization,b.normalization);assert.equal(updates.at(-1),74);assert.ok(updates.length>1);
});
test('cancelled CPU sampling restores the source and creates no scene GPU batch',async()=>{
 const {gltf,bone}=source(),scene=new THREE.Scene();let cancelled=false,yields=0;
 await assert.rejects(AnimatedBatch.create(gltf,scene,1,undefined,1,undefined,undefined,{sliceMs:0,cancelled:()=>cancelled,yield:async()=>{if(++yields===4)cancelled=true;}}),/已取消/);
 assert.equal(scene.children.length,0);assert.deepEqual(bone.position.toArray(),[0,0,0]);
 const retry=await AnimatedBatch.create(gltf,scene,1);assert.equal(scene.children.length,1);assert.equal(retry.pose('attack')?.frames,49);retry.dispose();
});
test('preparation uses scheduler.yield when available and a task fallback when absent',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'scheduler');let calls=0;
 try{Object.defineProperty(globalThis,'scheduler',{configurable:true,value:{yield:async()=>{calls++;}}});await yieldPreparation();assert.equal(calls,1);
  Object.defineProperty(globalThis,'scheduler',{configurable:true,value:undefined});let timer=false;setTimeout(()=>{timer=true;},0);await yieldPreparation();assert.equal(timer,true);
 }finally{if(descriptor)Object.defineProperty(globalThis,'scheduler',descriptor);else delete(globalThis as any).scheduler;}
});

test('sliced and immediate fun actors keep their reduced pose inputs and separate shader programs',async()=>{
 const normal=new AnimatedBatch(source().gltf,new THREE.Scene(),1);
 const sync=new AnimatedBatch(source().gltf,new THREE.Scene(),1,undefined,1,'fun-nydus');
 const asyncBatch=await AnimatedBatch.create(source().gltf,new THREE.Scene(),1,undefined,1,'fun-nydus',undefined,{sliceMs:0,yield:async()=>{}});
 const material=(batch:AnimatedBatch)=>{const m=batch.meshes[0].material;return Array.isArray(m)?m[0]:m;};
 const compile=(batch:AnimatedBatch)=>{const shader={uniforms:{},vertexShader:'#include <common>\nvoid main() {\n#include <beginnormal_vertex>\n#include <begin_vertex>\n}',fragmentShader:'#include <common>\n#include <emissivemap_fragment>'};material(batch).onBeforeCompile(shader as any,{} as any);return shader;};
 const plain=compile(normal),fun=compile(sync),sliced=compile(asyncBatch);
 assert.match(plain.vertexShader,/attribute vec2 unitAim/);assert.match(fun.vertexShader,/const vec2 unitAim/);assert.match(fun.vertexShader,/const vec4 unitBlend/);
 assert.equal(fun.vertexShader,sliced.vertexShader);assert.notEqual(material(normal).customProgramCacheKey(),material(sync).customProgramCacheKey());assert.equal(material(sync).customProgramCacheKey(),material(asyncBatch).customProgramCacheKey());
 assert.deepEqual(sync.clips,asyncBatch.clips);assert.deepEqual(sync.weaponTracks,asyncBatch.weaponTracks);
 for(const batch of [normal,sync,asyncBatch])batch.dispose();
});
