import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {World} from '../src/simulation/world';
import {SOURCE_UNIT_MODES} from '../src/data/expansion-units';
import {combatFxProfile,COMBAT_FX_PROFILES} from '../src/render/effects/combat-fx-profile';
import {combatMuzzleSides,SourceCombatEffects} from '../src/render/effects/source-combat-effects';
import {SOURCE_EFFECTS,SourceEffectPlayer} from '../src/render/effects/source/player';
import {sourceParticleQuads} from '../src/render/effects/source/particles';
import {sourceRibbonQuads,sourceProjectionQuads} from '../src/render/effects/source/ribbons';
import {emissionSchedule,sourceFieldScale,sourcePhase,sourceSeed,sourceLife} from '../src/render/effects/source/timeline';
import type {SourceEmitter,SourceEffectRequest} from '../src/render/effects/source/types';

test('every declared core layer resolves to a pinned original definition and immutable resource',()=>{
 for(const p of COMBAT_FX_PROFILES.values())for(const ids of Object.values(p.models))for(const id of ids)assert.ok(SOURCE_EFFECTS[id],p.key+':'+id);
 const registry=JSON.parse(fs.readFileSync('deploy/runtime/combat-effects.json','utf8'));
 assert.equal(registry.catalogSha256,createHash('sha256').update(fs.readFileSync('src/render/effects/source/catalog.json')).digest('hex'));
 for(const r of registry.records)assert.equal(createHash('sha256').update(fs.readFileSync(r.gitPath)).digest('hex'),r.packedSha256,r.id);
 for(const def of Object.values(SOURCE_EFFECTS))assert.equal(createHash('sha256').update(fs.readFileSync(def.source)).digest('hex'),def.sourceSha256,def.id);
});

test('form, native weapon and child identity determine ownership without replacing approved heroes',()=>{
 for(const [identity,expected] of [
  [{unitType:'hellion',nativeMode:'hellbat'},'hellbat'],[{unitType:'tank',mode:'siege'},'tank-siege'],[{unitType:'tank',mode:'tank',eliteId:'tank.1',team:'player'},'tank-siege'],
  [{unitType:'viking',nativeMode:'viking_assault'},'viking-assault'],[{unitType:'thor',activeWeapon:'JavelinMissileLaunchers'},'thor-air'],
  [{unitType:'thor',activeWeapon:SOURCE_UNIT_MODES.thor_high_impact.weapon.weaponId},'thor-high-impact'],[{unitType:'queen',activeWeapon:'Talons'},'queen-melee'],
  [{unitType:'queen',activeWeapon:'AcidSpines'},'queen-air'],[{unitType:'carrier',summonKind:'interceptor'},'interceptor'],
 ] as const)assert.equal(combatFxProfile(identity as any)?.key,expected);
 assert.equal(combatFxProfile({unitType:'carrier',heroId:'purifier_flagship'}),undefined);
 assert.equal(combatFxProfile({unitType:'carrier',summonKind:'interceptor',rewardSourceKind:'hero'}),undefined);
 assert.deepEqual(combatMuzzleSides(COMBAT_FX_PROFILES.get('marauder')!,1),['Left']);
 assert.deepEqual(combatMuzzleSides(COMBAT_FX_PROFILES.get('marauder')!,2),['Right']);
 assert.deepEqual(combatMuzzleSides(COMBAT_FX_PROFILES.get('thor-high-impact')!,2),['02','04']);
});

test('source emission integrates changing rates and preserves actual burst keys',()=>{
 const emitter={bone:0,material_reference_index:0,emit_rate:{id:1,default:0,interpolation:1},emit_count:{id:2,default:0,interpolation:0}} as SourceEmitter;
 const schedule=emissionSchedule(emitter,{name:'Stand',duration:1,tracks:[{id:1,frames:[0,1],values:[0,8]},{id:2,frames:[0,.25,.3],values:[0,3,0]}]});
 assert.equal(schedule.length,7);
 assert.equal(schedule.filter(e=>e.time===.25).length,3);
 const rates=schedule.filter(e=>e.time!==.25).map(e=>e.time);
 rates.forEach((t,i)=>assert.ok(Math.abs(t-Math.sqrt((i+1)/4))<1e-9));
});

