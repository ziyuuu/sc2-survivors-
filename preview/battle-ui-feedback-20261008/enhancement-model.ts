import type {ExpeditionReward} from '../../src/simulation/progression/expedition-drafts';
import type {ExpeditionState} from '../../src/simulation/expedition-state';
import {teamCardEffects,teamCardKey} from '../../src/simulation/progression/team-cards';

/** Sample-local UI journal of completed native shop purchases; never a save/schema change. */
export class EnhancementJournal {
 private entries:ExpeditionReward[]=[];
 reset(){this.entries=[];}
 record(offer:ExpeditionReward){
  const kind=offer.expeditionEffect.kind;
  if(!offer.sold||!offer.purchaseReceipt||offer.mapSource||offer.talentLootReceipt||!['card','teamCard','support','training'].includes(kind)||this.entries.some(r=>r.offerId===offer.offerId))return false;
  this.entries.push(structuredClone(offer));return true;
 }
 snapshot(){return structuredClone(this.entries);}
 totals(){
  const totals:Record<string,number>={};
  for(const r of this.entries){const e=r.expeditionEffect;if(e.kind==='card')totals[e.key]=(totals[e.key]??0)+e.amount;else if(e.kind==='teamCard'){const key=teamCardKey(e.group,e.rarity);totals[key]=(totals[key]??0)+1;}else if(e.kind==='support'||e.kind==='training'){const key=e.kind==='support'?'support.'+e.support:'training.'+e.rank;totals[key]=(totals[key]??0)+1;}}
  return totals;
 }
 team(){return teamCardEffects({cardTotals:this.totals()} as ExpeditionState);}
}
