import {funShopCandidates,funShopCatalogue,funShopQuote,shopRarityWeights,type FunShopLevels,type FunShopId} from '../fun-shop/state';
import {UNIQUE_SUPPORT,type UniqueSupportId} from '../../data/unique-support';
import {supplyPrice,supplyTier,type SupplyMode} from './supply-cards';
import type {SupportCard} from '../combat/shop-support';
import type {TrainingTarget} from './training-cards';
import {teamCardKey,teamCardLegal,TEAM_CARD_VALUES,type TeamCardGroup} from './team-cards';
import {DEVELOPMENT,developmentPrice,developmentInDirection,type DevelopmentDefinition} from '../../data/expedition-buildings';
import {FAMILIES_BY_RACE,HERO_LIMIT,MVP_RULES,type FamilyId,type Race} from '../../data/races';
import {DISCOUNTS} from '../../data/economy';
import {SOURCE_PRODUCTION_RECIPES} from '../../data/expansion-units';
import {CAMPAIGN_SCIENCE_VESSEL_RECIPE} from '../../data/campaign-science-vessel';
import {buildRouteMatches} from '../../data/build-card-routes';
import {rollRarity,type Rarity} from '../../data/rewards';
import type {Reward} from '../types';
import type {ExpeditionState} from '../expedition-state';
import {buildingContext,readBuildingContext,resetBuildingWindow,selectedProductionFamilies,syncBuildingWindow} from '../building/expedition';
import {PROJECTS,consumeRefresh,eligible,evolutionTargets,facilityCount,getOffers,linesFor,refreshCost as buildingRefreshCost,type Offer as BuildingOffer} from '../building/rules';

export type ExpeditionDraftRound='building'|'random';
export type ExpeditionCardEffect='weapon'|'vitality'|'armor'|'recovery'|'energy'|'production'|'cultivation';
export type ExpeditionOfferEffect=
 | {kind:'specialTicket';stage:number;challenge:import('../special-stages/state').SpecialStageKind}
 | {kind:'development';definitionId:string;expectedLevel:number;targetFacilityId?:number}
 | {kind:'card';effect:ExpeditionCardEffect;family:FamilyId;amount:number;key:string}
 | {kind:'support';support:SupportCard}
 | {kind:'funShop';item:FunShopId;level:number;expected:number}
 | {kind:'teamCard';group:TeamCardGroup;rarity:Rarity}
 | {kind:'hero';heroId:string}
 | {kind:'supply';family:FamilyId;count:number;mode:SupplyMode}
 | {kind:'training';rank:number;targets:TrainingTarget[];minerals:number;gas:number}
 | {kind:'elite';eliteId:string;family:FamilyId;targetRank?:5}
 | {kind:'resource';minerals:number;gas:number;fallback:boolean;fallbackReason?:'guarantee'|'pool-exhausted'};
/** Extra fields are plain DTOs and can be stored with the existing World.rewards array. */
export interface ExpeditionReward extends Reward {buildingQuoteId?:string;mapSource?:boolean;expeditionWindow:number;expeditionRound:ExpeditionDraftRound;expeditionEffect:ExpeditionOfferEffect;talentLootReceipt?:string;purchaseReceipt?:{minerals:number;gas:number;freeSource:'R07'|'R09'|null}}
export interface ExpeditionFamilyDraftInfo {
 name?:string;icon?:string;alive:number;canAttack:boolean;canSupport:boolean;usesEnergy:boolean;
 /** Free ordinary rank capacity after all paid deliveries and inheritance reservations. */
 cultivationCapacity:number;canProduce:boolean;capabilities?:readonly string[];
}
export interface ExpeditionHeroDraftInfo {id:string;race:Race;name:string;icon:string;rank:number;owned:boolean;eligible:boolean}
export interface ExpeditionEliteDraftInfo {id:string;race:Race;family:FamilyId;name:string;icon:string;eligible:boolean}
export interface ExpeditionDraftContext {
 difficulty?:import('../../data/stages').Difficulty;
 funShop?:FunShopLevels;
 wallet?:{minerals:number;gas:number};
 purchasePriceFactor?:number;
 state:ExpeditionState;stage:number;random:()=>number;nextOfferId:(id:string)=>string;
 /** Distinct monotonically increasing ID for endless windows; stage remains the quality tier (17). */
 windowId?:number;
 familyInfo:(family:FamilyId)=>ExpeditionFamilyDraftInfo;
 heroes:readonly ExpeditionHeroDraftInfo[];elites?:readonly ExpeditionEliteDraftInfo[];
 /** Supply this if the candidate list omits maxed or otherwise ineligible owned heroes. */
 heroSeatsUsed?:number;highQualityWeight?:number;
 /** World supplies its persisted offers so opening the same screen consumes no RNG. */
 currentOffers?:readonly Reward[];
 /** A readiness gate for actual implemented facilities/research, not wallet filtering. */
 developmentReady?:(definition:DevelopmentDefinition)=>boolean;
 developmentPriceFactor?:number;
 developmentPriceFactorFor?:(definition:DevelopmentDefinition)=>number;
 supplyLegal?:(family:FamilyId,count:number,mode:SupplyMode)=>boolean;
 supportLegal?:(kind:SupportCard)=>boolean;
 training?:(rank:number)=>{targets:TrainingTarget[];minerals:number;gas:number}|null;
 trainingValid?:(rank:number,targets:TrainingTarget[])=>boolean;
 freeCardLimit?:number;
}
export const EXPEDITION_CARD_DEFINITIONS:Readonly<Record<ExpeditionCardEffect,{name:string;values:readonly number[];cap:number;category:'core'|'synergy'|'general'}>>={
 weapon:{name:'武器培养',values:[.03,.05,.08,.12,.16],cap:.4,category:'core'},
 vitality:{name:'耐久培养',values:[.04,.07,.10,.15,.20],cap:.5,category:'core'},
 armor:{name:'装甲强化',values:[.1,.2,.3,.5,.7],cap:2,category:'core'},
 recovery:{name:'恢复增效',values:[.04,.06,.09,.12,.16],cap:.4,category:'synergy'},
 energy:{name:'能量循环',values:[.04,.06,.09,.12,.16],cap:.4,category:'synergy'},
 production:{name:'训练周转',values:[.03,.05,.07,.10,.12],cap:.25,category:'general'},
 cultivation:{name:'培养支援',values:[1,1,2,2,3],cap:5,category:'core'},
};
const RARITIES:Rarity[]=['white','green','blue','purple','orange'];
const RESOURCE_VALUES:readonly (readonly [number,number])[]=[[20,0],[30,5],[45,10],[60,15],[80,20]];
const CATEGORY_WEIGHTS={core:50,synergy:30,general:20};
type Category=keyof typeof CATEGORY_WEIGHTS;
interface Candidate {id:string;name:string;description:string;icon:string;rarity:Rarity;kind:Reward['kind'];value:string;strength?:number;effect:ExpeditionOfferEffect;category:Category;group:string;immediate:boolean;family?:FamilyId}
function assertWindow(stage:number){if(!Number.isInteger(stage)||stage<1||stage>17)throw new RangeError('Expedition drafts exist after stages 1–17');}
const windowOf=(ctx:ExpeditionDraftContext)=>ctx.windowId??ctx.stage;
function requireCurrent(ctx:ExpeditionDraftContext){assertWindow(ctx.stage);if(ctx.state.rules!==MVP_RULES||ctx.state.draftWindow!==windowOf(ctx))throw new Error('Start this expedition window before generating offers');}
const chapterOf=(stage:number)=>Math.floor((stage-1)/3)+1;
const tierIndex=(rarity:Rarity)=>RARITIES.indexOf(rarity);
export function expeditionCardKey(effect:ExpeditionCardEffect,family:FamilyId){return `${effect}.${family}`;}

