import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/simulation/world';
import {SourceCombatEffects} from '../src/render/effects/source-combat-effects';
import {SOURCE_EFFECTS} from '../src/render/effects/source/player';
import {sourceLife} from '../src/render/effects/source/timeline';
import type {SourceEffectRequest} from '../src/render/effects/source/types';
import type {SpecialType} from '../src/data/enemies';
import {enemyMissileHeight} from '../src/render/effects/enemy-special-source';

function fixture(type:SpecialType,air=false){
 const w=new World({race:'zerg',seed:77,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();w.effects=[];w.visualEvents=[];
 for(const p of Object.values(w.expedition.production))p.enabled={};
 const actor=w.spawnSpecial(type,'boss',{x:0,z:0})!,target=w.addUnit(air?'viking':'marine','terran',0,5);
 target.hp=target.maxHp=10000;actor.specialReady=0;actor.windup=0;w.time=2;w.hash.rebuild(w.entities.values());w.enemySpecials.act(actor,1/60);
 assert.equal(w.enemySpecials.casts.length,1);
 const requests:SourceEffectRequest[]=[],fx={sourceEventIds:new Set<number>()},effects=new SourceCombatEffects(new THREE.Scene(),new THREE.PerspectiveCamera(),fx as any);
 Object.assign(effects.player,{ready:true,begin:()=>requests.splice(0),add:(r:SourceEffectRequest)=>requests.push(r),end:()=>{},reset:()=>{}});
 const render=()=>{const before=w.captureRun();effects.render(w,e=>({x:e.x,y:e.y,z:e.z}),()=>undefined);assert.deepEqual(w.captureRun(),before);return requests;};
 return {w,actor,target,render,effects,fx,cast:w.enemySpecials.casts[0]};
}

test('enemy bile retains every locked flight and original impact after its caster is reclaimed',()=>{
 const {w,actor,cast,render,fx}=fixture('ravager');
 w.time=cast.at-.5;w.entities.delete(actor.id);
 assert.equal(render().filter(r=>r.model==='RavagerCorrosiveBileMissile').length,cast.points.length);
 const saved=w.captureRun();w.restoreRun(saved);
 assert.equal(render().filter(r=>r.model==='RavagerCorrosiveBileMissile').length,cast.points.length,'Pending flight survives checkpoint restore');
 w.time=cast.at;w.enemySpecials.update(0);
 const receipt=w.visualEvents.find(e=>e.kind==='enemy-special-impact');assert.ok(receipt);
 assert.equal(render().filter(r=>r.model==='RavagerCorrosiveBileImpact').length,cast.points.length);assert.ok(fx.sourceEventIds.has(receipt.serial));
 w.time=cast.at+sourceLife(SOURCE_EFFECTS.RavagerCorrosiveBileImpact)/1.4-.01;
 assert.equal(render().filter(r=>r.model==='RavagerCorrosiveBileImpact').length,cast.points.length);
 w.time+=.02;assert.equal(render().filter(r=>r.model==='RavagerCorrosiveBileImpact').length,0);
});

for(const type of ['lurker','roach'] as const)test(`enemy ${type} cancelled or dead casts never create an impact`,()=>{
 for(const reason of ['cancel','death'] as const){const {w,actor,cast,render}=fixture(type);
  w.time=cast.at;if(reason==='cancel')w.enemySpecials.cancelUncommittedSource(actor.id);else actor.hp=0;
  w.enemySpecials.update(0);render();assert.equal(w.visualEvents.filter(e=>e.kind==='enemy-special-impact').length,0);
 }
});

test('enemy spikes use all three native rays, complete their authored tails, and do not change damage',()=>{
 const {w,target,cast,render}=fixture('lurker');w.time=cast.at;const hp=target.hp;w.enemySpecials.update(0);
 assert.ok(Math.abs(hp-target.hp-Math.max(.5,cast.damage-target.armor))<1e-8);
 const spikes=render().filter(r=>r.model==='LurkerMPAttackSpike');assert.ok(spikes.length>3);
 assert.equal(new Set(spikes.map(r=>r.placement.facing)).size,3);
 w.time=cast.at+sourceLife(SOURCE_EFFECTS.LurkerAttackSpikeEx2)/1.4-.01;
 assert.ok(render().some(r=>r.model==='LurkerAttackSpikeEx2'));
 w.time+=.02;assert.equal(render().filter(r=>r.key.startsWith('enemy-special:')).length,0);
});

test('enemy impact tails survive a paused detail round trip but never replay after an advancing reset',()=>{
 for(const type of ['ravager','lurker','roach'] as const){
  const {w,cast,render,effects}=fixture(type);w.time=cast.at;w.enemySpecials.update(0);w.time+=.2;
  const before=structuredClone(render().filter(r=>r.key.startsWith('enemy-special:impact:')));assert.ok(before.length);
  w.paused=true;effects.resumeAt(w);
  assert.deepEqual(render().filter(r=>r.key.startsWith('enemy-special:impact:')),before,'No simulation time elapsed while detail was disabled');
  effects.reset();w.time+=.1;effects.resumeAt(w);
  assert.equal(render().filter(r=>r.key.startsWith('enemy-special:impact:')).length,0,'Resuming after time advanced must not replay the old impact receipt');
 }
});

test('enemy roach spray winds up at the native deadline, then impacts only actual cone targets',()=>{
 const {w,target,cast,render}=fixture('roach');
 w.time=cast.at-.1;assert.equal(render().filter(r=>r.model==='AcidSalivaWeapon').length,5);
 const hp=target.hp;w.time=cast.at;w.enemySpecials.update(0);assert.ok(Math.abs(hp-target.hp-Math.max(.5,cast.damage-target.armor))<1e-8);
 const hits=render().filter(r=>r.model==='RoachMissileImpact');assert.equal(hits.length,1);assert.equal(hits[0].placement.x,target.x);assert.equal(hits[0].placement.z,target.z);
 w.time=cast.at+sourceLife(SOURCE_EFFECTS.RoachMissileImpact)/1.4+.01;assert.equal(render().filter(r=>r.model==='RoachMissileImpact').length,0);
});

test('stopped native casts freeze the visual trajectory and never impact before the extended deadline',()=>{
 const {w,actor,cast,render}=fixture('ravager');w.time=2.3;
 const before=structuredClone(render().filter(r=>r.model==='RavagerCorrosiveBileMissile').map(r=>r.placement));
 actor.stoppedUntil=10;w.time+=.5;w.enemySpecials.update(.5);
 const after=render().filter(r=>r.model==='RavagerCorrosiveBileMissile').map(r=>r.placement);
 for(let i=0;i<before.length;i++)for(const k of ['x','y','z'] as const)assert.ok(Math.abs(before[i][k]-after[i][k])<1e-8);
 assert.equal(w.visualEvents.filter(e=>e.kind==='enemy-special-impact').length,0);
 actor.stoppedUntil=0;w.time=cast.at;w.enemySpecials.update(0);assert.equal(w.visualEvents.filter(e=>e.kind==='enemy-special-impact').length,1);
});

for(const air of [false,true])test(`enemy fan saved flight reaches its ${air?'air':'ground'} targeting height after caster removal`,()=>{
 const {w,actor,target,cast}=fixture('mutalisk',air);assert.equal(target.flying,air);
 w.time=cast.at;w.enemySpecials.update(0);const missiles=w.enemySpecials.missiles;assert.equal(missiles.length,3);
 for(const m of missiles)assert.ok(Math.abs(enemyMissileHeight(m,()=>0)-6.3)<1e-8);
 w.entities.delete(actor.id);w.restoreRun(w.captureRun());
 w.enemySpecials.update(5/16);
 for(const m of w.enemySpecials.missiles)assert.ok(Math.abs(enemyMissileHeight(m,()=>0)-(air?6.3:.7))<1e-8);
 assert.ok(w.enemySpecials.missiles.every(m=>m.remaining===cast.range-5),'Presentation does not change native speed or range');
});

test('enemy queen native heal owns a complete original transfusion effect without changing the heal',()=>{
 const w=new World({race:'zerg',seed:77,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();w.effects=[];w.visualEvents=[];
 for(const p of Object.values(w.expedition.production))p.enabled={};
 const queen=w.spawnSpecial('queen','boss',{x:0,z:0})!,patient=w.addUnit('roach','zerg',0,3);
 patient.hp=patient.maxHp*.15;queen.specialReady=0;queen.windup=0;w.time=2;
 const hp=patient.hp;
 w.enemySpecials.act(queen,1/60);
 assert.equal(patient.hp,Math.min(patient.maxHp,hp+Math.min(1200,patient.maxHp*.08)));
 assert.equal(queen.specialReady,10);
 const receipt=w.visualEvents.find(e=>e.kind==='skill-heal'&&e.entityId===queen.id);
 assert.equal(receipt?.targetId,patient.id,'Native heal must emit its presentation receipt');
 const requests:SourceEffectRequest[]=[],fx={sourceEventIds:new Set<number>()},effects=new SourceCombatEffects(new THREE.Scene(),new THREE.PerspectiveCamera(),fx as any);
 Object.assign(effects.player,{ready:true,begin:()=>requests.splice(0),add:(r:SourceEffectRequest)=>requests.push(r),end:()=>{},reset:()=>{}});
 const render=()=>{const before=w.captureRun();effects.render(w,e=>({x:e.x,y:e.y,z:e.z}),()=>undefined);assert.deepEqual(w.captureRun(),before);return requests.filter(r=>r.model==='SquibTransfusion');};
 assert.equal(render().length,1);assert.ok(fx.sourceEventIds.has(receipt!.serial));
 w.time=2+sourceLife(SOURCE_EFFECTS.SquibTransfusion)/1.4-.01;
 assert.equal(render().length,1,'Retain the authored heal tail, independently of the queen weapon profile');
 w.time+=.02;assert.equal(render().length,0,'The one-shot effect must expire');
});
