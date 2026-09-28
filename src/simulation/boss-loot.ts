import {acquireEliteImmediately} from './elite-claim';
import type {World} from './world';
import type {Entity,RewardDrop} from './types';
import {type EliteId} from '../data/elites';
import type {HeroId} from '../data/heroes';
import {draftContext} from './expedition-economy';
import {drawBossLoot,type ExpeditionReward} from './progression/expedition-drafts';

/** A physical Boss reward is rolled on death, then carried by a saved, single-use receipt. */
export function dropBossLoot(w:World,enemy:Entity){
 const s=w.expedition;if(!enemy||enemy.owner!=='zerg'||!['boss','lord'].includes(enemy.enemyTier??'')||enemy.hp>0||enemy.deadAt===null||!w.entities.has(enemy.id))return false;
 const receipt=`${w.runId}:boss:${enemy.id}:${enemy.bornAt}`;if(s.bossLootReceipts.includes(receipt))return false;
 const reward=drawBossLoot(draftContext(w),receipt);delete reward.talentLootReceipt;reward.minerals=reward.gas=reward.baseMinerals=reward.baseGas=0;
 s.bossLootReceipts.push(receipt);w.rewardDrops.push({id:w.nextId++,x:enemy.x,z:enemy.z,reward,bossLootReceipt:receipt});return true;
}
export function collectBossLoot(w:World,drop:RewardDrop){
 const s=w.expedition,receipt=drop.bossLootReceipt;if(!receipt||!s.bossLootReceipts.includes(receipt)||s.bossLootClaimed.includes(receipt)||s.bossLootQueue.some(q=>q.receipt===receipt)||!('expeditionEffect' in drop.reward))return false;
 s.bossLootQueue.push({receipt,reward:drop.reward as ExpeditionReward,variant:null});s.bossLootOpen=true;refreshBossLoot(w);w.changed();return true;
}
/** Transition recovery preserves actual uncollected Boss objects without generating another reward. */
export function recoverBossLoot(w:World){for(const drop of [...w.rewardDrops])if(drop.bossLootReceipt&&collectBossLoot(w,drop))w.rewardDrops=w.rewardDrops.filter(p=>p.id!==drop.id);}
export function selectBossLootVariant(w:World,receipt:string,variant:EliteId|null){const entry=w.expedition.bossLootQueue[0];if(!w.expedition.bossLootOpen||!entry||entry.receipt!==receipt||entry.reward.expeditionEffect.kind!=='elite'||variant!==null&&!w.eliteVariants(entry.reward.expeditionEffect.family).some(e=>e.id===variant))return false;entry.variant=variant;w.changed();return true;}
/** Revalidate a deferred unit reward without rolling rarity again or touching talent loot. */
export function refreshBossLoot(w:World){
 const entry=w.expedition.bossLootQueue[0];if(!entry)return false;const effect=entry.reward.expeditionEffect;
 if(effect.kind==='elite'&&w.eliteVariants(effect.family).length){if(entry.variant&&!w.eliteVariants(effect.family).some(e=>e.id===entry.variant)){entry.variant=null;w.changed();return true;}return false;}
 if(effect.kind==='elite'&&w.expedition.familySlots.includes(effect.family)&&!w.familyUnits(effect.family).some(u=>u.eliteId&&u.rank>=5))return false;
 if(effect.kind==='hero'&&w.canAcquireHero(effect.heroId as HeroId)||effect.kind==='resource')return false;
 const rarity=entry.reward.rarity==='orange'?'orange':'purple',reward=drawBossLoot(draftContext(w),entry.receipt,rarity);delete reward.talentLootReceipt;reward.minerals=reward.gas=reward.baseMinerals=reward.baseGas=0;entry.reward=reward;entry.variant=null;w.changed();return true;
}
export function claimBossLoot(w:World,receipt:string,variantId?:EliteId,targetId?:number){
 if(w.phase==='menu'||refreshBossLoot(w))return false;
 const s=w.expedition,entry=s.bossLootQueue[0];if(!s.bossLootOpen||!entry||entry.receipt!==receipt||entry.reward.sold||s.bossLootClaimed.includes(receipt))return false;
 const effect=entry.reward.expeditionEffect;
 if(effect.kind==='hero'){if(!w.acquireHero(effect.heroId as HeroId))return false;}
 else if(effect.kind==='elite'){
  const variant=w.resolveEliteVariant(effect.family,variantId??entry.variant??undefined);if(!variant)return false;
  if(!acquireEliteImmediately(w,variant,targetId))return false;
 }else if(effect.kind==='resource'){w.wallet.minerals+=effect.minerals;w.wallet.gas+=effect.gas;w.economyTotals.cards.minerals+=effect.minerals;w.economyTotals.cards.gas+=effect.gas;}
 else return false;
 entry.reward.sold=true;s.bossLootClaimed.push(receipt);s.bossLootQueue.shift();s.bossLootOpen=s.bossLootQueue.length>0;refreshBossLoot(w);w.changed();return true;
}
