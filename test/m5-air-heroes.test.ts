import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {HEROES,type HeroId} from '../src/data/heroes';
import {SOURCE_INTERCEPTOR} from '../src/data/expansion-units';
import {FASTER} from '../src/data/sc2-units';
import {sourceDetails,tickExpeditionRecovery} from '../src/simulation/combat/expedition-combat';
import {acquireExpeditionHero,castExpeditionHero,resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';
import {initializeCarrierSubsystem,ownedInterceptors,tickCarrierSubsystem} from '../src/simulation/combat/carriers';
import {readArchive,writeArchive} from '../src/persistence/archive';
import type {Race} from '../src/data/races';

function setup(race:Race){const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],race});w.start();w.entities.clear();w.heroes.clear();return w;}
function hero(w:World,id:HeroId){assert.ok(acquireExpeditionHero(w,id,()=>true));const u=w.heroEntity(id)!;u.x=u.z=0;return u;}
function enemy(w:World,x=4,z=0){const u=w.addUnit('roach','zerg',x,z);u.hp=u.maxHp=10000;u.armor=0;w.hash.rebuild(w.entities.values());return u;}
function resolve(w:World,time:number){w.time=time;w.hash.rebuild(w.entities.values());resolveExpeditionHeroCasts(w);}

test('three approved air heroes have independent combat identities outside 30 ordinary families',()=>{
 for(const [race,id] of [['terran','yamato_battlecruiser'],['zerg','hots_leviathan'],['protoss','purifier_flagship']] as const){
  const w=setup(race),u=hero(w,id),data=HEROES[id];assert.equal(u.unitType,id);assert.equal(u.race,race);assert.equal(u.team,'player');assert.equal(u.flying,true);assert.equal(u.maxHp,data.hp);assert.equal(u.maxShield,data.shield);assert.equal(w.expedition.familySlots.includes(id as never),false);
 }
});

test('Yamato main gun has two native hits and fixed-point fusion cannon saves in flight',()=>{
 const w=setup('terran'),u=hero(w,'yamato_battlecruiser'),main=enemy(w,4),near=enemy(w,4,1),far=enemy(w,12);
 w.fire(u,main);assert.equal(main.hp,9920);assert.ok(castExpeditionHero(w,'yamato_battlecruiser'));
 resolve(w,1.24);assert.equal(main.hp,9920);const run=readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()})).bundle.run!;
 const restored=setup('terran');restored.restoreRun(run);restored.paused=false;resolve(restored,1.25);
 assert.equal(restored.entities.get(main.id)?.hp,9220);assert.equal(restored.entities.get(near.id)?.hp,9720);assert.equal(restored.entities.get(far.id)?.hp,10000);assert.equal(restored.heroCasts.length,0);
});

test('Leviathan plasma storm gives three real pulses without spawning extra bodies',()=>{
 const w=setup('zerg');hero(w,'hots_leviathan');const target=enemy(w);const count=w.entities.size;
 assert.ok(castExpeditionHero(w,'hots_leviathan'));assert.deepEqual(w.heroCasts.map(c=>Number(c.at.toFixed(2))),[.8,1.6,2.4]);
 for(const [time,hp] of [[.79,10000],[.8,9820],[1.6,9640],[2.4,9460]] as const){resolve(w,time);assert.equal(target.hp,hp);}
 assert.equal(w.entities.size,count);assert.equal(w.heroCasts.length,0);
});

test('Leviathan alone receives its verified HotS innate regeneration once',()=>{
 const w=setup('zerg'),u=hero(w,'hots_leviathan');
 assert.equal(sourceDetails('hots_leviathan').lifeRegen,2);
 u.hp-=100;u.lastDamagedAt=w.time;const before=u.hp;
 tickExpeditionRecovery(w,u,1);assert.equal(u.hp,before+2*FASTER);
 const run=readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()})).bundle.run!;
 const restored=setup('zerg');restored.restoreRun(run);const same=restored.heroEntity('hots_leviathan')!;
 const saved=same.hp;tickExpeditionRecovery(restored,same,1);assert.equal(same.hp,saved+2*FASTER);
});

test('air-hero skills can target a real hive outside the entity spatial hash',()=>{
 for(const [race,id] of [['terran','yamato_battlecruiser'],['zerg','hots_leviathan'],['protoss','purifier_flagship']] as const){
  const w=setup(race);hero(w,id);
  const hive=w.hive={id:w.nextId++,x:4,z:0,hp:10000,maxHp:10000,armor:0,unitRadius:1,flying:false,attributes:['Armored','Biological','Structure'],owner:'zerg'};
  assert.equal(castExpeditionHero(w,id),true,id);
  resolve(w,id==='yamato_battlecruiser'?1.25:id==='purifier_flagship'?1.4:2.4);
  assert.ok(hive.hp<10000,id);
 }
});

test('Purifier flagship owns four initial interceptors, pays for replacement and fires no ordinary hull gun',()=>{
 const w=setup('protoss'),carrier=hero(w,'purifier_flagship'),target=enemy(w);w.wallet.minerals=15;
 initializeCarrierSubsystem(w);const initial=ownedInterceptors(w,carrier.id);assert.equal(initial.length,4);
 assert.equal(initial[0].weaponDamage,SOURCE_INTERCEPTOR.weapon.attackDamage*1.2);
 w.fire(carrier,target);assert.equal(target.hp,10000);
 assert.ok(castExpeditionHero(w,'purifier_flagship'));resolve(w,1.39);assert.equal(target.hp,10000);resolve(w,1.4);assert.equal(target.hp,9400);
 tickCarrierSubsystem(w,8.571428571428571);assert.equal(ownedInterceptors(w,carrier.id).length,5);assert.equal(w.wallet.minerals,0);
});

test('Purifier flagship alone remains a viable squad through normal battle steps',()=>{
 const w=setup('protoss'),carrier=hero(w,'purifier_flagship');enemy(w);
 for(let tick=0;tick<120;tick++)w.step();
 assert.equal(w.phase,'battle');
 assert.ok(carrier.hp>0);
 assert.equal(ownedInterceptors(w,carrier.id).length,4);
});
