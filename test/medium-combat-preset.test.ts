import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MEDIUM_DECORATIVE_EMITTERS,sourceDecorationMask} from '../src/render/effects/source/detail';
import {SOURCE_EFFECTS,SourceEffectPlayer} from '../src/render/effects/source/player';
import {sourceParticleQuads,SourceParticleCache} from '../src/render/effects/source/particles';
import {sourceSeed} from '../src/render/effects/source/timeline';
import type {SourceEffectRequest} from '../src/render/effects/source/types';
import {SceneShadows} from '../src/render/scene/scene-shadows';
import {SceneContact} from '../src/render/scene/scene-contact';
import {PosedDepthRegistry} from '../src/render/materials/posed-depth';
import {ScreenRefraction} from '../src/render/scene/screen-refraction';

function camera(){const c=new THREE.PerspectiveCamera();c.position.set(2,18,24);c.lookAt(0,0,0);c.updateMatrixWorld();return c;}
const summarize=(quads:any[])=>quads.map(q=>({emitter:q.emitter,born:q.born,matrix:q.matrix.elements.slice(),color:q.color,uv:q.uv,material:q.materialReference}));
function request(model:string,age:number):SourceEffectRequest{return {key:model,model,age,seed:sourceSeed(model),hostedBeam:true,placement:{x:1,y:2,z:3,facing:.3,end:{x:2,y:3,z:10},from:{x:0,y:2,z:2},age}};}

test('medium emitter classification resolves exact authored bones and leaves identity and primary beam emitters unselected',()=>{
 for(const [id,names] of Object.entries(MEDIUM_DECORATIVE_EMITTERS)){
  const def=SOURCE_EFFECTS[id];assert.ok(def,id);const actual=def.particles.map(p=>def.bones[p.bone].name);
  for(const name of names)assert.ok(actual.includes(name),id+':'+name);
  assert.ok(sourceDecorationMask(def).size>0,id);
 }
 for(const id of ['ProtossShieldRipple','GuardianShield','MedivacHealBeam','VoidRayCenterBeam','ColossusAttackBeam'])assert.equal(sourceDecorationMask(SOURCE_EFFECTS[id]).size,0,id);
});

test('medium preserves every unclassified particle exactly across native models, times and cache restoration',()=>{
 const c=camera(),cache=new SourceParticleCache();let removed=0,core=0;
 for(const def of Object.values(SOURCE_EFFECTS))for(const age of [.04,.15,.4,.8,1.5]){
  const r=request(def.id,age),mask=sourceDecorationMask(def),full=sourceParticleQuads(def,r,c,()=>0);
  cache.begin(age);const medium=sourceParticleQuads(def,r,c,()=>0,cache,.3,mask);cache.end();
  const main=(q:{emitter:number})=>!mask.has(q.emitter%1000);
  assert.deepEqual(summarize(medium.filter(main)),summarize(full.filter(main)),def.id+':'+age);core+=full.filter(main).length;
  const retained=new Set(full.map(q=>q.emitter+':'+q.born));assert.ok(medium.every(q=>retained.has(q.emitter+':'+q.born)),def.id);removed+=full.length-medium.length;
  cache.begin(age);assert.deepEqual(summarize(sourceParticleQuads(def,r,c,()=>0,cache,1,mask)),summarize(full),def.id+': restored');cache.end();
 }
 assert.ok(removed>100,'secondary particles actually reduced');assert.ok(core>100,'primary particles actually exercised');
});

test('source player clears displacement when switching medium while preserving shield colour and restores the original submission',()=>{
 const def=SOURCE_EFFECTS.ProtossShieldRipple,player=new SourceEffectPlayer(new THREE.Scene(),camera()),internal=player as any,batches=new Map<string,any>();
 internal.resources.set(def.id,{definition:def});player.ready=true;
 for(const ref of def.materialReferences){const key=def.id+(ref.type===2?':displacement:':':')+ref.material_index;if(batches.has(key))continue;const b={quads:[]as any[],begin(){this.quads=[];},add(q:any){this.quads.push(q);},end(){},report(){return {count:this.quads.length};}};batches.set(key,b);internal.batches.set(key,b);}
 const draw=()=>{player.begin(.1);player.add(request(def.id,.1),()=>0);player.end();return Object.fromEntries([...batches].map(([key,b])=>[key,summarize(b.quads)]));};
 const full=draw(),displacement=Object.keys(full).filter(k=>k.includes(':displacement:')),colour=Object.keys(full).filter(k=>!k.includes(':displacement:'));
 assert.ok(displacement.some(k=>full[k].length));assert.ok(colour.some(k=>full[k].length));
 player.displacementEnabled=false;player.decorationFraction=.3;const medium=draw();for(const key of displacement)assert.equal(medium[key].length,0);for(const key of colour)assert.deepEqual(medium[key],full[key]);
 player.displacementEnabled=true;player.decorationFraction=1;assert.deepEqual(draw(),full);
});

test('shadow toggles release old maps, restore light and renderer flags, and respect unsupported hardware',()=>{
 const renderer={capabilities:{maxTextureSize:4096},shadowMap:{enabled:false,type:0,needsUpdate:false}},light=new THREE.DirectionalLight(),shadows=new SceneShadows(renderer as any,new THREE.Scene(),light);let disposed=0;
 light.shadow.map={dispose(){disposed++;}} as any;shadows.setEnabled(false);assert.equal(disposed,1);assert.equal(light.shadow.map,null);assert.equal(light.castShadow,false);assert.equal(renderer.shadowMap.enabled,false);
 shadows.setEnabled(true);assert.equal(light.castShadow,true);assert.equal(renderer.shadowMap.enabled,true);assert.equal(light.shadow.needsUpdate,true);assert.equal(light.shadow.mapSize.x,1024);
 const unsupported=new SceneShadows({capabilities:{maxTextureSize:256},shadowMap:{}} as any,new THREE.Scene(),new THREE.DirectionalLight());unsupported.setEnabled(false);unsupported.setEnabled(true);assert.equal(unsupported.enabled,false);assert.ok(unsupported.report().fallback);
});

test('contact disables its stale sampled texture immediately and cannot re-enable a failed GPU path',()=>{
 const contact=new SceneContact({} as any,new PosedDepthRegistry()),internal=contact as any;internal.uniforms.sceneContactEnabled.value=1;internal.ready=true;internal.occluders=3;
 contact.setEnabled(false);contact.render(new THREE.Scene(),new THREE.PerspectiveCamera(),20,20);assert.equal(internal.uniforms.sceneContactEnabled.value,0);assert.equal(contact.report().ready,false);assert.equal(contact.report().occluders,0);
 contact.setEnabled(true);assert.equal(contact.enabled,true);assert.equal(internal.uniforms.sceneContactEnabled.value,0);
 internal.fallback='failed target';contact.setEnabled(false);contact.setEnabled(true);assert.equal(contact.enabled,false);assert.equal(contact.report().fallback,'failed target');
});

test('disabled refraction performs no GPU work or swap even with a visible distortion surface',()=>{
 const scene=new THREE.Scene(),mesh=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial());mesh.userData.displacement=true;scene.add(mesh);const pass=new ScreenRefraction(scene,new THREE.PerspectiveCamera()),target=new THREE.WebGLRenderTarget(2,2);
 (pass as any).active=1;pass.needsSwap=true;pass.setEnabled(false);pass.render({} as any,target,target);assert.equal(pass.needsSwap,false);assert.equal(pass.report().activeSurfaces,0);pass.setEnabled(true);assert.equal(pass.enabled,true);pass.dispose();target.dispose();mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();
});
