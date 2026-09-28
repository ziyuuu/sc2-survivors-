import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {draftContext} from '../src/simulation/expedition-economy';
import {drawExpeditionReinforcements} from '../src/simulation/progression/expedition-drafts';

function intermission(){const w=new World({terrain:false,obstacles:[],waves:false,sandbox:true});w.start();w.wallet={minerals:10000,gas:10000};w.endStage();return w;}
test('first intermission requires a direction and zero talents grant no free refresh',()=>{
 const w=intermission();assert.equal(w.rewards.length,0);assert.equal(w.rerollCost(),50);
 assert.equal((w as any).setDevelopmentDirection('barracks'),true);assert.ok(w.rewards.length>0);
 const offers=structuredClone(w.rewards);assert.equal((w as any).setDevelopmentDirection('factory'),true);assert.equal((w as any).setDevelopmentDirection('barracks'),true);assert.deepEqual(w.rewards,offers);
});
test('development purchase moves directly to paid shop; all three products can be purchased',()=>{
 const w=intermission();(w as any).setDevelopmentDirection('barracks');const first=w.rewards[0];assert.ok(w.choose(first.offerId));assert.equal(w.rewardRound,'random');
 assert.equal(w.rewards.length,3);assert.ok(w.rewards.every(o=>o.minerals>0||o.gas>0));
 const ids=w.rewards.map(o=>o.offerId);for(const id of ids)assert.ok(w.choose(id));assert.equal(w.phase,'reward');assert.ok(w.rewards.every(o=>o.sold));assert.equal(w.choose(ids[0]),false);
 for(const price of [50,90,130,170,210]){assert.equal(w.rerollCost(),price);assert.ok(w.reroll());}
});
test('shop discount is locked, survives save, and failed purchase changes no wallet or RNG',()=>{
 const w=intermission();(w as any).setDevelopmentDirection('barracks');w.skipReward();
 for(const r of w.rewards){assert.ok([0,.15,.3,.5].includes(r.discount));assert.equal(r.minerals,Math.max(r.baseMinerals?1:0,Math.ceil(r.baseMinerals*(1-r.discount))));}
 const snapshot=w.captureRun(),b=new World({terrain:false,obstacles:[],waves:false,sandbox:true});b.restoreRun(snapshot);assert.deepEqual(b.rewards,w.rewards);assert.equal(b.phase,'reward');const restoredTime=b.time;b.step(1/60);assert.equal(b.time,restoredTime);
 w.wallet={minerals:0,gas:0};const before=w.captureRun();assert.equal(w.choose(w.rewards[0].offerId),false);assert.deepEqual(w.captureRun(),before);
});
test('former guaranteed hero/purple windows and low-window history do not force rarity',()=>{
 const w=intermission();for(const stage of [6,9,12,15]){w.stage=stage;w.expedition.draftWindow=w.draftWindowId;w.expedition.lowWindows=9;w.expedition.draftTaken=false;const ctx=draftContext(w);ctx.random=()=>0;ctx.currentOffers=[];const offers=drawExpeditionReinforcements(ctx,true);assert.equal(offers.length,3);assert.ok(offers.every(r=>r.rarity==='white'));}
});
test('four authored discounts are independently quoted and zero-resource prices stay zero',()=>{
 for(const [random,off] of [[.1,0],[.6,.15],[.87,.3],[.98,.5]]){const w=intermission();w.random=()=>random;assert.ok(w.setDevelopmentDirection('barracks'));assert.ok(w.rewards.length);for(const offer of w.rewards){assert.equal(offer.discount,off);assert.equal(offer.minerals,Math.ceil(offer.baseMinerals*(1-off)));assert.equal(offer.gas,Math.ceil(offer.baseGas*(1-off)));}}
});
test('stale revisions and wrong windows are rejected without RNG, quota or wallet changes',()=>{
 const w=intermission();w.setDevelopmentDirection('barracks');const before=w.captureRun(),revision=w.expedition.shopRevision;assert.equal(w.purchaseDevelopmentOffer(w.draftWindowKey,w.rewards[0].offerId,revision-1),false);assert.equal(w.refreshOffers('wrong',revision),false);assert.equal(w.setDevelopmentDirection('factory',revision-1),false);assert.deepEqual(w.captureRun(),before);
 w.skipReward();const shop=w.captureRun();assert.equal(w.purchaseShopOffer(w.draftWindowKey,w.rewards[0].offerId,w.expedition.shopRevision-1),false);assert.deepEqual(w.captureRun(),shop);
});
