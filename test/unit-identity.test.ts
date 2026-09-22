import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';import {rewardPool} from '../src/simulation/progression/rewards';import {rewardOwnership,specialUnitName,healthReadout} from '../src/ui/unit-identity';
test('purple offer identifies first recruitment, pending replacement, current rank, and permanent death',()=>{
 const w=new World();w.start();w.autoWaves=false;const offer=rewardPool(w).find(r=>r.id==='elite.marine.1')!;
 assert.match(rewardOwnership(w,offer),/未拥有/);w.acquireElite('marine.1');assert.match(rewardOwnership(w,offer),/待编入/);
 const unit=w.allies()[0];assert.ok(w.replaceWithElite('marine.1',unit.id));assert.equal(specialUnitName(unit),'突击枪兵');assert.equal(rewardOwnership(w,offer),'已拥有 · Rank 1 → 2');
 w.acquireElite('marine.1');assert.equal(rewardOwnership(w,offer),'已拥有 · Rank 2 → 3');unit.rank=5;assert.match(rewardOwnership(w,offer),/已满级/);w.hit(unit,99999);assert.match(rewardOwnership(w,offer),/未拥有/);
});
test('hero ownership and visible HP distinguish wounded, dead, and paid revival states',()=>{
 const w=new World();w.start();w.acquireHero('raynor');const r=rewardPool(w).find(r=>r.id==='hero.raynor')!,u=w.heroEntity('raynor')!;
 assert.equal(specialUnitName(u),'雷诺');assert.equal(rewardOwnership(w,r),'已拥有 · Rank 1 → 2');u.hp=120;assert.deepEqual(healthReadout(u.hp,u.maxHp),{current:120,max:500,ratio:.24,critical:true});
 w.hit(u,99999);assert.match(rewardOwnership(w,r),/阵亡/);assert.equal(healthReadout(u.hp,u.maxHp).ratio,0);w.endStage();w.wallet={minerals:5000,gas:5000};assert.ok(w.reviveHero('raynor'));assert.match(rewardOwnership(w,r),/下关复活/);
});
