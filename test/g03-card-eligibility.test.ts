import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {ALL_FAMILIES,RACES,familyRace,type FamilyId,type Race} from '../src/data/races';
import {DEVELOPMENT,familyLine} from '../src/data/expedition-buildings';
import {HEROES,type HeroId} from '../src/data/heroes';
import {ELITES,type EliteId} from '../src/data/elites';
import {UNIQUE_SUPPORT,type UniqueSupportId} from '../src/data/unique-support';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {prepareEquipmentShelf} from '../src/simulation/starship/modules';
import {syncBuildingViews} from '../src/simulation/building/expedition';
import {newBuildingState,grantFacility,eligible,groupFamilies} from '../src/simulation/building/rules';
import {draftContext,purchaseOffer,offerEligible} from '../src/simulation/expedition-economy';
import {beginExpeditionWindow,inspectReinforcementPool,drawExpeditionReinforcements,canTakeExpeditionOffer,canClaimTalentLoot,EXPEDITION_CARD_DEFINITIONS,type ExpeditionReward,type ExpeditionOfferEffect} from '../src/simulation/progression/expedition-drafts';
import {teamCardKey,CARD_RARITIES} from '../src/simulation/progression/team-cards';
import {trainingTargets} from '../src/simulation/progression/training-cards';
import {canSupply} from '../src/simulation/progression/supply-cards';
import {supportLegal,buySupport,type SupportCard} from '../src/simulation/combat/shop-support';
import {FUN_SHOP_IDS,funShopCandidates,type FunShopId} from '../src/simulation/fun-shop/state';

// These are controlled eligibility states, not campaign controllers or balance runs.
function world(race:Race='terran',module?:string){
 const w=new World({race,seed:102301,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(102301)});
 if(module){const item=grantEquipment(w.starship.account,{template:module,race,slot:'logistics'},'g03-module',{kind:'warehouse'});assert.ok(item.ok);assert.ok(w.equipItem(item.value.id,'logistics').ok);}
 assert.ok(w.start());w.entities.clear();w.pods=[];w.expedition.ledger=[];w.expedition.zerglingPairs=[];w.expedition.heroRewardsUnlocked=true;
 w.stage=17;w.phase='reward';w.rewardRound='random';w.wallet={minerals:1e6,gas:1e6};beginExpeditionWindow(w.expedition,17);w.rewards=[];return w;
}
function familyWorld(f:FamilyId,count=2,rank=1){
 const w=world(familyRace(f)),b=w.expedition.building!,line=familyLine(f);w.expedition.familySlots=[f];
 if(w.expedition.race==='zerg')b.groups[0].directions=['ground','air'];
 else if(!b.groups.some(g=>g.line===line))assert.ok(w.grantFacility(line as 'barracks'|'factory'|'starport'|'gateway'|'robotics'|'stargate'));
 w.expedition.tech['unlock.'+f]=1;w.expedition.tech['research.'+line+'.weapon']=3;w.expedition.tech['research.'+line+'.defense']=3;
 const g=b.groups.find(g=>groupFamilies(g).includes(f))!;g.outputs=[f];g.enabled=true;g.enabledFamilies={[f]:true};syncBuildingViews(w.expedition);
 for(let i=0;i<count;i++)w.addFamilyMember(f,{x:-12+i*5,z:-8},rank);return w;
}
function offer(w:World,effect:ExpeditionOfferEffect,rarity:ExpeditionReward['rarity']='white'):ExpeditionReward{
 const id='g03:'+w.nextId++;return {id,offerId:id,name:'Controlled card',description:'Eligibility boundary',icon:'tech.attack',rarity,kind:'buff',value:id,minerals:50,gas:0,baseMinerals:50,baseGas:0,discount:0,sold:false,expeditionWindow:w.draftWindowId,expeditionRound:'random',expeditionEffect:effect};
}
function funOffer(w:World,item:FunShopId,level=1){const c=funShopCandidates(w.funShop.levels).find(c=>c.item===item&&c.level===level);assert.ok(c);return {...offer(w,{kind:'funShop',item,level,expected:c.expected},c.rarity),id:c.id,name:c.name,minerals:c.price.minerals,gas:c.price.gas,baseMinerals:c.price.minerals,baseGas:c.price.gas};}
const pool=(w:World)=>inspectReinforcementPool(draftContext(w));

