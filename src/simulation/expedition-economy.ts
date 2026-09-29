import {canSupply,applySupply} from './progression/supply-cards';
import {buySupport,supportLegal} from './combat/shop-support';
import {trainingTargets,validTrainingTargets,applyTrainingTargets} from './progression/training-cards';
import {teamCardKey} from './progression/team-cards';
import {acquireEliteImmediately} from './elite-claim';
import type {World} from './world';
import type {Reward} from './types';
import {HEROES,ALL_HERO_IDS,type HeroId} from '../data/heroes';
import {ELITES,type EliteId} from '../data/elites';
import {SC2_UNITS,type UnitType} from '../data/sc2-units';
import {sourceDetails} from './combat/expedition-combat';
import {DEVELOPMENT,PRODUCTION_LINES,LINE_SKILLS,lineSystem,lineResearch,type ProductionLineId} from '../data/expedition-buildings';
import {SOURCE_PRODUCTION_RECIPES} from '../data/expansion-units';
import {CAMPAIGN_SCIENCE_VESSEL_RECIPE} from '../data/campaign-science-vessel';
import {familyRace,type FamilyId} from '../data/races';
import {drawMapLoot,beginExpeditionWindow,drawExpeditionDevelopment,drawExpeditionReinforcements,drawFixedRarityTalentLoot,canClaimTalentLoot,expeditionDevelopmentActions,canTakeExpeditionOffer,recordExpeditionOffer,expeditionRefreshCost,consumeExpeditionRefresh,finishExpeditionDraft,type ExpeditionDraftContext,type ExpeditionReward} from './progression/expedition-drafts';
// A family's weapon upgrades remain useful while its body is undeployed or its
// weapon lives on paid hangar units. Pure healers must still stay out of this pool.
const familyHasWeapon=(family:FamilyId)=>family==='lurker'||family==='carrier'||SC2_UNITS[family].targetType!=='none';
export function draftContext(w:World):ExpeditionDraftContext {return {state:w.expedition!,stage:w.draftStage,windowId:w.draftWindowId,random:w.random,nextOfferId:id=>`${w.draftWindowId}:${w.endless?.round??0}:${w.nextId++}:${id}`,currentOffers:w.rewards,heroSeatsUsed:w.heroes.size,
 supplyLegal:(family,count,mode)=>canSupply(w,family,count,mode),
 supportLegal:kind=>supportLegal(w,kind),
 training:rank=>trainingTargets(w,rank),trainingValid:(rank,targets)=>validTrainingTargets(w,rank,targets),
 purchasePriceFactor:1-.1*w.talent('permanent_discount'),developmentPriceFactorFor:d=>(1-(d.kind==='research'?0:.15*w.talent('frugal_build')))*(1-.1*w.talent('permanent_discount')),
 familyInfo:f=>{const d=f in SC2_UNITS?SC2_UNITS[f as UnitType]:null,source=d?sourceDetails(f as UnitType):null;return {name:d?.zh??'未知单位',icon:'unit.'+f,alive:d?w.familyUnits(f as UnitType).length:0,canAttack:!!d&&familyHasWeapon(f),canSupport:['medivac','science_vessel','queen'].includes(f)||(source?.lifeRegen??0)>0||(source?.shieldRegen??0)>0,usesEnergy:(source?.energy??0)>0,cultivationCapacity:d?Math.min(w.availableCapacity(f as UnitType),w.ordinaryUnits(f as UnitType).reduce((n,u)=>n+w.soldierCap()-u.rank,0)):0,canProduce:w.isFamilyAvailable(f),capabilities:d?[...(d.targetType==='both'||d.targetType==='air'?['antiAir']:[]),...(d.splash.length||f==='lurker'?['area']:[]),...(['medivac','queen','science_vessel'].includes(f)?['support']:[])]:[]};},
 heroes:ALL_HERO_IDS.map(id=>({id,race:HEROES[id].race,name:HEROES[id].name,icon:'hero.'+id,rank:w.heroes.get(id)?.rank??0,owned:w.heroes.has(id),eligible:w.canAcquireHero(id)})),
 elites:Object.values(ELITES).filter((elite,index,all)=>all.findIndex(other=>other.family===elite.family)===index).map(e=>{const choice=w.eliteVariants(e.family)[0];return {id:choice?.id??e.id,race:familyRace(e.family),family:e.family,name:SC2_UNITS[e.family as UnitType]?.zh??e.family,icon:choice?.icon??e.icon,eligible:!!choice};})};}
