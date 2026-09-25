import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {MVP_TALENTS,allocationPoints} from '../src/data/mvp-talents';
import {HERO_IDS_BY_RACE} from '../src/data/heroes';
import type {Race} from '../src/data/races';

const races=['terran','zerg','protoss'] as const;
const difficulties=['easy','normal','hard','hell'] as const;
function profileFor(race:Race,points:0|41|80){
 const profile=new PermanentProfile();
 assert.equal(profile.award(`fixture:${race}`,1000,race),true);
 if(!points){assert.equal(profile.activatePreset(race,0),true);return profile;}
 const levels=Object.fromEntries(MVP_TALENTS.filter(node=>node.race===race&&(node.line==='resources'||points===80&&node.line==='soldiers'&&node.tier<=5||points===80&&node.line==='soldiers'&&node.id.endsWith('S14'))).map(node=>[node.id,node.maxRank]));
 if(points===80)levels[`${{terran:'T',zerg:'Z',protoss:'P'}[race]}-S15`]=1;
 assert.equal(allocationPoints(levels),points);
 const quote=profile.previewTalentAllocation(race,0,levels);assert.ok(quote);assert.equal(profile.commitTalentAllocation(quote,quote.expectedRevision),true);return profile;
}

test('three races × four difficulties × 0/41/80 points keep one frozen ruleset and their own difficulty through save',()=>{
 for(const race of races)for(const difficulty of difficulties)for(const points of [0,41,80] as const){
  const profile=profileFor(race,points),w=new World({race,difficulty,permanentProfile:profile,seed:31,waves:false,sandbox:true,terrain:false,obstacles:[]});
  assert.equal(w.start(points?HERO_IDS_BY_RACE[race][0]:undefined),true,`${race} ${difficulty} ${points}`);
  assert.equal(w.runConfig?.frozenTalents.allocated,points);
  for(let step=0;step<15;step++)w.step();
  const saved=w.captureRun(),other=new World({race:'terran',difficulty:'easy',seed:31,waves:false,sandbox:true,terrain:false,obstacles:[]});
  other.restoreRun(saved);
  assert.equal(other.runConfig?.rulesId,'mvp-1.0');assert.equal(other.expedition.race,race);assert.equal(other.difficulty,difficulty);
  assert.equal(other.runConfig?.frozenTalents.allocated,points);assert.deepEqual(other.runConfig?.frozenTalents.levels,w.runConfig?.frozenTalents.levels);
  assert.equal(other.paused,true);assert.equal(other.time,w.time);assert.equal(other.tick,w.tick);
  profile.respec('all');assert.equal(other.runConfig?.frozenTalents.allocated,points,'external respec cannot mutate a running build');
 }
});
