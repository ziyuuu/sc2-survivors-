import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {BUILD_CARD_ROUTES} from '../src/data/build-card-routes';
import {DEVELOPMENT,PRODUCTION_LINES,developmentInDirection,type ProductionLineId} from '../src/data/expedition-buildings';
import {reinforcementOfferBucket,drawExpeditionReinforcements,beginExpeditionWindow,type ExpeditionDraftContext,type ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {newExpedition} from '../src/simulation/expedition-state';
import {FAMILIES_BY_RACE} from '../src/data/races';
import {ELITES} from '../src/data/elites';
import {draftContext} from '../src/simulation/expedition-economy';

const rng=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('every development and recursive prerequisite belongs to at least one race direction',()=>{
 for(const action of DEVELOPMENT){const lines=Object.entries(PRODUCTION_LINES).filter(([id,p])=>p.race===action.race&&developmentInDirection(action.id,id as ProductionLineId));assert.ok(lines.length,action.id);for(const [id] of lines)for(const prerequisite of action.requires)assert.ok(developmentInDirection(prerequisite,id as ProductionLineId),`${id}/${action.id} missing ${prerequisite}`);}
});
for(const route of BUILD_CARD_ROUTES)for(const stage of [2,8,14])test(`${route.id} stage ${stage}: fixed seeds yield legal diverse paid cards and current-army bias`,()=>{
 const totals={cards:0,current:0,pages:0};
 for(const seed of [41,93,207]){const state=newExpedition(route.race);state.familySlots=[...route.families];beginExpeditionWindow(state,stage);let id=0;const random=rng(seed);
 const context:ExpeditionDraftContext={state,stage,random,nextOfferId:key=>`${key}:${id++}`,heroes:[],familyInfo:family=>({alive:route.families.includes(family)?2:0,canAttack:true,canSupport:['medivac','science_vessel','queen'].includes(family),usesEnergy:['medivac','science_vessel','queen','sentry','high_templar'].includes(family),cultivationCapacity:3,canProduce:true})};
 for(let page=0;page<100;page++){const offers=drawExpeditionReinforcements(context,true);assert.equal(offers.length,3);assert.equal(new Set(offers.map(o=>o.id)).size,3);assert.ok(new Set(offers.map(o=>o.expeditionEffect.kind==='card'?o.expeditionEffect.effect:o.expeditionEffect.kind)).size>=2);for(const offer of offers){assert.ok(offer.minerals>0||offer.gas>0);const e=offer.expeditionEffect;if(e.kind==='card'){assert.ok(FAMILIES_BY_RACE[route.race].includes(e.family));assert.ok(route.families.includes(e.family)||e.effect==='production');totals.cards++;if(route.families.includes(e.family))totals.current++;}}totals.pages++;}
 }assert.ok(totals.cards>450);assert.ok(totals.current/totals.cards>=.7);
});
test('elite purchase preview and cancellation do not spend money, lock variant or regenerate quotes',()=>{
 const w=new World({terrain:false,waves:false,sandbox:true,obstacles:[]});w.start();for(let n=1;n<5;n++)w.addUnit('marine','terran',n*2,0);w.wallet={minerals:10000,gas:10000};w.endStage();w.skipReward();
 let offer:ExpeditionReward|undefined;const ctx=draftContext(w);ctx.random=()=>.99;for(let n=0;n<5&&!offer;n++){w.rewards=drawExpeditionReinforcements(ctx,true);offer=w.rewards.find(r=>r.kind==='elite') as ExpeditionReward;}
 assert.ok(offer);const variant=Object.values(ELITES).find(e=>e.family==='marine')!;const before=w.captureRun(),wallet={...w.wallet};assert.equal(w.choose(offer.offerId,variant.id),true);assert.ok(w.expedition.pendingShopElite);assert.deepEqual(w.wallet,wallet);assert.equal(w.pendingElites.length,0);assert.equal(w.expedition.elitePaths.marine,undefined);
 assert.ok(w.cancelShopElite());assert.deepEqual(w.captureRun().state.rewards,before.state.rewards);assert.deepEqual(w.wallet,wallet);
 assert.ok(w.choose(offer.offerId,variant.id));const copy=new World({terrain:false,waves:false,sandbox:true,obstacles:[]});copy.restoreRun(w.captureRun());const target=copy.eliteCandidates(variant.id)[0];assert.ok(copy.confirmShopElite(target.id));assert.equal(copy.wallet.minerals,wallet.minerals-offer.minerals);assert.equal(copy.wallet.gas,wallet.gas-offer.gas);assert.equal(copy.entities.get(target.id)?.eliteId,variant.id);assert.equal(copy.confirmShopElite(target.id),false);
});
test('70/20/10 pools are all reachable and second-slot sampling follows the authored split',()=>{
 const state=newExpedition('terran');state.familySlots=['marine','marauder','reaper','viking','medivac'];beginExpeditionWindow(state,14);let id=0;const random=rng(881);
 const context:ExpeditionDraftContext={state,stage:14,random,nextOfferId:key=>`${key}:${id++}`,heroes:[],familyInfo:f=>({alive:state.familySlots.includes(f)?3:0,canAttack:f!=='medivac',canSupport:f==='medivac',usesEnergy:f==='medivac',cultivationCapacity:3,canProduce:true})};
 const counts={current:0,shared:0,other:0};
 for(let n=0;n<5000;n++){const offers=drawExpeditionReinforcements(context,true),first=offers[0].expeditionEffect,second=offers[1];if(second.rarity!=='white'||first.kind==='resource'||first.kind==='card'&&first.effect==='armor')continue;counts[reinforcementOfferBucket(context,second.expeditionEffect)]++;}
 const total=Object.values(counts).reduce((a,b)=>a+b,0);assert.ok(total>300,JSON.stringify(counts));for(const [bucket,expected] of Object.entries({current:.7,shared:.2,other:.1}))assert.ok(Math.abs(counts[bucket as keyof typeof counts]/total-expected)<.08,JSON.stringify(counts));
 const custom={...context,state:{...state,familySlots:['marine','marauder','reaper','banshee','science_vessel'] as typeof state.familySlots}};
 assert.equal(reinforcementOfferBucket(custom,{kind:'card',effect:'weapon',family:'banshee',amount:.03,key:'weapon.banshee'}),'current');
});