/** Idempotent: reopening/loading a window cannot refill rerolls or clear the chosen action. */
export function beginExpeditionWindow(state:ExpeditionState,stage:number,windowId=stage,bonusRefresh=0,freePurchases=0){
 assertWindow(stage);if(!Number.isSafeInteger(windowId)||windowId<stage)throw new RangeError('Invalid expedition window ID');if(state.rules!==MVP_RULES)throw new Error('运行规则不匹配');if(state.draftWindow===windowId)return false;
 if(state.draftWindow>windowId||state.draftWindow>0&&!state.draftTaken)throw new Error('The previous reinforcement window is unfinished');
 const chapter=chapterOf(stage);state.freeRefresh={chapter,building:1,random:0};state.developmentDirection??=linesFor(state.race)[0];
 state.pendingShopElite=null;state.directionOffers={};state.developmentQuotes={};state.refreshCount=0;state.shopPage=0;state.freePurchasesRemaining=Math.max(0,Math.min(2,freePurchases));state.shopRevision++;
 state.draftWindow=windowId;state.developmentBought=false;state.frozenDevelopmentTarget=state.developmentTarget;
 state.paidRefresh={building:false,random:false};state.bonusRefreshRemaining=Math.max(0,Math.min(3,bonusRefresh));state.draftTaken=false;state.draftClaims=[];state.draftSeenHigh=false;state.draftHistory.push({shown:[],chosen:null});resetBuildingWindow(state,stage,windowId);return true;
}
export function expeditionRefreshCost(state:ExpeditionState,stage:number,round:ExpeditionDraftRound,windowId=stage,priceReduction=0,discount=0):number|null {
 assertWindow(stage);if(state.rules!==MVP_RULES||state.draftWindow!==windowId||(round==='building'?state.developmentBought:state.draftTaken))return null;
 const b=readBuildingContext(state,stage,windowId,round==='building'?'building':'shop');if(b)b.talents={...b.talents,reroll_fan:priceReduction,permanent_discount:discount};return b?buildingRefreshCost(b):null;
}
/** Call only after World's atomic wallet check; this returns the exact mineral charge. */
export function consumeExpeditionRefresh(state:ExpeditionState,stage:number,round:ExpeditionDraftRound,windowId=stage,priceReduction=0,discount=0){
 const price=expeditionRefreshCost(state,stage,round,windowId,priceReduction,discount);if(price===null)return null;
 const b=buildingContext(state,stage,windowId,round==='building'?'building':'shop',undefined,{reroll_fan:priceReduction,permanent_discount:discount});if(!b||!consumeRefresh(b,b.revision).ok)return null;
 if(price>0)state.paidRefresh[round]=true;syncBuildingWindow(state,b);return price;
}
function sample<T>(pool:readonly T[],weight:(value:T)=>number,random:()=>number):T|undefined {
 if(!pool.length)return undefined;const weights=pool.map(item=>Math.max(0,weight(item))),sum=weights.reduce((a,b)=>a+b,0);if(sum<=0)return pool[0];let value=random()*sum;for(let i=0;i<pool.length;i++){value-=weights[i];if(value<0)return pool[i];}return pool.at(-1);
}
function retainedOffers(ctx:ExpeditionDraftContext,round:ExpeditionDraftRound,reroll:boolean){
 if(reroll)return null;const current=ctx.currentOffers?.filter((offer):offer is ExpeditionReward=>'expeditionWindow' in offer&&(offer as ExpeditionReward).expeditionWindow===windowOf(ctx)&&(offer as ExpeditionReward).expeditionRound===round);return current?.length?current.slice():null;
}
function quote(ctx:ExpeditionDraftContext,c:Candidate,round:ExpeditionDraftRound,price={minerals:0,gas:0},factor=ctx.purchasePriceFactor??1):ExpeditionReward {
 if(c.effect.kind==='funShop')return {id:c.id,offerId:ctx.nextOfferId(c.id),sold:false,name:c.name,description:c.description,icon:c.icon,rarity:c.rarity,kind:c.kind,value:c.value,minerals:price.minerals,gas:price.gas,baseMinerals:price.minerals,baseGas:price.gas,discount:0,expeditionWindow:windowOf(ctx),expeditionRound:round,expeditionEffect:c.effect};
 const discount=price.minerals||price.gas?sample(DISCOUNTS,d=>d.weight,ctx.random)!.off:0;
 const cost=(base:number)=>base?Math.max(1,Math.ceil(base*(1-discount)*factor)):0;
 return {id:c.id,offerId:ctx.nextOfferId(c.id),sold:false,name:c.name,description:c.description,icon:c.icon,rarity:c.rarity,kind:c.kind,value:c.value,strength:c.strength,minerals:cost(price.minerals),gas:cost(price.gas),baseMinerals:price.minerals,baseGas:price.gas,discount,expeditionWindow:windowOf(ctx),expeditionRound:round,expeditionEffect:c.effect};
}
function selectedFamilies(state:ExpeditionState){return selectedProductionFamilies(state);}
function ownsDevelopment(state:ExpeditionState,id:string){return (state.tech[id]??0)>0||state.facilities.some(f=>f.kind===id);}
function developmentState(ctx:ExpeditionDraftContext,mutate=false){return (mutate?buildingContext:readBuildingContext)(ctx.state,ctx.stage,windowOf(ctx),'building',ctx.wallet);}
function developmentAction(ctx:ExpeditionDraftContext,d:DevelopmentDefinition):ExpeditionOfferEffect&{kind:'development'}|null {
 const b=developmentState(ctx);if(!b||!eligible(b,d)||ctx.developmentReady?.(d)===false)return null;
 const target=d.kind==='evolution'?evolutionTargets(b,d.id)[0]:undefined;
 return {kind:'development',definitionId:d.id,expectedLevel:d.kind==='facility'?facilityCount(b,d.id):b.tech[d.id]??0,...(target?{targetFacilityId:target.ids[0]}:{})};
}
export function expeditionDevelopmentActions(ctx:ExpeditionDraftContext){requireCurrent(ctx);return PROJECTS.flatMap(definition=>{const effect=developmentAction(ctx,definition);return effect?[{definition,effect}]:[];});}
export function nativeBuildingQuote(ctx:ExpeditionDraftContext,offer:ExpeditionReward):BuildingOffer|null {
 const b=developmentState(ctx),e=offer.expeditionEffect;if(!b||e.kind!=='development'||!offer.buildingQuoteId)return null;
 const q=b.offers[b.direction]?.find(q=>q.id===offer.buildingQuoteId&&q.projectId===e.definitionId);
 return q?{...structuredClone(q),revision:b.revision}:null;
}
export function drawExpeditionDevelopment(ctx:ExpeditionDraftContext,reroll=false):ExpeditionReward[] {
 requireCurrent(ctx);const direction=ctx.state.developmentDirection,b=developmentState(ctx,true);if(ctx.state.developmentBought||!direction||!b)return [];
 if(reroll){ctx.state.directionOffers={};ctx.state.developmentQuotes={};b.offers={};b.quotes={};}
 const quotes=getOffers(b,{random:ctx.random,related:ctx.state.familySlots,capabilities:f=>ctx.familyInfo(f).capabilities??[],ready:ctx.developmentReady,priceFactorFor:ctx.developmentPriceFactorFor??(ctx.developmentPriceFactor!==undefined?()=>ctx.developmentPriceFactor!:undefined)});
 const offers=quotes.map(q=>{
  const d=PROJECTS.find(d=>d.id===q.projectId)!;
  if(ctx.state.developmentQuotes[q.id])return ctx.state.developmentQuotes[q.id];
  const target=d.kind==='evolution'?b.groups.find(g=>g.id===q.targets[0]):undefined;
  const effect:ExpeditionOfferEffect={kind:'development',definitionId:d.id,expectedLevel:q.level,...(target?{targetFacilityId:target.ids[0]}:{})};
  const action=d.kind==='facility'?'建造'+d.name+(q.level&&d.id!=='crystal'?'（第'+(q.level+1)+'座）':''):d.kind==='research'?d.name+' '+(q.level+1)+'级':d.name;
  const offer:ExpeditionReward={id:'development.'+d.id,offerId:ctx.nextOfferId(d.id),sold:false,name:action,description:d.kind==='facility'?d.batch?'增加两座生产设施':'增加一座生产设施':d.kind==='evolution'?'开放所选孵化场方向':'本局同类设施共享，未来新建也有效',icon:d.kind==='facility'?d.race==='terran'?'building.'+d.id:'unit.'+d.families[0]:d.kind==='evolution'?'unit.'+d.families[0]:d.line&&['barracks','factory','starport'].includes(d.line)?'building.'+d.line:'tech.attack',rarity:'white',kind:d.kind==='facility'?'build':d.kind==='evolution'?'upgrade':'research',value:d.id,minerals:q.cost.minerals,gas:q.cost.gas,baseMinerals:q.baseCost.minerals,baseGas:q.baseCost.gas,discount:q.discount,expeditionWindow:windowOf(ctx),expeditionRound:'building',expeditionEffect:effect,buildingQuoteId:q.id};
  ctx.state.developmentQuotes[q.id]=offer;return offer;
 });
 ctx.state.directionOffers[direction]=offers;return offers;
}

