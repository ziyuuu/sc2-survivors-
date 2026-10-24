import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/simulation/world';
import {SourceEffectPlayer,SOURCE_EFFECTS} from '../src/render/effects/source/player';
import {sourceRibbonQuads} from '../src/render/effects/source/ribbons';
import {sourceParticleQuads} from '../src/render/effects/source/particles';
import type {SourceEffectRequest} from '../src/render/effects/source/types';
import {AcidGroundEffects} from '../src/render/effects/acid-ground-effects';
import {releaseBuildingView} from '../src/render/scene/building-view-lifecycle';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

test('ended hosted beam respects authored Death visibility while keeping existing particle tails',()=>{
 const camera=new THREE.PerspectiveCamera();camera.position.set(2,15,20);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 const def=SOURCE_EFFECTS.MedivacHealBeam,request:SourceEffectRequest={key:'heal',model:def.id,age:.7,seed:1,loop:true,hostedBeam:true,placement:{x:0,y:1,z:0,facing:0,end:{x:0,y:1,z:7}}};
 assert.ok(sourceRibbonQuads(def,request,camera).length>0);
 const player:any=new SourceEffectPlayer(new THREE.Scene(),camera),calls:{r:SourceEffectRequest;particlesOnly:boolean}[]=[];
 player.resources.set(def.id,{definition:def});player.loops.set(request.key,{request,ground:()=>0,seenAt:1,stopped:1});
 player.play=(r:SourceEffectRequest,_g:unknown,particlesOnly=false)=>calls.push({r,particlesOnly});player.begin(1.1);player.end();
 const death=calls.find(c=>c.r.key.startsWith('ending-death:'))!,tail=calls.find(c=>c.particlesOnly)!;
 assert.ok(death&&tail);assert.equal(sourceRibbonQuads(def,death.r,camera).length,0);
 assert.equal(tail.r.stopAt,.7);assert.ok(Math.abs(tail.r.age-.8)<1e-9);
 assert.deepEqual(sourceParticleQuads(def,tail.r,camera,()=>0),sourceParticleQuads(def,{...request,key:tail.r.key,age:.8,stopAt:.7,mesh:false},camera,()=>0));
 player.begin(100);player.end();assert.equal(player.loops.size,0);
});

