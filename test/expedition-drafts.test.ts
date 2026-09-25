import test from 'node:test';
import assert from 'node:assert/strict';
import {newExpedition} from '../src/simulation/expedition-state';
import {DEVELOPMENT} from '../src/data/expedition-buildings';
import {FAMILIES_BY_RACE,type FamilyId,type Race} from '../src/data/races';
import {beginExpeditionWindow,expeditionRefreshCost,consumeExpeditionRefresh,expeditionDevelopmentActions,drawExpeditionDevelopment,drawExpeditionReinforcements,finishExpeditionDraft,canTakeExpeditionOffer,recordExpeditionOffer,expeditionCardKey,EXPEDITION_CARD_DEFINITIONS,type ExpeditionDraftContext,type ExpeditionReward} from '../src/simulation/progression/expedition-drafts';

const tiers=['white','green','blue','purple','orange'];
function context(race:Race='terran',stage=1,seed=91):ExpeditionDraftContext {
 const state=newExpedition(race);let rng=seed,serial=0;
 const ctx:ExpeditionDraftContext={state,stage,random:()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},nextOfferId:id=>`${id}:${++serial}`,
  familyInfo:family=>({name:family,alive:state.familySlots.includes(family)?1:0,canAttack:true,canSupport:false,usesEnergy:false,cultivationCapacity:10,canProduce:true,capabilities:family==='marine'?['air','ground']:['ground']}),
  heroes:Array.from({length:5},(_,i)=>({id:`${race}-${i}`,name:`Hero ${i}`,race,icon:'hero.test',rank:1,owned:false,eligible:true}))};
 beginExpeditionWindow(state,stage);return ctx;
}
function nextWindow(ctx:ExpeditionDraftContext,stage:number){finishExpeditionDraft(ctx.state);ctx.stage=stage;ctx.currentOffers=undefined;beginExpeditionWindow(ctx.state,stage);}
function cards(offers:ExpeditionReward[]){return offers.flatMap(o=>o.expeditionEffect.kind==='card'?[o.expeditionEffect]:[]);}
test('opening and restoring a window preserve offers, frozen target, random state and choices',()=>{
 const ctx=context();ctx.state.developmentTarget='factory';assert.equal(beginExpeditionWindow(ctx.state,1),false);assert.equal(ctx.state.frozenDevelopmentTarget,null);
 const offers=drawExpeditionDevelopment(ctx);ctx.currentOffers=structuredClone(offers);ctx.random=()=>{throw Error('reopen must not reroll');};
 assert.deepEqual(drawExpeditionDevelopment(ctx),offers);assert.equal(beginExpeditionWindow(ctx.state,1),false);
 assert.throws(()=>beginExpeditionWindow(ctx.state,2),/unfinished/);nextWindow(ctx,2);assert.equal(ctx.state.frozenDevelopmentTarget,'factory');
});
test('development gives distinct legal choices, pins a frozen target and charges fixed prices',()=>{
 const ctx=context();nextWindow(ctx,2);ctx.state.frozenDevelopmentTarget='factory';
 const offers=drawExpeditionDevelopment(ctx);assert.equal(offers.length,3);assert.equal(new Set(offers.map(o=>o.value)).size,3);assert.equal(offers[0].value,'factory');assert.equal(offers[0].minerals,150);assert.equal(offers[0].gas,100);
 for(const offer of offers){assert.equal(offer.expeditionRound,'building');assert.ok(canTakeExpeditionOffer(ctx,offer));assert.equal(DEVELOPMENT.find(d=>d.id===offer.value)!.race,'terran');}
 assert.equal(recordExpeditionOffer(ctx.state,offers[0]),true);assert.equal(recordExpeditionOffer(ctx.state,offers[0]),false);assert.equal(canTakeExpeditionOffer(ctx,offers[1]),false);assert.deepEqual(drawExpeditionDevelopment(ctx),[]);assert.equal(ctx.state.draftTaken,false);
});
test('research levels use stage 6/12 gates, valid prerequisites and oldest laboratory target',()=>{
 const ctx=context('terran',5);ctx.state.tech.engineering_bay=1;ctx.state.tech['terran.infantry']=1;ctx.state.facilities.unshift({id:4,kind:'barracks',line:'barracks',techLab:false});
 let actions=expeditionDevelopmentActions(ctx);assert.ok(!actions.some(a=>a.definition.id==='terran.infantry'));assert.equal(actions.find(a=>a.definition.id==='barracks_lab')!.effect.targetFacilityId,1);
 nextWindow(ctx,6);assert.equal(expeditionDevelopmentActions(ctx).find(a=>a.definition.id==='terran.infantry')!.effect.expectedLevel,1);
 ctx.state.tech['terran.infantry']=2;assert.ok(!expeditionDevelopmentActions(ctx).some(a=>a.definition.id==='terran.infantry'));nextWindow(ctx,12);ctx.state.frozenDevelopmentTarget='terran.infantry';
 const offer=drawExpeditionDevelopment(ctx)[0];assert.equal(offer.value,'terran.infantry');assert.equal(offer.minerals,275);assert.equal(offer.gas,150);
 ctx.developmentReady=d=>d.id!=='terran.infantry';assert.equal(canTakeExpeditionOffer(ctx,offer),false);assert.ok(!expeditionDevelopmentActions(ctx).some(a=>a.definition.id==='terran.infantry'));
});
test('each round has one free refresh per chapter and one paid refresh per window',()=>{
 const ctx=context();for(const round of ['building','random'] as const){assert.equal(consumeExpeditionRefresh(ctx.state,1,round),0);assert.equal(consumeExpeditionRefresh(ctx.state,1,round),round==='building'?50:30);assert.equal(expeditionRefreshCost(ctx.state,1,round),null);}
 nextWindow(ctx,2);assert.equal(expeditionRefreshCost(ctx.state,2,'building'),50);assert.equal(expeditionRefreshCost(ctx.state,2,'random'),30);
 nextWindow(ctx,4);assert.equal(consumeExpeditionRefresh(ctx.state,4,'building'),0);assert.equal(consumeExpeditionRefresh(ctx.state,4,'building'),60);assert.equal(consumeExpeditionRefresh(ctx.state,4,'random'),0);assert.equal(consumeExpeditionRefresh(ctx.state,4,'random'),40);
 nextWindow(ctx,16);assert.equal(consumeExpeditionRefresh(ctx.state,16,'building'),0);assert.equal(consumeExpeditionRefresh(ctx.state,16,'building'),100);assert.equal(consumeExpeditionRefresh(ctx.state,16,'random'),0);assert.equal(consumeExpeditionRefresh(ctx.state,16,'random'),80);
});
test('random cards are free and cannot create random ordinary recruits or cross-race targets',()=>{
 for(const race of ['terran','zerg','protoss'] as const)for(let seed=0;seed<30;seed++){
  const ctx=context(race,5,seed),offers=drawExpeditionReinforcements(ctx);assert.equal(offers.length,3);
  for(const offer of offers){assert.equal(offer.minerals,0);assert.equal(offer.gas,0);assert.ok(!['train','veteran','build'].includes(offer.kind));assert.ok(canTakeExpeditionOffer(ctx,offer));}
  for(const card of cards(offers))assert.ok((FAMILIES_BY_RACE[race] as readonly string[]).includes(card.family));
  assert.equal(new Set(cards(offers).map(e=>e.effect)).size,cards(offers).length);
 }
});
test('unadmitted outputs can receive production cards but never immediate battle/cultivation cards',()=>{
 const ctx=context();ctx.state.production.barracks!.outputs=['marine','marauder'];ctx.state.production.barracks!.enabled.marauder=true;
 let productionFound=false;
 for(let n=0;n<150;n++)for(const card of cards(drawExpeditionReinforcements(ctx,true)))if(card.family==='marauder'){assert.equal(card.effect,'production');productionFound=true;}
 assert.equal(productionFound,true);ctx.state.production.barracks!.enabled.marauder=false;
 for(let n=0;n<30;n++)assert.ok(!cards(drawExpeditionReinforcements(ctx,true)).some(e=>e.family==='marauder'));
});
test('6/9/12 guarantee a visible unowned hero and two blue-or-better alternatives',()=>{
 for(const race of ['terran','zerg','protoss'] as const)for(const stage of [6,9,12]){
  const ctx=context(race,stage);ctx.heroes=[{...ctx.heroes[0],owned:true},...ctx.heroes.slice(1),{...ctx.heroes[0],id:'foreign',race:race==='terran'?'zerg':'terran',owned:false}];
  const offers=drawExpeditionReinforcements(ctx);assert.equal(offers[0].expeditionEffect.kind,'hero');assert.notEqual(offers[0].value,`${race}-0`);assert.notEqual(offers[0].value,'foreign');for(const offer of offers.slice(1))assert.ok(tiers.indexOf(offer.rarity)>=2);
 }
});
test('hero seats exclude a fourth hero even if maxed owned heroes were omitted from candidates',()=>{
 const ctx=context('terran',6);ctx.heroSeatsUsed=3;ctx.heroes=ctx.heroes.slice(3);const offers=drawExpeditionReinforcements(ctx);assert.ok(offers.every(o=>o.expeditionEffect.kind!=='hero'));assert.equal(offers[0].rarity,'orange');
 const owned=context('terran',9);owned.heroes=owned.heroes.map((h,i)=>({...h,owned:i<3}));const first=drawExpeditionReinforcements(owned)[0];assert.equal(first.expeditionEffect.kind,'hero');assert.ok(owned.heroes.find(h=>h.id===first.value)!.owned);
});
test('stage 15 guarantees purple and three genuinely low windows guarantee blue',()=>{
 const purple=context('zerg',15);assert.ok(tiers.indexOf(drawExpeditionReinforcements(purple)[0].rarity)>=3);
 const ctx=context();ctx.random=()=>0;
 for(let stage=1;stage<=3;stage++){if(stage>1)nextWindow(ctx,stage);const offers=drawExpeditionReinforcements(ctx);assert.ok(offers.every(o=>o.rarity==='white'));assert.equal(ctx.state.lowWindows,stage-1);drawExpeditionReinforcements(ctx,true);assert.equal(ctx.state.lowWindows,stage-1);finishExpeditionDraft(ctx.state);}
 nextWindow(ctx,4);const offers=drawExpeditionReinforcements(ctx);assert.equal(offers[0].rarity,'blue');finishExpeditionDraft(ctx.state);assert.equal(ctx.state.lowWindows,0);
});
test('a high card seen then rerolled still resets pity when the window closes',()=>{
 const ctx=context();ctx.state.lowWindows=2;ctx.random=()=>.999;assert.ok(drawExpeditionReinforcements(ctx).some(o=>tiers.indexOf(o.rarity)>=2));ctx.random=()=>0;assert.ok(drawExpeditionReinforcements(ctx,true).every(o=>o.rarity==='white'));finishExpeditionDraft(ctx.state);assert.equal(ctx.state.lowWindows,0);
});
test('caps and paid cultivation capacity are checked before generation and again before acceptance',()=>{
 const ctx=context();ctx.random=()=>0;const offer=drawExpeditionReinforcements(ctx)[0];assert.equal(offer.expeditionEffect.kind,'card');if(offer.expeditionEffect.kind!=='card')return;
 const effect=offer.expeditionEffect;ctx.state.cardTotals[effect.key]=EXPEDITION_CARD_DEFINITIONS[effect.effect].cap;assert.equal(canTakeExpeditionOffer(ctx,offer),false);
 const family=ctx.state.familySlots[0];for(const [kind,definition] of Object.entries(EXPEDITION_CARD_DEFINITIONS))ctx.state.cardTotals[`${kind}.${family}`]=definition.cap;
 for(let n=0;n<20;n++)assert.equal(cards(drawExpeditionReinforcements(ctx,true)).length,0);
 const capacity=context();const info=capacity.familyInfo;capacity.familyInfo=f=>({...info(f),cultivationCapacity:0});for(let n=0;n<30;n++)assert.ok(!cards(drawExpeditionReinforcements(capacity,true)).some(c=>c.effect==='cultivation'));
});
test('one successful card records its cap once and closes the entire free choice',()=>{
 const ctx=context();ctx.random=()=>0;const offers=drawExpeditionReinforcements(ctx),offer=offers[0];assert.equal(canTakeExpeditionOffer(ctx,offer),true);assert.equal(recordExpeditionOffer(ctx.state,offer),true);assert.equal(recordExpeditionOffer(ctx.state,offer),false);assert.equal(canTakeExpeditionOffer(ctx,offers[1]),false);assert.deepEqual(drawExpeditionReinforcements(ctx),[]);
 if(offer.expeditionEffect.kind==='card')assert.equal(ctx.state.cardTotals[expeditionCardKey(offer.expeditionEffect.effect,offer.expeditionEffect.family)],offer.expeditionEffect.amount);
});
test('exhausted pools receive three explicit small fallback rewards without bypassing supply cap',()=>{
 const ctx=context();ctx.heroes=[];ctx.state.resourceCards=3;ctx.familyInfo=f=>({alive:0,canAttack:false,canSupport:false,usesEnergy:false,cultivationCapacity:0,canProduce:false});const offers=drawExpeditionReinforcements(ctx);assert.equal(offers.length,3);assert.equal(new Set(offers.map(o=>o.id)).size,3);
 for(const offer of offers){assert.equal(offer.expeditionEffect.kind,'resource');if(offer.expeditionEffect.kind==='resource')assert.equal(offer.expeditionEffect.fallback,true);assert.ok(canTakeExpeditionOffer(ctx,offer));}
 recordExpeditionOffer(ctx.state,offers[0]);assert.equal(ctx.state.resourceCards,3);
});
test('legacy rules cannot enter new drafts and stage 18 has no extra reinforcement window',()=>{
 const ctx=context();(ctx.state as {rules:string}).rules='survivors-v24';assert.throws(()=>drawExpeditionDevelopment(ctx),/Start this expedition/);assert.throws(()=>beginExpeditionWindow(ctx.state,2),/运行规则不匹配/);assert.throws(()=>beginExpeditionWindow(newExpedition('terran'),18),/1–17/);
});
test('endless uses distinct persisted windows at late-campaign quality without recharging chapter refreshes',()=>{
 const ctx=context('terran',17);consumeExpeditionRefresh(ctx.state,17,'random');consumeExpeditionRefresh(ctx.state,17,'random');const old=drawExpeditionReinforcements(ctx);finishExpeditionDraft(ctx.state);
 ctx.windowId=18;ctx.currentOffers=old;assert.equal(beginExpeditionWindow(ctx.state,17,18),true);assert.equal(expeditionRefreshCost(ctx.state,17,'random',18),80);const first=drawExpeditionReinforcements(ctx);assert.ok(first.every(o=>o.expeditionWindow===18));assert.equal(canTakeExpeditionOffer(ctx,old[0]),false);finishExpeditionDraft(ctx.state);
 ctx.windowId=19;beginExpeditionWindow(ctx.state,17,19);assert.equal(ctx.state.draftHistory.length,3);assert.equal(expeditionRefreshCost(ctx.state,17,'random',19),80);assert.equal(beginExpeditionWindow(ctx.state,17,19),false);
});
test('multiple elite variants split one family probability instead of tripling its chance',()=>{
 const ctx=context('terran',15);ctx.state.familySlots=['marine','marauder'];ctx.heroes=[];ctx.state.resourceCards=3;
 for(const f of ctx.state.familySlots)for(const [kind,d] of Object.entries(EXPEDITION_CARD_DEFINITIONS))ctx.state.cardTotals[`${kind}.${f}`]=d.cap;
 ctx.elites=[...Array.from({length:3},(_,i)=>({id:`marine.${i+1}`,family:'marine' as const})),{id:'marauder.1',family:'marauder' as const}].map(e=>({...e,race:'terran',name:e.id,icon:'test',eligible:true}));ctx.random=()=>.6;
 const offer=drawExpeditionReinforcements(ctx)[0];assert.equal(offer.expeditionEffect.kind,'elite');assert.equal(offer.value,'marauder.1');
});
test('recent choices suppress the same effect even when the next card has a different rarity',()=>{
 const ctx=context('terran',2);ctx.state.familySlots=['marine','marauder'];ctx.heroes=[];ctx.state.resourceCards=3;
 for(const f of ctx.state.familySlots)for(const [kind,d] of Object.entries(EXPEDITION_CARD_DEFINITIONS))if(kind!=='weapon')ctx.state.cardTotals[`${kind}.${f}`]=d.cap;
 ctx.state.draftHistory=[{shown:['card.weapon.marine.blue'],chosen:'card.weapon.marine.blue'},{shown:[],chosen:null}];let n=0;ctx.random=()=>[0,0,.4][n++%3];
 const first=drawExpeditionReinforcements(ctx)[0];assert.equal(first.id,'card.weapon.marauder.white');
});
test('exhausted high-quality pools retain the promised minimum through labelled resource guarantees',()=>{
 for(const stage of [4,6,9,12,15]){const ctx=context('terran',stage);ctx.heroes=[];ctx.state.resourceCards=3;ctx.state.lowWindows=3;ctx.familyInfo=()=>({alive:0,canAttack:false,canSupport:false,usesEnergy:false,cultivationCapacity:0,canProduce:false});
  const offers=drawExpeditionReinforcements(ctx),heroWindow=[6,9,12].includes(stage),tier=heroWindow?'orange':stage===15?'purple':'blue';assert.equal(offers.length,3);assert.equal(offers[0].rarity,tier);assert.ok(offers[0].description.includes('保底'));
  for(const offer of heroWindow?offers:offers.slice(0,1)){assert.ok(tiers.indexOf(offer.rarity)>=2);assert.ok(canTakeExpeditionOffer(ctx,offer));assert.equal(offer.expeditionEffect.kind,'resource');if(offer.expeditionEffect.kind==='resource')assert.equal(offer.expeditionEffect.fallbackReason,'guarantee');}
  recordExpeditionOffer(ctx.state,offers[0]);assert.equal(ctx.state.resourceCards,3);
 }
});