export function developmentOffers(w:World){if(!w.expedition||w.phase!=='reward'||w.rewardRound!=='building')return [];beginExpeditionWindow(w.expedition,w.draftStage,w.draftWindowId,w.talent('window_shop'),w.talent('free_purchase'));return drawExpeditionDevelopment(draftContext(w));}
export function setDevelopmentDirection(w:World,line:ProductionLineId,revision:number){const s=w.expedition;if(w.phase!=='reward'||w.rewardRound!=='building'||s.developmentBought||s.shopRevision!==revision||PRODUCTION_LINES[line]?.race!==s.race)return false;if(s.developmentDirection===line)return true;s.developmentDirection=line;s.shopRevision++;w.rewards=drawExpeditionDevelopment(draftContext(w));w.changed();return true;}
export function reinforcementOffers(w:World){if(!w.expedition||w.phase!=='reward'||w.rewardRound!=='random')return [];generateEliteContracts(w);return drawExpeditionReinforcements(draftContext(w));}
export function generateEliteContracts(w:World){const s=w.expedition,window=w.draftWindowId;
 if(!s||s.eliteContractWindow===window)return s?.eliteContracts??[];
 s.eliteContractWindow=window;s.eliteContracts=[];
 if(w.talent('find_elites')<=0||!([3,6,9,12,15].includes(w.stage)||!!w.endless&&w.endless.round%4===0))return s.eliteContracts;
 const used=new Set<FamilyId>();
 for(let slot=0;slot<w.talent('find_elites');slot++){
  const families=s.familySlots.filter(f=>!used.has(f)&&Object.values(ELITES).some(e=>e.family===f&&w.canAcquireElite(e.id)));
  if(!families.length)break;
  const family=families[Math.floor(w.random()*families.length)];used.add(family);
  const variants=Object.values(ELITES).filter(e=>e.family===family&&w.canAcquireElite(e.id)).sort((a,b)=>a.id.localeCompare(b.id));
  const elite=variants[0];if(!elite)continue;
  const recipe=family==='science_vessel'?CAMPAIGN_SCIENCE_VESSEL_RECIPE:SOURCE_PRODUCTION_RECIPES[family as UnitType],factor=1-.1*w.talent('permanent_discount');if(!recipe)continue;
  s.eliteContracts.push({id:`${window}:contract:${slot}:${elite.id}`,eliteId:elite.id,family,minerals:Math.max(1,Math.ceil(recipe.mineralCost*5*factor)),gas:recipe.gasCost?Math.max(1,Math.ceil(recipe.gasCost*5*factor)):0,purchased:false});
 }
 return s.eliteContracts;
}
export function purchaseEliteContract(w:World,id:string,variantId?:EliteId,targetId?:number){const s=w.expedition,contract=s?.eliteContracts.find(c=>c.id===id);
 if(!s||!contract||contract.purchased||s.eliteContractWindow!==w.draftWindowId||w.phase!=='reward'||w.rewardRound!=='random'||w.wallet.minerals<contract.minerals||w.wallet.gas<contract.gas)return false;
 const selected=w.resolveEliteVariant(contract.family,variantId);if(!selected||!acquireEliteImmediately(w,selected,targetId))return false;
 w.wallet.minerals-=contract.minerals;w.wallet.gas-=contract.gas;w.economyTotals.purchases.minerals+=contract.minerals;w.economyTotals.purchases.gas+=contract.gas;contract.purchased=true;s.shopRevision++;w.changed();return true;
}
export function offerEligible(w:World,r:Reward):r is ExpeditionReward {return !!w.expedition&&'expeditionEffect' in r&&w.phase==='reward'&&canTakeExpeditionOffer(draftContext(w),r as ExpeditionReward);}
function freeProject(w:World,line:ProductionLineId){
 const s=w.expedition,actions=expeditionDevelopmentActions(draftContext(w)).filter(a=>a.definition.line===line&&a.definition.kind!=='facility');
 const outputs=s.production[line]?.outputs??[],skills=LINE_SKILLS[line]??[];
 const priority=(id:string)=>id===s.frozenDevelopmentTarget?-100:skills.some(([key,,f])=>key===id&&outputs.includes(f))?-50:id===lineSystem(line)?-30:id===lineResearch(line,'weapon')?10*(s.tech[id]??0):id===lineResearch(line,'defense')?10*(s.tech[id]??0)+1:id.startsWith('unlock.')?40:50;
 return actions.sort((a,b)=>priority(a.definition.id)-priority(b.definition.id))[0];
}
function completeFreeResearch(w:World,line:ProductionLineId){const chosen=freeProject(w,line);if(!chosen)return false;const d=chosen.definition;w.expedition.tech[d.id]=(w.expedition.tech[d.id]??0)+1;if(d.unlock==='skill')w.upgrades.set(d.id,1);return true;}
function applyDevelopment(w:World,r:ExpeditionReward,definition:(typeof DEVELOPMENT)[number],firstFree:boolean){
 const s=w.expedition!,effect=r.expeditionEffect;if(effect.kind!=='development')return;
 s.tech[definition.id]=(s.tech[definition.id]??0)+1;
 if(definition.unlock==='skill')w.upgrades.set(definition.id,1);
 if(definition.kind!=='facility')return;
 const level=w.talent('instant_tech');
 const build=()=>{const line=definition.id==='hatchery'?(s.developmentDirection??'zerg.basic'):definition.line!;
  const facility={id:s.nextFacility++,kind:definition.id,line,techLab:false};s.facilities.push(facility);
  if(level>0&&freeProject(w,line)&&w.random()<Math.min(.99,.33*level))completeFreeResearch(w,line);
 };
 build();
 if(w.talent('double_build')>0&&(s.facilities.filter(f=>f.kind===definition.id).length<definition.maxLevel)&&w.random()<.3*w.talent('double_build')){
  if(w.wallet.minerals-(firstFree?0:r.minerals)>=r.minerals&&w.wallet.gas-(firstFree?0:r.gas)>=r.gas){w.wallet.minerals-=r.minerals;w.wallet.gas-=r.gas;w.economyTotals.purchases.minerals+=r.minerals;w.economyTotals.purchases.gas+=r.gas;s.tech[definition.id]++;build();}
 }
}
export function purchaseOffer(w:World,id:string,variantId?:EliteId,targetId?:number,oldFamily?:FamilyId){const s=w.expedition,r=w.rewards.find(r=>r.offerId===id),freePurchase=w.rewardRound==='random'&&s.freePurchasesRemaining>0;if(!s||!r||!offerEligible(w,r)||r.expeditionRound!==w.rewardRound||!freePurchase&&(w.wallet.minerals+1e-8<r.minerals||w.wallet.gas+1e-8<r.gas))return false;
 const effect=r.expeditionEffect;
 if(effect.kind==='hero'&&!w.acquireHero(effect.heroId as HeroId))return false;if(effect.kind==='elite'){const selected=w.resolveEliteVariant(effect.family,variantId);if(!selected||!acquireEliteImmediately(w,selected,targetId))return false;if(effect.targetRank){const u=w.eliteOwned(selected)!;u.rank=effect.targetRank;w.refreshStats(u);}}
 if(effect.kind==='supply'&&!applySupply(w,effect.family,effect.count,effect.mode,{minerals:freePurchase?0:r.minerals,gas:freePurchase?0:r.gas},oldFamily))return false;
 if(effect.kind==='support'&&!buySupport(w,effect.support))return false;
 if(effect.kind==='training'&&!applyTrainingTargets(w,effect.rank,effect.targets))return false;
 let firstFree=false;if(effect.kind==='development'){const d=DEVELOPMENT.find(d=>d.id===effect.definitionId)!;firstFree=d.kind!=='research'&&w.talent('free_house')>0&&w.random()<.2*w.talent('free_house');applyDevelopment(w,r,d,firstFree);}
 if(effect.kind==='resource'){w.wallet.minerals+=effect.minerals;w.wallet.gas+=effect.gas;w.economyTotals.cards.minerals+=effect.minerals;w.economyTotals.cards.gas+=effect.gas;}
 if(effect.kind==='card'&&effect.effect==='cultivation'){const type=effect.family as UnitType;for(let n=0;n<effect.amount;n++){const unit=w.ordinaryUnits(type).filter(u=>u.rank<w.soldierCap()).sort((a,b)=>a.rank-b.rank||a.id-b.id)[0];if(!unit||w.availableCapacity(type)<=0)throw Error('Validated cultivation recipient missing');unit.rank++;w.refreshStats(unit);}}
 const paidMinerals=firstFree||freePurchase?0:r.minerals,paidGas=firstFree||freePurchase?0:r.gas;if(freePurchase)s.freePurchasesRemaining--;
 r.purchaseReceipt={minerals:paidMinerals,gas:paidGas,freeSource:firstFree?'R07':freePurchase?'R09':null};w.wallet.minerals-=paidMinerals;w.wallet.gas-=paidGas;w.economyTotals.purchases.minerals+=paidMinerals;w.economyTotals.purchases.gas+=paidGas;recordExpeditionOffer(s,r,1+w.talent('free_purchase'));for(const u of w.allies())w.refreshStats(u);w.changed();return true;
}
export function refreshOffers(w:World){const s=w.expedition;if(!s||s.pendingShopElite||s.pendingShopSupply||w.phase!=='reward'||w.rewardRound==='building'&&!s.developmentDirection)return false;const stage=w.draftStage,windowId=w.draftWindowId,price=expeditionRefreshCost(s,stage,w.rewardRound,windowId,w.talent('reroll_fan'),w.talent('permanent_discount'));if(price===null||w.wallet.minerals<price)return false;w.wallet.minerals-=price;w.economyTotals.rerolls+=price;consumeExpeditionRefresh(s,stage,w.rewardRound,windowId,w.talent('reroll_fan'),w.talent('permanent_discount'));if(w.rewardRound==='random')s.shopPage++;w.rewards=w.rewardRound==='building'?drawExpeditionDevelopment(draftContext(w),true):drawExpeditionReinforcements(draftContext(w),true);w.changed();return true;}
export function endReinforcement(w:World){if(w.expedition&&!w.expedition.draftTaken)finishExpeditionDraft(w.expedition);}
export function mapReinforcement(w:World,elite=false):ExpeditionReward|null {return drawMapLoot(draftContext(w),elite);}
export function collectMapReinforcement(w:World,r:Reward){
 if(!('expeditionEffect' in r)||r.sold)return false;
 const offer=r as ExpeditionReward,effect=offer.expeditionEffect;
 if(effect.kind==='hero'||effect.kind==='elite')return false; // Deferred, free unit selection uses the receipt queue.
 if(!canClaimTalentLoot(draftContext(w),offer)){
  w.wallet.minerals+=r.baseMinerals;w.wallet.gas+=r.baseGas;w.economyTotals.cards.minerals+=r.baseMinerals;w.economyTotals.cards.gas+=r.baseGas;
 }else if(effect.kind==='training'){if(!applyTrainingTargets(w,effect.rank,effect.targets))return false;
 }else if(effect.kind==='teamCard'){const key=teamCardKey(effect.group,effect.rarity);w.expedition.cardTotals[key]=(w.expedition.cardTotals[key]??0)+1;
 }else if(effect.kind==='card'){
  if(effect.effect==='cultivation')for(let n=0;n<effect.amount;n++){
   const u=w.ordinaryUnits(effect.family as UnitType).filter(u=>u.rank<w.soldierCap()).sort((a,b)=>a.rank-b.rank||a.id-b.id)[0];
   if(!u)throw Error('Validated map cultivation recipient missing');u.rank++;w.refreshStats(u);
  }
  w.expedition.cardTotals[effect.key]=(w.expedition.cardTotals[effect.key]??0)+effect.amount;
 }else if(effect.kind==='resource'){
  w.wallet.minerals+=effect.minerals;w.wallet.gas+=effect.gas;w.economyTotals.cards.minerals+=effect.minerals;w.economyTotals.cards.gas+=effect.gas;
 }
 r.sold=true;for(const u of w.allies())w.refreshStats(u);return true;
}
export function openTalentLoot(w:World,receipt:string,rarity:'purple'|'orange'){
 const s=w.expedition;if(!s||w.phase!=='battle'||s.pendingTalentLoot||!s.talentLootReceipts.includes(receipt))return false;
 s.pendingTalentLoot={receipt,rarity,offers:drawFixedRarityTalentLoot(draftContext(w),rarity,receipt)};w.changed();return true;
}
export function claimTalentLoot(w:World,receipt:string,offerId:string,variantId?:EliteId){
 const s=w.expedition,pending=s?.pendingTalentLoot,offer=pending?.offers.find(item=>item.offerId===offerId);
 if(!s||w.phase!=='battle'||!pending||pending.receipt!==receipt||!offer||offer.sold||offer.talentLootReceipt!==receipt||!canClaimTalentLoot(draftContext(w),offer))return false;
 const effect=offer.expeditionEffect;
 if(effect.kind==='hero'&&!w.acquireHero(effect.heroId as HeroId))return false;
 if(effect.kind==='elite'){const selected=w.resolveEliteVariant(effect.family,variantId);if(!selected||!w.acquireElite(selected))return false;}
 if(effect.kind==='training'&&!applyTrainingTargets(w,effect.rank,effect.targets))return false;
 if(effect.kind==='teamCard'){const key=teamCardKey(effect.group,effect.rarity);s.cardTotals[key]=(s.cardTotals[key]??0)+1;}
 if(effect.kind==='card'){
  if(effect.effect==='cultivation'){const members=w.ordinaryUnits(effect.family as UnitType).filter(unit=>unit.rank<w.soldierCap()).sort((a,b)=>a.rank-b.rank||a.id-b.id);if(w.availableCapacity(effect.family as UnitType)<effect.amount||!members.length)return false;for(let index=0;index<effect.amount;index++){members.sort((a,b)=>a.rank-b.rank||a.id-b.id);const member=members[0];if(!member||member.rank>=w.soldierCap())return false;member.rank++;w.refreshStats(member);}}
  s.cardTotals[effect.key]=(s.cardTotals[effect.key]??0)+effect.amount;
 }
 if(effect.kind==='resource'){w.wallet.minerals+=effect.minerals;w.wallet.gas+=effect.gas;w.economyTotals.cards.minerals+=effect.minerals;w.economyTotals.cards.gas+=effect.gas;}
 offer.sold=true;s.pendingTalentLoot=null;for(const unit of w.allies())w.refreshStats(unit);w.changed();return true;
}
export interface RepairQuote {id:string;revision:number;targetIds:number[];minerals:number;gas:number;health:number}
export function previewRepair(w:World,ids:number[]):RepairQuote|null {if(!w.expedition||w.phase!=='reward'||new Set(ids).size!==ids.length)return null;let minerals=0,gas=0,health=0;for(const id of ids){const u=w.entities.get(id);if(!u||u.owner!=='terran'||u.hp<=0||u.temporary)return null;const missing=(u.maxHp-u.hp)/u.maxHp,base=u.heroId?w.revivalCost(u.rank):w.productionCost(u.unitType as UnitType);const factor=missing*.4*(u.heroId?1:u.rank);minerals+=Math.ceil(base.minerals*factor-1e-9);gas+=Math.ceil(base.gas*factor-1e-9);health+=u.maxHp-u.hp;}
 return {id:`repair:${w.revision}:${ids.join(',')}`,revision:w.revision,targetIds:[...ids],minerals,gas,health};}
export function repair(w:World,quote:RepairQuote){if(quote.revision!==w.revision)return false;const fresh=previewRepair(w,quote.targetIds);if(!fresh||fresh.id!==quote.id||!fresh.health||w.wallet.minerals<fresh.minerals||w.wallet.gas<fresh.gas)return false;w.wallet.minerals-=fresh.minerals;w.wallet.gas-=fresh.gas;w.economyTotals.purchases.minerals+=fresh.minerals;w.economyTotals.purchases.gas+=fresh.gas;for(const id of fresh.targetIds){const u=w.entities.get(id)!;u.hp=u.maxHp;}w.changed();return true;}
