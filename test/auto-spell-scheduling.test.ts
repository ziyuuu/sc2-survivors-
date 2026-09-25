import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {THREE_RACE_RULES} from '../src/data/races';
import {tickAutoAbilities} from '../src/simulation/combat/expedition-combat';
import {SOURCE_ABILITIES} from '../src/data/expansion-units';
function make(){const w=new World({rulesVersion:THREE_RACE_RULES,sandbox:true,terrain:false,waves:false,obstacles:[]});w.start();w.entities.clear();return w;}
test('depleted auto casters do no target-line work, remain ready, and cast correctly when energy returns',()=>{
 for(const type of ['queen','sentry','high_templar'] as const){const w=make(),u=w.addUnit(type,'terran',0,0),friend=w.addUnit('roach','terran',1,0);friend.hp=1;w.addUnit('hydralisk','zerg',4,0);w.expedition!.tech.storm=1;u.energy=0;let lines=0;const original=w.hasAttackLine.bind(w);w.hasAttackLine=(a,b)=>{lines++;return original(a,b);};const ready=u.abilityReady;tickAutoAbilities(w,u);assert.equal(lines,0);assert.equal(w.expedition!.spells.length,0);assert.equal(u.energy,0);assert.equal(u.abilityReady,ready);
  const a=type==='queen'?SOURCE_ABILITIES.transfusion:type==='sentry'?SOURCE_ABILITIES.guardianShield:SOURCE_ABILITIES.psiStorm;u.energy=a.energy;tickAutoAbilities(w,u);assert.equal(w.expedition!.spells.length,1);assert.equal(u.energy,0);assert.equal(u.abilityReady,w.time+a.cooldown);assert.equal(w.expedition!.spells[0].kind,type==='queen'?'transfusion':type==='sentry'?'guardian':'storm');if(type==='queen')assert.ok(friend.hp>1);
 }
});
test('sequential Sentries reserve one shared shield without charging the second caster',()=>{
 const w=make(),a=w.addUnit('sentry','terran',0,0),b=w.addUnit('sentry','terran',1,0);w.addUnit('hydralisk','zerg',4,0);a.energy=b.energy=100;tickAutoAbilities(w,a);tickAutoAbilities(w,b);assert.equal(w.expedition!.spells.length,1);assert.equal(a.energy,100-SOURCE_ABILITIES.guardianShield.energy);assert.equal(b.energy,100);
});
