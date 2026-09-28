import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {mapAnimations,selectAttackPresentation} from '../src/render/loaders/animations';
import {PodView} from '../src/render/units/pod-view';
import {World} from '../src/simulation/world';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {AssetReadinessCoordinator} from '../src/app/asset-readiness';

test('late audio progress cannot replace a required-model failure and remove Retry',async()=>{
 let progress:((done:number,total:number,label:string)=>void)|undefined,finish:()=>void=()=>{};
 const world={expedition:{race:'protoss'}},view={initialAssetsLoaded:false,load:async()=>{throw Error('cold birth blocked');}};
 const audio={preload:(notify:any)=>{progress=notify;return new Promise<void>(resolve=>{finish=resolve;});}};
 const gate=new AssetReadinessCoordinator(world as any,view as any,audio as any);
 assert.equal(await gate.prepare('new',{race:'protoss'}),false);assert.equal(gate.state.phase,'error');
 progress!(1,2,'late decoded audio');assert.equal(gate.state.phase,'error');assert.equal(gate.state.error,'cold birth blocked');finish();
});

test('required carrier failure occurs before initial common scene construction so retry cannot duplicate it',async()=>{
 const view=Object.create(BattleRenderer.prototype);let sharedPasses=0;
 view.world={expedition:{race:'protoss'}};
 view.prepareRescueAssets=async()=>{throw Error('required birth unavailable');};
 view.requiredFamilies=()=>{sharedPasses++;return [];};
 await assert.rejects(view.load(()=>{},'protoss'),/required birth unavailable/);
 await assert.rejects(view.load(()=>{},'protoss'),/required birth unavailable/);
 assert.equal(sharedPasses,0,'failed carrier preparation must not construct common batches, maps or effects');
});

test('B97563 Colossus uses the original thermal-lance start/channel/end bracket',()=>{
 const clips=['Stand','Walk','Attack Ready Channel','Attack 02','Attack','Stand Channel Start','Stand Channel','Stand Channel End'].map(n=>new THREE.AnimationClip(n,.2,[]));
 for(const key of ['colossus','elite.colossus.1','elite.colossus.2','elite.colossus.3']){
  const a=mapAnimations(clips,key);assert.equal(a.attack?.name,'Stand Channel Start');assert.equal(a.attackChannel?.name,'Stand Channel');assert.equal(a.attackEnd?.name,'Stand Channel End');
  const state={},u={unitType:'colossus',hp:100,action:'idle',lastShotAt:10,shotSequence:1,shotInterval:1,windup:0,modeTimer:0} as any;
  const before=structuredClone(u);assert.equal(selectAttackPresentation(u,10,a,state)?.action,'attack');assert.equal(selectAttackPresentation(u,10.2,a,state)?.action,'attackChannel');assert.equal(selectAttackPresentation(u,11.51,a,state)?.action,'attackEnd');assert.deepEqual(u,before);
 }
});
test('Pylon original birth samples existing arrival time and restores without altering paid pod',()=>{
 const source=(name:string,animations:THREE.AnimationClip[])=>{const scene=new THREE.Group();scene.name=name;scene.add(new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshStandardMaterial()));return {scene,animations} as unknown as GLTF;};
 const base=source('PylonBody',[new THREE.AnimationClip('Stand',1,[])]);
 const birth=source('PylonBirth',[new THREE.AnimationClip('Stand Build End',6,[])]);
 const scene=new THREE.Scene(),view=new (PodView as any)(base,scene,'protoss',birth),w=new World({race:'protoss',waves:false,sandbox:true,terrain:false});w.start();
 const pod=w.spawnPod('zealot',{x:3,z:0}),before=structuredClone(pod);
 const midpoint=(pod.createdAt+pod.landedAt)/2;view.update(pod,midpoint,true);
 const birthModel=view.root.getObjectByName('PylonBirth');assert.ok(birthModel,'original birth model must be visible during arrival');assert.equal(birthModel.visible,true);assert.equal(view.root.getObjectByName('PylonBody').visible,false);
 assert.equal(view.birthMixer.time,3,'full original six-second sequence maps to existing arrival progress');assert.deepEqual(pod,before);
 const restored=new (PodView as any)(base,scene,'protoss',birth);restored.update(pod,midpoint,true);assert.equal(restored.birthMixer.time,3);
 pod.status='active';view.update(pod,pod.landedAt,true);assert.equal(birthModel.visible,false);assert.equal(view.root.getObjectByName('PylonBody').visible,true);
 view.dispose();restored.dispose();assert.equal(scene.children.length,0);
});
