import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {retainedUnitEvictions} from '../src/render/units/retained-models';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {World} from '../src/simulation/world';
import {AssetReadinessCoordinator} from '../src/app/asset-readiness';
import {BackgroundPreparation} from '../src/app/background-preparation';

test('idle unit budget deduplicates shared backing stores, protects pinned data and uses LRU low water',()=>{
 const shared={},old={},recent={},current={},models=[
  {key:'current',lastUsed:3,pinned:true,resources:new Map([[shared,100],[current,200]])},
  {key:'old',lastUsed:1,pinned:false,resources:new Map([[shared,100],[old,70]])},
  {key:'recent',lastUsed:2,pinned:false,resources:new Map([[old,70],[recent,50]])}
 ];
 assert.deepEqual(retainedUnitEvictions(models,128,80),{before:120,after:120,evicted:[]});
 assert.deepEqual(retainedUnitEvictions(models,100,80),{before:120,after:0,evicted:['old','recent']});
 assert.deepEqual(retainedUnitEvictions(models.map(m=>({...m,pinned:true})),0,0),{before:0,after:0,evicted:[]});
});

test('idle retirement preserves paused bodies, required forms and live shared texture data',()=>{
 const world=new World({race:'terran',sandbox:true,terrain:false,waves:false});world.start();const before=world.captureRun();world.phase='menu';
 const released:string[]=[],gpu=new Map(),source={width:2048,height:2048},mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),1);mesh.count=0;
 for(const key of ['marine','marine.death','tank','tank.siege','elite.marine.2','elite.marine.2.death','hero.artanis']){
  const own={},rows=new Map<object,number>([[source,16*1024**2],[own,40*1024**2]]);
  gpu.set(key,{count:0,allMeshes:[mesh],retainedResources:(out:Map<object,number>)=>{for(const entry of rows)out.set(...entry);return out;},dispose:()=>released.push(key)});
 }
 const view:any=Object.assign(Object.create(BattleRenderer.prototype),{world,gpu,assetsPending:0,streamingLoads:new Map(),corpses:new Map(),batches:new Map(),variantLoads:new Map(['marine','tank','elite.marine.2','hero.artanis'].map(k=>[k,Promise.resolve(true)])),retainedRequired:new Set(['tank.siege']),unitLastUsed:new Map([['elite.marine.2',1],['hero.artanis',2]]),backgroundModels:new Set(),screenWarmed:new Set([mesh]),cacheEpoch:0,memoryConstrainedPreload:true});
 const result=view.trimIdleUnitAssets();assert(result.evicted.length);assert(!released.includes('marine'));assert(!released.includes('marine.death'));assert(!released.includes('tank'));assert(!released.includes('tank.siege'));assert(released.includes('elite.marine.2'));assert(released.includes('elite.marine.2.death'));
 assert.equal(view.variantLoads.has('elite.marine.2'),false);assert.equal(view.cacheEpoch,1);assert.equal(world.phase,'menu');assert.deepEqual(source,{width:2048,height:2048});
 world.phase='battle';assert.deepEqual(world.captureRun(),before);assert.equal(view.trimIdleUnitAssets(),undefined);
});

test('idle maintenance drains an old job and yields to a newer required entrance',async()=>{
 const world:any={phase:'menu',expedition:{race:'terran'}},lane=new BackgroundPreparation(()=>0,()=>true);let finish!:()=>void,trims=0;
 lane.select([{key:'old',run:()=>new Promise<void>(r=>finish=r)}]);lane.tick();
 const view:any={waitForPendingAssets:async()=>{},trimIdleUnitAssets:()=>{trims++;},initialAssetsLoaded:true,modelErrors:[],prepareCurrentAssets:async()=>{},preparationKey:'same',compilePresentation:async()=>{},warmPresentationBatches:async()=>0};
 const gate=new AssetReadinessCoordinator(world,view,undefined,lane),idle=gate.trimIdleResources(),entrance=gate.prepare('reinforcement');
 await Promise.resolve();assert.equal(trims,0);finish();await idle;assert.equal(await entrance,true);assert.equal(trims,0);gate.cancel();await gate.trimIdleResources();assert.equal(trims,1);
});
