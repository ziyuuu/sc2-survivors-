import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {MVP_TALENTS} from '../src/data/mvp-talents';

function makeWorld(){const profile=new PermanentProfile(59),levels=Object.fromEntries(MVP_TALENTS.filter(node=>node.race==='terran'&&node.line==='resources').map(node=>[node.id,node.maxRank]));const quote=profile.previewTalentAllocation('terran',0,levels);assert.ok(quote);assert.ok(profile.commitTalentAllocation(quote,quote.expectedRevision));const w=new World({race:'terran',permanentProfile:profile,seed:21,waves:false,sandbox:true,terrain:false,obstacles:[]});assert.equal(w.start('raynor'),true);return w;}
test('R14 makes independent purple and orange free choices that survive save and cannot be claimed twice',()=>{
 const w=makeWorld(),marine=w.familyUnits('marine')[0],enemy=w.addUnit('zergling','zerg',2,0);w.expedition.talentLootRngState=9721;
 w.hit(enemy,enemy.maxHp+100,[],1,'terran',0,1,marine.id);
 const drops=w.rewardDrops.filter(drop=>drop.talentLoot);assert.deepEqual(drops.map(drop=>drop.talentLoot?.rarity),['orange','purple']);assert.equal(new Set(drops.map(drop=>drop.talentLoot?.receipt)).size,2);
 const orange=drops[0];assert.equal(w.collectRewardDrop(orange.id),true);const pending=w.expedition.pendingTalentLoot!;assert.equal(w.requiresPlayerDecision,true);assert.equal(pending.offers.length,3);assert.ok(pending.offers.every(offer=>offer.rarity==='orange'&&offer.minerals===0&&offer.gas===0));
 const copy=new World({race:'terran',permanentProfile:w.permanentProfile,seed:21,waves:false,sandbox:true,terrain:false,obstacles:[]});copy.restoreRun(w.captureRun());assert.deepEqual(copy.expedition.pendingTalentLoot,pending);
 const offer=pending.offers.find(item=>item.expeditionEffect.kind==='resource')??pending.offers[0];assert.equal(copy.claimTalentLoot(pending.receipt,offer.offerId),true);assert.equal(copy.claimTalentLoot(pending.receipt,offer.offerId),false);assert.equal(copy.expedition.pendingTalentLoot,null);
 assert.equal(copy.collectRewardDrop(orange.id),false);assert.equal(copy.collectRewardDrop(drops[1].id),true);assert.equal(copy.expedition.pendingTalentLoot?.rarity,'purple');
});
