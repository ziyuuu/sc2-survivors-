import test from 'node:test';
import assert from 'node:assert/strict';
import {RefreshBatch} from '../src/ui/hud/refresh-batch';
import {World} from '../src/simulation/world';
import {ShopProgress} from '../src/ui/presentation/shop-progress';
import {battleActionReader,battleActionState} from '../src/ui/controls/battle-actions';
import {selectRunData} from '../src/simulation/persistence/run-fields';
import {takeUnitArrivals} from '../src/simulation/boss-loot';

test('HUD batches synchronous presentation, preserves every observer and flushes before return/error',()=>{
 const trace:string[]=[],batch=new RefreshBatch(()=>trace.push('refresh'));
 batch.request();assert.deepEqual(trace,['refresh']);trace.length=0;
 assert.equal(batch.run(()=>{trace.push('observer1');batch.request();batch.run(()=>{trace.push('observer2');batch.request();});trace.push('last-state');return 5;}),5);
 assert.deepEqual(trace,['observer1','observer2','last-state','refresh']);trace.length=0;
 assert.throws(()=>batch.run(()=>{batch.request();throw Error('advance failed');}),/advance failed/);
 assert.deepEqual(trace,['refresh']);trace.length=0;batch.run(()=>{});assert.deepEqual(trace,[]);
 batch.request();assert.deepEqual(trace,['refresh']);
});
test('purchase history keeps ordering, clone isolation, restored deduplication and run reset',()=>{
 const w=new World({race:'terran',seed:529,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();
 const journal=new ShopProgress(w),r:any={id:'card.weapon.marine.white',offerId:'one',name:'火力',description:'加强',icon:'tech.attack',rarity:'white',sold:true,purchaseReceipt:{minerals:5,gas:0},expeditionEffect:{kind:'card',effect:'weapon',key:'weapon.marine',family:'marine',amount:.05}};
 w.rewards=[r];journal.observe();journal.observe();assert.equal(journal.snapshot().entries.length,1);
 r.description='changed';assert.equal(journal.snapshot().entries[0].description,'加强');
 const saved=journal.snapshot();journal.restore(saved);assert.equal(journal.snapshot().entries.length,1);
 const two=structuredClone(r);two.offerId='two';two.sold=false;w.rewards.push(two);journal.observe();two.sold=true;journal.observe();
 assert.deepEqual(journal.snapshot().entries.map(r=>r.offerId),['one','two']);
 journal.restore({...saved,entries:[saved.entries[0],saved.entries[0]]});assert.deepEqual(journal.snapshot().entries.map(r=>r.offerId),['one','two']);
 w.runId='new-run';w.rewards=[];assert.equal(journal.snapshot().entries.length,0);
});
test('action presentation readers expire between passes and execution changes',()=>{
 const w=new World({race:'terran',seed:529,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();
 const read=battleActionReader(w);assert.deepEqual(read('dash'),battleActionState(w,'dash'));
 const before=read('dash');w.paused=true;
 assert.equal(read('dash'),before);assert.deepEqual(battleActionReader(w)('dash'),battleActionState(w,'dash'));
 assert.equal(battleActionReader(w)('dash').enabled,false);
});
test('batching keeps fixed steps, eight Boss transactions, arrival order and every business notification',()=>{
 const run=(batched:boolean)=>{
  const w=new World({race:'terran',seed:73,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();
  const old=w.runId!;w.runId='00000000-0000-4000-8000-000000000073';
  if(w.expedition.support.stageReceipt?.startsWith(old+':'))w.expedition.support.stageReceipt=w.runId+w.expedition.support.stageReceipt.slice(old.length);
  if(w.starship.account.run)w.starship.account.run.id=w.runId;
  w.random=()=>.5;
  for(let i=0;i<8;i++){const boss=w.spawnSpecial('zergling','boss',{x:10+i,z:0})!;w.hit(boss,1e9,[],1,'terran');}
  const drops=w.rewardDrops.filter(d=>d.bossLootReceipt);assert.equal(drops.length,8);
  let paints=0;const trace:unknown[]=[],batch=new RefreshBatch(()=>paints++);
  w.listeners.add(()=>{trace.push({tick:w.tick,wallet:{...w.wallet},claimed:[...w.expedition.bossLootClaimed]});batch.request();});
  const action=()=>{for(const d of drops)assert.equal(w.collectRewardDrop(d.id),true);for(let i=0;i<12;i++)w.step();};
  if(batched)batch.run(action);else action();
  return {paints,trace,arrivals:takeUnitArrivals(w),state:selectRunData(w)};
 };
 const direct=run(false),batched=run(true);
 assert.equal(batched.paints,1);assert.ok(direct.paints>=10);
 assert.deepEqual(batched.trace,direct.trace);assert.deepEqual(batched.arrivals,direct.arrivals);assert.deepEqual(batched.state,direct.state);
});
