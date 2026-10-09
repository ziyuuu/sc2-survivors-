import {acquireEliteImmediately} from './elite-claim';
import type {World} from './world';
import type {Entity,RewardDrop} from './types';
import {ELITES,type EliteId} from '../data/elites';
import {HEROES,type HeroId} from '../data/heroes';
import {draftContext} from './expedition-economy';
import {drawBossLoot,type ExpeditionReward} from './progression/expedition-drafts';

export type UnitArrival={identity:string;name:string;kind:'elite'|'hero';rank:number;promoted:boolean};
/** Presentation only: never included in a save, and never a player decision. */
const arrivals=new WeakMap<World,UnitArrival[]>();
export function takeUnitArrivals(w:World){const items=arrivals.get(w)??[];arrivals.delete(w);return items;}
export function clearUnitArrivals(w:World){arrivals.delete(w);}
function notify(w:World,item:UnitArrival){const items=arrivals.get(w)??[];items.push(item);arrivals.set(w,items);}
function receiptRandom(receipt:string){let seed=2166136261;for(const c of receipt)seed=Math.imul(seed^c.charCodeAt(0),16777619);return ()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};}
/** Freeze the actual elite identity without consuming the combat/draft RNG. */
export function freezeLootVariant(w:World,reward:ExpeditionReward,receipt:string):EliteId|undefined{
 const e=reward.expeditionEffect;if(e.kind!=='elite')return;
 const choices=w.eliteVariants(e.family);return choices[Math.floor(receiptRandom(receipt)()*choices.length)]?.id;
}
export function dropBossLoot(w:World,enemy:Entity){
 const s=w.expedition;if(!enemy||enemy.owner!=='zerg'||!['boss','lord'].includes(enemy.enemyTier??'')||enemy.hp>0||enemy.deadAt===null||!w.entities.has(enemy.id))return false;
 const receipt=`${w.runId}:boss:${enemy.id}:${enemy.bornAt}`;if(s.bossLootReceipts.includes(receipt))return false;
 const reward=drawBossLoot(draftContext(w),receipt);delete reward.talentLootReceipt;reward.minerals=reward.gas=reward.baseMinerals=reward.baseGas=0;
 s.bossLootReceipts.push(receipt);w.rewardDrops.push({id:w.nextId++,x:enemy.x,z:enemy.z,reward,bossLootReceipt:receipt,bossLootVariant:freezeLootVariant(w,reward,receipt)});return true;
}
type Entry=World['expedition']['bossLootQueue'][number];
function legal(w:World,entry:Entry){const e=entry.reward.expeditionEffect;return e.kind==='resource'||e.kind==='hero'&&w.canAcquireHero(e.heroId as HeroId)||e.kind==='elite'&&!!entry.variant&&w.canAcquireElite(entry.variant);}
function settle(w:World,entry:Entry){
 const s=w.expedition;if(s.bossLootClaimed.includes(entry.receipt))return true;
 // Existing schema-26 saves can contain a family choice without a frozen variant.
 entry.variant??=freezeLootVariant(w,entry.reward,entry.receipt)??null;
 if(!legal(w,entry)){
  if(entry.reward.mapSource){entry.reward.expeditionEffect={kind:'resource',minerals:entry.reward.baseMinerals,gas:entry.reward.baseGas,fallback:true};entry.variant=null;}
  else{const reward=drawBossLoot({...draftContext(w),random:receiptRandom(entry.receipt+':fallback')},entry.receipt,entry.reward.rarity==='orange'?'orange':'purple');delete reward.talentLootReceipt;reward.minerals=reward.gas=reward.baseMinerals=reward.baseGas=0;entry.reward=reward;entry.variant=freezeLootVariant(w,reward,entry.receipt)??null;}
 }
 const e=entry.reward.expeditionEffect;let arrival:UnitArrival|undefined;
 if(e.kind==='hero'){
  const id=e.heroId as HeroId,promoted=w.heroes.has(id);if(!w.acquireHero(id))return false;
  arrival={identity:id,name:HEROES[id].name,kind:'hero',rank:w.heroes.get(id)!.rank,promoted};
 }else if(e.kind==='elite'){
  const id=entry.variant;if(!id)return false;
  const promoted=!!w.eliteOwned(id),target=w.eliteCandidates(id).sort((a,b)=>a.rank-b.rank||a.id-b.id)[0];
  if(!acquireEliteImmediately(w,id,target?.id))return false;
  arrival={identity:id,name:ELITES[id].name,kind:'elite',rank:w.eliteOwned(id)!.rank,promoted};
 }else if(e.kind==='resource'){w.wallet.minerals+=e.minerals;w.wallet.gas+=e.gas;w.economyTotals.cards.minerals+=e.minerals;w.economyTotals.cards.gas+=e.gas;w.announce(`补给回收 · ${e.minerals} 矿 / ${e.gas} 气`);}
 else return false;
 entry.reward.sold=true;s.bossLootClaimed.push(entry.receipt);if(arrival)notify(w,arrival);return true;
}
export function collectBossLoot(w:World,drop:RewardDrop){
 const s=w.expedition,receipt=drop.bossLootReceipt;if(!receipt||!s.bossLootReceipts.includes(receipt)||s.bossLootClaimed.includes(receipt)||s.bossLootQueue.some(q=>q.receipt===receipt)||!('expeditionEffect' in drop.reward))return false;
 const entry={receipt,reward:drop.reward as ExpeditionReward,variant:drop.bossLootVariant??null};
 // A temporarily blocked spawn stays on the ground and retries through normal pickup.
 const ok=settle(w,entry);drop.reward=entry.reward;drop.bossLootVariant=entry.variant??undefined;return ok;
}
/** Old pending receipts and transition pickups settle automatically, without a claim screen. */
export function settlePendingLoot(w:World){
 const s=w.expedition;s.bossLootOpen=false;
 for(const entry of [...s.bossLootQueue])if(settle(w,entry))s.bossLootQueue=s.bossLootQueue.filter(q=>q.receipt!==entry.receipt);
}
export function recoverBossLoot(w:World){
 for(const drop of [...w.rewardDrops])if(drop.bossLootReceipt){
  if(!collectBossLoot(w,drop)&&!w.expedition.bossLootClaimed.includes(drop.bossLootReceipt)&&!w.expedition.bossLootQueue.some(q=>q.receipt===drop.bossLootReceipt))w.expedition.bossLootQueue.push({receipt:drop.bossLootReceipt,reward:drop.reward as ExpeditionReward,variant:drop.bossLootVariant??null});
  w.rewardDrops=w.rewardDrops.filter(p=>p.id!==drop.id);
 }
 settlePendingLoot(w);
}
