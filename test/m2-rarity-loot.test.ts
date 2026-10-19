import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {MVP_TALENTS} from '../src/data/mvp-talents';

function makeWorld(){const profile=new PermanentProfile(59),levels=Object.fromEntries(MVP_TALENTS.filter(node=>node.race==='terran'&&node.line==='resources').map(node=>[node.id,node.maxRank]));const quote=profile.previewTalentAllocation('terran',0,levels);assert.ok(quote);assert.ok(profile.commitTalentAllocation(quote,quote.expectedRevision));const w=new World({race:'terran',permanentProfile:profile,seed:21,waves:false,sandbox:true,terrain:false,obstacles:[]});assert.equal(w.start('raynor'),true);return w;}
test('retired rarity talent cannot re-enable non-Boss card drops',()=>{
 const w=makeWorld(),marine=w.familyUnits('marine')[0];w.expedition.talentLootRngState=9721;
 for(const tier of ['regular','elite'] as const){const enemy=w.addUnit('zergling','zerg',2,0);enemy.enemyTier=tier;w.hit(enemy,enemy.maxHp+100,[],1,'terran',0,1,marine.id);}
 assert.equal(w.rewardDrops.length,0);assert.equal(w.expedition.talentLootRngState,9721);assert.equal(w.expedition.talentLootReceipts.length,0);
});
