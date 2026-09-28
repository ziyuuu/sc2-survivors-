import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/simulation/world';
import {ALL_HERO_IDS,HEROES} from '../src/data/heroes';
import {modelPresentationScale,modelPresentationAccent,heroPresentation} from '../src/data/combat-presentation';
import {castExpeditionHero,resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';
import {BattleEffects} from '../src/render/effects/battle-effects';
import {heroFeedbackEvent,weaponWorldPoint} from '../src/render/effects/hero-feedback';
import {initializeCarrierSubsystem,ownedInterceptors} from '../src/simulation/combat/carriers';
import {AIR_HEIGHT} from '../src/data/terrain';

test('F06 fixed air sizes include active poses without changing collision or purifier scale',()=>{
 const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();
 for(const [id,bounds] of [['yamato_battlecruiser',8.907945800302585],['hots_leviathan',10.172856331934405]] as const){
  const u=w.addUnit(HEROES[id].baseFamily,'terran',0,0);u.heroId=id;u.modelKey=HEROES[id].model;const radius=u.unitRadius;
  assert.ok(bounds*modelPresentationScale(u)/1.15<=5.5);assert.equal(u.unitRadius,radius);assert.equal(modelPresentationAccent(u),14);u.team='enemy';assert.equal(modelPresentationAccent(u),0);
 }
 const purifier=w.addUnit('purifier_flagship','terran',0,0);purifier.heroId='purifier_flagship';assert.equal(modelPresentationScale(purifier),1.15);
});

test('F06 all hero profiles supply distinct real-event cores, including support successful restoration',()=>{
 assert.equal(ALL_HERO_IDS.length,18);for(const id of ALL_HERO_IDS){const p=heroPresentation(id);assert.ok(p.asset&&p.impact&&p.size>0&&p.impactSize>0);}
 for(const id of ['swann','niadra','artanis'] as const){
  const w=new World({race:HEROES[id].race,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();assert.ok(w.acquireHero(id));const hero=w.heroEntity(id)!;hero.x=hero.z=0;
  const ally=w.addUnit(id==='swann'?'tank':id==='artanis'?'zealot':'roach','terran',1,0);ally.hp-=20;if(id==='artanis')ally.shield=(ally.maxShield??0)-20;w.hash.rebuild(w.entities.values());
  assert.ok(castExpeditionHero(w,id));if(id==='swann'){w.time=1;resolveExpeditionHeroCasts(w);}
  const impacts=w.visualEvents.filter(e=>e.kind==='skill-impact'&&e.heroId===id);assert.ok(impacts.some(e=>e.end.x===ally.x&&e.end.z===ally.z),id+' actual beneficiary');
  const saved=w.captureRun(),copy=new World({race:HEROES[id].race,sandbox:true,waves:false,terrain:false,obstacles:[]});copy.restoreRun(saved);assert.equal(copy.visualEvents.length,0);w.time=2;resolveExpeditionHeroCasts(w);assert.equal(w.visualEvents.filter(e=>e.kind==='skill-impact'&&e.heroId===id).length,impacts.length,'full targets do not flash restoration');
 }
});

test('F06 core particles evict decoration at capacity with per-class accounting',()=>{
 const fx=new BattleEffects(new THREE.Scene());fx.batches.set('fixture',{} as never);
 const p={asset:'fixture',x:0,y:0,z:0,vx:0,vy:0,vz:0,start:0,life:1,size:1,growth:0,color:0xffffff,ground:false,angle:0};
 for(let i=0;i<1280;i++)fx.emit(p);fx.emit({...p,priority:'core'});
 assert.equal(fx.particles.length,1280);assert.ok(fx.particles.some(p=>p.priority==='core'));assert.equal(fx.stats.droppedByClass.decoration,1);assert.equal(fx.stats.droppedByClass.core,0);
 fx.reset();assert.equal(fx.particles.length,0);assert.equal(fx.stats.droppedByClass.decoration,0);
});

test('F06 aircraft mounts preserve height, rotation and fixed scale; only flagship child gets its profile',()=>{
 const w=new World({race:'protoss',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();assert.ok(w.acquireHero('purifier_flagship'));const mother=w.heroEntity('purifier_flagship')!;initializeCarrierSubsystem(w);const child=ownedInterceptors(w,mother.id)[0];w.visual('attack',child,{x:3,z:4});const event=w.visualEvents.at(-1)!;
 assert.equal(event.heroId,undefined);assert.equal(heroFeedbackEvent(event,w.entities).heroId,'purifier_flagship');assert.equal(child.heroId,undefined);assert.equal(heroFeedbackEvent(event,w.entities).entityId,child.id);
 const p=weaponWorldPoint({...event,x:1,z:2,facing:Math.PI/2},{x:2,y:3,z:4},.5,8);assert.equal(p.y,AIR_HEIGHT+1.5);assert.equal(p.x,3);assert.ok(Math.abs(p.z-1)<1e-12);
 const ordinary=w.addUnit('carrier','terran',0,0);initializeCarrierSubsystem(w);const normal=ownedInterceptors(w,ordinary.id)[0];w.visual('attack',normal,{x:3,z:4});assert.equal(heroFeedbackEvent(w.visualEvents.at(-1)!,w.entities).heroId,undefined);
});

test('F06 instant attacks have same-tick stationary cores, no synthetic delayed flight',()=>{
 const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();assert.ok(w.acquireHero('nova'));const hero=w.heroEntity('nova')!,enemy=w.addUnit('roach','zerg',3,0);w.fire(hero,enemy);const event=w.visualEvents.find(e=>e.kind==='attack'&&e.heroId==='nova')!;
 const fx=new BattleEffects(new THREE.Scene()),profile=heroPresentation('nova');fx.batches.set(profile.asset,{} as never);fx.batches.set(profile.impact,{} as never);fx.event(event,{x:hero.x,y:1,z:hero.z});const core=fx.particles.find(p=>p.x===enemy.x&&p.z===enemy.z)!;
 assert.ok(enemy.hp<enemy.maxHp);assert.equal(core.start,w.time);assert.deepEqual([core.vx,core.vy,core.vz],[0,0,0]);assert.equal(fx.projectiles.active.length,0);assert.equal(w.heroCasts.length,0);
});