for(const f of ALL_FAMILIES)test(`G03 ${f}: capped family effects, full recruitment and completed training leave the pool`,()=>{
 const w=familyWorld(f,5,5),ctx=draftContext(w),baseline=pool(w);
 for(const kind of ['recovery','energy','production'] as const){
  const definition=EXPEDITION_CARD_DEFINITIONS[kind],key=kind+'.'+f,exists=baseline.some(c=>c.effect.kind==='card'&&c.effect.key===key);
  if(exists){
   w.expedition.cardTotals[key]=definition.cap-definition.values[0];
   const allowed=pool(w).filter(c=>c.effect.kind==='card'&&c.effect.key===key);
   assert.ok(allowed.length>0,key+' keeps an effective final increment');
   assert.ok(allowed.every(c=>c.effect.kind==='card'&&c.effect.amount<=definition.values[0]+1e-9));
  }
  w.expedition.cardTotals[key]=definition.cap;
  assert.ok(!pool(w).some(c=>c.effect.kind==='card'&&c.effect.key===key),key);
  for(const amount of definition.values){const r=offer(w,{kind:'card',effect:kind,family:f,key,amount});assert.equal(canTakeExpeditionOffer(draftContext(w),r),false);assert.equal(canClaimTalentLoot(draftContext(w),r),false);}
 }
 for(const mode of ['direct','pod'] as const)for(const count of [1,2,3])assert.equal(canSupply(w,f,count,mode),false,mode+count);
 assert.ok(!pool(w).some(c=>c.effect.kind==='supply'&&c.effect.family===f));
 for(const rank of [2,3,4,5])assert.equal(trainingTargets(w,rank),null);
 assert.ok(!pool(w).some(c=>c.effect.kind==='training'));
 // Reopening one rank point must restore real growth, while completed cards remain excluded.
 const u=w.ordinaryUnits(f)[0];u.rank=4;w.refreshStats(u);assert.ok(pool(w).some(c=>c.effect.kind==='supply'&&c.effect.family===f));
 w.expedition.familySlots=[];assert.ok(!pool(w).some(c=>c.effect.kind==='card'&&c.effect.effect!=='production'));
 assert.equal(ctx.state.race,familyRace(f));
});

for(const race of RACES)test(`G03 ${race}: every team-card tier disappears at its own cap and rejects stale purchases`,()=>{
 const w=familyWorld(race==='terran'?'marine':race==='zerg'?'roach':'stalker');
 for(const group of ['firepower','defense'] as const)for(const rarity of CARD_RARITIES){
  const key=teamCardKey(group,rarity);w.expedition.cardTotals[key]=2;assert.ok(pool(w).some(c=>c.id===key));
  const r=offer(w,{kind:'teamCard',group,rarity},rarity);w.rewards=[r];const wallet={...w.wallet};assert.ok(purchaseOffer(w,r.offerId));assert.equal(w.expedition.cardTotals[key],3);assert.ok(!pool(w).some(c=>c.id===key));
  const stale=offer(w,{kind:'teamCard',group,rarity},rarity);w.rewards=[stale];const after={...w.wallet};assert.equal(purchaseOffer(w,stale.offerId),false);assert.deepEqual(w.wallet,after);assert.equal(wallet.minerals-after.minerals,50);
 }
});

for(const id of Object.keys(HEROES) as HeroId[])test(`G03 ${id}: hero max level is excluded, owned growth remains legal before it`,()=>{
 const w=world(HEROES[id].race);assert.ok(w.acquireHero(id));
 for(let rank=1;rank<5;rank++){assert.ok(pool(w).some(c=>c.effect.kind==='hero'&&c.effect.heroId===id));assert.ok(w.acquireHero(id));}
 assert.equal(w.heroes.get(id)!.rank,5);assert.equal(w.canAcquireHero(id),false);assert.ok(!pool(w).some(c=>c.effect.kind==='hero'&&c.effect.heroId===id));
 const r=offer(w,{kind:'hero',heroId:id},'orange');w.rewards=[r];const before={...w.wallet};assert.equal(purchaseOffer(w,r.offerId),false);assert.deepEqual(w.wallet,before);
});