test('source particles, splines and splats replay deterministically with finite geometry',()=>{
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,20,25);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 const summarize=(q:any[])=>q.map(p=>({matrix:p.matrix.elements,color:p.color,uv:p.uv}));
 let particles=0,ribbons=0,projections=0;
 for(const def of Object.values(SOURCE_EFFECTS))for(const age of [.25,.7]){
  const request:SourceEffectRequest={key:def.id,model:def.id,age,seed:sourceSeed(def.id),hostedBeam:true,placement:{x:0,y:1,z:0,facing:0,end:{x:0,y:2,z:7},from:{x:0,y:1,z:-2},age}};
  const a=sourceParticleQuads(def,request,camera,()=>0),b=sourceRibbonQuads(def,request,camera),c=sourceProjectionQuads(def,request,()=>0);
  particles+=a.length;ribbons+=b.length;projections+=c.length;
  for(const quad of [...a,...b,...c])assert.ok([...quad.matrix.elements,...quad.color,...quad.uv].every(Number.isFinite),def.id);
  assert.deepEqual(summarize(sourceParticleQuads(def,structuredClone(request),camera,()=>0)),summarize(a),def.id);
 }
 assert.ok(particles>0&&ribbons>0&&projections>0);
});

test('hosted beam actors activate native splines and preserve continuous ribbon UVs',()=>{
 const camera=new THREE.PerspectiveCamera();camera.position.set(2,15,20);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 for(const model of ['MedivacHealBeam','ColossusAttackBeam','SentryAttackBeam','VoidRayCenterBeam']){
  const def=SOURCE_EFFECTS[model],request:SourceEffectRequest={key:model,model,age:.7,seed:1,loop:true,hostedBeam:true,placement:{x:0,y:1,z:0,facing:0,end:{x:0,y:1,z:7}}};
  const q=sourceRibbonQuads(def,request,camera);assert.ok(q.length>0,model);assert.ok(q.every(p=>p.segmentedUv&&p.uv[3]<1),model);
 }
});

test('field reference footprints match native radii without selecting a collapsed Death pose',()=>{
 for(const id of ['GuardianShield','HighTemplarPsiStormModel']){
  const def=SOURCE_EFFECTS[id];assert.match(def.referenceBounds!.clip,/^Stand/);assert.ok(def.referenceBounds!.radius>4);
  const scale=sourceFieldScale(def,4.5);assert.ok(Math.abs(scale*def.referenceBounds!.radius*Math.max(def.scale[0],def.scale[1])*1.4-4.5)<1e-9);
 }
});

test('rotated source ground projections keep adjacent UV tiles on the same world edge',()=>{
 const def=SOURCE_EFFECTS.SiegeTankSiegedAttackImpact;
 for(const facing of [.35,1.2,2.7])for(const end of [undefined,{x:8,y:3,z:9}]){
  const request:SourceEffectRequest={key:'projection-seam',model:def.id,age:1.5,seed:17,placement:{x:2,y:1,z:3,facing,end}};
  const quads=sourceProjectionQuads(def,request,()=>0),corners=new Map<string,THREE.Vector3>();assert.equal(quads.length,16);
  for(const quad of quads)for(const [x,y]of [[-.5,-.5],[-.5,.5],[.5,-.5],[.5,.5]]){
   const uv=[quad.uv[0]+(x+.5)*quad.uv[2],quad.uv[1]+(y+.5)*quad.uv[3]],key=uv.join(','),at=new THREE.Vector3(x,y,0).applyMatrix4(quad.matrix),prior=corners.get(key);
   if(prior)assert.ok(at.distanceTo(prior)<1e-8,'Projection seam at '+key+' / facing '+facing);else corners.set(key,at);
  }
  assert.equal(corners.size,25);
 }
});

