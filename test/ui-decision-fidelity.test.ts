import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';import {openTalentLoot,draftContext} from '../src/simulation/expedition-economy';import {canClaimTalentLoot,drawExpeditionReinforcements} from '../src/simulation/progression/expedition-drafts';
import {renderTalentLoot} from '../src/ui/presentation/decision-screens';import {offerView} from '../src/ui/presentation/intermission';import {encodeGraph} from '../src/persistence/graph-codec';
const state=(w:World)=>JSON.stringify(encodeGraph({run:w.captureRun(),profile:w.permanentProfile.exportJSON()}));
test('battle talent gifts use their actual free-claim eligibility rather than shop phase or wallet',()=>{
 for(const rarity of ['purple','orange'] as const){const w=new World({sandbox:true,waves:false,terrain:false,seed:73});w.start();w.wallet={minerals:0,gas:0};const receipt='ui:'+rarity;w.expedition.talentLootReceipts.push(receipt);assert.ok(openTalentLoot(w,receipt,rarity));const before=state(w),html=renderTalentLoot(w,null),buttons=html.match(/<button[^>]*data-action="talent-loot"[^>]*>/g)??[];
  for(const r of w.expedition.pendingTalentLoot!.offers.filter(r=>r.expeditionEffect.kind!=='elite')){const button=buttons.find(b=>b.includes('data-id="'+r.offerId+'"'));assert.ok(button,r.offerId);assert.equal(button.includes('disabled'),!canClaimTalentLoot(draftContext(w),r));}
  assert.equal(state(w),before);
 }
});
test('training artwork shows the actual two frozen targets, including a pair and a different family',()=>{
 const w=new World({race:'zerg',sandbox:true,waves:false,terrain:false,seed:91});w.start();w.expedition.familySlots.push('roach');w.addFamilyMember('roach',{x:3,z:0},1);w.stage=6;w.endStage();w.skipReward();let reward;
 for(let i=0;i<400&&!reward;i++){const ctx=draftContext(w);ctx.currentOffers=[];reward=drawExpeditionReinforcements(ctx).find(r=>r.expeditionEffect.kind==='training');}
 assert.ok(reward);const e=reward.expeditionEffect;assert.equal(e.kind,'training');if(e.kind!=='training')return;const before=state(w),view=offerView(w,reward),identities=e.targets.flatMap(t=>Array(t.family==='zergling'?2:1).fill(t.family));assert.equal(e.targets.length,2);assert.deepEqual(new Set(identities),new Set(['zergling','roach']));assert.deepEqual(view.bodyIdentities,identities);assert.equal(view.bodies,3);assert.equal(state(w),before);
});
