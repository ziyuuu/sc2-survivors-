// HISTORICAL pre-fix investigation for V06-QUEEN-UNLOCK-001 at 674c528.
// Its assertions expect the stale-card bug. Current validation is
// test/development-unlock-feedback.test.ts; never overwrite the historical report with a fixed build.
// Uses controlled stage completion, ample test currency and JSON save roundtrips;
// does not claim natural gameplay, physical-device, or deployed-build coverage.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {World} from '../src/simulation/world';
import {encodeGraph,decodeGraph} from '../src/persistence/graph-codec';
import {PROJECTS,canUnlock,candidates,eligible,project,newBuildingState} from '../src/simulation/building/rules';
import {drawExpeditionReinforcements,type ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {draftContext} from '../src/simulation/expedition-economy';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS} from '../src/simulation/starship/types';
import {offerView} from '../src/ui/presentation/intermission';
import {referenceCard} from '../src/ui/presentation/reference-card';
const options={race:'zerg' as const,seed:529,sandbox:true,waves:false,terrain:false as const,obstacles:[]};
const queen='unlock.queen';
const isQueen=(r:World['rewards'][number])=>r.value===queen;
function world(seed=529){return new World({...options,seed,equipmentAccount:newEquipmentAccount(seed)});}
function start(w:World){assert.ok(w.start());w.wallet={minerals:100000,gas:100000};}
function next(w:World){while(w.phase==='reward')assert.ok(w.skipReward());assert.equal(w.phase,'battle');w.endStage();assert.equal(w.rewardRound,'building');}
function buy(w:World,id:string){const r=w.rewards.find(r=>r.value===id);assert.ok(r,'missing '+id);assert.ok(w.purchaseDevelopmentOffer(w.draftWindowKey,r.offerId,w.expedition.shopRevision));return r;}
function restored(w:World){const other=world();other.restoreRun(decodeGraph(JSON.parse(JSON.stringify(encodeGraph(w.captureRun())))) as ReturnType<World['captureRun']>);return other;}
function absent(w:World){assert.equal(w.expedition.tech[queen],1);assert.ok(w.isFamilyAvailable('queen'));assert.equal(canUnlock(w.expedition.building!,'queen'),false);assert.equal(eligible(w.expedition.building!,project(queen)!),false);assert.ok(!w.rewards.some(isQueen));}
const checks:object[]=[];
let shelves=0;
for(const seed of [529,41,93]){
 let w=world(seed);assert.ok(w.setDevelopmentTarget(queen));start(w);w.endStage();const old=buy(w,queen);absent(w);
 const paid={...w.wallet};assert.equal(w.choose(old.offerId),false);assert.deepEqual(w.wallet,paid);
 w=restored(w);absent(w);
 for(const id of ['evolve-zerg.evolution','evolve-zerg.air','hatchery','system.zerg.basic','research.zerg.basic.weapon','research.zerg.basic.defense']){
  assert.ok(w.setDevelopmentTarget(id));next(w);assert.ok(w.setDevelopmentDirection(project(id)!.line!));buy(w,id);absent(w);w=restored(w);absent(w);
 }
 assert.ok(w.setDevelopmentTarget(queen));next(w);assert.ok(w.setDevelopmentDirection('zerg.basic'));
 for(let i=0;i<12;i++){assert.ok(w.refreshOffers());absent(w);shelves++;}
 w=restored(w);absent(w);checks.push({case:'paid-unlock-progression-and-save',seed,upgrades:6,rerolls:12,duplicateAppeared:false,repeatPurchase:false});
}
// All family unlocks share the same one-time eligibility guard.
const allUnlocks=PROJECTS.filter(p=>p.unlock==='family');
for(const d of allUnlocks){const b=newBuildingState(d.race);b.tech[d.id]=1;assert.equal(eligible(b,d),false);assert.ok(!candidates(b,d.line!).some(x=>x.id===d.id));}
checks.push({case:'all-family-unlock-eligibility',count:allUnlocks.length,duplicates:0});
// Buying units and unlocking continuous production are intentionally distinct.
{
 const w=world();start(w);w.endStage();w.skipReward();let q:ExpeditionReward|undefined;
 for(let i=0;i<128&&!q;i++){w.rewards=drawExpeditionReinforcements(draftContext(w),true);q=w.rewards.find(r=>{const e=(r as ExpeditionReward).expeditionEffect;return e.kind==='supply'&&e.family==='queen'&&e.mode==='direct';}) as ExpeditionReward|undefined;}
 assert.ok(q);const display=offerView(w,q);assert.ok(w.choose(q.offerId));assert.ok(w.familyUnits('queen').length>0);assert.equal(w.expedition.tech[queen]??0,0);assert.equal(w.isFamilyAvailable('queen'),false);
 w.setDevelopmentTarget(queen);next(w);assert.ok(w.rewards.some(isQueen));assert.ok(w.canChooseReward(w.rewards.find(isQueen)!));
 checks.push({case:'queen-unit-purchase-is-not-production-unlock',unitCard:q.name,visibleSummary:display.stat,visibleDetail:display.detail,unitCount:w.familyUnits('queen').length,productionUnlocked:false,unlockCardOffered:true});
}
// An extra development purchase must not offer the manually purchased unlock again.
{
 const w=world();for(const slot of ATTRIBUTE_SLOTS.slice(0,4)){const r=grantEquipment(w.starship.account,{template:'set.advanced.choice.4',race:'zerg',slot},'queen-feedback:'+slot,{kind:'warehouse'});assert.ok(r.ok);assert.ok(w.equipItem(r.value.id,slot).ok);}
 assert.ok(w.setDevelopmentTarget(queen));start(w);w.endStage();buy(w,queen);assert.equal(w.rewardRound,'building');absent(w);const copy=restored(w);absent(copy);
 checks.push({case:'extra-development-choice-after-paid-unlock',duplicateAppeared:false});
}
// Confirmed defect: free research invalidates a sibling cached offer while
// development_double retains that offer for the extra choice.
{
 const w=world();for(const [template,slot] of [...ATTRIBUTE_SLOTS.slice(0,4).map(slot=>['set.advanced.choice.4',slot] as const),['module.contract.4','logistics'] as const]){
  const r=grantEquipment(w.starship.account,{template,race:'zerg',slot},'queen-stale:'+slot,{kind:'warehouse'});assert.ok(r.ok);assert.ok(w.equipItem(r.value.id,slot).ok);
 }
 assert.ok(w.setDevelopmentTarget(queen));start(w);w.endStage();assert.ok(w.rewards.some(isQueen));buy(w,'hatchery');
 assert.equal(w.expedition.tech[queen],1);assert.ok(w.isFamilyAvailable('queen'));assert.equal(w.rewardRound,'building');
 const q=w.rewards.find(isQueen)!;assert.ok(q);const display=offerView(w,q),html=referenceCard(display);assert.equal(display.locked,true);assert.ok(html.includes('待解锁'));assert.match(html,/data-action="development-purchase"[^>]*disabled/);
 const cash={...w.wallet};assert.equal(w.canChooseReward(q),false);assert.equal(w.choose(q.offerId),false);assert.deepEqual(w.wallet,cash);
 const copy=restored(w);assert.ok(copy.rewards.some(isQueen));assert.equal(copy.expedition.tech[queen],1);assert.equal(copy.canChooseReward(copy.rewards.find(isQueen)!),false);
 assert.ok(w.refreshOffers());absent(w);next(copy);absent(copy);
 checks.push({case:'confirmed-stale-unlock-after-free-research-with-extra-choice',seed:529,equipment:['set.advanced.choice.4 ×4','module.contract.4'],target:queen,purchased:'hatchery',productionUnlocked:true,staleCardVisible:true,staleStatus:'待解锁',purchaseButtonDisabled:true,repeatPurchase:false,extraCharge:0,persistsAfterSaveRestore:true,clearedByRefresh:true,clearedNextWindow:true});
}
const report={date:'2026-10-29',finding:'V06-QUEEN-UNLOCK-001',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Controlled native World transactions, stage transitions, graph-codec JSON save roundtrips, and actual presentation HTML; not a browser or original user save.',checks,rerolledShelves:shelves,conclusion:'Confirmed stale Queen unlock card after hatchery free research with an extra development choice; the card incorrectly says locked, but repeat purchase is rejected without a charge. Ordinary paid unlock progression does not reproduce it. The original user scenario remains unconfirmed.',cause:{freeResearch:'src/simulation/building/rules.ts:121-143',retainedOffers:'src/simulation/starship/economy.ts:21-22',cacheRead:'src/simulation/building/rules.ts:99-100',misleadingStatus:'src/ui/presentation/reference-card.ts:13'},limitations:['Original user card, action sequence, save and build are unknown.','Test stages are ended programmatically; not natural combat.','Initial diagnostic attempts used an invalid battle-time target command and raw JSON without graph decoding; those harness errors were corrected before these successful checks.'],productionFilesChanged:false,deployed:false};
fs.writeFileSync('reports/qa/queen-unlock-inspection-20261029.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
