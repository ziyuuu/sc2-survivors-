import assert from 'node:assert/strict';
import {scenario,lcg,oldCards,buy as legacyPriceBuy} from './g02-fixtures.mts';
import {inspectReinforcementPool,drawMapLoot,type ExpeditionReward} from '../../src/simulation/progression/expedition-drafts';
import {draftContext,purchaseOffer} from '../../src/simulation/expedition-economy';
import {RARITIES} from '../../src/data/rewards';
import type {World} from '../../src/simulation/world';
export {scenario,lcg,oldCards};export type {Case} from './g02-fixtures.mts';
/** Read the actual current native undiscounted quote, without reproducing price tables.
 * Map and shop share shopPrice. Controlled two-draw RNG selects the exact legal map
 * candidate; the purchase itself is a controlled paid shelf, never a map claim. */
export function pricedOffer(w:World,id:string):ExpeditionReward|null{
 const ctx=draftContext(w),legal=inspectReinforcementPool(ctx),item=legal.find(c=>c.id===id);if(!item)return null;
 const pool=legal.filter(c=>c.rarity===item.rarity&&!['support','funShop','supply'].includes(c.effect.kind)&&!(c.effect.kind==='elite'&&c.effect.targetRank));
 const index=pool.findIndex(c=>c.id===id);assert.ok(index>=0,id);let prefix=0;for(const [r,v] of Object.entries(RARITIES)){if(r===item.rarity)break;prefix+=v.mapWeight;}
 const draws=[(prefix+RARITIES[item.rarity].mapWeight*.5)/100,(index+.5)/pool.length];const offer=drawMapLoot({...ctx,random:()=>{assert.ok(draws.length);return draws.shift()!;}});assert.equal(offer?.id,id);assert.equal(draws.length,0);assert.ok(offer);
 delete offer.mapSource;offer.minerals=offer.baseMinerals;offer.gas=offer.baseGas;offer.discount=0;return offer;
}
export function buy(w:World,id:string){
 const old=oldCards[id];assert.ok(old,id);if(!['card','teamCard','resource'].includes(old.effect.kind))return legacyPriceBuy(w,id);
 const offer=pricedOffer(w,id);if(!offer)return null;w.rewards=[offer];const before={...w.wallet};assert.ok(purchaseOffer(w,offer.offerId),id);assert.deepEqual(offer.purchaseReceipt,{minerals:offer.baseMinerals,gas:offer.baseGas,freeSource:null});assert.equal(purchaseOffer(w,offer.offerId),false);
 return {id,name:offer.name,effect:offer.expeditionEffect,cost:{minerals:offer.baseMinerals,gas:offer.baseGas},walletBefore:before,walletAfter:{...w.wallet},receipt:offer.purchaseReceipt};
}
