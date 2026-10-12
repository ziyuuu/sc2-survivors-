import test from 'node:test';import assert from 'node:assert/strict';
import {BattleRenderer} from '../src/render/scene/battle-renderer';import {World} from '../src/simulation/world';import {encodeGraph} from '../src/persistence/graph-codec';
import {campaignTerrain} from '../src/data/campaign-map';import {BackgroundPreparation} from '../src/app/background-preparation';
test('optional missing model leaves native World, Profile, RNG and readiness unchanged',async()=>{
 const w=new World({sandbox:true,terrain:false,waves:false});w.start();const before=encodeGraph(w.captureRun()),profile=w.permanentProfile.exportJSON();let notified=0;w.listeners.add(()=>notified++);
 const view=Object.assign(Object.create(BattleRenderer.prototype),{world:w,gpu:new Map(),batches:new Map(),variantLoads:new Map(),variantQueue:Promise.resolve(),assetsPending:0,modelErrors:[],initialAssetsLoaded:false});
 assert.equal(await view.ensureUnitVariant('qa-optional-missing','marine',true),false);assert.deepEqual(encodeGraph(w.captureRun()),before);assert.equal(w.permanentProfile.exportJSON(),profile);assert.equal(notified,0);assert.equal(view.assetsPending,0);assert.equal(view.initialAssetsLoaded,false);assert.deepEqual(view.modelErrors,[]);
 assert.equal(await view.ensureUnitVariant('qa-optional-missing','marine'),false);assert.equal(w.paused,true);assert.equal(view.modelErrors.length,1);
});
test('a retired optional map is prepared again when its saved-run choice returns',async()=>{
 const world=new World({sandbox:true,terrain:false,waves:false}),recipe={version:3 as const,seed:529,theme:'industrial' as const},terrain=campaignTerrain(recipe),mapViews=new Map();let loads=0;
 const view=Object.assign(Object.create(BattleRenderer.prototype),{world,mapViews,contextEpoch:0,prepareCampaignAssets:async()=>{loads++;mapViews.set(terrain,{});}});
 const lane=new BackgroundPreparation(()=>0,()=>true),select=()=>lane.select(view.backgroundJobs('terran',null,recipe).filter((j:any)=>j.key.includes(':map:'))),flush=()=>new Promise<void>(r=>setTimeout(r,0));
 select();lane.tick();await flush();assert.equal(loads,1);mapViews.clear();select();lane.tick();await flush();assert.equal(loads,2);
});
