import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {RACES,type Race} from '../src/data/races';
import {HEROES,type HeroId} from '../src/data/heroes';
import {ELITES,type EliteId} from '../src/data/elites';
import {ELITE_VISUAL_PROFILES} from '../src/data/elite-visual-profiles';
import {TALENT_BY_ID} from '../src/data/mvp-talents';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS} from '../src/simulation/starship/types';
import type {RunSnapshot} from '../src/simulation/persistence/run-snapshot';
import {displayLoadModelKey,displayAssetModelKey} from '../src/render/materials/elite-visual';
import {ASSETS} from '../src/assets/manifest';
import type {CombatPreloadPlan} from '../src/app/combat-preload-plan';
import {createContentPlan} from '../src/simulation/progression/run-content';

function world(race:Race='terran'){const w=new World({race,seed:529,sandbox:true,terrain:false,waves:false,equipmentAccount:newEquipmentAccount(529)});w.start();return w;}
async function prepare(snapshot:RunSnapshot,current=world()){
 const models=new Map<string,string>(),common:CombatPreloadPlan[]=[];let endless=0;
 const renderer=Object.assign(Object.create(BattleRenderer.prototype),{world:current,gpu:new Map(),retainRequiredUnits:()=>{},prepareRescueAssets:async()=>{},prepareMissionAssets:async()=>{},prepareCommonAssets:async(plan:CombatPreloadPlan)=>common.push(plan),ensureUnitVariant:async(key:string,type:string)=>{models.set(key,type);return true;},prepareEndlessAssets:async()=>{endless++;}});
 const before=structuredClone(snapshot),live=current.captureRun();await renderer.prepareSnapshotAssets(snapshot);
 assert.deepEqual(snapshot,before);assert.deepEqual(current.captureRun(),live);
 for(const key of models.keys())assert.ok(ASSETS.has('model.'+displayAssetModelKey(key)),key);
 return {models,common:common[0],endless};
}

for(const race of RACES)test(`${race} first intermission restore omits unowned heroes/elites and endless templates`,async()=>{
 const w=world(race);w.endStage();const result=await prepare(w.captureRun());
 assert.deepEqual(result.common.heroes,[]);assert.equal(result.endless,0);
 assert.ok(![...result.models.keys()].some(key=>key.startsWith('hero.')||key.startsWith('elite.')));
 assert.ok(result.models.has('fun-infested-marine'));assert.ok(result.models.has('ultralisk'));
});

test('seeded save restores the purchased nydus before the shop spawns its first body',async()=>{
 const w=new World({race:'terran',difficulty:'easy',seed:529,sandbox:true,terrain:false,waves:false});
 w.start(undefined,createContentPlan(529,'terran','easy'));
 const snapshot=w.captureRun();
 snapshot.state.stage=16;
 assert(!(await prepare(snapshot)).models.has('fun-nydus'));
 snapshot.state.funShop.levels.nydus=1;
 assert.equal((await prepare(snapshot)).models.get('fun-nydus'),'roach');
});

test('owned heroes remain prepared after their body dies, including the flagship normalization',async()=>{
 for(const id of Object.keys(HEROES) as HeroId[]){const data=HEROES[id],w=world(data.race);assert.ok(w.acquireHero(id));w.entities.delete(w.heroEntity(id)!.id);
  const result=await prepare(w.captureRun());assert.equal(result.models.get(displayLoadModelKey(data.model,data.baseFamily)),data.baseFamily);assert.ok(result.common.heroes.includes(id));
 }
});

test('deferred elite deliveries keep every native body/form and foreign ordinary closure',async()=>{
 const w=world(),s=w.captureRun();s.state.pendingElites=Object.keys(ELITES) as EliteId[];
 s.state.expedition.ledger.push({id:999,family:'carrier',line:'stargate',facilityIds:[],remaining:1,state:'training',podId:null,passengers:[]});
 const result=await prepare(s);
 for(const p of Object.values(ELITE_VISUAL_PROFILES))for(const model of [p.model,...Object.values(p.forms)])assert.ok(result.models.has(model),model);
 for(const key of ['carrier','interceptor','hellion.hellbat','viking.assault'])assert.ok(result.models.has(key),key);
});

test('restored mercenary talent retains its future random variants without rolling RNG',async()=>{
 for(const race of RACES){const s=world(race).captureRun(),talent=[...TALENT_BY_ID.values()].find(t=>t.race===race&&t.semanticId==='mercenary')!;s.config.frozenTalents.levels={[talent.id]:1};
  const result=await prepare(s),family=race==='terran'?'marine':race==='zerg'?'zergling':'zealot';
  for(const e of Object.values(ELITES).filter(e=>e.family===family))assert.ok(result.models.has(e.model),e.model);
 }
});

test('incoming equipment account supplies future delivery candidates; title account does not leak into restore',async()=>{
 const geared=new World({race:'terran',seed:529,sandbox:true,terrain:false,waves:false,equipmentAccount:newEquipmentAccount(529)});
 for(const slot of ATTRIBUTE_SLOTS.slice(0,4)){const item=grantEquipment(geared.starship.account,{template:'set.advanced.bounty.4',race:'terran',slot},'gear:'+slot,{kind:'warehouse'});assert.ok(item.ok);assert.ok(geared.equipItem(item.value.id,slot).ok);}
 geared.start();const result=await prepare(geared.captureRun(),world());assert.ok(result.models.has('hero.raynor'));assert.ok(result.models.has('elite.thor.1'));
 const clean=await prepare(world().captureRun(),geared);assert.deepEqual(clean.common.heroes,[]);assert.ok(!clean.models.has('hero.raynor'));
});

test('endless restore and its preparation checkpoint retain static dependencies; campaign does not',async()=>{
 for(const mode of ['battle','entry'] as const){const s=world().captureRun();s.state.stage=18;
  if(mode==='battle')s.state.battlefield.mode='endless';else {s.state.phase='endless-ready';s.state.endlessEntry={id:s.state.runId+':endless-entry',revision:0,ready:false};}
  assert.equal((await prepare(s)).endless,1);
 }
});

test('O01 uses the same incoming seeded hero roster at departure and when preparing a saved stage',async()=>{
 const w=new World({race:'terran',difficulty:'hard',seed:529,sandbox:true,terrain:false,waves:false});
 w.start(undefined,createContentPlan(529,'terran','hard'));
 w.stage=9;
 w.endStage();
 const a=w.expedition.support.armed!, allowed=['hero.yamato_battlecruiser','hero.raynor','hero.swann'];
 const live=Object.assign(Object.create(BattleRenderer.prototype),{world:w});
 const before:Map<string,string>=live.currentModels(true);
 a.ranks.O01=1;
 const normal:Map<string,string>=live.currentModels(true);
 const expected=(base:Map<string,string>)=>new Set([...base.keys(),...allowed]);
 assert.deepEqual(new Set(normal.keys()),expected(before));
 const intermission=w.captureRun();
 for(let pass=0;pass<2 && w.phase==='reward';pass++) assert.ok(w.skipReward());
 assert.equal(w.phase,'battle');assert.equal(w.stage,10);
 for(const snapshot of [intermission,w.captureRun()]){
  delete snapshot.state.expedition.support.armed!.ranks.O01;
  const baseline=await prepare(snapshot);
  snapshot.state.expedition.support.armed!.ranks.O01=1;
  const restored=await prepare(snapshot);
  assert.deepEqual(new Set(restored.models.keys()),expected(baseline.models));
 }
});
