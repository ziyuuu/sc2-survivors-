import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/simulation/world';
import {BattleEffects} from '../src/render/effects/battle-effects';
import {heroSkillPresentation} from '../src/data/combat-presentation';
import {castLaunchEvent} from '../src/render/effects/hero-feedback';
import {castExpeditionHero,resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';

function batch(){const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial(),256);mesh.setColorAt(0,new THREE.Color(0xffffff));return {mesh,data:new THREE.InstancedBufferAttribute(new Float32Array(512),2),count:0,cells:1,start:0,end:0};}
const make=()=>{const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();return w;};

test('F06 visual review: live projectile and hit core take batch slots before decoration without changing World',()=>{
 const w=make(),fx=new BattleEffects(new THREE.Scene()),profile=heroSkillPresentation('yamato_battlecruiser'),b=batch();fx.batches.set(profile.asset,b);
 const p={asset:profile.asset,x:0,y:0,z:0,vx:0,vy:0,vz:0,start:0,life:2,size:1,growth:0,color:0x0000ff,ground:false,angle:0};
 for(let i=0;i<256;i++)fx.emit(p);fx.emit({...p,color:0xff0000,priority:'core'});
 w.heroCasts=[{id:100,hero:'yamato_battlecruiser',source:999,target:998,origin:{x:0,z:0},point:{x:0,z:5},at:.25,damage:700,phase:'impact',launched:true}];
 const before=w.captureRun();fx.render(w,new THREE.PerspectiveCamera(),()=>true);
 assert.ok([...fx.sculptures.batches.values()].some(batch=>batch.mesh.count>0));assert.equal(b.count,256);assert.equal(fx.stats.culledByClass.decoration,1);assert.equal(fx.stats.culledByClass.core,0);
 const color=new THREE.Color();b.mesh.getColorAt(0,color);assert.equal(color.getHex(),0xff0000);assert.deepEqual(w.captureRun(),before);
});

test('F06 visual review: repeated renders consume real events once and restore does not replay settled cores',()=>{
 const w=make();assert.ok(w.acquireHero('nova'));const hero=w.heroEntity('nova')!,target=w.addUnit('roach','zerg',3,0);target.hp=10000;w.fire(hero,target);
 const fx=new BattleEffects(new THREE.Scene());fx.batches.set('fx.muzzle.1',batch());fx.batches.set('fx.impact.0',batch());
 const camera=new THREE.PerspectiveCamera();fx.render(w,camera,()=>true);const count=fx.particles.length;assert.ok(count>0);fx.render(w,camera,()=>true);assert.equal(fx.particles.length,count);assert.equal(fx.stats.attack,1);
 const snapshot=w.captureRun();w.restoreRun(snapshot);fx.reset();fx.render(w,camera,()=>true);assert.equal(fx.particles.length,0);assert.equal(fx.stats.attack,0);
});

test('F06 moving cast preserves one actual launch origin and attachment pose through flight, death and save',()=>{
 const w=make();assert.ok(w.acquireHero('yamato_battlecruiser'));const source=w.heroEntity('yamato_battlecruiser')!;source.x=source.z=0;
 const target=w.addUnit('roach','zerg',0,5);target.hp=target.maxHp=10000;w.hash.rebuild(w.entities.values());assert.ok(castExpeditionHero(w,'yamato_battlecruiser'));
 const cast=w.heroCasts[0],gameplay={origin:{...cast.origin},point:{...cast.point},at:cast.at,damage:cast.damage};source.x=3;w.time=1;resolveExpeditionHeroCasts(w);
 const actual=w.visualEvents.find(e=>e.kind==='skill-launch')!,first=castLaunchEvent(cast,source,w.time);
 assert.equal(actual.x,3);assert.equal(first.x,actual.x);assert.equal(first.z,actual.z);assert.equal(first.facing,actual.facing);assert.equal(first.weaponPoseSeconds,1);assert.equal(actual.weaponPoseSeconds,first.weaponPoseSeconds);
 source.x=7;source.facing=2;w.time=1.1;const later=castLaunchEvent(cast,source,w.time);assert.equal(later.x,first.x);assert.equal(later.facing,first.facing);assert.equal(later.weaponPoseSeconds,first.weaponPoseSeconds);
 const snapshot=w.captureRun(),copy=make();copy.restoreRun(snapshot);copy.entities.delete(source.id);const restored=castLaunchEvent(copy.heroCasts[0],undefined,copy.time);
 assert.equal(restored.x,first.x);assert.equal(restored.z,first.z);assert.equal(restored.facing,first.facing);assert.equal(restored.weaponPoseSeconds,first.weaponPoseSeconds);assert.equal(restored.modelKey,actual.modelKey);assert.equal(restored.flying,actual.flying);
 assert.deepEqual({origin:cast.origin,point:cast.point,at:cast.at,damage:cast.damage},gameplay);assert.equal(copy.visualEvents.length,0);assert.equal(target.hp,10000);
 const bad=copy.captureRun();bad.state.heroCasts[0].presentationLaunch!.poseSeconds=NaN;assert.throws(()=>copy.restoreRun(bad),/英雄弹体/);
});
