import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {campaignPreloadModels,plannedBossPreloadModels,openingPreloadModels} from '../src/app/battle-preload-plan';
import {planFirstBossLoot} from '../src/simulation/boss-loot';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {HEROES} from '../src/data/heroes';
import {displayLoadModelKey} from '../src/render/materials/elite-visual';

for(const race of ['terran','zerg','protoss'] as const)test(`${race} mobile early stages retain required units and selected Boss reward without distant GPU preload`,()=>{
 const w=new World({race,seed:529,terrain:false,waves:false,equipmentAccount:newEquipmentAccount(529)});w.start();
 const view=Object.assign(Object.create(BattleRenderer.prototype),{world:w,memoryConstrainedPreload:true,contextEpoch:0,gpu:new Map()});
 for(let stage=1;stage<=3;stage++){
  w.stage=stage;if(stage===3)planFirstBossLoot(w);
  const before=w.captureRun(),full=view.completePreloadModels(),near=view.backgroundPreloadModels();
  for(const [key,type]of [...openingPreloadModels(race),...campaignPreloadModels(stage,stage+1),...plannedBossPreloadModels(w.expedition.firstBossLoot)])assert.equal(near.get(key),type,key);
  assert.ok(near.size<full.size*.6,`${near.size}/${full.size}`);
  const selected=new Set(plannedBossPreloadModels(w.expedition.firstBossLoot).keys());
  for(const hero of Object.values(HEROES).filter(h=>h.race===race&&!selected.has(h.model)))assert.ok(!near.has(displayLoadModelKey(hero.model,hero.baseFamily)),hero.model);
  const jobs=view.battleBackgroundJobs(async()=>{});assert.ok(jobs.every(job=>!job.key.startsWith('template:')));
  assert.deepEqual(w.captureRun(),before);
 }
});

test('mobile preload follows later enemies and keeps late/endless static preparations available',()=>{
 const w=new World({race:'terran',seed:529,terrain:false,waves:false});w.start();
 const view=Object.assign(Object.create(BattleRenderer.prototype),{world:w,memoryConstrainedPreload:true,contextEpoch:0,gpu:new Map()});
 for(const stage of [4,8,12,17]){w.stage=stage;const models=view.backgroundPreloadModels();for(const [key,type]of campaignPreloadModels(stage,stage+1))assert.equal(models.get(key),type);}
 assert.equal(view.battleBackgroundJobs(async()=>{}).filter(j=>j.key.startsWith('template:')).length,5);
 w.endless={round:1,startedAt:0,elites:0,bosses:0};for(const [key,type]of campaignPreloadModels(1,18))assert.equal(view.backgroundPreloadModels().get(key),type);
});
