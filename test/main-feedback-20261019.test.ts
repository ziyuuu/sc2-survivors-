import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RunSession} from '../src/app/run-session';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {takeUnitArrivals} from '../src/simulation/boss-loot';
import {equipmentDropPolicy} from '../src/simulation/starship/drops';
const make=()=>{const w=new World({seed:73,waves:false,terrain:false,obstacles:[],sandbox:true,equipmentAccount:newEquipmentAccount(73)});w.start();return w;};
test('Boss Reaper absorbed by Lone Hunter settles once and simulation continues',()=>{
 for(const variant of ['reaper.1','reaper.2'] as const){const w=make();w.expedition.familySlots.push('reaper');assert.ok(w.acquireElite('reaper.3'));const hunter=w.eliteOwned('reaper.3')!;
 const boss=w.spawnSpecial('zergling','boss',{x:10,z:0})!;w.hit(boss,1e9,[],1,'terran');const d=w.rewardDrops.find(d=>d.bossLootReceipt)!;
 (d.reward as any).expeditionEffect={kind:'elite',family:'reaper'};d.bossLootVariant=variant;
 assert.ok(w.collectRewardDrop(d.id));assert.equal(w.eliteOwned(variant),undefined);assert.ok(hunter.eliteCombat!.absorbed>0);const absorbed=hunter.eliteCombat!.absorbed;
 assert.equal(w.collectRewardDrop(d.id),false);assert.equal(hunter.eliteCombat!.absorbed,absorbed);assert.equal(w.expedition.bossLootClaimed.filter(r=>r===d.bossLootReceipt).length,1);
 const arrivals=takeUnitArrivals(w);assert.equal(arrivals.length,1);assert.ok(arrivals[0].absorbedBy);const time=w.time;w.step();assert.ok(w.time>time);
 }
});
test('isolated in-page continuation preserves live combat, equipment, pending decisions and reward phases without serialization',()=>{
 for(const phase of ['battle','reward','won','endless-ready'] as const){const w=make(),session=new RunSession(w,null,{run:null,savedAt:0,notice:'',memoryOnly:true});w.phase=phase;w.time=31;w.wallet.minerals=123;const entities=w.entities,ship=w.starship,expedition=w.expedition,run=w.runId;
 w.captureRun=()=>{throw Error('must not serialize');};session.keepRun();assert.equal(w.phase,'menu');assert.ok(session.canResume);w.step();assert.equal(w.time,31);assert.equal(ship.account.run!.ended,false);
 assert.ok(session.resume());assert.equal(w.phase,phase);assert.equal(w.runId,run);assert.equal(w.entities,entities);assert.equal(w.starship,ship);assert.equal(w.expedition,expedition);assert.equal(w.wallet.minerals,123);assert.equal(session.canResume,false);if(phase==='battle')assert.equal(w.paused,true);
 session.keepRun();w.resetRun();assert.equal(session.canResume,false);
 }
});
test('easy regular drops use the approved all-source budget and preserve white weights',()=>{
 const p=equipmentDropPolicy({difficulty:'easy',stage:1,tier:'regular'});assert.equal(p.baseChance,.0035);assert.equal(p.base.find(r=>r.quality===1)!.weight,85);
});
