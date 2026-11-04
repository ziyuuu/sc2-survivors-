import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {SpecialTerrain} from '../src/simulation/special-stages/terrain';
import {beginSpecialStage,finishSpecialStage} from '../src/simulation/special-stages/runtime';
import {createFlatMap} from '../src/render/terrain/flat-map';

import {configurePlatformAssetUrl} from '../src/assets/manifest';
import {AssetReadinessCoordinator} from '../src/app/asset-readiness';

const global=globalThis as any;
const flush=async()=>{for(let i=0;i<80;i++)await Promise.resolve();};
function browser(t:any){
 const originals=new Map<string,PropertyDescriptor|undefined>();
 const set=(key:string,value:unknown)=>{if(!originals.has(key))originals.set(key,Object.getOwnPropertyDescriptor(global,key));Object.defineProperty(global,key,{configurable:true,writable:true,value});};
 t.after(()=>{configurePlatformAssetUrl(null);for(const [key,descriptor]of originals)if(descriptor)Object.defineProperty(global,key,descriptor);else delete global[key];});
 return set;
}
function fixture(){const w=new World({difficulty:'hard',seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],initial:['marine','marauder','reaper','hellion']});w.start();w.stage=4;w.prepareStage();w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;}

test('failed special-map creation is retried by the existing preparation gate and stale errors clear',async t=>{
 const set=browser(t);set('__SC2_PACKED_GRAPHICS__',false);
 configurePlatformAssetUrl(id=>'https://runtime-audit.invalid/'+id);
 let healthy=false,loads=0;
 t.mock.method(THREE.TextureLoader.prototype,'loadAsync',async()=>{
  loads++;if(!healthy)throw Error('injected one-time image decoding failure');
  return new THREE.Texture({width:4,height:4});
 });
 const world=fixture(),normalTerrain=world.terrain;
 const oldMap={setVisible:()=>{},update:()=>{}},view:any=Object.assign(Object.create(BattleRenderer.prototype),{
  world,mapViews:new Map([[normalTerrain,oldMap]]),mapTerrain:normalTerrain,mapView:oldMap,
  mapSwitching:false,assetsPending:0,modelErrors:[],scene:new THREE.Scene(),cameraTarget:new THREE.Vector3(),filterTextures:()=>{},
  initialAssetsLoaded:true,contextEpoch:0,gpu:new Map(),preparedCommon:new Set(),fortTemplates:new Map(),fortDeathTemplates:new Map(),variantQueue:Promise.resolve(),
  prepareEquipmentFortAssets:async()=>{},prepareRescueAssets:async()=>{},prepareMissionAssets:async()=>{},currentModels:()=>new Map(),retainRequiredUnits:()=>{},prepareCommonAssets:async()=>{},
  compilePresentation:async()=>{},warmPresentationBatches:async()=>0
 });
 assert.equal(beginSpecialStage(world,'resources','fixture'),true);assert.ok(world.terrain instanceof SpecialTerrain);
 const challengeTerrain=world.terrain;view.syncMap();await flush();
 assert.equal(loads,1);assert.equal(view.mapSwitching,false);assert.equal(view.assetsPending,0);
 assert.equal(view.mapViews.has(challengeTerrain),false);assert.equal(view.modelErrors.length,1);assert.equal(world.paused,true);
 healthy=true;
 for(let i=0;i<3;i++){view.syncMap();await flush();}
 assert.equal(loads,1,'No uncontrolled retry loop while the same terrain remains failed');
 const gate=new AssetReadinessCoordinator(world,view);assert.equal(await gate.prepare('reinforcement'),true);
 assert.ok(loads>1);assert.equal(view.mapTerrain,challengeTerrain);assert.equal(view.mapViews.has(challengeTerrain),true);assert.deepEqual(view.modelErrors,[]);
 assert.equal(finishSpecialStage(world,'quit'),true);await view.syncMap();assert.equal(world.terrain,normalTerrain);assert.equal(await gate.retry(),true);assert.deepEqual(view.modelErrors,[]);

});
