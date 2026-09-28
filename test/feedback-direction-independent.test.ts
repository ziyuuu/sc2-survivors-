import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {PRODUCTION_LINES,developmentInDirection,type ProductionLineId} from '../src/data/expedition-buildings';
import {FAMILIES_BY_RACE} from '../src/data/races';
import {newExpedition} from '../src/simulation/expedition-state';
import {beginExpeditionWindow,drawExpeditionDevelopment,drawExpeditionReinforcements,type ExpeditionDraftContext} from '../src/simulation/progression/expedition-drafts';
const rng=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

for(const race of ['terran','zerg','protoss'] as const)test(`F07 ${race}: direction filters development but cannot filter the same army's random shop`,()=>{
 const directions=Object.entries(PRODUCTION_LINES).filter(([,line])=>line.race===race).map(([id])=>id as ProductionLineId);
 for(const seed of [41,93,207]){
  const shops=directions.map(direction=>{
   const state=newExpedition(race);state.familySlots=FAMILIES_BY_RACE[race].slice(0,5);state.developmentDirection=direction;beginExpeditionWindow(state,8);let serial=0;
   const context:ExpeditionDraftContext={state,stage:8,random:rng(seed),nextOfferId:id=>`${id}:${serial++}`,heroes:[],familyInfo:family=>({alive:state.familySlots.includes(family)?2:0,canAttack:true,canSupport:false,usesEnergy:false,cultivationCapacity:3,canProduce:true})};
   const development=drawExpeditionDevelopment(context);assert.ok(development.length>0);
   for(const offer of development){assert.equal(offer.expeditionEffect.kind,'development');if(offer.expeditionEffect.kind==='development')assert.ok(developmentInDirection(offer.expeditionEffect.definitionId,direction));}
   // Hold RNG/army/window constant to isolate direction itself from draw consumption.
   context.random=rng(seed);serial=0;
   return Array.from({length:30},()=>drawExpeditionReinforcements(context,true));
  });
  for(const shop of shops.slice(1))assert.deepEqual(shop,shops[0]);
 }
});

test('F07 development and random shop retain F03 shared rising refresh count across save',()=>{
 const w=new World({race:'terran',seed:707,terrain:false,obstacles:[],waves:false,sandbox:true});w.start();w.wallet={minerals:10000,gas:10000};w.endStage();
 assert.ok(w.setDevelopmentDirection('factory'));assert.equal(w.rerollCost(),50);assert.ok(w.reroll());assert.equal(w.expedition.refreshCount,1);assert.equal(w.rerollCost(),90);
 assert.ok(w.skipReward());assert.equal(w.rewardRound,'random');assert.equal(w.expedition.developmentDirection,'factory');assert.equal(w.rerollCost(),90);
 const offers=structuredClone(w.rewards),copy=new World({race:'terran',seed:707,terrain:false,obstacles:[],waves:false,sandbox:true});copy.restoreRun(w.captureRun());assert.deepEqual(copy.rewards,offers);assert.equal(copy.rerollCost(),90);
 assert.ok(copy.reroll());assert.equal(copy.expedition.refreshCount,2);assert.equal(copy.rerollCost(),130);assert.equal(copy.expedition.developmentDirection,'factory');
 const before=copy.captureRun();assert.equal(copy.setDevelopmentDirection('barracks'),false);assert.deepEqual(copy.captureRun(),before);
});
