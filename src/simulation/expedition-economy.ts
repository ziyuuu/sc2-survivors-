import type {World} from './world';
import type {Reward} from './types';
import {HEROES,ALL_HERO_IDS,type HeroId} from '../data/heroes';
import {ELITES,type EliteId} from '../data/elites';
import {SC2_UNITS,type UnitType} from '../data/sc2-units';
import {sourceDetails} from './combat/expedition-combat';
import {DEVELOPMENT} from '../data/expedition-buildings';
import {SOURCE_PRODUCTION_RECIPES} from '../data/expansion-units';
import {CAMPAIGN_SCIENCE_VESSEL_RECIPE} from '../data/campaign-science-vessel';
import {familyRace,type FamilyId} from '../data/races';
import {beginExpeditionWindow,drawExpeditionDevelopment,drawExpeditionReinforcements,drawFixedRarityTalentLoot,canClaimTalentLoot,expeditionDevelopmentActions,canTakeExpeditionOffer,recordExpeditionOffer,expeditionRefreshCost,consumeExpeditionRefresh,finishExpeditionDraft,type ExpeditionDraftContext,type ExpeditionReward} from './progression/expedition-drafts';
// A family's weapon upgrades remain useful while its body is undeployed or its
// weapon lives on paid hangar units. Pure healers must still stay out of this pool.
const familyHasWeapon=(family:FamilyId)=>family==='lurker'||family==='carrier'||SC2_UNITS[family].targetType!=='none';
export function draftContext(w:World):ExpeditionDraftContext {return {state:w.expedition!,stage:w.draftStage,windowId:w.draftWindowId,random:w.random,nextOfferId:id=>`${w.draftWindowId}:${w.endless?.round??0}:${w.nextId++}:${id}`,currentOffers:w.rewards,heroSeatsUsed:w.heroes.size,
 freeCardLimit:1+w.talent('free_purchase'),developmentPriceFactorFor:d=>(1-(d.kind==='research'?0:.15*w.talent('frugal_build')))*(1-.1*w.talent('permanent_discount')),
 familyInfo:f=>{const d=f in SC2_UNITS?SC2_UNITS[f as UnitType]:null,source=d?sourceDetails(f as UnitType):null;return {name:d?.zh??'未知单位',icon:'icon.'+f,alive:d?w.familyUnits(f as UnitType).length:0,canAttack:!!d&&familyHasWeapon(f),canSupport:['medivac','science_vessel','queen'].includes(f)||(source?.lifeRegen??0)>0||(source?.shieldRegen??0)>0,usesEnergy:(source?.energy??0)>0,cultivationCapacity:d?Math.min(w.availableCapacity(f as UnitType),w.ordinaryUnits(f as UnitType).reduce((n,u)=>n+w.soldierCap()-u.rank,0)):0,canProduce:w.isFamilyAvailable(f),capabilities:d?[...(d.targetType==='both'||d.targetType==='air'?['antiAir']:[]),...(d.splash.length||f==='lurker'?['area']:[]),...(['medivac','queen','science_vessel'].includes(f)?['support']:[])]:[]};},
 heroes:ALL_HERO_IDS.map(id=>({id,race:HEROES[id].race,name:HEROES[id].name,icon:'icon.'+HEROES[id].model,rank:w.heroes.get(id)?.rank??0,owned:w.heroes.has(id),eligible:w.canAcquireHero(id)})),
 elites:Object.values(ELITES).filter((elite,index,all)=>all.findIndex(other=>other.family===elite.family)===index).map(e=>{const choice=w.eliteVariants(e.family)[0];return {id:choice?.id??e.id,race:familyRace(e.family),family:e.family,name:SC2_UNITS[e.family as UnitType]?.zh??e.family,icon:'icon.'+(choice?.model??e.model),eligible:!!choice};})};}
