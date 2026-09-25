import test from 'node:test';
import assert from 'node:assert/strict';
import {MVP_TALENTS,allocationPoints} from '../src/data/mvp-talents';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {World} from '../src/simulation/world';
import type {Race} from '../src/data/races';

const races=['terran','zerg','protoss'] as const;
const prefix:Record<Race,string>={terran:'T',zerg:'Z',protoss:'P'};
function eighty(race:Race){
 const levels=Object.fromEntries(MVP_TALENTS.filter(node=>node.race===race&&(
  node.line==='resources'||node.line==='soldiers'&&node.tier<=5||node.id===`${prefix[race]}-S14`
 )).map(node=>[node.id,node.maxRank]));
 levels[`${prefix[race]}-S15`]=1;
 assert.equal(allocationPoints(levels),80);
 return levels;
}

test('three races can each reach level 80 with separate earned resources and paid allocations',()=>{
 const profile=new PermanentProfile();
 for(const race of races){
  assert.equal(profile.award(`seed:${race}`,110,race),true);
  const preview=profile.previewTalentAllocation(race,0,eighty(race));
  assert.ok(preview);assert.equal(preview.cost,110);
  assert.equal(profile.commitTalentAllocation(preview,preview.expectedRevision),true);
  assert.equal(profile.raceBalance(race),0);
 }
 for(const race of races){
  assert.equal(profile.levelFor(race),80);
  assert.equal(profile.spentFor(race),110);
  assert.equal(profile.activePresetFor(race),0);
 }
 assert.equal(profile.activatePreset('terran',0),true);
 assert.equal(profile.playerLevel,80);
 assert.equal(profile.respec('all'),true);
 assert.equal(profile.raceBalance('terran'),110);
 assert.equal(profile.levelFor('terran'),0);
 assert.equal(profile.levelFor('zerg'),80);
 assert.equal(profile.levelFor('protoss'),80);
 const copy=PermanentProfile.parseJSON(profile.exportJSON());
 assert.ok(copy);assert.deepEqual(copy.toSnapshot(),profile.toSnapshot());
});

test('battle reward is credited to frozen run race even if the visible profile race changes',()=>{
 const profile=new PermanentProfile();
 const world=new World({race:'zerg',permanentProfile:profile,terrain:false,waves:false,sandbox:true});
 assert.equal(world.start(),true);
 assert.equal(profile.activatePreset('terran',0),true);
 assert.equal(world.awardPermanentResource('zerg:stage:3',2),true);
 assert.equal(profile.raceBalance('zerg'),2);
 assert.equal(profile.raceBalance('terran'),0);
 assert.equal(world.awardPermanentResource('zerg:stage:3',2),false);
});

test('switching races and saving the current profile preserves each paid wallet and level',()=>{
 const profile=new PermanentProfile();
 assert.equal(profile.award('terran-earn',9,'terran'),true);
 assert.equal(profile.award('zerg-earn',4,'zerg'),true);
 assert.equal(profile.selectRace('terran'),true);
 assert.equal(profile.buy('T-R01'),true);
 const world=new World({race:'zerg',permanentProfile:profile,terrain:false,waves:false,sandbox:true});
 assert.equal(world.selectRace('zerg'),true);
 assert.equal(profile.levelFor('terran'),1);
 assert.equal(profile.raceBalance('terran'),8);
 assert.equal(profile.levelFor('zerg'),0);
 assert.equal(profile.raceBalance('zerg'),4);
 assert.equal(profile.buy('Z-R01'),true);
 assert.equal(world.start(),true);
 assert.equal(world.runConfig?.frozenTalents.allocated,1);
 const copy=PermanentProfile.parseJSON(profile.exportJSON());
 assert.ok(copy);assert.deepEqual(copy.toSnapshot(),profile.toSnapshot());
 assert.equal(copy.levelFor('terran'),1);
 assert.equal(copy.levelFor('zerg'),1);
 assert.equal(copy.raceBalance('protoss'),0);
});
