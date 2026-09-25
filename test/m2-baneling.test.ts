import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';

function world(){const w=new World({race:'zerg',waves:false,sandbox:true,terrain:false,obstacles:[],seed:44});w.start();w.entities.clear();return w;}
test('player Zerg Baneling explodes once, keeps its body and rank, then recovers after 300 fixed ticks',()=>{
 const w=world(),bane=w.addUnit('baneling','terran',0,0,3),victim=w.addUnit('roach','zerg',1,0);
 victim.hp=victim.maxHp=1000;w.hash.rebuild([...w.entities.values()]);
 w.fire(bane,victim);const after=victim.hp;
 assert.ok(after<1000);assert.ok(bane.hp>0);assert.equal(bane.rank,3);assert.equal(bane.recoveryUntil,5);
 w.fire(bane,victim);assert.equal(victim.hp,after,'recovery cannot replay the explosion');
 const snapshot=w.captureRun(),copy=world();copy.restoreRun(snapshot);const restored=copy.entities.get(bane.id)!;
 assert.equal(restored.recoveryUntil,5);copy.paused=false;
 for(let tick=1;tick<300;tick++){copy.time=tick/60;copy.updateUnit(restored,1/60);assert.equal(restored.action,'idle');assert.equal(restored.recoveryUntil,5);}
 copy.time=5;copy.updateUnit(restored,1/60);assert.equal(restored.recoveryUntil,undefined);
});
test('enemy Baneling still dies on its own explosion',()=>{
 const w=world(),bane=w.addUnit('baneling','zerg',0,0),victim=w.addUnit('marine','terran',1,0);
 w.hash.rebuild([...w.entities.values()]);w.fire(bane,victim);
 assert.equal(bane.hp,0);assert.equal(bane.action,'dead');assert.equal(bane.recoveryUntil,undefined);
});
