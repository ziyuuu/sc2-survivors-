import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPAIGN_MAP_ID,MAP_THEMES,campaignTerrain,chooseCampaignMap,validateMapRecipe,type CampaignTheme} from '../src/data/campaign-map';
import {World} from '../src/simulation/world';
import {RunSession} from '../src/app/run-session';

test('all five fresh maps are reachable and no subsequent draw repeats the previous map',()=>{
 const themes=Object.keys(MAP_THEMES) as CampaignTheme[];
 assert.deepEqual(new Set(Array.from({length:100},(_,seed)=>chooseCampaignMap(seed).theme)),new Set(themes));
 for(const previous of themes){
  const next=Array.from({length:100},(_,seed)=>chooseCampaignMap(seed,previous).theme);
  assert.ok(next.every(theme=>theme!==previous));assert.equal(new Set(next).size,4);
 }
 for(const bad of [{version:1,seed:1,theme:'ice',layout:0},{version:2,seed:1,theme:'ice'},{version:3,seed:-1,theme:'ice'},{version:3,seed:1,theme:'missing'},{version:3,seed:1,theme:'ice',layout:0}])assert.throws(()=>validateMapRecipe(bad as never));
});

test('all three races start at the center of every map and reload exactly that map',()=>{
 for(const theme of Object.keys(MAP_THEMES) as CampaignTheme[])for(const race of ['terran','zerg','protoss'] as const){
  const recipe={version:3 as const,seed:917,theme},w=new World({terrain:campaignTerrain(recipe),race,waves:false});
  assert.ok(w.start());assert.deepEqual([w.anchor.x,w.anchor.z],[0,0]);assert.equal(w.runConfig!.mapId,CAMPAIGN_MAP_ID);
  assert.deepEqual(w.runConfig!.campaignMap,recipe);
  const before=w.captureRun(),copy=new World({terrain:campaignTerrain(chooseCampaignMap(819)),waves:false});copy.restoreRun(before);
  assert.deepEqual(copy.campaignRecipe,recipe);assert.deepEqual([copy.anchor.x,copy.anchor.z],[0,0]);assert.equal(copy.runConfig!.mapHash,before.config.mapHash);
  assert.equal(copy.terrain!.canOccupy(copy.anchor,3.9),true);assert.equal(copy.paused,true);
 }
});

test('public new-run preparation draws browser entropy once and commits the frozen map',t=>{
 const w=new World({terrain:campaignTerrain(chooseCampaignMap(0)),waves:false}),session=new RunSession(w,null,{run:null,savedAt:0,notice:''});
 let calls=0;t.mock.method(globalThis.crypto,'getRandomValues',((array:Uint32Array)=>{array[0]=++calls;return array;}) as Crypto['getRandomValues']);
 const seen=new Set<CampaignTheme>();
 for(let i=0;i<10;i++){
  const previous=w.campaignRecipe!.theme,ticket=session.prepareNewRun('terran','normal',0,null),recipe=structuredClone(ticket.campaignMap!);
  assert.notEqual(recipe.theme,previous);assert.equal(calls,i+1);assert.equal(w.phase,'menu');
  assert.ok(session.commitNewRun(ticket.id,'ready','ready'));assert.deepEqual(w.campaignRecipe,recipe);assert.equal(calls,i+1);seen.add(recipe.theme);
  w.resetRun();
 }
 assert.ok(seen.size>1);
});

test('the new relief blocks a low ground shot without blocking its traversable ramp or an air shot',()=>{
 const terrain=campaignTerrain({version:3,seed:10608,theme:'industrial'});terrain.setStage(18);
 const a={x:-49,z:30},b={x:-9,z:30};
 assert.equal(terrain.height(a),0);assert.equal(terrain.height(b),0);
 assert.ok(terrain.height({x:-29,z:30})>1);
 assert.equal(terrain.walkLine(a,b,0),true);
 assert.equal(terrain.lineOfFire(a,b,false,false,false),false);
 assert.equal(terrain.lineOfFire(a,b,false,false,true),true);
 assert.equal(terrain.lineOfFire(a,b,true,true,false),true);
});
