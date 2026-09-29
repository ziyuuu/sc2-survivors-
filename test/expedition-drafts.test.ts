import test from 'node:test';
import assert from 'node:assert/strict';
import {newExpedition} from '../src/simulation/expedition-state';
import {DEVELOPMENT} from '../src/data/expedition-buildings';
import {FAMILIES_BY_RACE,type FamilyId,type Race} from '../src/data/races';
import {beginExpeditionWindow,expeditionRefreshCost,consumeExpeditionRefresh,expeditionDevelopmentActions,drawExpeditionDevelopment,drawExpeditionReinforcements,finishExpeditionDraft,canTakeExpeditionOffer,recordExpeditionOffer,expeditionCardKey,EXPEDITION_CARD_DEFINITIONS,type ExpeditionDraftContext,type ExpeditionReward} from '../src/simulation/progression/expedition-drafts';

import {teamCardKey,CARD_RARITIES} from '../src/simulation/progression/team-cards';
const capTeam=(ctx:ExpeditionDraftContext)=>{for(const group of ['firepower','defense'] as const)for(const rarity of CARD_RARITIES)ctx.state.cardTotals[teamCardKey(group,rarity)]=3;};
const tiers=['white','green','blue','purple','orange'];
function context(race:Race='terran',stage=1,seed=91):ExpeditionDraftContext {
 const state=newExpedition(race);let rng=seed,serial=0;
 const ctx:ExpeditionDraftContext={state,stage,random:()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},nextOfferId:id=>`${id}:${++serial}`,
  familyInfo:family=>({name:family,alive:state.familySlots.includes(family)?1:0,canAttack:true,canSupport:false,usesEnergy:false,cultivationCapacity:10,canProduce:true,capabilities:family==='marine'?['air','ground']:['ground']}),
  heroes:Array.from({length:5},(_,i)=>({id:`${race}-${i}`,name:`Hero ${i}`,race,icon:'hero.test',rank:1,owned:false,eligible:true}))};
 beginExpeditionWindow(state,stage);state.developmentDirection=race==='terran'?'barracks':race==='zerg'?'zerg.basic':'gateway';return ctx;
}
function nextWindow(ctx:ExpeditionDraftContext,stage:number){finishExpeditionDraft(ctx.state);ctx.stage=stage;ctx.currentOffers=undefined;beginExpeditionWindow(ctx.state,stage);}
function cards(offers:ExpeditionReward[]){return offers.flatMap(o=>o.expeditionEffect.kind==='card'?[o.expeditionEffect]:[]);}
test('opening and restoring a window preserve offers, frozen target, random state and choices',()=>{
 const ctx=context();ctx.state.developmentTarget='factory';assert.equal(beginExpeditionWindow(ctx.state,1),false);assert.equal(ctx.state.frozenDevelopmentTarget,null);
 const offers=drawExpeditionDevelopment(ctx);ctx.currentOffers=structuredClone(offers);ctx.random=()=>{throw Error('reopen must not reroll');};
 assert.deepEqual(drawExpeditionDevelopment(ctx),offers);assert.equal(beginExpeditionWindow(ctx.state,1),false);
 assert.throws(()=>beginExpeditionWindow(ctx.state,2),/unfinished/);nextWindow(ctx,2);assert.equal(ctx.state.frozenDevelopmentTarget,'factory');
});
test('development gives distinct legal choices, pins a frozen target and locks discounted quotes',()=>{
 const ctx=context();nextWindow(ctx,2);ctx.state.frozenDevelopmentTarget='factory';ctx.state.developmentDirection='factory';
 const offers=drawExpeditionDevelopment(ctx);assert.equal(offers.length,2);assert.deepEqual(new Set(offers.map(o=>o.value)),new Set(['factory','barracks']));assert.equal(offers[0].value,'factory');assert.equal(offers[0].baseMinerals,150);assert.equal(offers[0].baseGas,100);assert.equal(offers[0].minerals,Math.ceil(150*(1-offers[0].discount)));assert.equal(offers[0].gas,Math.ceil(100*(1-offers[0].discount)));
 for(const offer of offers){assert.equal(offer.expeditionRound,'building');assert.ok(canTakeExpeditionOffer(ctx,offer));assert.equal(DEVELOPMENT.find(d=>d.id===offer.value)!.race,'terran');}
 assert.equal(recordExpeditionOffer(ctx.state,offers[0]),true);assert.equal(recordExpeditionOffer(ctx.state,offers[0]),false);assert.equal(canTakeExpeditionOffer(ctx,offers[1]),false);assert.deepEqual(drawExpeditionDevelopment(ctx),[]);assert.equal(ctx.state.draftTaken,false);
});
test('shared research uses stage 6/12 gates and no per-facility laboratory',()=>{
 const ctx=context('terran',5);ctx.state.tech['system.barracks']=1;ctx.state.tech['research.barracks.weapon']=1;ctx.state.facilities.unshift({id:4,kind:'barracks',line:'barracks',techLab:false});
 let actions=expeditionDevelopmentActions(ctx);assert.ok(!actions.some(a=>a.definition.id==='research.barracks.weapon'));assert.ok(actions.some(a=>a.definition.id==='unlock.marauder'));assert.ok(actions.every(a=>a.effect.targetFacilityId===undefined));
 nextWindow(ctx,6);assert.equal(expeditionDevelopmentActions(ctx).find(a=>a.definition.id==='research.barracks.weapon')!.effect.expectedLevel,1);
 ctx.state.tech['research.barracks.weapon']=2;assert.ok(!expeditionDevelopmentActions(ctx).some(a=>a.definition.id==='research.barracks.weapon'));nextWindow(ctx,12);ctx.state.frozenDevelopmentTarget='research.barracks.weapon';
 const offer=drawExpeditionDevelopment(ctx)[0];assert.equal(offer.value,'research.barracks.weapon');assert.equal(offer.baseMinerals,275);assert.equal(offer.baseGas,150);assert.equal(offer.minerals,Math.ceil(275*(1-offer.discount)));assert.equal(offer.gas,Math.ceil(150*(1-offer.discount)));
 ctx.developmentReady=d=>d.id!=='research.barracks.weapon';assert.equal(canTakeExpeditionOffer(ctx,offer),false);assert.ok(!expeditionDevelopmentActions(ctx).some(a=>a.definition.id==='research.barracks.weapon'));
});
test('both rounds share unlimited rising refresh prices and each new window resets the sequence',()=>{
 const ctx=context();for(const [index,round] of (['building','building','random','random','building','random'] as const).entries())assert.equal(consumeExpeditionRefresh(ctx.state,1,round),[50,90,130,170,210,250][index]);
 assert.equal(expeditionRefreshCost(ctx.state,1,'random'),290);
 for(const stage of [2,4,16]){nextWindow(ctx,stage);assert.equal(consumeExpeditionRefresh(ctx.state,stage,'building'),50);assert.equal(consumeExpeditionRefresh(ctx.state,stage,'random'),90);}
});
test('random cards carry paid quotes and cannot create random ordinary recruits or cross-race targets',()=>{
 for(const race of ['terran','zerg','protoss'] as const)for(let seed=0;seed<30;seed++){
  const ctx=context(race,5,seed),offers=drawExpeditionReinforcements(ctx);assert.equal(offers.length,3);
  for(const offer of offers){assert.ok(offer.minerals>0);assert.equal(offer.minerals,Math.ceil(offer.baseMinerals*(1-offer.discount)));assert.equal(offer.gas,Math.ceil(offer.baseGas*(1-offer.discount)));assert.ok(!['train','veteran','build'].includes(offer.kind));assert.ok(canTakeExpeditionOffer(ctx,offer));}
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
test('6/9/12 use ordinary random quality without forcing heroes or blue alternatives',()=>{
 for(const race of ['terran','zerg','protoss'] as const)for(const stage of [6,9,12]){
  const ctx=context(race,stage);ctx.heroes=[{...ctx.heroes[0],owned:true},...ctx.heroes.slice(1),{...ctx.heroes[0],id:'foreign',race:race==='terran'?'zerg':'terran',owned:false}];
  ctx.random=()=>0;const offers=drawExpeditionReinforcements(ctx);assert.equal(offers.length,3);for(const offer of offers){assert.equal(offer.rarity,'white');assert.notEqual(offer.expeditionEffect.kind,'hero');assert.ok(canTakeExpeditionOffer(ctx,offer));}
 }
});
test('hero seats exclude a fourth hero even if maxed owned heroes were omitted from candidates',()=>{
 const ctx=context('terran',6);ctx.heroSeatsUsed=3;ctx.heroes=ctx.heroes.slice(3);ctx.random=()=>.999;const offers=drawExpeditionReinforcements(ctx);assert.ok(offers.every(o=>o.expeditionEffect.kind!=='hero'));
 const owned=context('terran',9);owned.heroes=owned.heroes.map((h,i)=>({...h,owned:i<3}));owned.random=()=>.999;const first=drawExpeditionReinforcements(owned)[0];assert.equal(first.expeditionEffect.kind,'hero');assert.ok(owned.heroes.find(h=>h.id===first.value)!.owned);
});
test('stage 15 and repeated low windows do not inject forced higher quality',()=>{
 const purple=context('zerg',15);purple.random=()=>0;assert.ok(drawExpeditionReinforcements(purple).every(o=>o.rarity==='white'));
 const ctx=context();ctx.random=()=>0;
 for(let stage=1;stage<=3;stage++){if(stage>1)nextWindow(ctx,stage);const offers=drawExpeditionReinforcements(ctx);assert.ok(offers.every(o=>o.rarity==='white'));assert.equal(ctx.state.lowWindows,stage-1);drawExpeditionReinforcements(ctx,true);assert.equal(ctx.state.lowWindows,stage-1);finishExpeditionDraft(ctx.state);}
 nextWindow(ctx,4);const offers=drawExpeditionReinforcements(ctx);assert.ok(offers.every(o=>o.rarity==='white'));finishExpeditionDraft(ctx.state);assert.equal(ctx.state.lowWindows,4);
});
test('a high card seen then rerolled still resets pity when the window closes',()=>{
 const ctx=context();ctx.state.lowWindows=2;ctx.random=()=>.999;assert.ok(drawExpeditionReinforcements(ctx).some(o=>tiers.indexOf(o.rarity)>=2));ctx.random=()=>0;assert.ok(drawExpeditionReinforcements(ctx,true).every(o=>o.rarity==='white'));finishExpeditionDraft(ctx.state);assert.equal(ctx.state.lowWindows,0);
});
test('caps and paid cultivation capacity are checked before generation and again before acceptance',()=>{
 const ctx=context();ctx.random=()=>0;const offer=drawExpeditionReinforcements(ctx)[0];assert.equal(offer.expeditionEffect.kind,'teamCard');if(offer.expeditionEffect.kind!=='teamCard')return;
 const effect=offer.expeditionEffect;ctx.state.cardTotals[teamCardKey(effect.group,effect.rarity)]=3;assert.equal(canTakeExpeditionOffer(ctx,offer),false);
 const family=ctx.state.familySlots[0];for(const [kind,definition] of Object.entries(EXPEDITION_CARD_DEFINITIONS))ctx.state.cardTotals[`${kind}.${family}`]=definition.cap;
 for(let n=0;n<20;n++)assert.equal(cards(drawExpeditionReinforcements(ctx,true)).length,0);
 const capacity=context();const info=capacity.familyInfo;capacity.familyInfo=f=>({...info(f),cultivationCapacity:0});for(let n=0;n<30;n++)assert.ok(!cards(drawExpeditionReinforcements(capacity,true)).some(c=>c.effect==='cultivation'));
});
test('one successful card records its cap once while the other paid goods remain buyable',()=>{
 const ctx=context();ctx.random=()=>0;const offers=drawExpeditionReinforcements(ctx),offer=offers[0];assert.equal(canTakeExpeditionOffer(ctx,offer),true);assert.equal(recordExpeditionOffer(ctx.state,offer),true);assert.equal(recordExpeditionOffer(ctx.state,offer),false);assert.equal(offer.sold,true);assert.equal(canTakeExpeditionOffer(ctx,offers[1]),true);ctx.currentOffers=offers;assert.deepEqual(drawExpeditionReinforcements(ctx),offers);assert.equal(ctx.state.draftTaken,false);
 if(offer.expeditionEffect.kind==='card')assert.equal(ctx.state.cardTotals[expeditionCardKey(offer.expeditionEffect.effect,offer.expeditionEffect.family)],offer.expeditionEffect.amount);
});
test('exhausted unit pools retain paid resource goods despite the old free supply cap',()=>{
 const ctx=context();ctx.heroes=[];ctx.state.resourceCards=3;capTeam(ctx);ctx.familyInfo=f=>({alive:0,canAttack:false,canSupport:false,usesEnergy:false,cultivationCapacity:0,canProduce:false});const offers=drawExpeditionReinforcements(ctx);assert.equal(offers.length,3);assert.equal(new Set(offers.map(o=>o.id)).size,3);
 for(const offer of offers){assert.equal(offer.expeditionEffect.kind,'resource');if(offer.expeditionEffect.kind==='resource')assert.equal(offer.expeditionEffect.fallback,false);assert.ok(offer.minerals>0);assert.equal(offer.rarity,'white');assert.ok(canTakeExpeditionOffer(ctx,offer));}
 assert.equal(recordExpeditionOffer(ctx.state,offers[0]),true);assert.equal(canTakeExpeditionOffer(ctx,offers[1]),true);
});
test('legacy rules cannot enter new drafts and stage 18 has no extra reinforcement window',()=>{
 const ctx=context();(ctx.state as {rules:string}).rules='survivors-v24';assert.throws(()=>drawExpeditionDevelopment(ctx),/Start this expedition/);assert.throws(()=>beginExpeditionWindow(ctx.state,2),/运行规则不匹配/);assert.throws(()=>beginExpeditionWindow(newExpedition('terran'),18),/1–17/);
});
test('endless uses distinct persisted windows at late-campaign quality without recharging chapter refreshes',()=>{
 const ctx=context('terran',17);consumeExpeditionRefresh(ctx.state,17,'random');consumeExpeditionRefresh(ctx.state,17,'random');const old=drawExpeditionReinforcements(ctx);finishExpeditionDraft(ctx.state);
 ctx.windowId=18;ctx.currentOffers=old;assert.equal(beginExpeditionWindow(ctx.state,17,18),true);assert.equal(expeditionRefreshCost(ctx.state,17,'random',18),50);const first=drawExpeditionReinforcements(ctx);assert.ok(first.every(o=>o.expeditionWindow===18));assert.equal(canTakeExpeditionOffer(ctx,old[0]),false);finishExpeditionDraft(ctx.state);
 ctx.windowId=19;beginExpeditionWindow(ctx.state,17,19);assert.equal(ctx.state.draftHistory.length,3);assert.equal(expeditionRefreshCost(ctx.state,17,'random',19),50);assert.equal(beginExpeditionWindow(ctx.state,17,19),false);
});
test('multiple elite variants split one family probability instead of tripling its chance',()=>{
 const ctx=context('terran',15);ctx.state.familySlots=['marine','marauder'];ctx.heroes=[];ctx.state.resourceCards=3;capTeam(ctx);
 for(const f of ctx.state.familySlots)for(const [kind,d] of Object.entries(EXPEDITION_CARD_DEFINITIONS))ctx.state.cardTotals[`${kind}.${f}`]=d.cap;
 ctx.elites=[...Array.from({length:3},(_,i)=>({id:`marine.${i+1}`,family:'marine' as const})),{id:'marauder.1',family:'marauder' as const}].map(e=>({...e,race:'terran',name:e.id,icon:'test',eligible:true}));let draw=0;ctx.random=()=>[.94,.6][draw++%2];
 const offer=drawExpeditionReinforcements(ctx)[0];assert.equal(offer.expeditionEffect.kind,'elite');assert.equal(offer.value,'marauder.1');
});
test('recent choices suppress the same team group across rarity',()=>{
 const count=(prior:boolean)=>{let found=0;const ctx=context('terran',2,773);ctx.heroes=[];ctx.familyInfo=()=>({alive:1,canAttack:true,canSupport:false,usesEnergy:false,cultivationCapacity:0,canProduce:false});
 if(prior)ctx.state.draftHistory=[{shown:['team.firepower.blue'],chosen:null},{shown:[],chosen:null}];
 for(let i=0;i<500;i++){const first=drawExpeditionReinforcements(ctx,true)[0];if(first.expeditionEffect.kind==='teamCard'&&first.expeditionEffect.group==='firepower')found++;}return found;};
 assert.ok(count(true)<count(false)*.6);
});

test('exhausted high-quality pools sell honest white resource goods without legacy guarantees',()=>{
 for(const stage of [4,6,9,12,15]){const ctx=context('terran',stage);ctx.heroes=[];ctx.state.resourceCards=3;capTeam(ctx);ctx.state.lowWindows=3;ctx.familyInfo=()=>({alive:0,canAttack:false,canSupport:false,usesEnergy:false,cultivationCapacity:0,canProduce:false});
  const offers=drawExpeditionReinforcements(ctx);assert.equal(offers.length,3);
  for(const offer of offers){assert.equal(offer.rarity,'white');assert.ok(offer.minerals>0);assert.ok(canTakeExpeditionOffer(ctx,offer));assert.equal(offer.expeditionEffect.kind,'resource');if(offer.expeditionEffect.kind==='resource')assert.equal(offer.expeditionEffect.fallback,false);}
  assert.equal(recordExpeditionOffer(ctx.state,offers[0]),true);assert.equal(canTakeExpeditionOffer(ctx,offers[0]),false);assert.equal(canTakeExpeditionOffer(ctx,offers[1]),true);
 }
});

test('each race exposes eight distinct fun cards; quality-first sampling keeps a quarter of eligible first slots',()=>{
 for(const race of ['terran','zerg','protoss'] as const){const ctx=context(race,17,20260929);ctx.supportLegal=()=>true;let eligible=0,fun=0,multiple=false;const seen=new Set<string>();
  for(let i=0;i<2500;i++){const page=drawExpeditionReinforcements(ctx,true),first=page[0];if(first.rarity!=='white'){eligible++;if(first.expeditionEffect.kind==='support')fun++;}
   const cards=page.filter(o=>o.expeditionEffect.kind==='support');if(cards.length>1)multiple=true;assert.equal(new Set(page.map(o=>o.value)).size,page.length);for(const o of cards){assert.ok(o.id.includes(`support.${race}.`));seen.add(o.value);}
  }assert.equal(seen.size,8,race);assert.ok(multiple);assert.ok(fun/eligible>.22&&fun/eligible<.28,`${race}: ${fun}/${eligible}`);
 }
});
