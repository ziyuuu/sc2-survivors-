import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {PodView} from '../src/render/units/pod-view';

test('prepared carrier references preserve posed scale, private outlines and independent live materials',()=>{
 const template=(width:number)=>{const scene=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(width,2,3),new THREE.MeshStandardMaterial());mesh.name='Body';mesh.userData.sc2Role='body';scene.add(mesh);const clips=[new THREE.AnimationClip('Stand',1,[new THREE.VectorKeyframeTrack('Body.position',[0,1],[1,2,0,1,3,0])]),new THREE.AnimationClip('Death',1,[])];return {scene,animations:clips} as unknown as GLTF;};
 const first=template(8),other=template(16),scene=new THREE.Scene();PodView.prepare(first,'terran',undefined,first);
 const a=new PodView(first,scene,'terran',undefined,first),b=new PodView(first,scene,'terran',undefined,first),c=new PodView(other,scene,'terran');
 assert.deepEqual(a.bodyOutline,b.bodyOutline);assert.equal(a.bodyHeight,b.bodyHeight);assert.notEqual(a.bodyHeight,c.bodyHeight);
 const original=b.bodyOutline[0].clone();a.bodyOutline[0].set(99,99,99);assert.deepEqual(b.bodyOutline[0],original);
 const ma=(a.root.getObjectByName('Body') as THREE.Mesh).material,mb=(b.root.getObjectByName('Body') as THREE.Mesh).material;assert.notEqual(ma,mb);assert.notEqual(ma,(first.scene.children[0] as THREE.Mesh).material);
 const body=b.root.children[0],box=new THREE.Box3().setFromObject(body);assert.ok(Math.abs(Math.max(box.max.x-box.min.x,box.max.z-box.min.z)-2.7)<1e-9);
 a.dispose();assert.equal(b.root.parent,scene);b.dispose();c.dispose();assert.equal(scene.children.length,0);
});

