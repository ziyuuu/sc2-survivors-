import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {PodView} from '../src/render/units/pod-view';
import {World} from '../src/simulation/world';

test('F05 temporary building view has a 2.7 planar footprint and cannot mutate a paid delivery',()=>{
 const scene=new THREE.Scene(),source=new THREE.Group();source.add(new THREE.Mesh(new THREE.BoxGeometry(8,2,6),new THREE.MeshBasicMaterial()));
 const gltf={scene:source,animations:[new THREE.AnimationClip('Stand',1,[])]} as unknown as GLTF;
 const view=new PodView(gltf,scene),size=new THREE.Box3().setFromObject(view.root).getSize(new THREE.Vector3());
 assert.ok(Math.abs(Math.max(size.x,size.z)-2.7)<1e-8);
 const w=new World({waves:false,sandbox:true,terrain:false});w.start();const p=w.spawnPod('marine',{x:3,z:0});const before=structuredClone(p);
 for(const time of [0,4,5,12])view.update(p,time,true);assert.deepEqual(p,before);view.dispose();assert.equal(scene.children.length,0);
});
for(const race of ['terran','zerg'] as const)test(`F05 ${race} carrier uses original work animation when releasing passengers`,()=>{
 const scene=new THREE.Scene(),source=new THREE.Group();source.add(new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshBasicMaterial()));
 const clips=['Birth','Stand','Stand Work','Death'].map(name=>new THREE.AnimationClip(name,1,[]));
 const view=new PodView({scene:source,animations:clips} as unknown as GLTF,scene,race),w=new World({race,waves:false,sandbox:true,terrain:false});w.start();
 const pod=w.spawnPod(w.expedition.familySlots[0],{x:3,z:0});pod.status='opening';pod.resolvedAt=4;view.update(pod,4.6,true);
 assert.equal(view.state,'opening');assert.equal(view.mixer.existingAction(clips[2],view.mixer.getRoot())?.isRunning(),true);view.dispose();
});
test('F05 pylon warp feedback changes only its private material, never shared originals',()=>{
 const scene=new THREE.Scene(),source=new THREE.Group(),material=new THREE.MeshStandardMaterial({emissive:0x3399ff,emissiveIntensity:1});material.onBeforeCompile=()=>{};material.customProgramCacheKey=()=>"sc2-test";source.add(new THREE.Mesh(new THREE.BoxGeometry(2,2,2),material));
 const clips=[new THREE.AnimationClip('Stand',1,[])],view=new PodView({scene:source,animations:clips} as unknown as GLTF,scene,'protoss'),w=new World({race:'protoss',waves:false,sandbox:true,terrain:false});w.start();
 const pod=w.spawnPod('zealot',{x:3,z:0});pod.status='opening';pod.resolvedAt=4;view.update(pod,4.15,true);
 let intensity=0;view.root.traverse(n=>{if(n instanceof THREE.Mesh){intensity=(n.material as THREE.MeshStandardMaterial).emissiveIntensity;assert.equal((n.material as THREE.Material).onBeforeCompile,material.onBeforeCompile);assert.equal((n.material as THREE.Material).customProgramCacheKey(),material.customProgramCacheKey());}});
 assert.ok(intensity>1);assert.equal(material.emissiveIntensity,1);view.dispose();
});
