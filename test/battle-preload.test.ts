import test from 'node:test';
import assert from 'node:assert/strict';
import {openingPreloadModels,campaignPreloadModels,plannedBossPreloadModels} from '../src/app/battle-preload-plan';
import {initialMenuAssetIds} from '../src/assets/menu-assets';
import {ASSETS,configurePlatformAssetUrl} from '../src/assets/manifest';
import {CAMPAIGN18_STAGES,campaign18Schedule,campaign18StageConfig} from '../src/data/campaign18';
import {TALENT_BY_ID} from '../src/data/mvp-talents';
import {ELITES} from '../src/data/elites';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS} from '../src/simulation/starship/types';
import {equipmentOpeningModels,equipmentRuntimeModels} from '../src/simulation/starship/asset-plan';
import {BackgroundPreparation} from '../src/app/background-preparation';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {HEROES} from '../src/data/heroes';
import {planFirstBossLoot} from '../src/simulation/boss-loot';

test('new-run roster covers actual three-stage enemy schedules and native production forms',()=>{
 for(const race of ['terran','zerg','protoss'] as const){const plan=openingPreloadModels(race);for(const difficulty of ['easy','normal','hard','hell'] as const)for(let stage=1;stage<=3;stage++){
  const schedule=campaign18Schedule(campaign18StageConfig(stage,difficulty),529);for(const wave of schedule.waves)for(const type of wave.types)assert.ok(plan.has(type),`${race}:${difficulty}:${stage}:${type}`);for(const special of schedule.specials)assert.ok(plan.has(special.type));
 }assert.ok(![...plan.keys()].some(key=>key.startsWith('hero.')||key.startsWith('elite.')));}
 const human=openingPreloadModels('terran');for(const type of ['tank','hellion.hellbat','viking.assault'])assert.ok(human.has(type));assert.ok(!human.has('ultralisk'));assert.ok(openingPreloadModels('protoss').has('interceptor'));
 for(let stage=1;stage<=18;stage++){const plan=campaignPreloadModels(stage,stage);for(const [type,share] of Object.entries(CAMPAIGN18_STAGES[stage-1].mix))if(share)assert.ok(plan.has(type));}
});

test('mercenary talent covers every possible future variant, without loading unchosen heroes',()=>{
 for(const race of ['terran','zerg','protoss'] as const){const talent=[...TALENT_BY_ID.values()].find(t=>t.race===race&&t.semanticId==='mercenary')!;assert.ok(talent);const plan=openingPreloadModels(race,{[talent.id]:1});const families=race==='terran'?['marine','marauder','reaper']:race==='zerg'?['zergling','roach','hydralisk']:['zealot','stalker','immortal'];for(const elite of Object.values(ELITES))if(families.includes(elite.family))assert.ok(plan.has(elite.model));assert.ok(![...plan.keys()].some(key=>key.startsWith('hero.')));}
});

test('stage three prepares exactly its saved reward instead of the entire Boss pool',()=>{
 for(const race of ['terran','zerg','protoss'] as const){const w=new World({race,seed:529,terrain:false,waves:false,equipmentAccount:newEquipmentAccount(529)});w.start();
  assert.equal(plannedBossPreloadModels(w.expedition.firstBossLoot).size,0);w.stage=3;planFirstBossLoot(w);const plan=w.expedition.firstBossLoot!;assert.ok(plan);const models=plannedBossPreloadModels(plan);assert.equal(models.size,1);
  const effect=plan.reward.expeditionEffect;if(effect.kind==='elite')assert.ok(models.has(ELITES[plan.variant!].model));else if(effect.kind==='hero')assert.ok(models.has(HEROES[effect.heroId as keyof typeof HEROES].model));else assert.fail('Fresh race has a legal unit reward');
  const view=Object.assign(Object.create(BattleRenderer.prototype),{world:w,contextEpoch:0,assetsPending:0,backgroundBusy:false,gpu:new Map()});const jobs=view.battleBackgroundJobs(async()=>{});assert.equal(jobs.filter(j=>j.key.startsWith('boss:')).length,1);assert.ok(jobs[0].key.startsWith('boss:'));
 }
});

test('every selected Boss identity references shipped bodies and native forms',()=>{
 const w=new World({race:'terran',seed:529,terrain:false,waves:false,equipmentAccount:newEquipmentAccount(529)});w.start();w.stage=3;planFirstBossLoot(w);const original=w.expedition.firstBossLoot!;
 for(const [id,elite] of Object.entries(ELITES)){const plan={...original,variant:id as keyof typeof ELITES,reward:{...original.reward,expeditionEffect:{kind:'elite' as const,eliteId:id,family:elite.family}}};for(const key of plannedBossPreloadModels(plan).keys())assert.ok(ASSETS.has('model.'+key),key);}
 for(const [id,hero] of Object.entries(HEROES)){const plan={...original,variant:null,reward:{...original.reward,expeditionEffect:{kind:'hero' as const,heroId:id}}};const keys=[...plannedBossPreloadModels(plan).keys()];assert.deepEqual(keys,[hero.model]);assert.ok(ASSETS.has('model.'+keys[0]));}
});

