import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import type {Race} from '../src/data/races';

function run(race:Race='terran'){const w=new World({race,seed:4,waves:false,sandbox:true,terrain:false,obstacles:[]});w.start();w.entities.clear();return w;}
const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);
test('S10 shares only final HP damage with nearby same-family bodies and does not reapply their armor',()=>{
 const w=run(),front=w.addUnit('marine','terran',0,0),partner=w.addUnit('marine','terran',2,0),other=w.addUnit('marauder','terran',2,1),enemy=w.addUnit('roach','zerg',3,0);
 w.runConfig!.frozenTalents.levels={'T-S10':2};w.refreshStats(front);w.refreshStats(partner);partner.armor=100;
 const hp=[front.hp,partner.hp,other.hp];w.hit(front,20,[],1,'zerg',0,0,enemy.id);
 close(hp[0]-front.hp,12);close(hp[1]-partner.hp,8);close(hp[2]-other.hp,0);
});
test('Terran biological talent shield is separate from native shields and restores after five seconds',()=>{
 const w=run(),marine=w.addUnit('marine','terran',0,0),enemy=w.addUnit('roach','zerg',3,0);
 w.runConfig!.frozenTalents.levels={'T-S06':1};w.refreshStats(marine,true);
 close(marine.maxTalentShield??0,marine.maxHp*.1);close(marine.maxShield??0,0);
 const hp=marine.hp,shield=marine.talentShield!;w.hit(marine,3,[],1,'zerg',0,0,enemy.id);
 close(marine.hp,hp);close(marine.talentShield!,shield-3);
 w.time=4.9;w.updateUnit(marine,.1);close(marine.talentShield!,shield-3);
 w.time=5;w.updateUnit(marine,1);close(marine.talentShield!,Math.min(shield,shield-3+shield*.03));
});
test('S01 benefits a recruited hero while temporary soldiers do not inherit it',()=>{
 const w=run(),hero=w.addUnit('marine','terran',0,0),temporary=w.addUnit('marine','terran',2,0);
 hero.heroId='raynor';temporary.temporary=true;w.runConfig!.frozenTalents.levels={'T-S01':3};w.refreshStats(hero);w.refreshStats(temporary);
 close(hero.maxHp,625*1.15);close(hero.weaponDamage,28*1.15);close(temporary.maxHp,45);
});
test('M07 doubles only the primary direct hit of an area weapon',()=>{
 const w=run(),hellbat=w.addUnit('hellion','terran',0,0),main=w.addUnit('zergling','zerg',1,0),secondary=w.addUnit('zergling','zerg',1.5,.3);
 hellbat.nativeMode='hellbat';w.runConfig!.frozenTalents.levels={'T-M07':1};w.refreshStats(hellbat);for(const u of [main,secondary]){u.hp=u.maxHp=1000;u.armor=0;}
 w.hash.rebuild([...w.entities.values()]);w.fire(hellbat,main);
 assert.ok(1000-main.hp>1000-secondary.hp);
 close(1000-main.hp,(1000-secondary.hp)*2);
});