export function developmentOffers(w:World){if(!w.expedition||w.phase!=='reward'||w.rewardRound!=='building')return [];beginExpeditionWindow(w.expedition,w.draftStage,w.draftWindowId,w.talent('window_shop'));return drawExpeditionDevelopment(draftContext(w));}
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
  const locked=s.elitePaths[family],elite=locked?variants.find(e=>e.id===locked):variants[0];if(!elite)continue;
  const recipe=family==='science_vessel'?CAMPAIGN_SCIENCE_VESSEL_RECIPE:SOURCE_PRODUCTION_RECIPES[family as UnitType],factor=1-.1*w.talent('permanent_discount');if(!recipe)continue;
  s.eliteContracts.push({id:`${window}:contract:${slot}:${elite.id}`,eliteId:elite.id,family,minerals:Math.max(1,Math.ceil(recipe.mineralCost*5*factor)),gas:recipe.gasCost?Math.max(1,Math.ceil(recipe.gasCost*5*factor)):0,purchased:false});
 }
 return s.eliteContracts;
}
export function purchaseEliteContract(w:World,id:string,variantId?:EliteId){const s=w.expedition,contract=s?.eliteContracts.find(c=>c.id===id);
 if(!s||!contract||contract.purchased||s.eliteContractWindow!==w.draftWindowId||w.phase!=='reward'||w.rewardRound!=='random'||w.wallet.minerals<contract.minerals||w.wallet.gas<contract.gas)return false;
 const selected=w.resolveEliteVariant(contract.family,variantId);if(!selected||!w.acquireElite(selected))return false;
 w.wallet.minerals-=contract.minerals;w.wallet.gas-=contract.gas;w.economyTotals.purchases.minerals+=contract.minerals;w.economyTotals.purchases.gas+=contract.gas;contract.purchased=true;w.changed();return true;
}
export function offerEligible(w:World,r:Reward):r is ExpeditionReward {return !!w.expedition&&'expeditionEffect' in r&&w.phase==='reward'&&canTakeExpeditionOffer(draftContext(w),r as ExpeditionReward);}
const RESEARCH_ORDER:Record<string,string[]>={
 barracks:['stim','shield','terran.infantry','terran.infantry_armor'],factory:['infernal','terran.vehicle','terran.vehicle_armor'],starport:['cloak','support_efficiency','terran.air_weapon','terran.air_armor'],
 hatchery:['ling_speed','bane_speed','roach_speed','zerg.melee','zerg.missile','zerg.carapace'],gateway:['charge','blink','glaives','storm','protoss.ground_weapon','protoss.ground_armor','protoss.shields'],
 robotics:['colossus_range','protoss.ground_weapon','protoss.ground_armor','protoss.shields'],stargate:['protoss.air_weapon','protoss.air_armor','protoss.shields']
};
function researchOrder(kind:string,line:string){return kind==='hatchery'&&line==='zerg.air'?['zerg.flyer_weapon','zerg.flyer_armor']:kind==='hatchery'&&line==='zerg.evolution'?['hydra_range','lurker_deploy','zerg.missile','zerg.melee','zerg.carapace']:RESEARCH_ORDER[kind]??[];}
function completeFreeResearch(w:World,kind:string,line:string){
 const s=w.expedition!,order=researchOrder(kind,line);
 const actions=expeditionDevelopmentActions(draftContext(w));
 const chosen=order.map(id=>actions.find(a=>a.definition.id===id)).find(Boolean);
 if(!chosen)return false;
 s.tech[chosen.definition.id]=(s.tech[chosen.definition.id]??0)+1;
 if(chosen.definition.kind==='research'&&chosen.definition.maxLevel===1)w.upgrades.set(chosen.definition.id,1);
 return true;
}
function applyDevelopment(w:World,r:ExpeditionReward,definition:(typeof DEVELOPMENT)[number],firstFree:boolean){
 const s=w.expedition!,effect=r.expeditionEffect;if(effect.kind!=='development')return;
 if(effect.targetFacilityId!==undefined){const facility=s.facilities.find(f=>f.id===effect.targetFacilityId);if(!facility)throw Error('Validated facility missing');facility.techLab=true;}
 s.tech[definition.id]=(s.tech[definition.id]??0)+1;
 if(definition.kind==='research'&&definition.maxLevel===1)w.upgrades.set(definition.id,1);
 if(definition.kind!=='facility')return;
 const level=w.talent('instant_tech');
 const build=()=>{const hadLab=s.facilities.some(f=>f.kind===definition.id&&f.techLab),facility={id:s.nextFacility++,kind:definition.id,line:definition.line??'zerg.basic' as typeof s.facilities[number]['line'],techLab:false};s.facilities.push(facility);
  if(level>0){const legal=s.race==='terran'&&hadLab||expeditionDevelopmentActions(draftContext(w)).some(action=>researchOrder(definition.id,facility.line).includes(action.definition.id));
   if(legal&&w.random()<Math.min(.99,.33*level)){if(s.race==='terran'&&hadLab)facility.techLab=true;else completeFreeResearch(w,definition.id,facility.line);}
  }
 };
 build();
 if(w.talent('double_build')>0&&(s.facilities.filter(f=>f.kind===definition.id).length<definition.maxLevel)&&w.random()<.2*w.talent('double_build')){
  if(w.wallet.minerals-(firstFree?0:r.minerals)>=r.minerals&&w.wallet.gas-(firstFree?0:r.gas)>=r.gas){w.wallet.minerals-=r.minerals;w.wallet.gas-=r.gas;w.economyTotals.purchases.minerals+=r.minerals;w.economyTotals.purchases.gas+=r.gas;s.tech[definition.id]++;build();}
 }
}
export function purchaseOffer(w:World,id:string,variantId?:EliteId){const s=w.expedition,r=w.rewards.find(r=>r.offerId===id);if(!s||!r||!offerEligible(w,r)||r.expeditionRound!==w.rewardRound||w.wallet.minerals+1e-8<r.minerals||w.wallet.gas+1e-8<r.gas)return false;
 const effect=r.expeditionEffect;
 if(effect.kind==='hero'&&!w.acquireHero(effect.heroId as HeroId))return false;if(effect.kind==='elite'){const selected=w.resolveEliteVariant(effect.family,variantId);if(!selected||!w.acquireElite(selected))return false;}
 let firstFree=false;if(effect.kind==='development'){const d=DEVELOPMENT.find(d=>d.id===effect.definitionId)!;firstFree=d.kind!=='research'&&w.talent('free_house')>0&&w.random()<.2*w.talent('free_house');applyDevelopment(w,r,d,firstFree);}
 if(effect.kind==='resource'){w.wallet.minerals+=effect.minerals;w.wallet.gas+=effect.gas;w.economyTotals.cards.minerals+=effect.minerals;w.economyTotals.cards.gas+=effect.gas;}
 if(effect.kind==='card'&&effect.effect==='cultivation'){const type=effect.family as UnitType;for(let n=0;n<effect.amount;n++){const unit=w.ordinaryUnits(type).filter(u=>u.rank<w.soldierCap()).sort((a,b)=>a.rank-b.rank||a.id-b.id)[0];if(!unit||w.availableCapacity(type)<=0)throw Error('Validated cultivation recipient missing');unit.rank++;w.refreshStats(unit);}}
 const paidMinerals=firstFree?0:r.minerals,paidGas=firstFree?0:r.gas;
 w.wallet.minerals-=paidMinerals;w.wallet.gas-=paidGas;w.economyTotals.purchases.minerals+=paidMinerals;w.economyTotals.purchases.gas+=paidGas;recordExpeditionOffer(s,r,1+w.talent('free_purchase'));for(const u of w.allies())w.refreshStats(u);w.changed();return true;
}
export function refreshOffers(w:World){const s=w.expedition;if(!s||w.phase!=='reward')return false;const stage=w.draftStage,windowId=w.draftWindowId,price=expeditionRefreshCost(s,stage,w.rewardRound,windowId,w.talent('reroll_fan'),w.talent('permanent_discount'));if(price===null||w.wallet.minerals<price)return false;w.wallet.minerals-=price;w.economyTotals.rerolls+=price;consumeExpeditionRefresh(s,stage,w.rewardRound,windowId,w.talent('reroll_fan'),w.talent('permanent_discount'));w.rewards=w.rewardRound==='building'?drawExpeditionDevelopment(draftContext(w),true):drawExpeditionReinforcements(draftContext(w),true);w.changed();return true;}
export function endReinforcement(w:World){if(w.expedition&&!w.expedition.draftTaken)finishExpeditionDraft(w.expedition);}
/** One physical permanent reinforcement per campaign chapter; Boss cards belong to intermission. */
export function mapReinforcement(w:World):ExpeditionReward|null {const s=w.expedition!,chapter=Math.ceil(w.stage/3);if((s.mapCardsByChapter[chapter]??0)>=1)return null;const candidates=s.familySlots.flatMap(f=>(['weapon','vitality'] as const).filter(effect=>(effect!=='weapon'||familyHasWeapon(f))&&(s.cardTotals[effect+'.'+f]??0)<(effect==='weapon'?.4:.5)).map(effect=>({f,effect})));if(!candidates.length)return null;const {f,effect}=candidates[Math.floor(w.random()*candidates.length)],amount=Math.min(effect==='weapon'?.08:.10,(effect==='weapon'?.4:.5)-(s.cardTotals[effect+'.'+f]??0)),id='map.'+effect+'.'+f;s.mapCardsByChapter[chapter]=1;return {id,offerId:id+':'+w.nextId++,name:SC2_UNITS[f].zh+' · '+(effect==='weapon'?'武器培养':'耐久培养'),description:`该家族${effect==='weapon'?'伤害':'最大生命'}增加 ${Math.round(amount*100)}%`,icon:'unit.'+f,kind:'buff',value:f,rarity:'blue',sold:false,minerals:0,gas:0,baseMinerals:0,baseGas:0,discount:0,expeditionWindow:s.draftWindow,expeditionRound:'random',expeditionEffect:{kind:'card',effect,family:f,amount,key:effect+'.'+f}};}
export function collectMapReinforcement(w:World,r:Reward){if(!w.expedition||!('expeditionEffect' in r)||r.sold)return false;const effect=(r as ExpeditionReward).expeditionEffect;if(effect.kind!=='card')return false;const cap=effect.effect==='weapon'?.4:.5,current=w.expedition.cardTotals[effect.key]??0;w.expedition.cardTotals[effect.key]=Math.min(cap,current+effect.amount);r.sold=true;for(const u of w.allies())w.refreshStats(u);return true;}
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