export function expeditionRarityWeights(stage:number):readonly number[]{assertWindow(stage);return stage<=5?[45,35,16,4,0]:stage<=11?[25,40,27,7,1]:[15,35,35,12,3];}
function familyAllowed(ctx:ExpeditionDraftContext,family:FamilyId){return (FAMILIES_BY_RACE[ctx.state.race] as readonly string[]).includes(family);}
function effectLegal(ctx:ExpeditionDraftContext,effect:ExpeditionCardEffect,family:FamilyId,amount:number){
 if(!familyAllowed(ctx,family))return false;const info=ctx.familyInfo(family),definition=EXPEDITION_CARD_DEFINITIONS[effect],key=expeditionCardKey(effect,family);
 if((ctx.state.cardTotals[key]??0)+amount>definition.cap+1e-9)return false;
 if(effect==='production')return selectedFamilies(ctx.state).has(family)&&info.canProduce;
 if(!ctx.state.familySlots.includes(family)||info.alive<=0)return false;
 if(effect==='weapon')return info.canAttack;if(effect==='recovery')return info.canSupport;if(effect==='energy')return info.usesEnergy;
 if(effect==='cultivation')return info.cultivationCapacity>=amount;return true;
}
function cardDescription(effect:ExpeditionCardEffect,amount:number){
 if(effect==='cultivation')return `普通成员共获得${amount}点培养，优先最低等级；不增加身体，不占用已付空投的培养容量。`;
 if(effect==='armor')return `本兵种护甲 +${amount}。`;
 const value=Math.round(amount*100);return effect==='production'?`本兵种之后开工的训练耗时降低${value}%；已付批次保持原进度。`:effect==='weapon'?`本兵种武器伤害 +${value}%。`:effect==='vitality'?`本兵种最大生命 +${value}%，保留已损失生命。`:effect==='energy'?`本兵种能量恢复 +${value}%。`:`本兵种合法恢复能力效率 +${value}%，不扩大治疗目标类型。`;
}
function legalHeroes(ctx:ExpeditionDraftContext){const owned=ctx.heroSeatsUsed??ctx.heroes.filter(h=>h.race===ctx.state.race&&h.owned).length;return ctx.heroes.filter(h=>h.race===ctx.state.race&&h.eligible&&(h.owned||owned<HERO_LIMIT));}
function heroCandidate(hero:ExpeditionHeroDraftInfo):Candidate{return {id:`hero.${hero.id}`,name:hero.name,description:hero.owned?'同名英雄培养一级；阵亡状态不会因此复活。':'招募本族英雄，占用一个独立英雄席位。',icon:hero.icon,rarity:'orange',kind:'hero',value:hero.id,effect:{kind:'hero',heroId:hero.id},category:'synergy',group:'hero',immediate:true};}
/** The original ordered unit subset, using this call's live eligibility. */
function reinforcementUnits(ctx:ExpeditionDraftContext):Candidate[]{
 const result=legalHeroes(ctx).map(heroCandidate);
 for(const elite of ctx.elites??[])if(elite.race===ctx.state.race&&elite.eligible&&ctx.state.familySlots.includes(elite.family)&&familyAllowed(ctx,elite.family))result.push({id:`elite.${elite.id}`,name:elite.name,description:'招募或培养本族已入编家族的精英，占用同系席位。',icon:elite.icon,rarity:'purple',kind:'elite',value:elite.id,effect:{kind:'elite',eliteId:elite.id,family:elite.family},category:'core',group:'elite',family:elite.family,immediate:true});
 return result;
}
function reinforcementPool(ctx:ExpeditionDraftContext,shop=false,reference=false):Candidate[]{
 const result:Candidate[]=[];
 if(shop&&ctx.funShop)for(const c of reference?funShopCatalogue():funShopCandidates(ctx.funShop,ctx.difficulty))result.push({...c,kind:'buff',value:c.item,effect:{kind:'funShop',item:c.item,level:c.level,expected:c.expected},category:'synergy',group:'fun-shop.'+c.item,immediate:true});
 for(const group of ['firepower','defense'] as const)for(const [i,rarity] of RARITIES.entries())if(teamCardLegal(ctx.state,group,rarity))result.push({id:teamCardKey(group,rarity),name:group==='firepower'?'全军火力':'全军防御',description:group==='firepower'?`伤害 +${TEAM_CARD_VALUES.damage[i]*100}% · 攻速 +${TEAM_CARD_VALUES.speed[i]*100}%`:`生命与护盾 +${TEAM_CARD_VALUES.health[i]*100}% · 护甲 +${TEAM_CARD_VALUES.armor[i]}`,icon:group==='firepower'?'tech.attack':'tech.armor',rarity,kind:'buff',value:teamCardKey(group,rarity),effect:{kind:'teamCard',group,rarity},category:'core',group,immediate:true});
 for(let rank=2;rank<=5;rank++){const plan=ctx.training?.(rank);if(plan)result.push({id:`training.${rank}`,name:`两名士兵晋升${['','I','II','III','IV','V'][rank]}`,description:`最低军衔的两名普通士兵提升至${rank}级`,icon:'tech.attack',rarity:RARITIES[rank-1],kind:'buff',value:'training',effect:{kind:'training',rank,...plan},category:'core',group:'training',immediate:true});}
 if(shop)for(const [kind,rarity,names,description] of [
 ['mines','green',['蜘蛛雷','爆裂虫卵','灵能地雷'],'每关布置地雷，最多叠加3张'],['bombardment','blue',['炮火轰炸','酸液轰炸','轨道轰击'],'持续轰炸可见敌军，叠加缩短间隔'],['mutation','purple',['燃烧弹','腐蚀弹','灼能弹'],'本族主力普攻附带持续伤害'],['strategic','orange',['核弹','生体巨爆','净化打击'],'获得一枚战略打击弹药']
 ] as const)if(ctx.supportLegal?.(kind))result.push({id:`support.${ctx.state.race}.${kind}`,name:names[['terran','zerg','protoss'].indexOf(ctx.state.race)],description,icon:'tech.attack',rarity,kind:'buff',value:kind,effect:{kind:'support',support:kind},category:'synergy',group:'support',immediate:true});
 if(shop)for(const [id,card] of Object.entries(UNIQUE_SUPPORT))if(card.race===ctx.state.race&&ctx.supportLegal?.(id as UniqueSupportId))result.push({id:'support.'+id,name:card.name,description:card.description,icon:'tech.attack',rarity:card.rarity,kind:'buff',value:id,effect:{kind:'support',support:id as UniqueSupportId},category:'synergy',group:'support',immediate:true});
 if(shop)for(const family of FAMILIES_BY_RACE[ctx.state.race])for(const mode of ['pod','direct'] as const)for(let count=1;count<=3;count++)if(ctx.supplyLegal?.(family,count,mode)){const info=ctx.familyInfo(family),rarity=RARITIES[count-1+(mode==='direct'?1:0)];result.push({id:`supply.${mode}.${family}.${count}`,name:`${info.name??family} ×${count}${family==='zergling'?'对':''}`,description:mode==='pod'?'救援空投 · 不解锁持续生产':'立即加入 · 不解锁持续生产',icon:info.icon??'unit.'+family,rarity,kind:'buff',value:family,effect:{kind:'supply',family,count,mode},family,category:'core',group:'supply',immediate:mode==='direct'});}
 for(const family of FAMILIES_BY_RACE[ctx.state.race]){const info=ctx.familyInfo(family);
  for(const [effect,definition] of Object.entries(EXPEDITION_CARD_DEFINITIONS) as [ExpeditionCardEffect,typeof EXPEDITION_CARD_DEFINITIONS[ExpeditionCardEffect]][])for(let tier=0;tier<5;tier++){
   const amount=definition.values[tier];if(['weapon','vitality','armor','cultivation'].includes(effect)||!effectLegal(ctx,effect,family,amount))continue;
   result.push({id:`card.${effect}.${family}.${RARITIES[tier]}`,name:`${info.name??family} · ${definition.name}`,description:cardDescription(effect,amount),icon:info.icon??`unit.${family}`,rarity:RARITIES[tier],kind:'buff',value:expeditionCardKey(effect,family),strength:amount,effect:{kind:'card',effect,family,amount,key:expeditionCardKey(effect,family)},category:definition.category,group:effect,family,immediate:effect!=='production'&&info.alive>0});
  }
 }
 for(const [id,name,minerals,gas] of [['minerals','矿物补给',100,0],['gas','瓦斯补给',0,50],['salvage','战地回收',75,25],['supply','补给运输',100,25]] as const)result.push({id:`economy.${id}`,name,description:`获得 ${minerals} 矿物／${gas} 瓦斯。`,icon:gas&&!minerals?'ui.gas':'ui.minerals',rarity:'white',kind:'economy',value:id,effect:{kind:'resource',minerals,gas,fallback:false},category:'general',group:'resource',immediate:true});
 result.push(...reinforcementUnits(ctx));
 if(shop)for(const c of [...result])if(c.effect.kind==='elite')result.push({...c,id:c.id+'.v',rarity:'orange',name:c.name+' · V级',description:'招募或直接提升至V级',effect:{...c.effect,targetRank:5}});
 return result;
}
function historyKey(id:string){return /^(card\.|supply\.|team\.)/.test(id)?id.replace(/\.(white|green|blue|purple|orange)$/,''):id;}
function candidateWeight(ctx:ExpeditionDraftContext,c:Candidate,pool:readonly Candidate[]){
 let weight=c.family?(ctx.familyInfo(c.family).alive>0?3:selectedFamilies(ctx.state).has(c.family)?2:1):1;
 if(c.effect.kind==='supply'){const tier=supplyTier(c.effect.family),siblings=pool.filter(o=>o.effect.kind==='supply'&&o.effect.mode===(c.effect as {mode:SupplyMode}).mode&&supplyTier(o.effect.family)===tier);weight*=[50,35,15][tier]/Math.max(1,siblings.reduce((total,o)=>total+(o.family?(ctx.familyInfo(o.family).alive>0?3:selectedFamilies(ctx.state).has(o.family)?2:1):1),0));}
 // Variants split the family's mass; three old Terran variants are not three tickets.
 if(c.effect.kind==='elite')weight/=pool.filter(other=>other.effect.kind==='elite'&&other.family===c.family).length;
 const key=historyKey(c.id),previous=ctx.state.draftHistory.slice(Math.max(0,ctx.state.draftHistory.length-3),Math.max(0,ctx.state.draftHistory.length-1));if(previous.some(h=>h.shown.some(id=>historyKey(id)===key)&&historyKey(h.chosen??'')!==key))weight*=.25;
 if(historyKey(previous.at(-1)?.chosen??'')===key)weight*=.5;return weight;
}
/** No sampling or state mutation. Weight is conditional on this rarity's legal pool. */
export function inspectReinforcementPool(ctx:ExpeditionDraftContext){
 const pool=reinforcementPool(ctx,true);
 return pool.map(c=>({id:c.id,family:c.family??null,group:c.group,rarity:c.rarity,bucket:reinforcementOfferBucket(ctx,c.effect),effect:c.effect,weight:candidateWeight(ctx,c,pool.filter(o=>o.rarity===c.rarity)),historyKey:historyKey(c.id)}));
}
/** A reference catalogue keeps each product's mass after another product sells out.
 * It is never offered or applied: live eligibility still controls the actual shelf. */
