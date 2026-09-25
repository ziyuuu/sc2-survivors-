import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {THREE_RACE_RULES} from '../src/data/races';
import type {Entity} from '../src/simulation/types';
import {SOURCE_WEAPON_PATTERNS} from '../src/data/expansion-units';
import {sourceWeaponUpgradeDelta} from '../src/data/expansion-upgrades';
const world=()=>{const w=new World({rulesVersion:THREE_RACE_RULES,race:'zerg',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();return w;};
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const target=(u:Entity)=>{u.hp=u.maxHp=10000;u.armor=0;u.shield=0;u.unitRadius=.1;return u;};
test('upgraded Mutalisk uses three independently upgraded source hits before one rank/talent/card scale',()=>{
 for(const elite of [false,true]){
  const w=world(),u=w.addUnit('mutalisk','terran',0,0,3);if(elite)u.eliteId='mutalisk.1';w.expedition!.tech['zerg.flyer_weapon']=3;w.runConfig!.frozenTalents.levels={'Z-S01':3,'Z-S02':3};w.expedition!.cardTotals['weapon.mutalisk']=.2;w.refreshStats(u);
  const enemies=[2,3.5,5].map(x=>target(w.addUnit('roach','zerg',x,0))),factor=w.growth(u).damage*1.3*1.2;w.fire(u,enemies[0]);
  close(10000-enemies[0].hp,12*factor);close(10000-enemies[1].hp,(3+3*.333)*factor*(elite?1.25:1));close(10000-enemies[2].hp,(1+3*.111)*factor*(elite?1.25:1));
 }
});
test('Baneling building damage uses its independent source upgrade and ignores armor without inheriting light bonus',()=>{
 const w=world(),u=w.addUnit('baneling','terran',0,0,3);w.expedition!.tech['zerg.melee']=3;w.runConfig!.frozenTalents.levels={'Z-S01':3,'Z-S02':3};w.expedition!.cardTotals['weapon.baneling']=.2;w.refreshStats(u);
 const ordinary=target(w.addUnit('zergling','zerg',1.5,0)),hive=w.hive={id:w.nextId++,x:1,z:0,hp:10000,maxHp:10000,armor:25,unitRadius:.5,flying:false,attributes:['Armored','Light','Biological','Structure'],owner:'zerg'};
 w.hash.rebuild([...w.entities.values(),hive]);const factor=w.growth(u).damage*1.3*1.2;w.fire(u,hive);
 assert.equal(SOURCE_WEAPON_PATTERNS.baneling.structureDamage,80);assert.equal(SOURCE_WEAPON_PATTERNS.baneling.structureArmorReduction,0);assert.equal(sourceWeaponUpgradeDelta('VolatileBurstU2',3).damage,15);
 close(10000-hive.hp,95*factor);close(10000-ordinary.hp,(16+6+19)*factor);assert.ok(u.hp>0);assert.equal(u.recoveryUntil,w.time+5);
});
