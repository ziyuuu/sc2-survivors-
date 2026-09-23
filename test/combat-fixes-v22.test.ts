import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {BILE,SC2_UNITS} from '../src/data/sc2-units';

test('a new elite joins an empty family seat without consuming an ordinary soldier',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],initial:['marine']});w.start();
 const ordinary=w.allies()[0];
 assert.equal(w.acquireElite('marine.1'),true);
 assert.equal(w.familyUnits('marine').length,2);
 assert.equal(w.eliteOwned('marine.1')?.rank,1);
 assert.equal(ordinary.eliteId,undefined);
 assert.equal(w.requiresEliteChoice,false);
});

test('ordinary bile uses its cast-time damage after the caster changes or dies',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],initial:['marine']});w.start();
 const ally=w.allies()[0],ravager=w.addUnit('ravager','zerg',4,0);
 ally.hp=ally.maxHp=500;ally.armor=2;ally.moveSpeed=0;ally.weaponDamage=0;
 ravager.weaponDamage=SC2_UNITS.ravager.attackDamage*2;ravager.bileCooldown=0;ravager.weaponCooldown=100;
 w.hash.rebuild(w.entities.values());w.updateBile(ravager,1/60);
 const bile=w.effects.find(e=>e.kind==='bile');assert.ok(bile);
 assert.equal(bile.damage,BILE.damage*2);
 ravager.weaponDamage=1;ravager.hp=0;
 w.advance(BILE.delay+1/60);
 assert.equal(ally.hp,500-BILE.damage*2);
});