test('equipment delivery planning includes random evolution pools and leaves the live account/RNG intact',()=>{
 for(const family of ['training','bounty'] as const){const w=new World({race:'terran',seed:529,terrain:false,waves:false,equipmentAccount:newEquipmentAccount(529)});
  for(const slot of ATTRIBUTE_SLOTS.slice(0,4)){const item=grantEquipment(w.starship.account,{template:`set.advanced.${family}.4`,race:'terran',slot},'gear:'+slot,{kind:'warehouse'});assert.ok(item.ok);assert.ok(w.equipItem(item.value.id,slot).ok);}
  const before=structuredClone(w.starship.account),rng=w.rngState,profile=w.permanentProfile.exportJSON(),plan=equipmentOpeningModels(w,'terran',null,0),later=equipmentRuntimeModels(w,'terran');
  assert.ok(plan.some(m=>m.key==='elite.marine.1'));assert.ok(later.some(m=>m.key==='elite.thor.1'));if(family==='bounty')assert.ok(later.some(m=>m.key==='hero.raynor'));assert.deepEqual(w.starship.account,before);assert.equal(w.rngState,rng);assert.equal(w.permanentProfile.exportJSON(),profile);
  for(const model of plan)assert.ok(ASSETS.has('model.'+model.key),model.key);
 }
});

test('battle jobs prepare the full deferred roster without holding simulation or changing World',async()=>{
 const w=new World({race:'terran',seed:529,terrain:false,waves:false,equipmentAccount:newEquipmentAccount(529)});w.start();
 const constructed:string[]=[];const view=Object.assign(Object.create(BattleRenderer.prototype),{world:w,contextEpoch:0,assetsPending:0,backgroundBusy:false,gpu:new Map(),streamUnitVariant:async(key:string)=>{constructed.push(key);return true;}});
 const before={time:w.time,tick:w.tick,rng:w.rngState,account:structuredClone(w.starship.account),entities:structuredClone([...w.entities])};
 try{configurePlatformAssetUrl(()=>null);const jobs=view.battleBackgroundJobs(async()=>{}) as {key:string;run:()=>Promise<void>;paced?:boolean}[];assert.ok(jobs.length>0);assert.equal(new Set(jobs.map(j=>j.key)).size,jobs.length);assert.ok(jobs.every(j=>j.paced));assert.equal(jobs.filter(j=>j.key.startsWith('template:')).length,5);await jobs[0].run();assert.equal(constructed.length,1);assert.equal(view.assetsPending,0);assert.equal(view.backgroundBusy,false);assert.deepEqual({time:w.time,tick:w.tick,rng:w.rngState,account:w.starship.account,entities:[...w.entities]},before);}
 finally{configurePlatformAssetUrl(null);}
});

test('required entrance drains optional work even while frame budget and input gates are closed',async()=>{
 const lane=new BackgroundPreparation(()=>0,()=>true);let started=false,finished=false;
 lane.select([{key:'future-file',run:async()=>{started=true;lane.input();await lane.checkpoint();finished=true;}}]);lane.tick();await Promise.resolve();assert.ok(started);
 lane.frame(100);const release=await lane.enter();assert.ok(finished);assert.equal(lane.busy,false);release();assert.equal(lane.report().held,0);
 await assert.rejects(lane.checkpoint(()=>true),/取消/);
});

test('first menu retains shared frames and faction icons while catalog icons wait for their pages',()=>{
 const ids=['ui.cover.nova','ui.native.frame','building.barracks','unit.marine','unit.zergling','unit.zealot','unit.thor','hero.raynor','tech.stim','skill.blink','model.thor'];assert.deepEqual(initialMenuAssetIds(ids),ids.slice(0,6));
});

test('held movement input defers distant files but cannot starve the chosen Boss reward',async()=>{
 const lane=new BackgroundPreparation(()=>0,()=>true);let distant=false,chosen=false;lane.frame(16);lane.input();
 lane.select([{key:'distant',run:async()=>{distant=true;}}]);lane.tick();await Promise.resolve();assert.equal(distant,false);
 lane.select([{key:'chosen',priority:true,run:async()=>{await lane.checkpoint(()=>false,true);chosen=true;}}]);lane.tick();
 await new Promise(resolve=>setTimeout(resolve,40));assert.equal(chosen,true);assert.equal(lane.busy,false);
});

test('an already active file checkpoint drains for a newly chosen reward during held input',async()=>{
 const lane=new BackgroundPreparation(()=>0,()=>true);let drained=false,chosen=false;
 lane.select([{key:'old-file',run:async()=>{lane.input();await lane.checkpoint();drained=true;}}]);lane.tick();await Promise.resolve();
 lane.select([{key:'chosen',priority:true,run:async()=>{await lane.checkpoint(()=>false,true);chosen=true;}}]);
 await new Promise(resolve=>setTimeout(resolve,40));assert.equal(drained,true);lane.tick();
 await new Promise(resolve=>setTimeout(resolve,40));assert.equal(chosen,true);
});
