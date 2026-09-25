import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world.ts';
import {distance} from '../src/simulation/movement/steering.ts';
const setup=(initial:any[]=[])=>{const w=new World({sandbox:true,waves:false,obstacles:[],initial});w.start();return w;};
const foe=(w:World,x:number,z:number)=>{const e=w.addUnit('roach','zerg',x,z);e.hp=e.maxHp=10000;e.moveSpeed=0;e.weaponDamage=0;return e;};

test('empty target searches respect the AI cadence while a fresh player order reacts immediately',()=>{
 const w=setup(['marine']);let searches=0;const original=w.findTarget.bind(w);w.findTarget=(...args)=>{searches++;return original(...args);};w.advance(1);assert.ok(searches<=9,`empty searches: ${searches}`);
 const e=foe(w,3,0);w.issueMove({x:e.x,z:e.z});w.step();assert.equal(w.allies()[0].attackTarget,e.id);w.advance(.3);assert.ok(e.hp<e.maxHp);
});
test('move commands retain coordinate values rather than a picked entity object',()=>{
 const w=setup(['marine']);
 const picked={x:8,z:2,id:99,guardianIds:new Set([101])};
 assert.equal(w.issueMove(picked),true);
 picked.x=12;
 assert.deepEqual(w.order?.kind==='move'?w.order.point:null,{x:8,z:2});
});
test('mobile fighters defend against a reachable threat while moving to an out-of-range destination',()=>{
 for(const type of ['marine','hellion','tank']){const w=setup([type]),near=foe(w,3,1),chosen=foe(w,28,0);w.issueMove({x:chosen.x,z:chosen.z});w.advance(1);
  assert.ok(near.hp<near.maxHp,type);assert.ok(w.order?.kind==='move'&&w.order.point.x===chosen.x);assert.ok(w.anchor.x>1,type);assert.ok(w.allies()[0].distanceWalked>.1,type);
 }
});
test('Medivac heals an eligible nearby patient before chasing a distant critical patient',()=>{
 const w=setup(),med=w.addUnit('medivac','terran',0,0),near=w.addUnit('marine','terran',2,0),far=w.addUnit('marine','terran',12,0);near.hp=30;far.hp=1;near.moveSpeed=far.moveSpeed=0;w.advance(.2);assert.ok(near.hp>30);assert.equal(far.hp,1);assert.equal(med.healTarget,near.id);
});
test('medical patient retention avoids alternating beams for tiny HP differences',()=>{
 const w=setup(),med=w.addUnit('medivac','terran',0,0),a=w.addUnit('marine','terran',2,0),b=w.addUnit('marine','terran',-2,0);a.hp=10;b.hp=11;a.moveSpeed=b.moveSpeed=0;const targets=new Set<number|null>();for(let i=0;i<15;i++){w.step();targets.add(med.healTarget);}assert.deepEqual([...targets],[a.id]);
});
test('Medivac follows a moving squad while continuing legal healing in range',()=>{
 const w=setup(),med=w.addUnit('medivac','terran',0,0),patient=w.addUnit('marine','terran',1,0);patient.hp=1;w.issueMove({x:12,z:0});w.advance(1);assert.ok(med.x>1);assert.ok(w.stats.healed>0);assert.ok(med.energy<50);assert.equal(med.attackTarget,null);
});
test('formation plans are shared within a simulation tick, but a new roster gets live slots',()=>{
 const w=setup(['marine','hellion','tank','medivac']);let plans=0;const f=(w as any).formation,original=f.plan.bind(f);f.plan=(...args:any[])=>{plans++;return original(...args);};w.input={x:1,z:0};w.advance(.3);assert.ok(plans<=18,`${plans} plans`);const recruit=w.addUnit('marine','terran',0,1);w.step();assert.ok(distance(w.moveGoal(recruit),w.moveGoal(w.allies()[0]))>.5);
});

test('forward movement does not pull the medical aircraft backwards into its rear slot',()=>{const w=setup(['marine','medivac']),med=w.allies()[1];med.x=0;med.z=2;med.prev={x:0,z:2};w.issueMove({x:15,z:0});let least=0;for(let i=0;i<60;i++){w.step();least=Math.min(least,med.x);}assert.ok(least>-.05);assert.ok(med.x>1);});
