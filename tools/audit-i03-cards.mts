import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ALL_FAMILIES} from '../src/data/races';
import {ELITES} from '../src/data/elites';
import {HEROES} from '../src/data/heroes';
import {draftContext,purchaseOffer} from '../src/simulation/expedition-economy';
import {drawExpeditionReinforcements,inspectReinforcementPool,canTakeExpeditionOffer,type ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {familyWorld} from './lib/i03-fixtures.mts';
const base='reports/local/integration-i03-20261022',rows=new Map<string,any>(),missing:any[]=[],eliteWitnesses=new Map<string,any>();
for(const family of ALL_FAMILIES){
 const {w,witness,job}=familyWorld(family),ctx=draftContext(w),pool=inspectReinforcementPool(ctx),found=new Map<string,{offer:ExpeditionReward;draw:number}>();
 for(const p of pool)assert.ok(p.weight>0&&Number.isFinite(p.weight));
 for(let draw=0;draw<12000&&found.size<pool.length;draw++){
  const offers=drawExpeditionReinforcements(ctx,true);assert.ok(offers.length>0);
  for(const offer of offers){assert.ok(canTakeExpeditionOffer(ctx,offer));if(!found.has(offer.id))found.set(offer.id,{offer:structuredClone(offer),draw});}
 }
 for(const p of pool){const sample=found.get(p.id);if(!sample){missing.push({family,id:p.id});continue;}
  if(rows.has(p.id)&&p.effect.kind!=='elite')continue;
  const variants=p.effect.kind==='elite'?Object.values(ELITES).filter(e=>e.family===p.effect.family).map(e=>e.id):[undefined];
  for(const variant of variants){
   const {w:buyer}=familyWorld(family),offer=structuredClone(sample.offer);buyer.rewards=[offer];const before={wallet:{...buyer.wallet},cards:{...buyer.expedition.cardTotals},entities:buyer.entities.size,heroes:buyer.heroes.size,ledger:buyer.expedition.ledger.length};
   const promote=p.effect.kind==='elite'&&!buyer.eliteOwned(variant!)&&buyer.familySeatCount(p.effect.family)>=buyer.familyMemberCap(p.effect.family)?buyer.ordinaryUnits(p.effect.family)[0]?.id:undefined;
   assert.ok(purchaseOffer(buyer,offer.offerId,variant,promote),JSON.stringify({family,id:p.id,variant,promote,effect:p.effect}));
   assert.equal(purchaseOffer(buyer,offer.offerId,variant,promote),false,'duplicate offer is not consumed twice');
   const e=offer.expeditionEffect;
   if(e.kind==='card')assert.ok((buyer.expedition.cardTotals[e.key]??0)>(before.cards[e.key]??0));
   if(e.kind==='teamCard')assert.ok(Object.entries(buyer.expedition.cardTotals).some(([key,n])=>n>(before.cards[key]??0)));
   if(e.kind==='hero')assert.ok(buyer.heroes.has(e.heroId as keyof typeof HEROES));
   if(e.kind==='elite'){assert.ok(buyer.eliteOwned(variant!));eliteWitnesses.set(variant!,{family,offer:p.id,rank:buyer.eliteOwned(variant!)!.rank,draw:sample.draw});}
   if(e.kind==='training')assert.ok(e.targets.every(target=>(buyer.entities.get(target.id)?.rank??0)>=e.rank));
   if(e.kind==='funShop')assert.equal(buyer.funShop.levels[e.item],e.level);
   if(e.kind==='supply')assert.ok(e.mode==='pod'?buyer.expedition.ledger.length>before.ledger:buyer.familyUnits(e.family).length>0);
   rows.set(p.id,{family,buildingSeed:witness.seed,buildingPath:witness.path.map((p:any)=>p.project),paidJob:job.id,weight:p.weight,rarity:p.rarity,effect:p.effect,draw:sample.draw,offer,purchaseReceipt:offer.purchaseReceipt,verified:'native eligibility, seeded shelf, native purchase, receipt and no duplicate purchase; effect-specific regressions separately mapped'});
  }
 }
 console.log(JSON.stringify({family,pool:pool.length,found:found.size,total:rows.size,elites:eliteWitnesses.size}));
}
await fs.writeFile(base+'/cards-paths.json',JSON.stringify({at:new Date().toISOString(),scope:'Controlled live World contexts with replayed building purchase paths and actual paid production/rescue, native seeded shelf and purchase. Funding and battle outcomes controlled; not campaign frequency or difficulty.',rows:Object.fromEntries(rows),eliteWitnesses:Object.fromEntries(eliteWitnesses),missing},null,2));
console.log(JSON.stringify({cards:rows.size,elites:eliteWitnesses.size,missing}));
