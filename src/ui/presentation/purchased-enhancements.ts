import type {ExpeditionReward} from '../../simulation/progression/expedition-drafts';

export interface PurchasedEnhancement {card:ExpeditionReward;count:number;minerals:number;gas:number}
/** Group the presentation only; receipts and the applied game effects remain individual. */
export function purchasedEnhancements(entries:readonly ExpeditionReward[]):PurchasedEnhancement[]{
 const groups=new Map<string,PurchasedEnhancement>();
 for(const card of entries){
  const e=card.expeditionEffect;
  if(!card.sold||!card.purchaseReceipt||card.mapSource||card.talentLootReceipt)continue;
  const key=e.kind==='card'?`${e.kind}:${e.key}:${card.rarity}:${e.amount}`:e.kind==='teamCard'?`${e.kind}:${e.group}:${e.rarity}`:e.kind==='support'?`${e.kind}:${e.support}:${card.rarity}`:null;
  if(!key)continue;
  const group=groups.get(key)??{card,count:0,minerals:0,gas:0};
  group.count++;group.minerals+=card.purchaseReceipt.minerals;group.gas+=card.purchaseReceipt.gas;groups.set(key,group);
 }
 return [...groups.values()];
}
