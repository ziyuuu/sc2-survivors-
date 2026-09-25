import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';
import type {Race} from '../src/data/races';
import type {HeroId} from '../src/data/heroes';

function setup(race:Race,id:HeroId){
 const w=new World({race,sandbox:true,waves:false,terrain:false,obstacles:[]});
 assert.equal(w.start(),true);w.entities.clear();w.heroes.clear();
 assert.equal(w.acquireHero(id),true);const actor=w.heroEntity(id)!;actor.x=actor.z=0;
 w.hive={id:w.nextId++,x:4,z:0,hp:10000,maxHp:10000,armor:0,unitRadius:1,flying:false,attributes:['Armored','Biological','Structure'],owner:'zerg'};
 w.hash.rebuild(w.entities.values());return w;
}

test('traveling line skills damage a legal hive without relying on the moving-entity hash',()=>{
 for(const [race,id] of [['terran','raynor'],['zerg','kerrigan'],['protoss','alarak']] as const){
  const w=setup(race,id);assert.equal(w.castHero(id),true,id);
  for(let tick=0;tick<=60;tick++){w.time=tick/60;resolveExpeditionHeroCasts(w);}
  assert.ok(w.hive!.hp<10000,`${id} should hit the selected hive`);
  assert.equal(w.visualEvents.filter(event=>event.kind==='skill-impact'&&event.heroId===id).length,1,id);
 }
});

test('Vorazun does not spend cooldown on a structure she cannot stop',()=>{
 const w=setup('protoss','vorazun'),ready=w.heroes.get('vorazun')!.skillReady;
 assert.equal(w.castHero('vorazun'),false);
 assert.equal(w.heroes.get('vorazun')!.skillReady,ready);
 assert.equal(w.heroCasts.length,0);
});