for(const race of RACES)test(`G03 ${race}: equipment hero cap is effective and three occupied seats do not permit a fourth hero`,()=>{
 const ids=(Object.keys(HEROES) as HeroId[]).filter(id=>HEROES[id].race===race),w=world(race,'module.singularity.5');
 for(const id of ids.slice(0,3))assert.ok(w.acquireHero(id));
 for(let rank=1;rank<9;rank++){assert.ok(w.canAcquireHero(ids[0]));assert.ok(w.acquireHero(ids[0]));}
 assert.equal(w.heroes.get(ids[0])!.rank,9);assert.ok(!pool(w).some(c=>c.effect.kind==='hero'&&c.effect.heroId===ids[0]));
 assert.ok(pool(w).some(c=>c.effect.kind==='hero'&&c.effect.heroId===ids[1]));assert.ok(!pool(w).some(c=>c.effect.kind==='hero'&&ids.slice(3).includes(c.effect.heroId as HeroId)));
});

for(const id of Object.keys(ELITES) as EliteId[])test(`G03 ${id}: elite max level and non-growing identities are not eligible variants`,()=>{
 const w=familyWorld(ELITES[id].family,0);assert.ok(w.acquireElite(id));const u=w.eliteOwned(id)!;assert.ok(u);
 for(let rank=1;rank<5;rank++)assert.ok(w.acquireElite(id));assert.equal(u.rank,5);assert.equal(w.canAcquireElite(id),false);assert.ok(!w.eliteVariants(ELITES[id].family).some(e=>e.id===id));
 u.rank=1;w.refreshStats(u);assert.ok(w.canAcquireElite(id));w.starship.members.set(u.id,{source:'fixture',items:[],independent:true,cannotGrow:true});assert.equal(w.canAcquireElite(id),false);
});

for(const race of RACES)test(`G03 ${race}: capped support cards are removed; repeat strategic ammunition still adds value`,()=>{
 const f=race==='terran'?'marine':race==='zerg'?'hydralisk':'stalker',w=familyWorld(f);
 const ids:SupportCard[]=['mines','bombardment','mutation',...Object.keys(UNIQUE_SUPPORT).filter(id=>UNIQUE_SUPPORT[id as UniqueSupportId].race===race) as UniqueSupportId[]];
 for(const id of ids){for(let level=0;level<3;level++){assert.ok(supportLegal(w,id),id);assert.ok(buySupport(w,id),id);}assert.equal(supportLegal(w,id),false,id);assert.ok(!pool(w).some(c=>c.effect.kind==='support'&&c.effect.support===id));const r=offer(w,{kind:'support',support:id});w.rewards=[r];assert.equal(purchaseOffer(w,r.offerId),false);}
 const before=w.expedition.support.ammo;assert.ok(buySupport(w,'strategic'));assert.ok(buySupport(w,'strategic'));assert.equal(w.expedition.support.ammo,before+2);assert.ok(pool(w).some(c=>c.effect.kind==='support'&&c.effect.support==='strategic'));
});

for(const f of ALL_FAMILIES)test(`G03 ${f}: all maxed elite variants remove both purple and direct-V products`,()=>{
 const w=familyWorld(f,0);
 for(const e of Object.values(ELITES).filter(e=>e.family===f)){
  const u=w.addFamilyMember(f,{x:-10+w.entities.size*2,z:8},5);u.eliteId=e.id;u.rank=5;w.refreshStats(u);
 }
 assert.equal(w.eliteVariants(f).length,0);assert.ok(!pool(w).some(c=>c.effect.kind==='elite'&&c.effect.family===f));
});

for(const item of FUN_SHOP_IDS)test(`G03 ${item}: one-shot and completed levels cannot be resold or rerolled`,()=>{
 const w=world();let previous:ExpeditionReward|undefined;
 for(let level=1;level<6;level++){const c=funShopCandidates(w.funShop.levels).find(c=>c.item===item&&c.level===level);if(!c)break;const r=funOffer(w,item,level);w.rewards=[r];assert.ok(purchaseOffer(w,r.offerId));if(previous){const stale={...previous,sold:false,offerId:'stale:'+level};w.rewards=[stale];const before={...w.wallet};assert.equal(purchaseOffer(w,stale.offerId),false);assert.deepEqual(w.wallet,before);}previous=r;}
 assert.ok(!pool(w).some(c=>c.effect.kind==='funShop'&&c.effect.item===item));assert.ok(!funShopCandidates(w.funShop.levels).some(c=>c.item===item));
});

