import test from 'node:test';import assert from 'node:assert/strict';
import {BackgroundPreparation} from '../src/app/background-preparation';
import {BattleRenderer} from '../src/render/scene/battle-renderer';import {World} from '../src/simulation/world';
import {racePreloadModels,modelPreloadAssets} from '../src/app/race-preload';import {HEROES} from '../src/data/heroes';import {ELITES} from '../src/data/elites';
import {displayLoadModelKey,displayAssetModelKey} from '../src/render/materials/elite-visual';
import {ASSETS} from '../src/assets/manifest';
import * as THREE from 'three';

for(const race of ['terran','zerg','protoss'] as const)test(`complete deferred roster covers the former ${race} startup roster and its shipped forms`,()=>{
 const world=new World({race,seed:529,terrain:false,waves:false});world.start();const gpu=new Map();
 const view=Object.assign(Object.create(BattleRenderer.prototype),{world,gpu,contextEpoch:0,screenWarmed:new Set(),staticWarmEpoch:new Map(),fortTemplates:new Map(),fortDeathTemplates:new Map(),mapViews:new Map()});
 const models=view.completePreloadModels() as Map<string,any>,expected=racePreloadModels(race);if(race==='protoss')expected.set(ELITES['carrier.1'].model,'carrier');
 for(const [key,type]of expected){assert.equal(models.get(displayLoadModelKey(key,type)),type,key);for(const id of modelPreloadAssets([[displayAssetModelKey(displayLoadModelKey(key,type)),type]]))assert.ok(ASSETS.has(id),id);}
 for(const h of Object.values(HEROES).filter(h=>h.race===race))assert.ok(models.has(displayLoadModelKey(h.model,h.baseFamily)),h.model);
 assert.equal(view.completePreloadStatus().ready,0);for(const [key,type]of models)gpu.set(displayLoadModelKey(key,type),{allMeshes:[]});
 assert.equal(view.completePreloadStatus().complete,false);assert.equal(view.completePreloadStatus().missing.length,5);
 view.fortTemplates.set('bunker',{});view.fortTemplates.set('repair',{});view.fortDeathTemplates.set('bunker',{});view.fortDeathTemplates.set('repair',{});view.mapViews.set(world.endlessField,{});for(const id of ['model.fort.bunker','model.fort.bunker.death','model.fort.repair','model.fort.repair.death','map.endless'])view.staticWarmEpoch.set(id,0);
 assert.equal(view.completePreloadStatus().complete,true);assert.equal(view.completePreloadStatus().ready,view.completePreloadStatus().total);view.contextEpoch++;assert.equal(view.completePreloadStatus().complete,false);assert.equal(view.completePreloadStatus().missing.length,5);
});

test('paced live jobs cannot starve under continuous input and slow frames, but back off between slices',async()=>{
 let now=0;const lane=new BackgroundPreparation(()=>now,()=>true);await lane.opening(20000,async()=>{});lane.frame(40);lane.input();let count=0;
 lane.select([{key:'roster',paced:true,run:async()=>{await lane.checkpoint(()=>false,false,true);count++;now=2;await lane.checkpoint(()=>false,false,true);count++;}}]);lane.tick();
 await new Promise(r=>setTimeout(r,24));assert.equal(count,1);await new Promise(r=>setTimeout(r,24));assert.equal(count,1);
 now=64;lane.input();lane.frame(40);await new Promise(r=>setTimeout(r,24));assert.equal(count,2);assert.equal(lane.busy,false);
});
test('completed live assets are omitted and an urgent reward overtakes unscheduled optional work',async()=>{
 const lane=new BackgroundPreparation(()=>0,()=>true),seen:string[]=[];
 lane.select([{key:'already-ready',isReady:()=>true,run:async()=>{seen.push('ready');}},{key:'later',run:async()=>{seen.push('later');}},{key:'boss',priority:true,run:async()=>{seen.push('boss');}}]);
 assert.equal(lane.pending,2);lane.tick();await new Promise(r=>setTimeout(r,0));assert.deepEqual(seen,['boss']);assert.equal(lane.pending,1);
});
test('a cancelled paced slice cannot publish work even when required entrance drains the lane',async()=>{
 let now=0;const lane=new BackgroundPreparation(()=>now,()=>true);let cancelled=false,published=false;
 lane.select([{key:'model',paced:true,run:async()=>{await lane.checkpoint(()=>cancelled,false,true);now=4;await lane.checkpoint(()=>cancelled,false,true);published=true;}}]);lane.tick();await Promise.resolve();cancelled=true;
 const release=await lane.enter();release();assert.equal(published,false);assert.deepEqual(lane.report().failed,['model']);
});

for(const fail of [false,true])test(`restoring a cached static template keeps its source scene and instance data intact${fail?' when warmup fails':''}`,async()=>{
 const world=new World({terrain:false,waves:false}),source=new THREE.Group(),mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial(),3),matrix=new THREE.Matrix4().makeTranslation(7,8,9);mesh.count=2;mesh.setMatrixAt(0,matrix);source.add(mesh);source.visible=false;let disposedSource=0,disposedClone=0;
 mesh.geometry.addEventListener('dispose',()=>disposedSource++);const cache=new Map([['bunker',source]]),epochs=new Map();
 const view=Object.assign(Object.create(BattleRenderer.prototype),{world,contextEpoch:2,scene:new THREE.Scene(),fortTemplates:cache,fortDeathTemplates:new Map(),staticWarmEpoch:epochs,warmDetachedBatches:async(root:THREE.Scene,meshes:THREE.Mesh[])=>{
  const copy=meshes[0] as THREE.InstancedMesh;assert.notEqual(copy,mesh);copy.addEventListener('dispose',()=>disposedClone++);copy.count=1;copy.setMatrixAt(0,new THREE.Matrix4());copy.visible=false;if(fail)throw Error('warmup failure');
 }});
 const work=view.streamEndlessTemplate('model.fort.bunker',async()=>{});if(fail)await assert.rejects(work,/warmup failure/);else await work;
 const after=new THREE.Matrix4();mesh.getMatrixAt(0,after);assert.ok(after.equals(matrix));assert.equal(mesh.count,2);assert.equal(source.visible,false);assert.equal(mesh.parent,source);assert.equal(cache.get('bunker'),source);assert.equal(disposedSource,0);assert.equal(disposedClone,1);assert.equal(epochs.get('model.fort.bunker'),fail?undefined:2);
 mesh.dispose();mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();
});