function shopReferencePool(ctx:ExpeditionDraftContext){
 const reference:ExpeditionDraftContext={...ctx,state:{...ctx.state,cardTotals:{}},
  heroes:ctx.heroes.map(h=>({...h,eligible:true})),heroSeatsUsed:0,
  elites:ctx.elites?.map(e=>({...e,eligible:true})),
  supplyLegal:ctx.supplyLegal?()=>true:undefined,supportLegal:ctx.supportLegal?()=>true:undefined,
  training:ctx.training?rank=>ctx.training!(rank)??{targets:[],minerals:0,gas:0}:undefined};
 return reinforcementPool(reference,true,true);
}
function shopWeights(ctx:ExpeditionDraftContext,reference:readonly Candidate[],immediate:boolean){
 const result=new Map<string,number>(),rarities=shopRarityWeights(expeditionRarityWeights(ctx.stage),ctx.funShop?.dice??0,ctx.highQualityWeight??0);
 for(const rarity of RARITIES){
  const tier=reference.filter(c=>c.rarity===rarity&&(!immediate||c.immediate)),fun=tier.filter(c=>c.effect.kind==='support'||c.effect.kind==='funShop'),other=tier.filter(c=>!fun.includes(c));
  const assign=(items:Candidate[],mass:number)=>{const weights=items.map(c=>candidateWeight(ctx,c,tier)),total=weights.reduce((n,v)=>n+v,0);items.forEach((c,i)=>result.set(c.id,total?mass*weights[i]/total:0));};
  const mass=rarities[tierIndex(rarity)];assign(fun,mass*(other.length?.25:1));
  const otherMass=mass*(fun.length?.75:1);
  if(immediate){assign(other,otherMass);continue;}
  const buckets={current:70,shared:20,other:10},keys=(Object.keys(buckets) as (keyof typeof buckets)[]).filter(k=>other.some(c=>reinforcementOfferBucket(ctx,c.effect)===k)),total=keys.reduce((n,k)=>n+buckets[k],0);
  for(const key of keys)assign(other.filter(c=>reinforcementOfferBucket(ctx,c.effect)===key),otherMass*buckets[key]/total);
 }
 return result;
}
/** Read-only actual weights, before without-replacement choices within the shelf. */
export function inspectShopWeights(ctx:ExpeditionDraftContext,immediate=false){
 const weights=shopWeights(ctx,shopReferencePool(ctx),immediate);
 return reinforcementPool(ctx,true).filter(c=>shopEffectLegal(ctx,c.effect)&&(!immediate||c.immediate)).map(c=>({id:c.id,rarity:c.rarity,group:c.group,weight:weights.get(c.id)??0}));
}
function pickShopCandidate(ctx:ExpeditionDraftContext,pool:readonly Candidate[],picked:readonly Candidate[],weights:ReadonlyMap<string,number>,immediate:boolean){
 const remaining=pool.filter(c=>!picked.some(p=>p.id===c.id)&&(!immediate||c.immediate)&&(weights.get(c.id)??0)>0);
 // One resource card while another unshown strengthening remains available.
 const resourceAllowed=!picked.some(c=>c.effect.kind==='resource')||!remaining.some(c=>c.effect.kind!=='resource');
 let available=remaining.filter(c=>(resourceAllowed||c.effect.kind!=='resource')&&!picked.some(p=>p.group===c.group&&c.effect.kind!=='support'));
 if(!available.length)available=remaining.filter(c=>resourceAllowed||c.effect.kind!=='resource');
 available.sort((a,b)=>tierIndex(a.rarity)-tierIndex(b.rarity));
 return sample(available,c=>weights.get(c.id)??0,ctx.random);
}
function guaranteeResource(tier:number,slot:number):Candidate {const rarity=RARITIES[tier],[minerals,gas]=RESOURCE_VALUES[tier];return {id:`fallback.guarantee.${rarity}.${slot}`,name:'保底资源补给',description:`本次保底没有合法的${rarity==='orange'?'橙':rarity==='purple'?'紫':'蓝'}色强化可供选择，改为${minerals}矿物与${gas}瓦斯；仍只领取一张。`,icon:'ui.minerals',rarity,kind:'economy',value:'guarantee',effect:{kind:'resource',minerals,gas,fallback:true,fallbackReason:'guarantee'},category:'general',group:'resource',immediate:true};}
/** Disjoint pools: strongest matching route(s) supply the authored stage recommendations.
 * A custom family's core cards stay current; off-route units are never excluded. */
