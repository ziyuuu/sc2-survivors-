import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import * as economy from '../src/data/economy';
import {RACES} from '../src/data/races';

for(const race of RACES)test(`F05 ${race}: rescued worker income, allegiance and save remain independent of race`,()=>{
 const w=new World({seed:73,race,waves:false,terrain:true,obstacles:[]});w.start();
 const egg=w.spawnEconomic('egg',{x:3,z:0}),roster=w.allies().map(u=>u.id),ledger=structuredClone(w.expedition.ledger);
 w.hit(egg,egg.maxHp+20,[],1,'terran');w.hit(egg,egg.maxHp+20,[],1,'terran');
 assert.equal(w.workers,1);assert.deepEqual(w.allies().map(u=>u.id),roster);assert.deepEqual(w.expedition.ledger,ledger);
 const before={...w.wallet};w.updateEconomy(10);assert.ok(Math.abs(w.wallet.minerals-before.minerals-6.725)<1e-8);assert.ok(Math.abs(w.wallet.gas-before.gas-1.46)<1e-8);
 const snapshot=w.captureRun();assert.equal(snapshot.state.workers,1);assert.equal(Object.hasOwn(snapshot.state,'scvs'),false);
 const copy=new World({seed:73,race,waves:false,terrain:true,obstacles:[]});copy.restoreRun(snapshot);assert.equal(copy.workers,1);
 const enemyEgg=copy.spawnEconomic('egg',{x:4,z:0});copy.hit(enemyEgg,100,[],1,'zerg');assert.equal(copy.workers,1);assert.equal(enemyEgg.status,'expired');
 assert.match(w.notice,new RegExp(race==='terran'?'SCV':race==='zerg'?'工蜂':'探机'));
});
test('F05 uses exact race worker and temporary carrier identities',()=>{
 const identities=(economy as any).RESCUE_PRESENTATION;
 assert.ok(identities,'race presentation table exists');
 assert.deepEqual(RACES.map(r=>[identities[r].workerModel,identities[r].carrierModel]),[['scv','barracks'],['drone','hatchery'],['probe','pylon']]);
});