test('continuous native beams survive save restoration and end when either body dies',()=>{
 const w=new World({race:'protoss',seed:77,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();w.effects=[];
 for(const p of Object.values(w.expedition.production))p.enabled={};
 const u=w.addUnit('sentry','terran',0,0),target=w.addUnit('roach','zerg',0,5);w.time=5.1;u.lastShotAt=5;u.shotInterval=.7;u.shotSequence=4;u.attackTarget=target.id;w.visualEvents=[];
 const requests:SourceEffectRequest[]=[],effects=new SourceCombatEffects(new THREE.Scene(),new THREE.PerspectiveCamera(),{sourceEventIds:new Set()} as any);
 Object.assign(effects.player,{ready:true,begin:()=>requests.splice(0),add:(r:SourceEffectRequest)=>requests.push(r),end:()=>{},reset:()=>{}});
 const render=()=>{const before=w.captureRun();effects.render(w,e=>({x:e.x,y:e.y,z:e.z}),()=>undefined);assert.deepEqual(w.captureRun(),before);return structuredClone(requests);};
 const first=render();assert.equal(first.length,1);assert.equal(first[0].model,'SentryAttackBeam');
 const saved=w.captureRun();w.restoreRun(saved);effects.reset();assert.deepEqual(render(),first);
 w.entities.get(target.id)!.hp=0;assert.equal(render().length,0);
 w.restoreRun(saved);w.entities.get(u.id)!.hp=0;assert.equal(render().length,0);
});

test('explicit clip sampling never starts a second unrelated effect animation',()=>{
 const def=SOURCE_EFFECTS.MarineAttackLaunch,clip=def.materialProfile.clips[0];
 assert.equal(sourcePhase(def,100,false,1,clip.name).clip.name,clip.name);
 assert.equal(sourcePhase(def,100,false,1,clip.name).seconds,clip.duration);
});

test('native bile keeps its projectile and original impact after its caster is reclaimed',()=>{
 const w=new World({race:'zerg',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();w.effects=[];
 for(const p of Object.values(w.expedition.production))p.enabled={};
 const u=w.addUnit('ravager','terran',0,0),enemy=w.addUnit('roach','zerg',0,3);enemy.hp=enemy.maxHp=1e7;const pending=w.effect('bile',u,enemy,1.5,2.5);pending.damage=1;
 w.entities.delete(u.id);w.time=pending.until-.2;
 const requests:SourceEffectRequest[]=[],effects=new SourceCombatEffects(new THREE.Scene(),new THREE.PerspectiveCamera(),{sourceEventIds:new Set()} as any);
 Object.assign(effects.player,{ready:true,begin:()=>requests.splice(0),add:(r:SourceEffectRequest)=>requests.push(r),end:()=>{},reset:()=>{}});
 const before=w.captureRun();effects.render(w,e=>({x:e.x,y:e.y,z:e.z}),()=>undefined);assert.deepEqual(w.captureRun(),before);assert.ok(requests.some(r=>r.model==='RavagerCorrosiveBileMissile'));
 w.tick=Math.round(pending.until*60);w.time=pending.until;w.paused=false;w.step();const receipt=w.visualEvents.find(e=>e.kind==='bile-impact');assert.equal(receipt?.unitType,'ravager');
 effects.render(w,e=>({x:e.x,y:e.y,z:e.z}),()=>undefined);assert.ok(requests.some(r=>r.model==='RavagerCorrosiveBileImpact'));
});

test('storm model and struck-target impact have separate source ownership',()=>{
 const p=COMBAT_FX_PROFILES.get('storm')!;assert.deepEqual(p.models.field,['HighTemplarPsiStormModel']);assert.deepEqual(p.models.impact,['HighTemplarPsiStormImpact']);
});

test('each committed delayed salvo launches once at its own native start and keeps its original muzzle',()=>{
 const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();w.effects=[];for(const p of Object.values(w.expedition.production))p.enabled={};
 const u=w.addUnit('reaper','terran',0,0),enemy=w.addUnit('roach','zerg',0,5);u.eliteId='reaper.1';w.refreshStats(u,true);w.time=5;w.tick=300;w.fire(u,enemy);assert.equal(w.weaponFlights.length,6);
 const requests:SourceEffectRequest[]=[],effects=new SourceCombatEffects(new THREE.Scene(),new THREE.PerspectiveCamera(),{sourceEventIds:new Set()} as any);
 Object.assign(effects.player,{ready:true,begin:()=>requests.splice(0),add:(r:SourceEffectRequest)=>requests.push(r),end:()=>{},reset:()=>{}});
 const render=()=>effects.render(w,(e,side)=>({x:side==='Left'?-1:1,y:e.y,z:e.z}),()=>undefined);
 render();assert.equal(requests.filter(r=>r.model==='ReaperAttackLaunch').length,1);assert.ok(requests.every(r=>!r.key.startsWith('event:')));
 for(const flight of w.weaponFlights){w.time=flight.start+.001;render();const launch=requests.find(r=>r.key.startsWith('flight-launch:'+flight.id+':'));assert.ok(launch);assert.equal(launch.placement.x,flight.id%2===0?-1:1);}
 const keys=requests.map(r=>r.key);render();assert.deepEqual(requests.map(r=>r.key),keys);
});

test('a stopped source channel freezes during pause, plays Death once and reclaims its tail',()=>{
 const player=new SourceEffectPlayer(new THREE.Scene(),new THREE.PerspectiveCamera()),definition=SOURCE_EFFECTS.GuardianShield,requests:SourceEffectRequest[]=[];
 const internal=player as any;internal.resources.set(definition.id,{definition});internal.play=(request:SourceEffectRequest)=>{internal.requests.add(request.key);requests.push(structuredClone(request));};
 const request:SourceEffectRequest={key:'guardian',model:definition.id,age:4,clockRate:1.4,seed:1,loop:true,placement:{x:1,y:0,z:2,facing:0}};
 player.begin(10);player.add(request,()=>0);player.end();requests.length=0;player.begin(11);player.end();const ending=structuredClone(requests);assert.ok(ending.some(r=>/^Death/.test(r.clip??'')));assert.equal(ending.find(r=>r.key.startsWith('ending-particles:'))?.stopAt,4);
 requests.length=0;player.begin(11);player.end();assert.deepEqual(requests,ending);
 requests.length=0;player.begin(11+sourceLife(definition)/1.4+1);player.end();assert.equal(requests.length,0);assert.equal(player.report().endingChannels,0);
});

test('Void Ray native hits do not duplicate its already hosted central beam',()=>{
 const w=new World({race:'protoss',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();w.effects=[];for(const p of Object.values(w.expedition.production))p.enabled={};
 const u=w.addUnit('void_ray','terran',0,0),target=w.addUnit('roach','zerg',0,5);target.hp=target.maxHp=1e6;w.time=5;w.tick=300;u.attackTarget=target.id;w.fire(u,target);assert.ok(w.visualEvents.some(e=>e.kind==='hit'));
 const requests:SourceEffectRequest[]=[],effects=new SourceCombatEffects(new THREE.Scene(),new THREE.PerspectiveCamera(),{sourceEventIds:new Set()} as any);Object.assign(effects.player,{ready:true,begin:()=>requests.splice(0),add:(r:SourceEffectRequest)=>requests.push(r),end:()=>{},reset:()=>{}});
 effects.render(w,e=>({x:e.x,y:e.y,z:e.z}),()=>undefined);assert.deepEqual(requests.map(r=>r.model).sort(),['VoidRayAttackBeam','VoidRayCenterBeam']);assert.ok(requests.every(r=>r.hostedBeam));
});

test('one absorbed shield receipt owns one original shield pair through pause and overflow',()=>{
 const w=new World({race:'protoss',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();w.effects=[];for(const p of Object.values(w.expedition.production))p.enabled={};
 const source=w.addUnit('marine','zerg',-3,0),target=w.addUnit('stalker','terran',0,0);target.shield=8;w.time=5;w.tick=300;w.hit(target,30,[],1,'zerg',.5,0,source.id,false,false,0,true);
 const shield=w.visualEvents.filter(e=>e.kind==='shield-break');assert.equal(shield.length,1);assert.equal(shield[0].shieldDamage,8);assert.ok(w.visualEvents.some(e=>e.kind==='hit'));
 const requests:SourceEffectRequest[]=[],fx={sourceEventIds:new Set<number>()},effects=new SourceCombatEffects(new THREE.Scene(),new THREE.PerspectiveCamera(),fx as any);Object.assign(effects.player,{ready:true,begin:()=>requests.splice(0),add:(r:SourceEffectRequest)=>requests.push(r),end:()=>{},reset:()=>{}});
 const render=()=>{const before=w.captureRun();effects.render(w,e=>({x:e.x,y:e.y,z:e.z}),()=>undefined,()=>({center:{x:0,y:1,z:0},radius:1.2}));assert.deepEqual(w.captureRun(),before);return structuredClone(requests.filter(r=>r.model.startsWith('ProtossShield')));};
 const first=render();assert.deepEqual(first.map(r=>r.model),['ProtossShieldDamage','ProtossShieldRipple']);assert.ok(fx.sourceEventIds.has(shield[0].serial));assert.deepEqual(render(),first);assert.equal(first[0].placement.facing,-Math.PI/2);
 w.restoreRun(w.captureRun());effects.reset();assert.equal(render().length,0);
});

test('Medivac target actor repeats its original Birth and uses the target overhead attachment',()=>{
 const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();w.effects=[];for(const p of Object.values(w.expedition.production))p.enabled={};
 const u=w.addUnit('medivac','terran',0,0),target=w.addUnit('marine','terran',0,3);target.hp=10;u.healTargets=[target.id];w.time=12;w.tick=720;
 const requests:SourceEffectRequest[]=[],effects=new SourceCombatEffects(new THREE.Scene(),new THREE.PerspectiveCamera(),{sourceEventIds:new Set()} as any);Object.assign(effects.player,{ready:true,begin:()=>requests.splice(0),add:(r:SourceEffectRequest)=>requests.push(r),end:()=>{},reset:()=>{}});
 const before=w.captureRun();effects.render(w,e=>({x:e.x,y:e.y,z:e.z}),()=>undefined,()=>({center:{x:0,y:1,z:3},top:{x:0,y:2,z:3},radius:1}));assert.deepEqual(w.captureRun(),before);
 const heal=requests.find(r=>r.model==='MedicHealModel')!;assert.ok(heal);assert.equal(heal.clip,'Birth');assert.equal(heal.loop,true);assert.equal(heal.placement.y,2);assert.equal(requests.find(r=>r.model==='MedivacHealBeam')?.placement.end?.y,1);
 const def=SOURCE_EFFECTS.MedicHealModel;assert.ok(sourceParticleQuads(def,heal,new THREE.PerspectiveCamera(),()=>0).length>0);
});
