import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {MVP_TALENTS} from '../src/data/mvp-talents';
import {HERO_IDS_BY_RACE} from '../src/data/heroes';
import type {Race} from '../src/data/races';
import type {ExpeditionReward} from '../src/simulation/progression/expedition-drafts';

function worldWithResourceLine(race:Race,target?:string){
 const profile=new PermanentProfile(),levels=Object.fromEntries(MVP_TALENTS.filter(node=>node.race===race&&node.line==='resources').map(node=>[node.id,node.maxRank]));
 assert.equal(profile.award(`fixture:${race}`,59,race),true);
 const quote=profile.previewTalentAllocation(race,0,levels);assert.ok(quote);assert.equal(profile.commitTalentAllocation(quote,quote.expectedRevision),true);
 const w=new World({race,permanentProfile:profile,seed:21,waves:false,sandbox:true,terrain:false,obstacles:[]});
 if(target)assert.equal(w.setDevelopmentTarget(target),true);
 assert.equal(w.start(HERO_IDS_BY_RACE[race][0]),true);return w;
}
function facilityOffer(w:World,id:string){const offer=w.rewards.find((item):item is ExpeditionReward=>'expeditionEffect' in item&&item.expeditionEffect.kind==='development'&&item.expeditionEffect.definitionId===id);assert.ok(offer,`${id} offer missing`);return offer;}

test('R07 free first building and R10 paid second building share one action and one receipt',()=>{
 const w=worldWithResourceLine('terran','barracks');w.endStage();
 const offer=facilityOffer(w,'barracks'),before=w.expedition.facilities.filter(f=>f.kind==='barracks').length;
 w.wallet.minerals=10000;w.wallet.gas=10000;
 const minerals=w.wallet.minerals,gas=w.wallet.gas;
 w.random=()=>0;
 assert.equal(w.choose(offer.offerId),true);
 assert.equal(w.expedition.facilities.filter(f=>f.kind==='barracks').length,before+2);
 assert.equal(w.wallet.minerals,minerals-offer.minerals);
 assert.equal(w.wallet.gas,gas-offer.gas);
 assert.equal(w.choose(offer.offerId),false);
 assert.equal(w.expedition.facilities.filter(f=>f.kind==='barracks').length,before+2);
});

test('R09 keeps extra free claims in the original draft and blocks reroll after the first claim',()=>{
 const w=worldWithResourceLine('terran');w.endStage();assert.equal(w.skipReward(),true);assert.equal(w.rewardRound,'random');
 const initialIds=w.rewards.map(offer=>offer.offerId);
 assert.equal(initialIds.length,3);
 const first=w.rewards.find(offer=>w.canChooseReward(offer));assert.ok(first);
 assert.equal(w.choose(first.offerId),true);
 assert.equal(w.expedition.draftClaims.length,1);
 assert.equal(w.reroll(),false);
 assert.deepEqual(w.rewards.map(offer=>offer.offerId),initialIds);
 const next=w.rewards.find(offer=>w.canChooseReward(offer));assert.ok(next);
 assert.equal(w.choose(next.offerId),true);
 assert.equal(w.expedition.draftClaims.length,2);
 const restored=new World({race:'terran',seed:21,waves:false,sandbox:true,terrain:false,obstacles:[]});restored.restoreRun(w.captureRun());
 assert.deepEqual(restored.expedition.draftClaims,w.expedition.draftClaims);
 assert.equal(restored.choose(first.offerId),false);
 assert.equal(restored.reroll(),false);
});

test('R13 completes only a legal Zerg hatchery research and never charges a second research price',()=>{
 const w=worldWithResourceLine('zerg','hatchery');w.endStage();
 const offer=facilityOffer(w,'hatchery');w.wallet.minerals=10000;w.wallet.gas=10000;w.random=()=>0;
 const before=w.expedition.tech.ling_speed??0;
 assert.equal(w.choose(offer.offerId),true);
 assert.equal(w.expedition.tech.ling_speed,before+1);
 assert.equal(w.expedition.tech.roach_speed??0,0);
 assert.equal(w.expedition.tech.bane_speed??0,0);
 assert.equal(w.choose(offer.offerId),false);
 assert.equal(w.expedition.tech.ling_speed,before+1);
});

test('A10 paid elite contract is separate from the three free cards and cannot be bought twice',()=>{
 const profile=new PermanentProfile(59),levels=Object.fromEntries(MVP_TALENTS.filter(node=>node.race==='terran'&&node.line==='army').map(node=>[node.id,node.maxRank]));
 const quote=profile.previewTalentAllocation('terran',0,levels);assert.ok(quote);assert.equal(profile.commitTalentAllocation(quote,quote.expectedRevision),true);
 const w=new World({race:'terran',permanentProfile:profile,seed:21,waves:false,sandbox:true,terrain:false,obstacles:[]});assert.equal(w.start(),true);
 w.stage=3;w.endStage();assert.equal(w.skipReward(),true);
 const cards=w.rewards.map(offer=>offer.offerId),contract=w.expedition.eliteContracts[0];assert.ok(contract);assert.equal(contract.family,'marine');
 w.wallet.minerals=10000;w.wallet.gas=10000;const before={...w.wallet};
 assert.equal(w.buyEliteContract(contract.id),false,'three variants require an explicit choice');
 assert.equal(w.buyEliteContract(contract.id,'marine.2'),true);
 assert.deepEqual(w.rewards.map(offer=>offer.offerId),cards);
 assert.equal(w.wallet.minerals,before.minerals-contract.minerals);assert.equal(w.wallet.gas,before.gas-contract.gas);
 assert.equal(w.buyEliteContract(contract.id),false);
 const copy=new World({race:'terran',seed:21,waves:false,sandbox:true,terrain:false,obstacles:[]});copy.restoreRun(w.captureRun());
 assert.equal(copy.expedition.eliteContracts[0].purchased,true);assert.equal(copy.buyEliteContract(contract.id),false);
});
