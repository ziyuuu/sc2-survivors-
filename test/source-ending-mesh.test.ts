import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SOURCE_EFFECTS,SourceEffectPlayer} from '../src/render/effects/source/player';
import {sourceLife,sourcePhase} from '../src/render/effects/source/timeline';
import {sourceParticleQuads} from '../src/render/effects/source/particles';
import type {SourceEffectRequest} from '../src/render/effects/source/types';

function fixture(model:string){
 const definition=SOURCE_EFFECTS[model],camera=new THREE.PerspectiveCamera();camera.position.set(2,15,20);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 const player=new SourceEffectPlayer(new THREE.Scene(),camera),internal=player as any;
 internal.resources.set(model,{definition,gltf:definition.glbId?{}:undefined,displacementGltf:definition.displacementGlb?{}:undefined});player.ready=true;
 const meshCalls:{key:string;displacement:boolean}[]=[];
 internal.mesh=(_resource:unknown,request:SourceEffectRequest,_phase:unknown,displacement=false)=>{meshCalls.push({key:request.key,displacement});if(displacement)internal.counts.displacementMeshes++;else internal.counts.meshes++;};
 if(['NeedleSpinesWeapon','TalonsMissileWeapon','AcidSpinesWeapon'].includes(model))internal.rigid.set(model,{begin(){},add(r:SourceEffectRequest){meshCalls.push({key:r.key,displacement:false});},end(){},report(){return {model};}});
 // Keep native particle/ribbon evaluation; replace only GPU submission.
 for(let i=0;i<definition.materialProfile.materials.length;i++)internal.batches.set(model+':'+i,{begin(){},add(){},end(){},report(){return {};}});
 for(let i=0;i<definition.displacementMaterials.length;i++)internal.batches.set(model+':displacement:'+i,{begin(){},add(){},end(){},report(){return {};}});
 const request:SourceEffectRequest={key:'channel',model,age:.7,clockRate:1.4,seed:1,loop:true,placement:{x:0,y:1,z:0,facing:0,end:{x:0,y:1,z:7}}};
 player.begin(10);player.add(request,()=>0);player.end();
 const frame=(time:number)=>{meshCalls.length=0;player.begin(time);player.end();return {draws:structuredClone(meshCalls),report:player.report()};};
 frame(11);
 return {player,request,definition,camera,frame};
}

test('nuclear one-shot releases its 13 second mesh and refraction while source particles may finish',()=>{
 const {player,request,definition,frame}=fixture('GhostNukeExplode');player.reset();
 const sample=(age:number)=>{player.begin(age);player.add({...request,key:'nuke',age,loop:false,clip:'Death',meshUntil:13},()=>0);player.end();return player.report();};
 assert.ok(sample(12.9).meshes>0);const tail=sample(13.1);assert.equal(tail.meshes,0);assert.equal(tail.displacementMeshes,0);assert.equal(tail.missing,0);
 assert.equal(sample(sourceLife(definition)+1).effects,0);frame(100);assert.equal(player.report().effects,0);
});

for(const model of ['NeedleSpinesWeapon','TalonsMissileWeapon','AcidSpinesWeapon'])test(model+' releases its authored Death mesh without holding its last pose',()=>{
 const {player,definition,frame}=fixture(model),death=sourcePhase(definition,sourceLife(definition)).clip;
 assert.equal(death.duration,.167);
 const early=frame(11+.05/1.4);assert.ok(early.draws.some(d=>d.key==='ending-death:channel'));
 assert.deepEqual(frame(11+.05/1.4),early,'Paused rendering keeps the same ending frame');
 assert.equal(frame(11+.2/1.4).draws.length,0,'Death mesh must be gone even while the wider source lifetime remains');
 assert.equal(frame(11+sourceLife(definition)/1.4+1).report.endingChannels,0);
 player.reset();assert.equal(player.report().endingChannels,0);
});

test('ending mesh cutoff retains the exact native particle tail and also removes displacement geometry',()=>{
 for(const model of ['RavagerWeaponMissile','GuardianShield']){
  const {definition,request,camera,frame}=fixture(model),death=sourcePhase(definition,sourceLife(definition),false,request.seed).clip,age=death.duration+.01;
  const before=frame(11+death.duration*.5/1.4);assert.ok(before.draws.some(d=>!d.displacement),model);
  if(definition.displacementGlb)assert.ok(before.draws.some(d=>d.displacement),model+' displacement before expiry');
  const after=frame(11+age/1.4);assert.equal(after.draws.length,0,model+' mesh tail');
  const tail=sourceParticleQuads(definition,{...request,key:'ending-particles:channel',age:request.age+age,stopAt:request.age,mesh:false},camera,()=>0);
  const dying=sourceParticleQuads(definition,{...request,key:'ending-death:channel',age,loop:false,hostedBeam:false,clip:death.name},camera,()=>0);
  if(model==='RavagerWeaponMissile')assert.ok(tail.length+dying.length>0,model+' must exercise surviving particles');
  assert.equal(after.report.particles,tail.length+dying.length,model+' native particles must not be cut off with the mesh');
 }
});
