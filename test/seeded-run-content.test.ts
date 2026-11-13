import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {createContentPlan,plannedStage,plannedNatural,validContentPlan} from '../src/simulation/progression/run-content';
import {offerSpecialTicket,preferredSpecialKinds} from '../src/simulation/special-stages/runtime';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {snapshotIdentityModels} from '../src/app/snapshot-preload-plan';
import {stageContentAssets} from '../src/app/stage-content-assets';
import {battleScenePreload} from '../src/app/battle-scene-preload';
import {combatPreloadPlan} from '../src/app/combat-preload-plan';
import {draftContext} from '../src/simulation/expedition-economy';
import {seededBossVariant} from '../src/simulation/boss-loot';
import {ELITES} from '../src/data/elites';
import {SpecialTerrain} from '../src/simulation/special-stages/terrain';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import type {TerrainQuery} from '../src/data/map-definition';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {RunSession} from '../src/app/run-session';

function game(seed:number){
 const w=new World({seed,race:'terran',difficulty:'normal',sandbox:true,terrain:false,waves:false,equipmentAccount:newEquipmentAccount(seed)});
 assert(w.start(undefined,createContentPlan(seed,'terran','normal')));
 return w;
}
test('boss preparation selects the legal seeded variant even when the scheduled elite is capped',()=>{
 const stage=createContentPlan(529,'terran','easy').stages[17];
 assert(stage.elites.includes('marauder.1'));
 const third=ELITES['marauder.3'],first=ELITES['marauder.1'];
 assert.equal(seededBossVariant(stage,'marauder',[first,third]),first.id);
 assert.equal(seededBossVariant(stage,'marauder',[third]),third.id);
 assert.equal(seededBossVariant(stage,'marauder',[]),undefined);
});
test('the battle roster requests actual bodies after leaving an elite on the previous shelf',()=>{
 const requested:string[]=[];
 const w=game(529);
 w.rewards=[{kind:'elite',value:'marauder.3'} as typeof w.rewards[number]];
 const view=Object.assign(Object.create(BattleRenderer.prototype),{world:w,initialAssetsLoaded:true,gpu:new Map(),
  syncMap:()=>{},ensureUnitVariant:(key:string)=>requested.push(key)});
 view.prepareRosterAssets();
 assert(!requested.includes('elite.marauder.3'));
 const body=w.addUnit('marauder','terran',0,0);
 body.eliteId='marauder.3';body.modelKey=ELITES[body.eliteId].model;
 view.prepareRosterAssets();
 assert(requested.includes(body.modelKey));
});
test('a purchased nydus is prepared before its first target appears',()=>{
 const w=game(529),view=Object.assign(Object.create(BattleRenderer.prototype),{world:w});
 assert(!view.currentModels(true).has('fun-nydus'));
 w.funShop.levels.nydus=1;
 assert.equal(w.funShop.nydus,null);
 assert.equal(view.currentModels(true).get('fun-nydus'),'roach');
});
test('the normal new-game transaction installs the previewed plan only on commit',()=>{
 const w=new World({seed:529,race:'terran',terrain:false,waves:false,sandbox:true,equipmentAccount:newEquipmentAccount(529)});
 const session=new RunSession(w,null,{run:null,savedAt:0,notice:'',memoryOnly:true});
 const preview=session.prepareNewRun('terran','normal',0,null),rng=w.rngState;
 assert.equal(w.runConfig,null);assert(preview.contentPlan);
 assert.equal(session.commitNewRun(preview.id,'new:1','new:2'),false);assert.equal(w.runConfig,null);assert.equal(w.rngState,rng);
 assert(session.commitNewRun(preview.id,'new:2','new:2'));assert.deepEqual(w.captureRun().config.contentPlan,preview.contentPlan);
});
test('seeded ticket offers use the same eligible order after unrelated combat draws',()=>{
 const schedule=(extra:number)=>{
  const w=game(529),offers=[];
  w.phase='reward';
  for(let stage=4;stage<=18;stage++){
   w.stage=stage-1;
   for(let n=0;n<extra;n++)w.random();
   const rng=w.rngState;
   offerSpecialTicket(w);assert.equal(w.rngState,rng);
   const t=w.specialStages.ticket;
   if(t){
    assert.equal(t.kind,w.runConfig!.contentPlan!.stages[stage-1].ticket.find(k=>preferredSpecialKinds(w).includes(k)));
    offers.push([stage,t.kind]);w.specialStages.used.add(stage);w.specialStages.lastEnteredKind=t.kind;w.specialStages.ticket=null;
   }
  }
  return offers;
 };
 const first=schedule(0);assert(first.length>0);assert.deepEqual(first,schedule(23));
});
test('content and stored choices survive a checkpoint, legacy saves retain their original rules',()=>{
 const w=game(529),snapshot=w.captureRun(),p=snapshot.config.contentPlan!;
 assert(validContentPlan(p,529,'terran','normal'));
 assert.deepEqual(p,createContentPlan(529,'terran','normal'));assert.notDeepEqual(p,createContentPlan(530,'terran','normal'));
 const far=plannedStage(p,18,1000);plannedStage(p,18,1);assert.deepEqual(far,plannedStage(p,18,1000));assert.equal(p.stages.length,18);
 const restore=game(530);restore.restoreRun(snapshot);assert.deepEqual(restore.runConfig?.contentPlan,p);
 const corrupt=structuredClone(snapshot);corrupt.state.runConfig!.contentPlan!.stages[2].heroes=[];
 assert.throws(()=>restore.restoreRun(corrupt));assert.deepEqual(restore.runConfig?.contentPlan,p);
 delete snapshot.state.runConfig!.contentPlan;delete snapshot.config.contentPlan;restore.restoreRun(snapshot);assert.equal(restore.runConfig?.contentPlan,undefined);
});
test('future content in a snapshot does not request all its hero, elite or encounter bodies at stage one',()=>{
 const w=game(532),s=w.captureRun(),models=snapshotIdentityModels(s);
 assert(!models.has('fun-nydus'));assert(!models.has('ultralisk'));
 assert(![...models.keys()].some(k=>k.startsWith('hero.')||k.startsWith('elite.')));
 const common=combatPreloadPlan({race:'terran',stage:1,difficulty:'normal',identities:s.state,plannedHeroes:[]});
 assert.deepEqual(common.heroes,[]);
 const e=w.eliteVariants('marine');
 if(e.length>1)assert(e.every(v=>w.resolveEliteVariant('marine',v.id)===v.id));
 w.expedition.heroRewardsUnlocked=true;w.stage=12;
 const context=draftContext(w);
 for(const row of context.heroes.filter(h=>h.eligible))assert(w.runConfig!.contentPlan!.stages[11].heroes.some(id=>id===row.id));
});
test('a later shelf alone does not load hero candidates on departure',()=>{
 const plan=createContentPlan(529,'terran','normal');
 const next=(stage:number)=>stageContentAssets(plan,stage,undefined,{tavern:0,bait:0},['marine'],[])!;
 assert(next(9).heroes.size>0);assert.equal(next(10).heroes.size,0);
 assert(![...next(10).models.keys()].some(key=>key.startsWith('hero.')));
});
test('the renderer scopes mission templates and selected variants by stage and retains existing bodies',()=>{
 const p=createContentPlan(541,'terran','hard');
 for(let stage=4;stage<=18;stage++){
  const content=stageContentAssets(p,stage,undefined,{tavern:0,bait:0},['marine'],[])!;
  const selected=plannedNatural(p.stages[stage-1],stage,0);
  assert.equal(content.mission,selected==='mission'?p.stages[stage-1].mission:null);
  assert.equal(content.encounter,selected==='encounter'?p.stages[stage-1].encounter:null);
  const closure=battleScenePreload({race:'terran',difficulty:'hard',stage,content,bodyModels:['nexus']});
  assert(closure.buildings.includes('nexus'));
  assert.equal(closure.buildings.includes('mission.tower'),content.mission==='fleet');
  const marine=p.stages[stage-1].elites.find(id=>ELITES[id].family==='marine')!;
  assert(content.models.has(ELITES[marine].model));
 }
});
test('returning from a special stage disposes only the retired view and keeps the normal map',()=>{
 const w=game(529),normal={},challenge=new SpecialTerrain('crossing'),keep={setVisible:()=>{}};
 let releases=0;
 const cached=new Map<object,unknown>([[normal,keep],[challenge,{dispose:()=>releases++,setVisible:()=>{}}]]);
 const view=Object.assign(Object.create(BattleRenderer.prototype),{world:{...w,terrain:normal},mapViews:cached,
  mapTerrain:challenge,modelErrors:[],cameraTarget:{set:()=>{}},ground:()=>0});
 view.syncMap();view.syncMap();
 assert.equal(releases,1);assert.equal(view.mapTerrain,normal);assert.equal(cached.get(normal),keep);assert(!cached.has(challenge));
});
test('committing endless retires its old campaign view, while a challenge retains its return map',()=>{
 const campaign=campaignTerrain(chooseCampaignMap(529)),endless=game(529).endlessField!,challenge=new SpecialTerrain('crossing');
 const active={setVisible:()=>{}},released:unknown[]=[];
 const maps=new Map<TerrainQuery,{setVisible:()=>void;dispose?:()=>void}>([[campaign,{...active,dispose:()=>released.push(campaign)}],[endless,active],[challenge,{...active,dispose:()=>released.push(challenge)}]]);
 const world={terrain:challenge as TerrainQuery,endless:null as unknown,endlessField:endless,anchor:{x:0,z:0}};
 const view=Object.assign(Object.create(BattleRenderer.prototype),{world,mapViews:maps,mapTerrain:campaign,modelErrors:[],cameraTarget:{set:()=>{}},ground:()=>0});
 view.syncMap();assert.ok(maps.has(campaign));assert.equal(released.length,0);
 world.terrain=endless;world.endless={round:1};view.syncMap();view.syncMap();
 assert.deepEqual(released,[campaign,challenge]);assert.equal(maps.size,1);assert.equal(maps.get(endless),active);
});
