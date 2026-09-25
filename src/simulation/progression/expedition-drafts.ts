import {DEVELOPMENT,developmentPrice,type DevelopmentDefinition} from '../../data/expedition-buildings';
import {FAMILIES_BY_RACE,HERO_LIMIT,MVP_RULES,type FamilyId,type Race} from '../../data/races';
import {CAMPAIGN18_HERO_WINDOWS,CAMPAIGN18_PURPLE_WINDOWS} from '../../data/campaign18';
import type {Rarity} from '../../data/rewards';
import type {Reward} from '../types';
import type {ExpeditionState} from '../expedition-state';

export type ExpeditionDraftRound='building'|'random';
export type ExpeditionCardEffect='weapon'|'vitality'|'armor'|'recovery'|'energy'|'production'|'cultivation';
export type ExpeditionOfferEffect=
 | {kind:'development';definitionId:string;expectedLevel:number;targetFacilityId?:number}
 | {kind:'card';effect:ExpeditionCardEffect;family:FamilyId;amount:number;key:string}
 | {kind:'hero';heroId:string}
 | {kind:'elite';eliteId:string;family:FamilyId}
 | {kind:'resource';minerals:number;gas:number;fallback:boolean;fallbackReason?:'guarantee'|'pool-exhausted'};
/** Extra fields are plain DTOs and can be stored with the existing World.rewards array. */
export interface ExpeditionReward extends Reward {expeditionWindow:number;expeditionRound:ExpeditionDraftRound;expeditionEffect:ExpeditionOfferEffect;talentLootReceipt?:string}
export interface ExpeditionFamilyDraftInfo {
 name?:string;icon?:string;alive:number;canAttack:boolean;canSupport:boolean;usesEnergy:boolean;
 /** Free ordinary rank capacity after all paid deliveries and inheritance reservations. */
 cultivationCapacity:number;canProduce:boolean;capabilities?:readonly string[];
}
export interface ExpeditionHeroDraftInfo {id:string;race:Race;name:string;icon:string;rank:number;owned:boolean;eligible:boolean}
export interface ExpeditionEliteDraftInfo {id:string;race:Race;family:FamilyId;name:string;icon:string;eligible:boolean}
export interface ExpeditionDraftContext {
 state:ExpeditionState;stage:number;random:()=>number;nextOfferId:(id:string)=>string;
 /** Distinct monotonically increasing ID for endless windows; stage remains the quality tier (17). */
 windowId?:number;
 familyInfo:(family:FamilyId)=>ExpeditionFamilyDraftInfo;
 heroes:readonly ExpeditionHeroDraftInfo[];elites?:readonly ExpeditionEliteDraftInfo[];
 /** Supply this if the candidate list omits maxed or otherwise ineligible owned heroes. */
 heroSeatsUsed?:number;
 /** World supplies its persisted offers so opening the same screen consumes no RNG. */
 currentOffers?:readonly Reward[];
 /** A readiness gate for actual implemented facilities/research, not wallet filtering. */
 developmentReady?:(definition:DevelopmentDefinition)=>boolean;
 developmentPriceFactor?:number;
 developmentPriceFactorFor?:(definition:DevelopmentDefinition)=>number;
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
export function beginExpeditionWindow(state:ExpeditionState,stage:number,windowId=stage,bonusRefresh=0){
 assertWindow(stage);if(!Number.isSafeInteger(windowId)||windowId<stage)throw new RangeError('Invalid expedition window ID');if(state.rules!==MVP_RULES)throw new Error('运行规则不匹配');if(state.draftWindow===windowId)return false;
 if(state.draftWindow>windowId||state.draftWindow>0&&!state.draftTaken)throw new Error('The previous reinforcement window is unfinished');
 const chapter=chapterOf(stage);if(state.freeRefresh.chapter!==chapter)state.freeRefresh={chapter,building:1,random:1};
 state.draftWindow=windowId;state.developmentBought=false;state.frozenDevelopmentTarget=state.developmentTarget;
 state.paidRefresh={building:false,random:false};state.bonusRefreshRemaining=Math.max(0,Math.min(3,bonusRefresh));state.draftTaken=false;state.draftClaims=[];state.draftSeenHigh=false;state.draftHistory.push({shown:[],chosen:null});return true;
}
export function expeditionRefreshCost(state:ExpeditionState,stage:number,round:ExpeditionDraftRound,windowId=stage,priceReduction=0,discount=0):number|null {
 assertWindow(stage);if(state.rules!==MVP_RULES||state.draftWindow!==windowId||(round==='building'?state.developmentBought:state.draftTaken))return null;
 if(round==='random'&&state.draftClaims.length>0)return null;
 if(state.freeRefresh[round]>0||state.bonusRefreshRemaining>0)return 0;if(state.paidRefresh[round])return null;
 return Math.max(10,Math.ceil(((round==='building'?50:30)+10*(chapterOf(stage)-1)-20*priceReduction)*(1-.1*discount)));
}
/** Call only after World's atomic wallet check; this returns the exact mineral charge. */
export function consumeExpeditionRefresh(state:ExpeditionState,stage:number,round:ExpeditionDraftRound,windowId=stage,priceReduction=0,discount=0){
 const price=expeditionRefreshCost(state,stage,round,windowId,priceReduction,discount);if(price===null)return null;
 if(price===0){if(state.freeRefresh[round]>0)state.freeRefresh[round]--;else state.bonusRefreshRemaining--;}
 else state.paidRefresh[round]=true;return price;
}
function sample<T>(pool:readonly T[],weight:(value:T)=>number,random:()=>number):T|undefined {
 if(!pool.length)return undefined;const weights=pool.map(item=>Math.max(0,weight(item))),sum=weights.reduce((a,b)=>a+b,0);if(sum<=0)return pool[0];let value=random()*sum;for(let i=0;i<pool.length;i++){value-=weights[i];if(value<0)return pool[i];}return pool.at(-1);
}
function retainedOffers(ctx:ExpeditionDraftContext,round:ExpeditionDraftRound,reroll:boolean){
 if(reroll)return null;const current=ctx.currentOffers?.filter((offer):offer is ExpeditionReward=>'expeditionWindow' in offer&&(offer as ExpeditionReward).expeditionWindow===windowOf(ctx)&&(offer as ExpeditionReward).expeditionRound===round);return current?.length?current.slice():null;
}
function quote(ctx:ExpeditionDraftContext,c:Candidate,round:ExpeditionDraftRound,price={minerals:0,gas:0}):ExpeditionReward {
 return {id:c.id,offerId:ctx.nextOfferId(c.id),sold:false,name:c.name,description:c.description,icon:c.icon,rarity:c.rarity,kind:c.kind,value:c.value,strength:c.strength,minerals:price.minerals,gas:price.gas,baseMinerals:price.minerals,baseGas:price.gas,discount:0,expeditionWindow:windowOf(ctx),expeditionRound:round,expeditionEffect:c.effect};
}
function selectedFamilies(state:ExpeditionState){return new Set(Object.values(state.production).flatMap(line=>line?.outputs.filter(f=>line.enabled[f]!==false)??[]));}
function ownsDevelopment(state:ExpeditionState,id:string){return (state.tech[id]??0)>0||state.facilities.some(f=>f.kind===id);}
function developmentAction(ctx:ExpeditionDraftContext,d:DevelopmentDefinition):ExpeditionOfferEffect&{kind:'development'}|null {
 const s=ctx.state;if(d.race!==s.race||ctx.stage<d.afterStage||d.requires.some(id=>!ownsDevelopment(s,id))||ctx.developmentReady?.(d)===false)return null;
 if(d.id.endsWith('_lab')){const target=s.facilities.filter(f=>f.kind===d.requires[0]&&!f.techLab).sort((a,b)=>a.id-b.id)[0];return target?{kind:'development',definitionId:d.id,expectedLevel:0,targetFacilityId:target.id}:null;}
 const level=d.kind==='facility'?s.facilities.filter(f=>f.kind===d.id).length:s.tech[d.id]??0;
 if(level>=d.maxLevel||d.maxLevel===3&&(level===1&&ctx.stage<6||level===2&&ctx.stage<12))return null;
 return {kind:'development',definitionId:d.id,expectedLevel:level};
}
export function expeditionDevelopmentActions(ctx:ExpeditionDraftContext){requireCurrent(ctx);return DEVELOPMENT.flatMap(definition=>{const effect=developmentAction(ctx,definition);return effect?[{definition,effect}]:[];});}
export function drawExpeditionDevelopment(ctx:ExpeditionDraftContext,reroll=false):ExpeditionReward[] {
 requireCurrent(ctx);if(ctx.state.developmentBought)return [];const retained=retainedOffers(ctx,'building',reroll);if(retained)return retained;
 const pool=expeditionDevelopmentActions(ctx),selected=selectedFamilies(ctx.state),related=new Set([...ctx.state.familySlots,...selected]);
 const currentCapabilities=new Set(ctx.state.familySlots.flatMap(f=>ctx.familyInfo(f).alive>0?[...(ctx.familyInfo(f).capabilities??[])]:[]));
 const picked:typeof pool=[];
 for(let slot=0;slot<3&&pool.length;slot++){
  const pinned=slot===0?pool.find(c=>c.definition.id===ctx.state.frozenDevelopmentTarget):undefined;
  const chosen=pinned??sample(pool,({definition:d})=>{
   if(slot===0)return d.families.some(f=>related.has(f))?4:1;
   if(slot===1){const fills=d.families.some(f=>(ctx.familyInfo(f).capabilities??[]).some(cap=>!currentCapabilities.has(cap)));return fills?4:d.families.some(f=>related.has(f))?2:1;}
   return d.families.some(f=>!related.has(f))?4:d.kind==='facility'?2:1;
  },ctx.random)!;picked.push(chosen);pool.splice(pool.indexOf(chosen),1);
 }
 return picked.map(({definition:d,effect})=>{
  const raw=developmentPrice(d,effect.expectedLevel),factor=ctx.developmentPriceFactorFor?.(d)??ctx.developmentPriceFactor??1;
  if(!Number.isFinite(factor)||factor<0)throw new RangeError('Invalid development price multiplier');
  const price={minerals:raw.minerals?Math.max(1,Math.ceil(raw.minerals*factor)):0,gas:raw.gas?Math.max(1,Math.ceil(raw.gas*factor)):0};
  const action=d.kind==='facility'?`建造${d.name}${effect.expectedLevel?`（第${effect.expectedLevel+1}座）`:''}`:d.kind==='research'?`${d.name}${d.maxLevel>1?` ${effect.expectedLevel+1}级`:''}`:`${d.name}${effect.targetFacilityId?`（设施${effect.targetFacilityId}）`:''}`;
  return quote(ctx,{id:`development.${d.id}${effect.targetFacilityId?'.'+effect.targetFacilityId:''}`,name:action,description:`${d.kind==='facility'?'增加生产设施':d.kind==='research'?'完成一项研究':'完成建筑科技'}。${d.families.length?'关联配方：'+d.families.map(f=>ctx.familyInfo(f).name??f).join('、')+'；仍需满足完整前置。':''}本窗口最多执行一个发展动作。`,icon:d.line?`building.${d.line}`:'tech.attack',rarity:'white',kind:d.kind==='facility'?'build':effect.targetFacilityId?'upgrade':'research',value:d.id,effect,category:'general',group:'development',immediate:true},'building',price);
 });
}

export function expeditionRarityWeights(stage:number):readonly number[]{assertWindow(stage);return stage<=5?[45,35,16,4,0]:stage<=11?[25,40,27,7,1]:[15,35,35,12,3];}
function rollTier(ctx:ExpeditionDraftContext,minimum=0){const weights=expeditionRarityWeights(ctx.stage);return sample(RARITIES.filter((_,i)=>i>=minimum),tier=>weights[tierIndex(tier)],ctx.random)??RARITIES[minimum];}
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
function legalHeroes(ctx:ExpeditionDraftContext){const owned=ctx.heroSeatsUsed??ctx.heroes.filter(h=>h.race===ctx.state.race&&h.owned).length;return ctx.heroes.filter(h=>h.race===ctx.state.race&&h.eligible&&h.rank<5&&(h.owned||owned<HERO_LIMIT));}
function heroCandidate(hero:ExpeditionHeroDraftInfo):Candidate{return {id:`hero.${hero.id}`,name:hero.name,description:hero.owned?'同名英雄培养一级；阵亡状态不会因此复活。':'招募本族英雄，占用一个独立英雄席位。',icon:hero.icon,rarity:'orange',kind:'hero',value:hero.id,effect:{kind:'hero',heroId:hero.id},category:'synergy',group:'hero',immediate:true};}
function reinforcementPool(ctx:ExpeditionDraftContext):Candidate[]{
 const result:Candidate[]=[];
 for(const family of FAMILIES_BY_RACE[ctx.state.race]){const info=ctx.familyInfo(family);
  for(const [effect,definition] of Object.entries(EXPEDITION_CARD_DEFINITIONS) as [ExpeditionCardEffect,typeof EXPEDITION_CARD_DEFINITIONS[ExpeditionCardEffect]][])for(let tier=0;tier<5;tier++){
   const amount=definition.values[tier];if(!effectLegal(ctx,effect,family,amount))continue;
   result.push({id:`card.${effect}.${family}.${RARITIES[tier]}`,name:`${info.name??family} · ${definition.name}`,description:cardDescription(effect,amount),icon:info.icon??`unit.${family}`,rarity:RARITIES[tier],kind:'buff',value:expeditionCardKey(effect,family),strength:amount,effect:{kind:'card',effect,family,amount,key:expeditionCardKey(effect,family)},category:definition.category,group:effect,family,immediate:effect!=='production'&&info.alive>0});
  }
 }
 if(ctx.state.resourceCards<3)for(let tier=0;tier<5;tier++){const [minerals,gas]=RESOURCE_VALUES[tier];result.push({id:`supply.${RARITIES[tier]}`,name:'资源补给',description:`获得${minerals}矿物${gas?`与${gas}瓦斯`:''}；全局最多取得三张完整补给卡。`,icon:'ui.minerals',rarity:RARITIES[tier],kind:'economy',value:'supply',effect:{kind:'resource',minerals,gas,fallback:false},category:'general',group:'resource',immediate:true});}
 result.push(...legalHeroes(ctx).map(heroCandidate));
 for(const elite of ctx.elites??[])if(elite.race===ctx.state.race&&elite.eligible&&ctx.state.familySlots.includes(elite.family)&&familyAllowed(ctx,elite.family))result.push({id:`elite.${elite.id}`,name:elite.name,description:'招募或培养本族已入编家族的精英，占用同系席位。',icon:elite.icon,rarity:'purple',kind:'elite',value:elite.id,effect:{kind:'elite',eliteId:elite.id,family:elite.family},category:'core',group:'elite',family:elite.family,immediate:true});
 return result;
}
function historyKey(id:string){return /^(card\.|supply\.)/.test(id)?id.replace(/\.(white|green|blue|purple|orange)$/,''):id;}
function candidateWeight(ctx:ExpeditionDraftContext,c:Candidate,pool:readonly Candidate[]){
 let weight=c.family?(ctx.familyInfo(c.family).alive>0?3:selectedFamilies(ctx.state).has(c.family)?2:1):1;
 // Variants split the family's mass; three old Terran variants are not three tickets.
 if(c.effect.kind==='elite')weight/=pool.filter(other=>other.effect.kind==='elite'&&other.family===c.family).length;
 const key=historyKey(c.id),previous=ctx.state.draftHistory.slice(0,-1).slice(-2);if(previous.some(h=>h.shown.some(id=>historyKey(id)===key)&&historyKey(h.chosen??'')!==key))weight*=.25;
 if(historyKey(previous.at(-1)?.chosen??'')===key)weight*=.5;return weight;
}
function guaranteeResource(tier:number,slot:number):Candidate {const rarity=RARITIES[tier],[minerals,gas]=RESOURCE_VALUES[tier];return {id:`fallback.guarantee.${rarity}.${slot}`,name:'保底资源补给',description:`本次保底没有合法的${rarity==='orange'?'橙':rarity==='purple'?'紫':'蓝'}色强化可供选择，改为${minerals}矿物与${gas}瓦斯；仍只领取一张。`,icon:'ui.minerals',rarity,kind:'economy',value:'guarantee',effect:{kind:'resource',minerals,gas,fallback:true,fallbackReason:'guarantee'},category:'general',group:'resource',immediate:true};}
function pickReinforcement(ctx:ExpeditionDraftContext,pool:readonly Candidate[],picked:readonly Candidate[],minimum:number,immediate:boolean){
 const available=pool.filter(c=>!picked.some(p=>p.id===c.id||p.group===c.group)&&(!immediate||c.immediate));
 if(!available.length)return minimum>0?guaranteeResource(minimum,picked.length):undefined;
 const rolled=rollTier(ctx,minimum),rolledIndex=tierIndex(rolled);
 // If a rolled tier is exhausted, retain a guarantee by considering higher legal tiers first.
 let same=available.filter(c=>c.rarity===rolled);
 if(!same.length){const order=[...Array.from({length:rolledIndex-minimum},(_,i)=>rolledIndex-1-i),...Array.from({length:4-rolledIndex},(_,i)=>rolledIndex+1+i)];for(const tier of order){same=available.filter(c=>tierIndex(c.rarity)===tier);if(same.length)break;}}
 if(!same.length)return minimum>0?guaranteeResource(minimum,picked.length):undefined;
 const categories=(Object.keys(CATEGORY_WEIGHTS) as Category[]).filter(category=>same.some(c=>c.category===category));
 const category=sample(categories,c=>CATEGORY_WEIGHTS[c],ctx.random)!;return sample(same.filter(c=>c.category===category),c=>candidateWeight(ctx,c,same),ctx.random);
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
 if(effect.kind==='card')return effect.key===expeditionCardKey(effect.effect,effect.family)&&effectLegal(ctx,effect.effect,effect.family,effect.amount);
 if(effect.kind==='hero')return legalHeroes(ctx).some(hero=>hero.id===effect.heroId);
 if(effect.kind==='elite')return (ctx.elites??[]).some(elite=>elite.family===effect.family&&elite.eligible&&elite.race===ctx.state.race&&ctx.state.familySlots.includes(elite.family));
 return effect.kind==='resource'&&effect.fallback;
}
export function drawExpeditionReinforcements(ctx:ExpeditionDraftContext,reroll=false):ExpeditionReward[]{
 requireCurrent(ctx);if(ctx.state.draftTaken)return [];const retained=retainedOffers(ctx,'random',reroll);if(retained)return retained;
 const pool=reinforcementPool(ctx),picked:Candidate[]=[],heroWindow=(CAMPAIGN18_HERO_WINDOWS as readonly number[]).includes(ctx.stage);
 if(heroWindow){const heroes=legalHeroes(ctx),unowned=heroes.filter(h=>!h.owned),hero=sample(unowned.length?unowned:heroes,()=>1,ctx.random);if(hero)picked.push(heroCandidate(hero));else {const fallback=pickReinforcement(ctx,pool,picked,4,true);if(fallback)picked.push(fallback);}}
 while(picked.length<3){const index=picked.length,minimum=heroWindow?2:index===0&&(CAMPAIGN18_PURPLE_WINDOWS as readonly number[]).includes(ctx.stage)?3:index===0&&ctx.state.lowWindows>=3?2:0;const next=pickReinforcement(ctx,pool,picked,minimum,index===0);if(!next)break;picked.push(next);}
 for(const fallback of fallbackCandidates()){if(picked.length>=3)break;if(!picked.some(c=>c.id===fallback.id))picked.push(fallback);}
 const history=ctx.state.draftHistory.at(-1)!;for(const c of picked)if(!history.shown.includes(c.id))history.shown.push(c.id);
 if(picked.some(c=>tierIndex(c.rarity)>=2))ctx.state.draftSeenHigh=true;
 return picked.map(c=>quote(ctx,c,'random'));
}
/** Closing without taking a card is permitted; it does not reset the pity counter by itself. */
export function finishExpeditionDraft(state:ExpeditionState,chosen:string|null=null){
 if(state.draftTaken)return false;state.draftTaken=true;state.lowWindows=state.draftSeenHigh?0:state.lowWindows+1;const history=state.draftHistory.at(-1);if(history)history.chosen=chosen;return true;
}
export function canTakeExpeditionOffer(ctx:ExpeditionDraftContext,offer:ExpeditionReward){
 if(offer.sold||offer.expeditionWindow!==windowOf(ctx)||ctx.state.draftWindow!==windowOf(ctx)||ctx.state.rules!==MVP_RULES)return false;
 if(offer.expeditionRound==='building'){
  if(ctx.state.developmentBought||offer.expeditionEffect.kind!=='development')return false;const effect=offer.expeditionEffect,d=DEVELOPMENT.find(d=>d.id===effect.definitionId&&d.race===ctx.state.race);if(!d)return false;const current=developmentAction(ctx,d);return !!current&&current.expectedLevel===effect.expectedLevel&&current.targetFacilityId===effect.targetFacilityId;
 }
 if(ctx.state.draftTaken||ctx.state.draftClaims.length>=(ctx.freeCardLimit??1)||ctx.state.draftClaims.includes(offer.offerId))return false;const effect=offer.expeditionEffect;
 if(effect.kind==='card')return effect.key===expeditionCardKey(effect.effect,effect.family)&&effectLegal(ctx,effect.effect,effect.family,effect.amount);
 if(effect.kind==='hero')return legalHeroes(ctx).some(h=>h.id===effect.heroId);
 if(effect.kind==='elite')return (ctx.elites??[]).some(e=>e.eligible&&e.race===ctx.state.race&&e.family===effect.family&&ctx.state.familySlots.includes(e.family));
 return effect.kind==='resource'&&(effect.fallback||ctx.state.resourceCards<3);
}
/** After World applies the real transaction successfully, record limits/receipts exactly once. */
export function recordExpeditionOffer(state:ExpeditionState,offer:ExpeditionReward,freeCardLimit=1){
 if(offer.sold||state.draftWindow!==offer.expeditionWindow||(offer.expeditionRound==='building'?state.developmentBought:state.draftTaken))return false;
 if(offer.expeditionRound==='building')state.developmentBought=true;
 else {const effect=offer.expeditionEffect;if(effect.kind==='card')state.cardTotals[effect.key]=(state.cardTotals[effect.key]??0)+effect.amount;else if(effect.kind==='resource'&&!effect.fallback)state.resourceCards++;
  state.draftClaims.push(offer.offerId);if(state.draftClaims.length>=freeCardLimit)finishExpeditionDraft(state,offer.id);else {const history=state.draftHistory.at(-1);if(history&&!history.chosen)history.chosen=offer.id;}}
 offer.sold=true;return true;
}
