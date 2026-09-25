import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world.ts';
import {SC2_UNITS,TERRAN,ZERG,HYDRALISK_MELEE} from '../src/data/sc2-units.ts';
test('five unit families use the pinned SC2 profiles',()=>{
 assert.equal(TERRAN.length,5);assert.equal(ZERG.length,5);
 const m=SC2_UNITS.marauder;assert.equal(m.maxHp,125);assert.equal(m.attackRange,6);assert.equal(m.attackPeriod,1.5/1.4);assert.equal(m.productionTime,30/1.4);
 assert.equal(SC2_UNITS.hydralisk.targetType,'both');assert.equal(SC2_UNITS.hydralisk.maxHp,90);assert.equal(HYDRALISK_MELEE.period,.75/1.4);
});
test('Marauder infantry damage, armored bonus, biological healing and 20 HP stim are independent',()=>{
 const w=new World({initial:['marauder','medivac'],sandbox:true,waves:false,obstacles:[]});w.start();
 const m=w.allies()[0],target=w.addUnit('roach','zerg',2,0);w.upgrades.set('infantry',1);w.upgrades.set('stim',1);w.refreshStats(m);
 w.fire(m,target);assert.equal(target.maxHp-target.hp,21);assert.ok(w.stim());assert.equal(m.hp,105);
 w.upgrades.set('shield',1);w.refreshStats(m);assert.equal(m.maxHp,125);
});
test('Hydralisk close and ranged shots share an existing cooldown',()=>{
 const w=new World({initial:['marine'],sandbox:true,waves:false,obstacles:[]});w.start();
 const h=w.addUnit('hydralisk','zerg',1,0),m=w.allies()[0];h.weaponCooldown=.4;h.attackTarget=m.id;w.hash.rebuild([...w.entities.values()]);w.updateUnit(h,1/60);
 assert.ok(h.weaponCooldown>.38);assert.equal(h.pendingTarget,null);m.x=4;w.updateUnit(h,1/60);assert.ok(h.weaponCooldown>.36);
});