for(const module of ['module.purchase.3','module.unreasonable.3'])for(const item of FUN_SHOP_IDS.filter(id=>id!=='pandora'))test(`G03 ${module} ${item}: an equipment-adjusted shelf price remains a usable product`,()=>{
 const w=world('terran',module),r=funOffer(w,item);w.rewards=prepareEquipmentShelf(w,[r],r=>offerEligible(w,r));assert.ok(r.minerals<r.baseMinerals||r.gas<r.baseGas,'equipment changed displayed price');assert.equal(offerEligible(w,r),true);
 const before={...w.wallet},price={minerals:r.minerals,gas:r.gas};assert.ok(purchaseOffer(w,r.offerId));assert.equal(w.funShop.levels[item],1);assert.equal(before.minerals-w.wallet.minerals,price.minerals);assert.equal(before.gas-w.wallet.gas,price.gas);
 assert.equal(purchaseOffer(w,r.offerId),false);
 const stale={...r,sold:false,offerId:r.offerId+':stale'};w.rewards=[stale];const after={...w.wallet};assert.equal(purchaseOffer(w,stale.offerId),false);assert.deepEqual(w.wallet,after);
});

test('G03 fun goods validate the native price and expected upgrade even on an equipment-adjusted shelf',()=>{
 const w=world('terran','module.purchase.3'),r=funOffer(w,'tavern');w.rewards=prepareEquipmentShelf(w,[r],r=>offerEligible(w,r));assert.ok(offerEligible(w,r));
 const base=r.baseMinerals;r.baseMinerals++;assert.equal(offerEligible(w,r),false);r.baseMinerals=base;
 assert.ok(r.expeditionEffect.kind==='funShop');r.expeditionEffect.expected=1;assert.equal(offerEligible(w,r),false);
});

for(const race of RACES)test(`G03 ${race}: every completed development project is absent, including per-hatchery evolution`,()=>{
 const b=newBuildingState(race,{minerals:1e6,gas:1e6});b.stage=17;
 for(const d of DEVELOPMENT.filter(d=>d.race===race&&d.kind==='facility'))while(grantFacility(b,d.id as never));
 for(const d of DEVELOPMENT.filter(d=>d.race===race&&d.kind!=='facility'&&d.kind!=='evolution'))b.tech[d.id]=d.maxLevel;
 for(const g of b.groups)if(g.kind==='hatchery')g.directions=['ground','air'];
 for(const d of DEVELOPMENT.filter(d=>d.race===race))assert.equal(eligible(b,d),false,d.id);
 const d=DEVELOPMENT.find(d=>d.race===race&&d.kind==='research')!;b.researchLimit=4;assert.ok(eligible(b,d));b.tech[d.id]=4;assert.equal(eligible(b,d),false);
});

test('G03 same-page training becomes invalid after another purchase completes its targets',()=>{
 const w=familyWorld('marine',5,4),plan=trainingTargets(w,5);assert.ok(plan);const first=offer(w,{kind:'training',rank:5,...plan},'orange'),stale=offer(w,{kind:'training',rank:5,...plan},'orange');w.rewards=[first,stale];assert.ok(purchaseOffer(w,first.offerId));const before={...w.wallet};assert.equal(purchaseOffer(w,stale.offerId),false);assert.deepEqual(w.wallet,before);
});

test('G03 capped or missing-target cards never reappear in generated shelves or free reward eligibility',()=>{
 const w=familyWorld('marine',5,5);for(const d of Object.entries(EXPEDITION_CARD_DEFINITIONS))w.expedition.cardTotals[d[0]+'.marine']=d[1].cap;
 for(const group of ['firepower','defense'] as const)for(const rarity of CARD_RARITIES)w.expedition.cardTotals[teamCardKey(group,rarity)]=3;
 for(const value of [0,.45,.8,.94,.999]){const ctx=draftContext(w);ctx.random=()=>value;for(const r of drawExpeditionReinforcements(ctx,true)){assert.ok(canTakeExpeditionOffer(ctx,r));assert.ok(!['card','teamCard','training'].includes(r.expeditionEffect.kind));assert.ok(r.expeditionEffect.kind!=='supply'||r.expeditionEffect.family!=='marine');}}
 for(const effect of ['recovery','energy'] as const){w.expedition.cardTotals[effect+'.marine']=0;const r=offer(w,{kind:'card',effect,family:'marine',key:effect+'.marine',amount:.04});assert.equal(canTakeExpeditionOffer(draftContext(w),r),false);assert.equal(canClaimTalentLoot(draftContext(w),r),false);}
});
