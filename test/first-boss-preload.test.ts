import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {planFirstBossLoot,dropBossLoot} from '../src/simulation/boss-loot';

const make=()=>{const w=new World({sandbox:true,terrain:false,obstacles:[],waves:false,seed:529});w.start();return w;};
test('stage-three reward is fixed once without advancing combat RNG or allocating a live ID',()=>{
 const w=make();planFirstBossLoot(w);assert.equal(w.expedition.firstBossLoot,undefined);w.stage=3;
 const rng=w.rngState,id=w.nextId,entities=structuredClone([...w.entities]),wallet={...w.wallet};planFirstBossLoot(w);
 const planned=structuredClone(w.expedition.firstBossLoot);assert.ok(planned);assert.equal(w.rngState,rng);assert.equal(w.nextId,id);assert.deepEqual([...w.entities],entities);assert.deepEqual(w.wallet,wallet);
 w.random();planFirstBossLoot(w);assert.deepEqual(w.expedition.firstBossLoot,planned);
});
test('saved plan survives restoration and the real Boss drop uses that identity only once',()=>{
 const w=make();w.stage=3;w.prepareStage();const planned=structuredClone(w.expedition.firstBossLoot!);assert.ok(planned);
 const restored=make();restored.restoreRun(w.captureRun());assert.deepEqual(restored.expedition.firstBossLoot,planned);
 const boss=restored.spawnSpecial('zergling','boss',{x:10,z:0})!;assert.equal(boss.enemySpawn?.stage,3);restored.hit(boss,1e9,[],1,'terran');
 const drop=restored.rewardDrops.find(d=>d.bossLootReceipt)!;assert.ok(drop);assert.deepEqual((drop.reward as any).expeditionEffect,planned.reward.expeditionEffect);assert.equal(drop.bossLootVariant,planned.variant??undefined);assert.equal(restored.expedition.firstBossLoot!.consumed,true);
 assert.equal(dropBossLoot(restored,boss),false);assert.equal(restored.rewardDrops.filter(d=>d.bossLootReceipt).length,1);
});
test('planned and legacy death paths consume identical combat RNG and live IDs',()=>{
 const w=make();w.stage=3;w.prepareStage();const snap=w.captureRun(),legacy=make();legacy.restoreRun(snap);delete legacy.expedition.firstBossLoot;
 const boss=w.spawnSpecial('zergling','boss',{x:10,z:0})!,old=legacy.spawnSpecial('zergling','boss',{x:10,z:0})!;
 w.hit(boss,1e9,[],1,'terran');legacy.hit(old,1e9,[],1,'terran');assert.equal(w.rngState,legacy.rngState);assert.equal(w.nextId,legacy.nextId);
});
test('foreign or corrupt saved planned rewards fail before changing the world',()=>{
 const w=make();w.stage=3;w.prepareStage();const snap=structuredClone(w.captureRun());snap.state.expedition.firstBossLoot!.variant='zergling.1';const restored=make(),before=restored.captureRun();
 assert.throws(()=>restored.restoreRun(snap),/首关首领奖励计划无效/);assert.deepEqual(restored.captureRun(),before);
});