function emptyWorld(){const w=new World({race:'terran',seed:529,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();w.effects=[];for(const p of Object.values(w.expedition.production))p.enabled={};return w;}
test('short native stop clears stale medivac targets and normal healing resumes',()=>{
 const w=emptyWorld(),u=w.addUnit('medivac','terran',0,0),patient=w.addUnit('marine','terran',0,1);patient.hp=patient.maxHp/2;
 w.heal(u,1/60);assert.equal(u.healTarget,patient.id);const hp=patient.hp;
 u.stoppedUntil=w.time+.1;w.updateUnit(u,1/60);assert.equal(patient.hp,hp);assert.equal(u.healTarget,null);assert.deepEqual(u.healTargets,[]);
 w.time+=.2;w.updateUnit(u,1/60);assert.equal(u.healTarget,patient.id);assert.ok(patient.hp>hp);
});
test('native hero passive healing keeps its fresh targets during a movement stop',()=>{
 const w=emptyWorld();assert.ok(w.acquireHero('swann'));const u=w.heroEntity('swann')!;u.x=u.z=0;const patient=w.addUnit('tank','terran',1,0);patient.hp=patient.maxHp/2;w.hash.rebuild(w.entities.values());u.stoppedUntil=w.time+.1;
 const hp=patient.hp;w.updateUnit(u,1/60);assert.ok(patient.hp>hp);assert.ok(u.healTargets?.includes(patient.id));
});
test('visual burst survives an eight-step render gap and old history is reclaimed',()=>{
 const w=emptyWorld(),u=w.addUnit('marine','terran',0,0);w.visualEvents=[];
 for(let tick=0;tick<8;tick++){w.time=tick/60;for(let i=0;i<150;i++)w.visual('hit',u);}
 assert.equal(w.visualEvents.length,1200);assert.equal(new Set(w.visualEvents.map(e=>e.serial)).size,1200);
 w.time=1;for(let i=0;i<10;i++)w.visual('hit',u);assert.ok(w.visualEvents.length<=768);assert.ok(w.visualEvents.filter(e=>e.time===1).length===10);
 for(let tick=60;tick<660;tick++){w.time=tick/60;for(let i=0;i<20;i++)w.visual('hit',u);assert.ok(w.visualEvents.length<=800);}
});

test('acid expiry, reset and terrain replacement release both instance objects and one shared patch geometry',()=>{
 const scene=new THREE.Scene(),atlas=new THREE.Texture(),base=new THREE.ShaderMaterial({uniforms:{map:{value:atlas},grid:{value:new THREE.Vector2(1,1)}}});
 const fx:any={batches:new Map(['fx.bile.4','fx.acid.0'].map(k=>[k,{mesh:{material:base}}]))},acid=new AcidGroundEffects(scene,fx);
 const w:any={terrain:{height:()=>0},time:0,enemySpecials:{acidZones:[]}};acid.prepare();let instances=0,geometry=0,shared=0;
 atlas.addEventListener('dispose',()=>shared++);base.addEventListener('dispose',()=>shared++);
 for(const reason of ['expiry','reset','terrain']){
  w.enemySpecials.acidZones=[{source:1,point:{x:0,z:0},radius:2,nextTick:1,ticks:3}];acid.render(w,()=>true);
  const root=scene.getObjectByName('native-acid-ground')!,meshes=root.children as THREE.InstancedMesh[];assert.equal(meshes.length,2);
  meshes[0].geometry.addEventListener('dispose',()=>geometry++);for(const m of meshes){m.addEventListener('dispose',()=>instances++);m.material.addEventListener('dispose',()=>shared++);}
  w.enemySpecials.acidZones=[];if(reason==='reset')acid.reset();else {if(reason==='terrain')w.terrain={height:()=>0};acid.render(w,()=>true);}
  assert.equal(root.parent,null);assert.equal(acid.report().zones.length,0);
 }
 assert.equal(instances,6);assert.equal(geometry,3);assert.equal(shared,0);assert.equal(scene.children.filter(x=>x.name==='acid-ground-prewarm').length,2);
});
test('building clone disposal releases each owned skeleton once and preserves model resources for another clone',()=>{
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial(),root=new THREE.Group(),bone=new THREE.Bone(),skeleton=new THREE.Skeleton([bone]);
 const mesh=new THREE.SkinnedMesh(geometry,material);root.add(mesh,bone);mesh.bind(skeleton);const mesh2=new THREE.SkinnedMesh(geometry,material);root.add(mesh2);mesh2.bind(skeleton);
 let shared=0;geometry.addEventListener('dispose',()=>shared++);material.addEventListener('dispose',()=>shared++);skeleton.computeBoneTexture();skeleton.boneTexture!.addEventListener('dispose',()=>shared++);
 const child=clone(root),owned=new Set<THREE.Skeleton>();child.traverse(n=>{if(n instanceof THREE.SkinnedMesh)owned.add(n.skeleton);});let released=0;
 for(const s of owned){assert.notEqual(s,skeleton);s.computeBoneTexture();s.boneTexture!.addEventListener('dispose',()=>released++);}
 const scene=new THREE.Scene();scene.add(child);const mixer=new THREE.AnimationMixer(child);mixer.clipAction(new THREE.AnimationClip('Stand',1,[])).play();releaseBuildingView(child,mixer);
 assert.equal(released,owned.size);assert.equal(shared,0);assert.equal(child.parent,null);assert.equal(mixer.stats.actions.total,0);assert.ok(clone(root));
});