export function reinforcementOfferBucket(ctx:ExpeditionDraftContext,effect:ExpeditionOfferEffect):'current'|'shared'|'other' {
 if(effect.kind==='teamCard'||effect.kind==='training')return 'current';
 if(effect.kind==='supply')return ctx.state.familySlots.includes(effect.family)||selectedFamilies(ctx.state).has(effect.family)?'current':'other';
 if(effect.kind!=='card'&&effect.kind!=='elite')return 'shared';
 const matches=buildRouteMatches(ctx.state.race,ctx.stage,new Set(ctx.state.familySlots),f=>ctx.familyInfo(f).alive>0,selectedFamilies(ctx.state));
 const best=Math.max(0,...matches.map(m=>m.score)),routes=matches.filter(m=>m.score===best&&m.score>0),kind=effect.kind==='elite'?'elite':effect.effect;
 if(routes.some(m=>m.cards.some(([family,effects])=>family===effect.family&&effects.includes(kind))))return 'current';
 if(effect.kind==='card'&&['recovery','energy'].includes(effect.effect))return 'shared';
 if(ctx.state.familySlots.includes(effect.family)&&!routes.some(m=>m.route.families.includes(effect.family)))return 'current';
 return 'other';
}
function fallbackCandidates():Candidate[]{return ([[10,0,'矿物', 'minerals'],[0,3,'瓦斯','gas'],[5,1,'混合','mixed']] as const).map(([minerals,gas,name,id])=>({id:`fallback.${id}`,name:`${name}储备`,description:`可用强化不足，获得${minerals}矿物与${gas}瓦斯。`,icon:gas&&!minerals?'ui.gas':'ui.minerals',rarity:'white',kind:'economy',value:id,effect:{kind:'resource',minerals,gas,fallback:true,fallbackReason:'pool-exhausted'},category:'general',group:`fallback.${id}`,immediate:true}));}
/** R14 has its own fixed-tier choice. It never consumes a chapter map card or an intermission draft. */
export function drawFixedRarityTalentLoot(ctx:ExpeditionDraftContext,rarity:'purple'|'orange',receipt:string):ExpeditionReward[]{
 const pool=reinforcementPool(ctx).filter(candidate=>candidate.rarity===rarity),picked:Candidate[]=[];
 while(picked.length<3){const available=pool.filter(candidate=>!picked.some(prior=>prior.id===candidate.id||prior.group===candidate.group));if(!available.length)break;const next=sample(available,candidate=>candidateWeight(ctx,candidate,available),ctx.random)!;picked.push(next);}
 while(picked.length<3)picked.push(guaranteeResource(tierIndex(rarity),picked.length));
 return picked.map((candidate,index)=>({...quote(ctx,{...candidate,id:`talent.${receipt}.${index}.${candidate.id}`},'random'),talentLootReceipt:receipt}));
}
export function canClaimTalentLoot(ctx:ExpeditionDraftContext,offer:ExpeditionReward){
 const effect=offer.expeditionEffect;
 if(effect.kind==='supply')return ctx.supplyLegal?.(effect.family,effect.count,effect.mode)??false;
 if(effect.kind==='support')return ctx.supportLegal?.(effect.support)??false;
 if(effect.kind==='training')return ctx.trainingValid?.(effect.rank,effect.targets)??false;
 if(effect.kind==='teamCard')return teamCardLegal(ctx.state,effect.group,effect.rarity);
 if(effect.kind==='card')return effect.key===expeditionCardKey(effect.effect,effect.family)&&effectLegal(ctx,effect.effect,effect.family,effect.amount);
 if(effect.kind==='hero')return legalHeroes(ctx).some(hero=>hero.id===effect.heroId);
 if(effect.kind==='elite')return (ctx.elites??[]).some(elite=>elite.family===effect.family&&elite.eligible&&elite.race===ctx.state.race&&ctx.state.familySlots.includes(elite.family));
 return effect.kind==='resource'&&effect.fallback;
}
export function drawExpeditionReinforcements(ctx:ExpeditionDraftContext,reroll=false):ExpeditionReward[]{
 requireCurrent(ctx);if(ctx.state.draftTaken)return [];const retained=retainedOffers(ctx,'random',reroll);if(retained)return retained;
 const pool=reinforcementPool(ctx,true).filter(c=>shopEffectLegal(ctx,c.effect)),reference=shopReferencePool(ctx),firstWeights=shopWeights(ctx,reference,true),laterWeights=shopWeights(ctx,reference,false),picked:Candidate[]=[];
 while(picked.length<3){const first=picked.length===0,next=pickShopCandidate(ctx,pool,picked,first?firstWeights:laterWeights,first);if(!next)break;picked.push(next);}
 for(const fallback of pool.filter(c=>c.kind==='economy')){if(picked.length>=3)break;if(!picked.some(c=>c.id===fallback.id))picked.push(fallback);}
 const history=ctx.state.draftHistory.at(-1)!;for(const c of picked)if(!history.shown.includes(c.id))history.shown.push(c.id);
 if(picked.some(c=>tierIndex(c.rarity)>=2))ctx.state.draftSeenHigh=true;
 return picked.map(c=>quote(ctx,c,'random',c.effect.kind==='funShop'?funShopQuote(ctx.funShop!,c.effect.item,c.effect.level,c.effect.expected)!:shopPrice(c)));
}
function shopPrice(c:Candidate){
 const effect=c.effect;
 if(effect.kind==='supply')return supplyPrice(effect.family,effect.count,effect.mode);
 if(effect.kind==='training')return {minerals:effect.minerals,gas:effect.gas};
 if(effect.kind==='hero')return {minerals:750,gas:250};
 if(effect.kind==='elite'||effect.kind==='card'&&effect.effect==='cultivation'){
  const recipe=effect.family==='science_vessel'?CAMPAIGN_SCIENCE_VESSEL_RECIPE:SOURCE_PRODUCTION_RECIPES[effect.family];const count=effect.kind==='elite'?(effect.targetRank?15:5):effect.amount*(effect.family==='zergling'?2:1);
  if(!recipe)throw Error(`Missing paid recipe: ${effect.family}`);
  return {minerals:recipe.mineralCost*count,gas:recipe.gasCost*count};
 }
 if(effect.kind==='resource'){const costs:Record<string,[number,number]>={minerals:[25,0],gas:[25,0],salvage:[50,0],supply:[75,25]};const [minerals,gas]=costs[c.value]??[25,0];return {minerals,gas};}
 const prices=effect.kind==='card'&&['recovery','energy','production'].includes(effect.effect)?[[25,0],[50,0],[90,20],[150,50],[225,90]]:[[50,0],[90,20],[150,50],[225,90],[325,140]];
 const [minerals,gas]=prices[tierIndex(c.rarity)];return {minerals,gas};
}
/** Physical map loot keeps the legacy quality roll, without shop weighting or chapter quotas. */
export function drawMapLoot(ctx:ExpeditionDraftContext,elite=false):ExpeditionReward|null {
 const rarity=rollRarity(ctx.random,elite?'elite':true),pool=reinforcementPool(ctx).filter(c=>c.rarity===rarity);
 if(!pool.length)return null;
 const c=pool[Math.floor(ctx.random()*pool.length)],reward=quote(ctx,c,'random'),base=shopPrice(c);
 return {...reward,mapSource:true,baseMinerals:base.minerals,baseGas:base.gas};
}
/** Boss units use the old single purple elite / orange hero route, never the paid shop. */
export function drawBossLoot(ctx:ExpeditionDraftContext,receipt:string,fixedRarity?:'purple'|'orange'):ExpeditionReward {
 const rarity=fixedRarity??(ctx.random()<.2?'orange':'purple'),units=reinforcementUnits(ctx),tier=units.filter(c=>c.rarity===rarity),pool=tier.length?tier:units;
 const c=sample(pool,c=>candidateWeight(ctx,c,pool),ctx.random)??{id:'boss.exhausted',name:'首领补给回收',description:'全部合法单位奖励满额，获得250矿／100气。',icon:'ui.minerals',rarity,kind:'economy' as const,value:'boss-recycle',effect:{kind:'resource' as const,minerals:250,gas:100,fallback:true},category:'general' as const,group:'resource',immediate:true};
 return {...quote(ctx,c,'random'),offerId:receipt,talentLootReceipt:receipt};
}
/** Equipment rewards draw from the same currently legal unit-card pool. */
export function drawEquipmentUnitLoot(ctx:ExpeditionDraftContext,receipt:string):ExpeditionReward|null {
 const pool=reinforcementUnits(ctx);
 const c=sample(pool,c=>candidateWeight(ctx,c,pool),ctx.random);if(!c)return null;
 return {...quote(ctx,c,'random'),offerId:receipt,minerals:0,gas:0,baseMinerals:0,baseGas:0};
}
/** Closing without taking a card is permitted; it does not reset the pity counter by itself. */
export function finishExpeditionDraft(state:ExpeditionState,chosen:string|null=null){
 if(state.draftTaken)return false;state.draftTaken=true;state.lowWindows=state.draftSeenHigh?0:state.lowWindows+1;const history=state.draftHistory.at(-1);if(history)history.chosen=chosen;return true;
}
export function canTakeExpeditionOffer(ctx:ExpeditionDraftContext,offer:ExpeditionReward){
 if(offer.sold||offer.expeditionWindow!==windowOf(ctx)||ctx.state.draftWindow!==windowOf(ctx)||ctx.state.rules!==MVP_RULES)return false;
 if(offer.expeditionRound==='building'){
  if(ctx.state.developmentBought||offer.expeditionEffect.kind!=='development')return false;const effect=offer.expeditionEffect,d=PROJECTS.find(d=>d.id===effect.definitionId&&d.race===ctx.state.race),b=developmentState(ctx),q=nativeBuildingQuote(ctx,offer);if(!d||!b||!q||q.cost.minerals!==offer.minerals||q.cost.gas!==offer.gas)return false;const current=developmentAction(ctx,d);return !!current&&current.expectedLevel===effect.expectedLevel&&q.level===effect.expectedLevel;
 }
 if(ctx.state.draftTaken||ctx.state.draftClaims.includes(offer.offerId))return false;const effect=offer.expeditionEffect;
 if(effect.kind==='funShop'){
  const q=ctx.funShop&&funShopQuote(ctx.funShop,effect.item,effect.level,effect.expected);
  // Equipment changes the persisted shelf price; the native quote still identifies the upgrade.
  return !!q&&offer.baseMinerals===q.minerals&&offer.baseGas===q.gas;
 }
 return shopEffectLegal(ctx,effect);
}
/** Shared by fresh shelves and the final transaction; insufficient money is not ineligibility. */
function shopEffectLegal(ctx:ExpeditionDraftContext,effect:ExpeditionOfferEffect){
 if(effect.kind==='funShop')return !!ctx.funShop&&!!funShopQuote(ctx.funShop,effect.item,effect.level,effect.expected);
 if(effect.kind==='supply')return ctx.supplyLegal?.(effect.family,effect.count,effect.mode)??false;
 if(effect.kind==='support')return ctx.supportLegal?.(effect.support)??false;
 if(effect.kind==='training')return ctx.trainingValid?.(effect.rank,effect.targets)??false;
 if(effect.kind==='teamCard')return teamCardLegal(ctx.state,effect.group,effect.rarity);
 if(effect.kind==='card')return effect.key===expeditionCardKey(effect.effect,effect.family)&&effectLegal(ctx,effect.effect,effect.family,effect.amount);
 if(effect.kind==='hero')return legalHeroes(ctx).some(h=>h.id===effect.heroId);
 if(effect.kind==='elite')return (ctx.elites??[]).some(e=>e.eligible&&e.race===ctx.state.race&&e.family===effect.family&&ctx.state.familySlots.includes(e.family));
 return effect.kind==='resource';
}
/** After World applies the real transaction successfully, record limits/receipts exactly once. */
export function recordExpeditionOffer(state:ExpeditionState,offer:ExpeditionReward,freeCardLimit=1){
 if(offer.sold||state.draftWindow!==offer.expeditionWindow||(offer.expeditionRound==='building'?state.developmentBought:state.draftTaken))return false;
 if(offer.expeditionRound==='building')state.developmentBought=true;
 else {const effect=offer.expeditionEffect;if(effect.kind==='teamCard'){const key=teamCardKey(effect.group,effect.rarity);state.cardTotals[key]=(state.cardTotals[key]??0)+1;}else if(effect.kind==='card')state.cardTotals[effect.key]=(state.cardTotals[effect.key]??0)+effect.amount;else if(effect.kind==='resource'&&!effect.fallback)state.resourceCards++;
  state.draftClaims.push(offer.offerId);const history=state.draftHistory.at(-1);if(history&&!history.chosen)history.chosen=offer.id;}
 state.shopRevision++;offer.sold=true;return true;
}
