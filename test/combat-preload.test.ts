import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {combatPreloadPlan} from '../src/app/combat-preload-plan';
import {COMBAT_FX_PROFILES} from '../src/render/effects/combat-fx-profile';
import {SOURCE_EFFECTS} from '../src/render/effects/source/player';
import {sourceDependencies} from '../src/render/effects/source/materials';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {World} from '../src/simulation/world';
import {RACES,FAMILIES_BY_RACE} from '../src/data/races';
import {HEROES,HERO_IDS_BY_RACE} from '../src/data/heroes';

test('opening keeps complete own/enemy weapon routes, shared gear and encounter effects without unrelated heroes',()=>{
 const common=['marine','zealot','stalker','shield','sentry'];
 for(const race of RACES){
  const plan=combatPreloadPlan({race,stage:1,difficulty:'normal'});
  assert.deepEqual(plan.heroes,[]);
  for(const profile of COMBAT_FX_PROFILES.values())if([...FAMILIES_BY_RACE[race],...FAMILIES_BY_RACE.zerg,...common].includes(profile.family)){
   for(const id of Object.values(profile.models).flat())assert(plan.sources.includes(id),race+':'+id);
  }
  // Independent channels can reuse a native weapon resource. Catch that closure
  // even when its ordinary unit family is absent from the starting army.
  for(const file of ['equipment-effects.ts','enemy-special-source.ts','fun-source-effects.ts']){
   const text=fs.readFileSync(new URL('../src/render/effects/'+file,import.meta.url),'utf8');
   for(const id of Object.keys(SOURCE_EFFECTS))if(text.includes("'"+id+"'"))assert(plan.sources.includes(id),race+':'+file+':'+id);
  }
  assert(plan.sources.length<Object.keys(SOURCE_EFFECTS).length);
 }
});

test('selected hero and equipment replay identities prepare their effects without activating unrelated hero kits',()=>{
 for(const [id,data]of Object.entries(HEROES)){
  const plan=combatPreloadPlan({race:data.race,stage:1,difficulty:'normal',identities:{selectedHero:id}});
  assert.deepEqual(plan.heroes,[id]);
 }
 const equipment=combatPreloadPlan({race:'zerg',stage:1,difficulty:'normal',identities:{effects:[{binding:{hero:'nova'}},{binding:{hero:'artanis'}}]}});
 assert.deepEqual(equipment.heroes,['artanis','nova']);
 const flagship=combatPreloadPlan({race:'terran',stage:1,difficulty:'normal',models:new Map([['hero.purifier_flagship','purifier_flagship']])});
 assert.deepEqual(flagship.heroes,['purifier_flagship']);
});

test('restore includes pending foreign orders, flights and expired-source casts without changing native state or RNG',()=>{
 const world=new World({race:'terran',sandbox:true,terrain:false,waves:false,seed:529});world.start();
 const snapshot=world.captureRun(),before=structuredClone(snapshot);
 const deferred={snapshot,orders:new Map([[7,{family:'carrier'}]]),casts:new Set([{hero:'kerrigan'}]),flights:[{source:{unitType:'high_templar'}}]};
 const plan=combatPreloadPlan({race:'terran',stage:1,difficulty:'normal',identities:deferred});
 for(const key of ['carrier','interceptor','high-templar','storm'])for(const id of Object.values(COMBAT_FX_PROFILES.get(key)!.models).flat())assert(plan.sources.includes(id),id);
 assert.deepEqual(plan.heroes,['kerrigan']);assert.deepEqual(snapshot,before);assert.deepEqual(world.captureRun(),before);
});

test('first boss and later mission rewards retain every legal own-race hero candidate',()=>{
 for(const race of RACES)for(const stage of [3,4,18]){
  const plan=combatPreloadPlan({race,stage,difficulty:'hell'});
  assert.deepEqual(plan.heroes,[...HERO_IDS_BY_RACE[race]].sort());
 }
});

test('renderer file and preparation jobs use the same scoped dependency closure',()=>{
 const plan=combatPreloadPlan({race:'terran',stage:1,difficulty:'normal',identities:'nova'}),prototype=BattleRenderer.prototype as any;
 const ids:string[]=prototype.commonAssetIds(plan),jobs:{key:string}[]=prototype.commonTasks(plan);
 for(const id of plan.sources){assert(jobs.some(j=>j.key==='source-combat-effects:'+id));for(const dep of sourceDependencies(SOURCE_EFFECTS[id]))assert(ids.includes(dep),dep);}
 assert(jobs.some(j=>j.key==='hero:nova'));assert(!jobs.some(j=>j.key==='hero:raynor'||j.key==='zerg-heroes'||j.key==='protoss-heroes'));
 const missing=Object.keys(SOURCE_EFFECTS).filter(id=>!plan.sources.includes(id));assert(missing.length>0);
 for(const id of missing)assert(!jobs.some(j=>j.key==='source-combat-effects:'+id));
});

test('failed or context-invalid common work is never marked prepared',async()=>{
 const view:any=Object.assign(Object.create(BattleRenderer.prototype),{contextEpoch:0,preparedCommon:new Set()});
 await assert.rejects(view.commonTask('hero:nova',async()=>{throw Error('read failed');}),/read failed/);
 assert.equal(view.preparedCommon.size,0);
 await assert.rejects(view.commonTask('hero:nova',async()=>{view.contextEpoch++;}),/失效/);
 assert.equal(view.preparedCommon.size,0);let calls=0;
 await view.commonTask('hero:nova',async()=>{calls++;});await view.commonTask('hero:nova',async()=>{calls++;});assert.equal(calls,1);
 view.contextEpoch++;await view.commonTask('hero:nova',async()=>{calls++;});assert.equal(calls,2);
});
