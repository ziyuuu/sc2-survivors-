import assert from 'node:assert/strict';
import {test} from 'node:test';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import type {RunSnapshot} from '../src/simulation/persistence/run-snapshot';
import {newExpedition} from '../src/simulation/expedition-state';

test('loading a campaign save prepares upcoming wave and paid-order models before resume',async()=>{
 const requested:string[]=[];
 const renderer={prepareRescueAssets:async()=>{},prepareEndlessAssets:async()=>{},gpu:new Map(),ensureUnitVariant:async(key:string)=>{requested.push(key);return true;}};
 const snapshot={config:{race:'terran'},state:{stage:4,phase:'battle',battlefield:{mode:'campaign'},expedition:{...newExpedition('terran'),familySlots:['marine'],production:{barracks:{outputs:['marauder'],enabled:{marauder:true}}},ledger:[{family:'tank',state:'training'}]},entities:new Map(),pods:[],rewards:[]}} as unknown as RunSnapshot;
 await BattleRenderer.prototype.prepareSnapshotAssets.call(renderer as BattleRenderer,snapshot);
 for(const model of ['marine','marauder','tank','zergling','roach','baneling'])assert.ok(requested.includes(model),`${model} must be ready before combat resumes`);
});

test('a missing upcoming enemy model blocks restored combat',async()=>{
 const renderer={prepareRescueAssets:async()=>{},prepareEndlessAssets:async()=>{},gpu:new Map(),ensureUnitVariant:async(key:string)=>key!=='roach'};
 const snapshot={config:{race:'terran'},state:{stage:4,phase:'battle',battlefield:{mode:'campaign'},expedition:{...newExpedition('terran'),familySlots:['marine'],production:{},ledger:[]},entities:new Map(),pods:[],rewards:[]}} as unknown as RunSnapshot;
 await assert.rejects(BattleRenderer.prototype.prepareSnapshotAssets.call(renderer as BattleRenderer,snapshot),/必需单位模型未就绪：roach/);
});

test('loading stage fifteen prepares its scheduled lurker Boss before it appears',async()=>{
 const requested:string[]=[],renderer={prepareRescueAssets:async()=>{},prepareEndlessAssets:async()=>{},gpu:new Map(),ensureUnitVariant:async(key:string)=>{requested.push(key);return true;}};
 const snapshot={config:{race:'terran'},state:{stage:15,phase:'battle',battlefield:{mode:'campaign'},expedition:newExpedition('terran'),entities:new Map(),pods:[],rewards:[]}} as unknown as RunSnapshot;
 await BattleRenderer.prototype.prepareSnapshotAssets.call(renderer as BattleRenderer,snapshot);assert.ok(requested.includes('lurker'));
});

test('shop asset preparation includes every offered elite variant and a selected replacement',async()=>{
 const {World}=await import('../src/simulation/world');const {drawExpeditionReinforcements}=await import('../src/simulation/progression/expedition-drafts');const {draftContext}=await import('../src/simulation/expedition-economy');
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();for(let i=1;i<5;i++)w.addUnit('marine','terran',i,0);w.wallet={minerals:10000,gas:10000};w.endStage();w.skipReward();const ctx=draftContext(w);ctx.random=()=>.99;w.rewards=drawExpeditionReinforcements(ctx,true);const offer=w.rewards.find(r=>r.kind==='elite')!;const wallet={...w.wallet},positions=w.familyUnits('marine').map(u=>[u.id,u.x,u.z]);assert.equal(w.choose(offer.offerId,'marine.3'),true);
 const requested:string[]=[],renderer={world:w,prepareRescueAssets:async()=>{},prepareEndlessAssets:async()=>{},gpu:new Map(),requiredFamilies:()=>[],ensureUnitVariant:async(key:string)=>{requested.push(key);return true;}};
 await BattleRenderer.prototype.prepareCurrentAssets.call(renderer as unknown as BattleRenderer);for(const variant of [1,2,3])assert.ok(requested.includes(`elite.marine.${variant}`));assert.deepEqual(w.wallet,wallet);assert.deepEqual(w.familyUnits('marine').map(u=>[u.id,u.x,u.z]),positions);assert.equal(w.pendingElites.length,0);
 const restored:string[]=[],snapshotRenderer={prepareRescueAssets:async()=>{},prepareEndlessAssets:async()=>{},gpu:new Map(),ensureUnitVariant:async(key:string)=>{restored.push(key);return true;}};
 await BattleRenderer.prototype.prepareSnapshotAssets.call(snapshotRenderer as BattleRenderer,w.captureRun());for(const variant of [1,2,3])assert.ok(restored.includes(`elite.marine.${variant}`));
});

test('a failed selected shop elite model blocks readiness without payment or replacement',async()=>{
 const {World}=await import('../src/simulation/world');const {drawExpeditionReinforcements}=await import('../src/simulation/progression/expedition-drafts');const {draftContext}=await import('../src/simulation/expedition-economy');
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();for(let i=1;i<5;i++)w.addUnit('marine','terran',i,0);w.wallet={minerals:10000,gas:10000};w.endStage();w.skipReward();const ctx=draftContext(w);ctx.random=()=>.99;w.rewards=drawExpeditionReinforcements(ctx,true);const offer=w.rewards.find(r=>r.kind==='elite')!;assert.equal(w.choose(offer.offerId,'marine.3'),true);const before=w.captureRun();
 const renderer={world:w,prepareRescueAssets:async()=>{},prepareEndlessAssets:async()=>{},gpu:new Map(),requiredFamilies:()=>[],ensureUnitVariant:async(key:string)=>key!=='elite.marine.3'};
 await assert.rejects(BattleRenderer.prototype.prepareCurrentAssets.call(renderer as unknown as BattleRenderer),/增援模型未就绪：elite.marine.3/);assert.deepEqual(w.captureRun(),before);
});
