import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/simulation/world.ts';
import {AnimatedBatch} from '../src/render/units/animated-batch.ts';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';

test('actual damage and one death notify presentation without consuming gameplay IDs',()=>{
 const w=new World(),u=w.addUnit('marine','terran',0,0);const next=w.nextId;
 w.hit(u,6);assert.equal(u.hp,39);assert.equal(w.visualEvents.filter(e=>e.kind==='hit').length,1);
 w.hit(u,100);w.hit(u,100);assert.equal(w.visualEvents.filter(e=>e.kind==='death').length,1);assert.equal(w.nextId,next);
 assert.ok(w.visualEvents.every(e=>e.entityId===u.id&&e.time===w.time));
});
test('presentation history is bounded and has no random side effects',()=>{
 const a=new World(),b=new World(),u=a.addUnit('marine','terran',0,0);b.addUnit('marine','terran',0,0);
 for(let i=0;i<2000;i++)a.visual('hit',u);assert.ok(a.visualEvents.length<=768);assert.equal(a.nextId,b.nextId);assert.equal(a.random(),b.random());
});
test('baneling suicide emits one death as well as the damaging attack',()=>{
 const w=new World(),b=w.addUnit('baneling','zerg',0,0),m=w.addUnit('marine','terran',0,.5);w.hash.rebuild([b,m]);w.fire(b,m);
 assert.equal(b.hp,0);assert.equal(w.visualEvents.filter(e=>e.kind==='death'&&e.entityId===b.id).length,1);
 assert.ok(m.hp<m.maxHp);
});
test('GPU atlas retains animated bone translation; rendering and pause do not advance it',()=>{
 const root=new THREE.Group(),bone=new THREE.Bone();bone.name='Root';root.add(bone);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));g.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Array(12).fill(0),4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
 const mesh=new THREE.SkinnedMesh(g,new THREE.MeshStandardMaterial());root.add(mesh);root.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton([bone]));
 const clips=[new THREE.AnimationClip('Stand',1,[new THREE.VectorKeyframeTrack('Root.position',[0,1],[0,0,0,0,0,0])]),new THREE.AnimationClip('Walk',1,[new THREE.VectorKeyframeTrack('Root.position',[0,1],[0,0,0,2,0,0])])];
 const batch=new AnimatedBatch({scene:root,animations:clips} as unknown as GLTF,new THREE.Scene(),1);
 batch.begin();batch.add(0,0,0,0,'move',.25);batch.end();const first=Array.from(batch.attributes[0].array.slice(0,4));
 batch.begin();batch.add(0,0,0,0,'move',.25);batch.end();assert.deepEqual(Array.from(batch.attributes[0].array.slice(0,4)),first);
 const shader={uniforms:{},vertexShader:'#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <emissivemap_fragment>'};
 (batch.meshes[0].material as THREE.Material).onBeforeCompile(shader as never,{} as never);
 const texture=(shader.uniforms as Record<string,{value:THREE.DataTexture}>).unitBoneAtlas.value;
 const data=Array.from(texture.image.data as Uint16Array,THREE.DataUtils.fromHalfFloat),p=batch.pose('move')!;assert.equal(data[p.offset*16+12],0);assert.equal(data[(p.offset+p.frames-1)*16+12],2);assert.ok(data.every(Number.isFinite));
 batch.begin();batch.end();assert.equal(batch.meshes[0].visible,false,'empty effects/death batches do not issue draw calls');
});
