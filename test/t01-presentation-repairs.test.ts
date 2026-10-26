import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,PerspectiveCamera} from 'three';
import {World} from '../src/simulation/world';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {CombatAudioRouter} from '../src/render/effects/combat-audio-router';
import {SOUND_DATA} from '../src/render/effects/audio-source-data';
import {SourceCombatEffects} from '../src/render/effects/source-combat-effects';
import {ApprovedGunEffects} from '../src/render/effects/confirmed-hero/approved-gun-effects';
import {fleetGunWorld} from '../src/render/effects/mission-feedback';
import {TERRAN_HERO_IDS} from '../src/data/terran-heroes';
import {callFleet,tickFleetCall} from '../src/simulation/missions/fleet';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {makeMissionBody} from '../src/simulation/missions/runtime';
import {equipmentPresentation,type EquipmentPresentationKind} from '../src/simulation/starship/presentation';
import {deathPresentation} from '../src/render/materials/death-presentation';
import {unitMaterialIdentity} from '../src/render/materials/elite-visual';
import {modelPresentationScale} from '../src/data/combat-presentation';
import type {MissionRecord} from '../src/simulation/missions/state';
import type {SourceEffectRequest} from '../src/render/effects/source/types';
const fresh=()=>{const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});w.entities.clear();w.visualEvents=[];w.phase='battle';w.starship.enabled=true;w.anchor={x:0,z:0,facing:0};w.paused=false;return w;};
const banks=(w:World,r:CombatAudioRouter)=>r.update(w).cues.map(c=>c.bank);
test('fleet main guns have one owner and Yamato charge, launch, impact follow native phases',()=>{
 const w=fresh(),r=new CombatAudioRouter();w.missions.fleet.unlocked=true;assert.ok(callFleet(w,{x:0,z:0}));w.tick++;w.time=w.tick/60;tickFleetCall(w);w.missions.fleet.pending=null;
 const ship=[...w.entities.values()].find(u=>u.mission?.fleet)!,target=w.addUnit('roach','zerg',ship.x+3,ship.z);target.hp=target.maxHp=1e7;r.resumeAt(w);w.fire(ship,target);
 assert.deepEqual(banks(w,r),[SOUND_DATA.weapons['hero:yamato_battlecruiser'].attack]);assert.equal(banks(w,r).length,0);
 const rows=TERRAN_HERO_IDS.map(hero=>{const gun=new ApprovedGunEffects(new Scene(),{heroQuality:'full',emit(){}} as any);gun.render(fleetGunWorld(w,hero),()=>true,new Map());return [hero,gun.stats.flights] as const;});assert.equal(rows.reduce((n,[,count])=>n+count,0),2);assert.equal(rows.find(([hero])=>hero==='yamato_battlecruiser')![1],2);
 w.time+=.2;w.tick+=12;tickWeaponFlights(w,.2);assert.deepEqual(banks(w,r),[SOUND_DATA.weapons['hero:yamato_battlecruiser'].impact]);
 const state=w.missions.fleet.ships.get(ship.id)!;state.ready=w.tick;tickFleetCall(w);assert.deepEqual(banks(w,r),[SOUND_DATA.skills.yamato_battlecruiser.charge]);
 w.tick=state.cast!.at;w.time=w.tick/60;tickFleetCall(w);assert.deepEqual(banks(w,r),[SOUND_DATA.skills.yamato_battlecruiser.launch]);
 w.tick=w.missions.fleet.flights[0].at;w.time=w.tick/60;tickFleetCall(w);assert.deepEqual(banks(w,r),[SOUND_DATA.skills.yamato_battlecruiser.impact]);assert.equal(banks(w,r).length,0);assert.equal(ship.heroId,undefined);
});
for(const [role,model]of [['worker','scv'],['worker','drone'],['worker','probe'],['hive','hatchery'],['repair','factory'],['repair','barracks'],['repair','starport'],['repair','gateway'],['repair','robotics'],['repair','stargate']] as const)test('mission death freezes actual '+model+' identity before cleanup',()=>{
 const w=fresh(),m={id:'test',kind:'repair',phase:'active',stage:10,age:0,bodyIds:[],enemyIds:[],queue:[],progress:0,completed:0,total:1,nextSpawn:0,receipts:[]} as MissionRecord;w.missions.active=m;
 const owner=role==='hive'?'zerg':'terran',b=makeMissionBody(w,m,role,{x:0,z:0},2,model,owner,.6),enemy=w.addUnit('zergling',owner==='terran'?'zerg':'terran',1,0);enemy.mission={taskId:m.id,sourceId:0,noLoot:true,escortOnly:role==='worker',pulse:false,nextAction:0};b.facing=.73;w.hit(b,100,[],1,enemy.owner,0,1,enemy.id);const event=w.visualEvents.find(e=>e.kind==='death')!;
 assert.equal(event.missionModel,model);assert.equal(event.missionDeath,role);assert.equal(event.facing,.73);w.missions.bodies.clear();assert.equal(event.missionModel,model);
});
test('death colour and scale survive entity reclamation and do not use a later live identity',()=>{
 const w=fresh(),u=w.addUnit('marine','terran',0,0);u.eliteId='marine.2';u.visualScale=1.7;const color=unitMaterialIdentity(u,w.time).teamColor;w.hit(u,1e8,[],1,'zerg',0,1);const event=w.visualEvents.find(e=>e.kind==='death')!;w.entities.delete(u.id);
 const p=deathPresentation(event)!;assert.deepEqual(p.teamColor,color);assert.equal(p.scale,modelPresentationScale(u));assert.equal(p.type,'elite.marine.2');assert.ok(event.revealed);
});
for(const kind of ['fun-brood','hero-baneling'] as const)test(kind+' expiry emits one retirement without a death transaction',()=>{
 const w=fresh(),u=w.addUnit(kind==='fun-brood'?'zergling':'baneling','terran',0,0),r=new CombatAudioRouter();u.temporary=true;u.temporaryKind=kind;w.time=1;u.temporaryUntil=1;const stats=structuredClone(w.stats),next=w.nextId;r.resumeAt(w);w.updateUnit(u,1/60);
 assert.equal(w.entities.has(u.id),false);assert.deepEqual(w.stats,stats);assert.equal(w.nextId,next);assert.deepEqual(w.visualEvents.map(e=>e.kind),['unit-expired']);assert.equal(banks(w,r).length,1);assert.equal(banks(w,r).length,0);
});
test('cocoon death uses the native death effect after its receipt leaves the short event queue',()=>{
 const w=fresh(),u=w.addUnit('queen','zerg',0,0);u.modelKey='fun-cocoon';u.visualScale=1.5;const requests:SourceEffectRequest[]=[],fx={sourceEventIds:new Set<number>()},effects=new SourceCombatEffects(new Scene(),new PerspectiveCamera(),fx as any);
 Object.assign(effects.player,{ready:true,begin:()=>requests.splice(0),add:(r:SourceEffectRequest)=>requests.push(r),end:()=>{},reset:()=>{}});w.hit(u,1e8,[],1,'terran',0,1);effects.render(w,()=>({x:0,y:0,z:0}),()=>undefined);
 assert.equal(requests.filter(r=>r.model==='FunCocoonDeath').length,1);assert.ok(fx.sourceEventIds.has(w.visualEvents.find(e=>e.kind==='death')!.serial));
 w.visualEvents=[];w.entities.delete(u.id);w.time=.3;effects.render(w,()=>({x:0,y:0,z:0}),()=>undefined);assert.equal(requests.filter(r=>r.model==='FunCocoonDeath').length,1);
 effects.reset();effects.resumeAt(w);effects.render(w,()=>({x:0,y:0,z:0}),()=>undefined);assert.equal(requests.filter(r=>r.model==='FunCocoonDeath').length,0);
});
test('all eleven committed equipment lifecycle cues sound once and resume discards old receipts',()=>{
 const w=fresh(),u=w.addUnit('marine','terran',0,0),r=new CombatAudioRouter();r.resumeAt(w);
 const kinds:EquipmentPresentationKind[]=['projection-birth','projection-end','recall-from','recall-to','rewind','capture','evolve','reinforcement','expiry','fort-deploy','heal'];
 for(const kind of kinds){equipmentPresentation(w,kind,u);assert.equal(banks(w,r).length,1,kind);assert.equal(banks(w,r).length,0,kind);}
 r.resumeAt(w);assert.equal(banks(w,r).length,0);w.paused=true;equipmentPresentation(w,'projection-birth',u);assert.equal(banks(w,r).length,0);w.paused=false;assert.equal(banks(w,r).length,0);
});

test('infected explosion sounds once, while pause and restoration discard old bursts',()=>{
 const w=fresh(),r=new CombatAudioRouter();r.resumeAt(w);
 const burst={id:'committed-explosion',time:w.time,point:{x:0,z:0},facing:0,scale:1,model:'BanelingDeath' as const};w.encounters.expanded.bursts.push(burst);
 assert.deepEqual(banks(w,r),[SOUND_DATA.weapons.baneling.attack]);assert.deepEqual(banks(w,r),[]);
 r.resumeAt(w);assert.deepEqual(banks(w,r),[]);
 w.paused=true;w.encounters.expanded.bursts.push({...burst,id:'paused-explosion'});assert.deepEqual(banks(w,r),[]);w.paused=false;assert.deepEqual(banks(w,r),[]);
});
