import test from 'node:test';
import assert from 'node:assert/strict';
import {battleScenePreload} from '../src/app/battle-scene-preload';
import {World} from '../src/simulation/world';
import {spawnMission} from '../src/simulation/missions/runtime';
import {campaign18StageConfig} from '../src/data/campaign18';
import {RACES} from '../src/data/races';

test('first three stages do not decode later mission buildings or campaign hives',()=>{
 for(const race of RACES)for(const difficulty of ['easy','normal','hard','hell'] as const)for(const stage of [1,2,3]){
  const plan=battleScenePreload({race,difficulty,stage});assert.deepEqual(plan,{workers:[],buildings:[],deaths:[],hive:false});
 }
});

test('real escort and repair spawns are covered without preparing foreign production buildings',()=>{
 for(const race of RACES)for(const kind of ['escort','repair','hives'] as const){
  const w=new World({race,difficulty:'normal',seed:529,sandbox:true,terrain:false,waves:false,obstacles:[]});w.start();w.stage=4;w.prepareStage();w.workers=5;
  assert(spawnMission(w,kind),race+':'+kind);const state=w.captureRun(),plan=battleScenePreload({race,difficulty:w.difficulty,stage:4});
  for(const b of w.missions.bodies.values()){
   const key=b.model==='hive'?'hatchery':b.model;assert([...plan.workers,...plan.buildings].includes(key),key);
   if(b.role==='repair'||b.role==='hive')assert(plan.deaths.includes(key),key+' death');
  }
  assert.deepEqual(w.captureRun(),state,'render dependency planning cannot alter World or RNG');
  if(race!=='protoss')assert(!plan.buildings.includes('robotics'));
  if(race!=='terran')assert(!plan.buildings.includes('factory'));
 }
});

test('hard cross-race exceptions and restored bodies override simple own-race filtering',()=>{
 const before=battleScenePreload({race:'terran',difficulty:'hard',stage:5}),after=battleScenePreload({race:'terran',difficulty:'hard',stage:6});
 assert.deepEqual(new Set(before.workers),new Set(['scv','drone','probe']));assert(before.buildings.includes('mission.tower'));assert(!before.buildings.includes('gateway'));assert(after.buildings.includes('gateway'));
 const restored=battleScenePreload({race:'terran',difficulty:'normal',stage:1,bodyModels:['gateway','probe'],hasHive:true});
 assert(restored.buildings.includes('gateway'));assert(restored.deaths.includes('gateway'));assert(restored.workers.includes('probe'));assert(restored.hive);
});

test('campaign hive preparation follows real structure budgets and endless does not preload campaign structures',()=>{
 for(const difficulty of ['easy','normal','hard','hell'] as const)for(let stage=1;stage<=18;stage++){
  const reserves=campaign18StageConfig(stage,difficulty).reserves;
  assert.equal(battleScenePreload({race:'terran',difficulty,stage}).hive,reserves.mainHive>0||reserves.expansionHive>0);
 }
 assert.deepEqual(battleScenePreload({race:'terran',difficulty:'hell',stage:18,endless:true}),{workers:[],buildings:[],deaths:[],hive:false});
});
