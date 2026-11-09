import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {grantFacility} from '../src/simulation/building/rules';
import {syncBuildingViews} from '../src/simulation/building/expedition';
import {renderHatcheryEvolution} from '../src/ui/presentation/hatchery-evolution';
const make=()=>new World({race:'zerg',waves:false,sandbox:true,terrain:false,obstacles:[],seed:845});
function fixture(){const w=make();w.start();w.wallet={minerals:10000,gas:10000};w.endStage();return w;}
const fixed=(w:World,id='evolve-zerg.evolution')=>Object.values(w.expedition.developmentQuotes).find(r=>r.expeditionEffect.kind==='development'&&r.expeditionEffect.definitionId===id);
test('fixed hatchery entry shows accurate missing prerequisites without selling another hatchery as evolution',()=>{
 const w=fixture(),html=renderHatcheryEvolution(w,0);assert.match(html,/需要解锁蟑螂或虫后/);assert.match(html,/需要至少一座地面进化/);assert.match(html,/地面未进化/);assert.match(html,/天空未进化/);assert.equal(fixed(w),undefined);
 for(const line of ['zerg.evolution','zerg.air'] as const){w.setDevelopmentDirection(line,w.expedition.shopRevision);assert.ok(w.rewards.every(r=>r.value!=='hatchery'));}
});
test('fixed ground action is always available once qualified, spends the frozen quote once on the selected hatchery and consumes the development action',()=>{
 const w=fixture(),b=w.expedition.building!;w.expedition.tech['unlock.queen']=1;const second=grantFacility(b,'hatchery')!;syncBuildingViews(w.expedition);w.generateDevelopmentOffers(w.draftWindowKey);
 const q=fixed(w)!;assert.ok(q);assert.ok(!w.rewards.includes(q));const frozen={id:q.offerId,m:q.minerals,g:q.gas},rng=w.snapshotData().rngState;
 w.generateDevelopmentOffers(w.draftWindowKey);assert.equal(w.snapshotData().rngState,rng);assert.deepEqual({id:fixed(w)!.offerId,m:fixed(w)!.minerals,g:fixed(w)!.gas},frozen);
 const wallet={...w.wallet},rev=w.expedition.shopRevision;assert.ok(w.purchaseDevelopmentOffer(w.draftWindowKey,q.offerId,rev,second.ids[0]));
 assert.deepEqual(second.directions,['ground']);assert.deepEqual(b.groups[0].directions,[]);assert.equal(w.wallet.minerals,wallet.minerals-q.minerals);assert.equal(w.wallet.gas,wallet.gas-q.gas);assert.equal(w.rewardRound,'random');
 assert.equal(w.purchaseDevelopmentOffer(w.draftWindowKey,q.offerId,rev,second.ids[0]),false);assert.equal(w.wallet.minerals,wallet.minerals-q.minerals);
});
test('sky evolution preserves a hatchery ground direction and saved fixed quotes survive restoration',()=>{
 const w=fixture(),g=w.expedition.building!.groups[0];w.expedition.tech['unlock.queen']=1;g.directions.push('ground');w.generateDevelopmentOffers(w.draftWindowKey);const q=fixed(w,'evolve-zerg.air')!;assert.ok(q);
 const copy=make();copy.restoreRun(w.captureRun());const restored=fixed(copy,'evolve-zerg.air')!;assert.equal(restored.offerId,q.offerId);assert.equal(restored.minerals,q.minerals);
 assert.ok(copy.purchaseDevelopmentOffer(copy.draftWindowKey,restored.offerId,copy.expedition.shopRevision,g.ids[0]));assert.deepEqual(copy.expedition.building!.groups[0].directions,['ground','air']);assert.ok(copy.expedition.tech['unlock.mutalisk']);
});
test('wrong target, stale revision and insufficient funds cannot buy or consume fixed evolution',()=>{
 const w=fixture();w.expedition.tech['unlock.roach']=1;w.generateDevelopmentOffers(w.draftWindowKey);const q=fixed(w)!,wallet={...w.wallet},rev=w.expedition.shopRevision;
 assert.equal(w.purchaseDevelopmentOffer(w.draftWindowKey,q.offerId,rev,9999),false);assert.equal(w.purchaseDevelopmentOffer(w.draftWindowKey,q.offerId,rev-1,1),false);assert.deepEqual(w.wallet,wallet);
 w.wallet.minerals=w.wallet.gas=0;assert.equal(w.purchaseDevelopmentOffer(w.draftWindowKey,q.offerId,rev,1),false);assert.equal(w.expedition.developmentBought,false);assert.equal(w.rewardRound,'building');
});

test('opening evolution from an older qualified shelf saves newly frozen prices once without redrawing its cards',()=>{
 const w=fixture(),cards=structuredClone(w.rewards);w.expedition.tech['unlock.queen']=1;let changes=0;w.listeners.add(()=>changes++);
 assert.ok(w.prepareHatcheryEvolution());assert.equal(changes,1);const q=structuredClone(fixed(w));assert.ok(q);assert.deepEqual(w.rewards,cards);
 const rng=w.rngState;assert.ok(w.prepareHatcheryEvolution());assert.equal(changes,1);assert.equal(w.rngState,rng);assert.deepEqual(fixed(w),q);
 const copy=make();copy.restoreRun(w.captureRun());assert.deepEqual(fixed(copy),q);
});
