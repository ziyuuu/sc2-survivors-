import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/simulation/world';
import {tickShopSupport} from '../src/simulation/combat/shop-support';
import {SourceCombatEffects} from '../src/render/effects/source-combat-effects';
import {SourceEffectPlayer,SOURCE_EFFECTS} from '../src/render/effects/source/player';
import {sourceLife,sourcePhase} from '../src/render/effects/source/timeline';
import type {SourceEffectRequest} from '../src/render/effects/source/types';
function fixture(type:'colossus'|'void_ray'='colossus',elite?:string){
 const w=new World({race:'protoss',seed:71,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();w.effects=[];w.visualEvents=[];
 for(const p of Object.values(w.expedition.production))p.enabled={};
 const u=w.addUnit(type,'terran',0,0),target=w.addUnit('roach','zerg',0,5);if(elite){u.eliteId=elite as any;w.refreshStats(u,true);}target.hp=target.maxHp=1e8;u.attackTarget=target.id;w.time=5;w.tick=300;
 const requests:SourceEffectRequest[]=[],fx={sourceEventIds:new Set<number>()},effects=new SourceCombatEffects(new THREE.Scene(),new THREE.PerspectiveCamera(),fx as any);
 Object.assign(effects.player,{ready:true,begin:()=>requests.splice(0),add:(r:SourceEffectRequest)=>requests.push(r),end:()=>{},reset:()=>{}});
 const render=()=>{const before=w.captureRun();effects.render(w,(e,side)=>({x:side==='02'?-1:side==='03'?1:0,y:4,z:0}),()=>undefined);assert.deepEqual(w.captureRun(),before,'Presentation cannot mutate combat');return structuredClone(requests);};
 return {w,u,target,requests,fx,effects,render};
}
for(const elite of [undefined,'colossus.1','colossus.2','colossus.3'])test('Colossus '+(elite??'ordinary')+' finishes opposing sweeps after native damage areas expire',()=>{
 const {w,u,target,render,effects}=fixture('colossus',elite);w.fire(u,target);const initial=render().filter(r=>r.model==='ColossusAttackBeam');assert.equal(initial.length,2);assert.deepEqual(initial.map(r=>r.placement.x),[-1,1]);
 const native=w.expedition.weaponAreas.length?w.expedition.weaponAreas.map(a=>a.points):w.protossElites.lines.map(a=>a.points);assert.equal(native.length,2);assert.equal(initial[0].placement.end!.x,native[0][0].x);
 // Model the authoritative collection's real completion without retaining it.
 w.expedition.weaponAreas=[];w.protossElites.lines=[];w.time=5.3;
 const mid=render().filter(r=>r.model==='ColossusAttackBeam');assert.equal(mid.length,2);assert.ok(mid.every(r=>sourcePhase(SOURCE_EFFECTS[r.model],r.age,true,r.seed).clip.name==='Stand'));
 assert.ok(mid[0].placement.end!.x>initial[0].placement.end!.x);assert.ok(mid[1].placement.end!.x<initial[1].placement.end!.x);
 const paused=render();assert.deepEqual(render(),paused);
 w.time=7;assert.equal(render().filter(r=>r.model==='ColossusAttackBeam').length,0);
 effects.reset();assert.equal(render().filter(r=>r.model==='ColossusAttackBeam').length,0,'Expired history cannot revive a sweep');
});
test('Void Ray retains one explicit normal channel across damage ticks and separates a new target episode',()=>{
 const {w,u,target,render}=fixture('void_ray');let key='',age=-1;
 for(let i=0;i<7;i++){w.time=5+i*u.shotInterval;w.fire(u,target);const r=render().filter(r=>r.model==='VoidRayAttackBeam');assert.equal(r.length,1);assert.equal(r[0].clip,'Attack 02');assert.ok(r[0].age>age);age=r[0].age;if(key)assert.equal(r[0].key,key);key=r[0].key;}
 const other=w.addUnit('roach','zerg',2,5);u.attackTarget=other.id;w.time+=u.shotInterval;w.fire(u,other);assert.notEqual(render().find(r=>r.model==='VoidRayAttackBeam')!.key,key);
 other.hp=0;assert.equal(render().filter(r=>r.model.startsWith('VoidRay')).length,0);
});
test('Void Ray powered variant follows its real full-charge state, resets with target and ends on caster death',()=>{
 const {w,u,target,render}=fixture('void_ray','void_ray.1');w.fire(u,target);assert.equal(render().find(r=>r.model==='VoidRayAttackBeam')?.clip,'Attack 02');
 for(let i=1;i<=20;i++){w.time=5+i*.3;w.fire(u,target);render();}
 assert.equal(render().find(r=>r.model==='VoidRayAttackBeam')?.clip,'Attack 06');
 const other=w.addUnit('roach','zerg',2,5);other.hp=other.maxHp=1e8;u.attackTarget=other.id;w.time+=.3;w.fire(u,other);assert.equal(render().find(r=>r.model==='VoidRayAttackBeam')?.clip,'Attack 02');
 u.hp=0;assert.equal(render().filter(r=>r.model.startsWith('VoidRay')).length,0);
});
test('Void Ray original stop timer removes both actors after .125 seconds without a Death restart',()=>{
 const player=new SourceEffectPlayer(new THREE.Scene(),new THREE.PerspectiveCamera()),p=player as any,draws:SourceEffectRequest[]=[];
 p.resources.set('VoidRayAttackBeam',{definition:SOURCE_EFFECTS.VoidRayAttackBeam});p.play=(r:SourceEffectRequest)=>{p.requests.add(r.key);draws.push(r);};
 player.begin(1);player.add({key:'beam',model:'VoidRayAttackBeam',age:1,seed:1,loop:true,clip:'Attack 02',stopAfter:.125,placement:{x:0,y:0,z:0,facing:0}},()=>0);player.end();
 draws.length=0;player.begin(1.1);player.end();assert.equal(draws.length,1);assert.equal(draws[0].clip,'Attack 02');
 draws.length=0;player.begin(1.23);player.end();assert.equal(draws.length,0);assert.equal(player.report().endingChannels,0);
});
test('strategic point drops target identity; unchanged three-second impact damages in-range bodies once',()=>{
 const {w,target,render,fx}=fixture();w.expedition.race='terran';w.expedition.support.ammo=1;target.armor=0;
 const outside=w.addUnit('roach','zerg',0,15);outside.hp=outside.maxHp=1e8;
 assert.ok(w.commitStrategicStrike(target));assert.deepEqual(w.expedition.support.impacts[0].point,{x:target.x,z:target.z});
 const damage=w.expedition.support.impacts[0].damage!;w.time=7.99;tickShopSupport(w);assert.equal(target.hp,target.maxHp);
 w.time=8;tickShopSupport(w);assert.equal(target.maxHp-target.hp,damage);assert.equal(outside.hp,outside.maxHp);tickShopSupport(w);assert.equal(target.maxHp-target.hp,damage);
 const receipt=w.visualEvents.find(e=>e.kind==='strategic-impact')!;assert.equal(receipt.race,'terran');assert.equal(receipt.unitType,null);
 const initial=render().filter(r=>r.model==='GhostNukeExplode');assert.equal(initial.length,1);assert.equal(initial[0].clip,'Death');assert.ok(fx.sourceEventIds.has(receipt.serial));
 w.time=12;assert.equal(render().filter(r=>r.model==='GhostNukeExplode').length,1,'Smoke remains after the old generic 1.15 second lifetime');
 w.time=8+sourceLife(SOURCE_EFFECTS.GhostNukeExplode)/1.4+1;assert.equal(render().filter(r=>r.model==='GhostNukeExplode').length,0);
});
