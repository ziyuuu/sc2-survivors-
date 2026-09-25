import {FAMILIES_BY_RACE,MVP_RULES,type Race,type FamilyId} from '../data/races';
import {PRODUCTION_LINES,type ProductionLineId} from '../data/expedition-buildings';
import type {ExpeditionReward} from './progression/expedition-drafts';
export interface Payment {minerals:number;gas:number}
export type TacticalDirection='assault'|'guard'|'mobility';
export interface DeliveryPassenger {paid:Payment;status:'waiting'|'released'|'lost'|'refunded';entityId:number|null;purpose:'body'|'rankTraining'|'tacticalProgress';targetEntityId?:number;targetGeneration?:number;tacticalTierAtOrder?:number;direction?:TacticalDirection;}
export interface DeliveryLedger {id:number;family:FamilyId;line:ProductionLineId;facilityIds:number[];remaining:number;state:'training'|'awaiting'|'risk'|'settled';podId:number|null;passengers:DeliveryPassenger[];}
export interface CultivationCredit {id:number;rank:number;sourceId:number;}
export interface FamilyReceiptRequest {id:string;podId:number;passengerIndex:number;family:FamilyId;readyTick:number;}
export interface EliteContract {id:string;eliteId:string;family:FamilyId;minerals:number;gas:number;purchased:boolean;}
export interface TacticalPlan {targetEntityId:number;targetGeneration:number;direction:TacticalDirection;bank:number;enabled:boolean;}
export interface TalentLootChoice {receipt:string;rarity:'purple'|'orange';offers:ExpeditionReward[];}
export interface EliteRescueRight {receipt:string;eliteId:string;}
export interface ExpeditionState {
 weaponAreas:{id:number;source:number;owner:'terran'|'zerg';points:{x:number;z:number}[];nextIndex:number;next:number;period:number;radius:number;hits:number[];damage:number;bonuses:{attribute:string;amount:number}[];primaryTargetId?:number;primaryCrit?:number;apmDamage?:number;apmBonuses?:{attribute:string;amount:number}[];apmUsed?:boolean}[];
 spells:{id:number;kind:'storm'|'transfusion'|'guardian';source:number;target:number|null;x:number;z:number;owner:'terran'|'zerg';radius:number;next:number;until:number;period:number;amount:number}[];
 rules:typeof MVP_RULES;race:Race;familySlots:FamilyId[];tech:Record<string,number>;
 facilities:{id:number;kind:string;line:ProductionLineId;techLab:boolean}[];nextFacility:number;
 production:Partial<Record<ProductionLineId,{outputs:FamilyId[];enabled:Partial<Record<FamilyId,boolean>>;cursor:number}>>;
 ledger:DeliveryLedger[];credits:Partial<Record<FamilyId,CultivationCredit[]>>;nextCredit:number;
 tacticalPlans:Partial<Record<FamilyId,TacticalPlan>>;
 pendingReceipt:FamilyReceiptRequest|null;completedReceipts:string[];refunds:Payment;
 developmentTarget:string|null;frozenDevelopmentTarget:string|null;developmentBought:boolean;
 freeRefresh:{chapter:number;building:number;random:number};bonusRefreshRemaining:number;paidRefresh:{building:boolean;random:boolean};
 draftWindow:number;draftTaken:boolean;draftClaims:string[];draftSeenHigh:boolean;lowWindows:number;draftHistory:{shown:string[];chosen:string|null}[];
 eliteContractWindow:number;eliteContracts:EliteContract[];
 talentLootReceipts:string[];pendingTalentLoot:TalentLootChoice|null;talentLootRngState:number;
 eliteRescueRights:EliteRescueRight[];eliteRescueCompleted:string[];
 temporaryOrdinaryCursor:number;temporaryEliteCursor:number;
 cardTotals:Record<string,number>;resourceCards:number;mapCardsByChapter:Record<number,number>;elitePaths:Partial<Record<FamilyId,string>>;
 detectionReady:number;detectionFields:{id:number;x:number;z:number;radius:number;until:number;team:'player'|'enemy'}[];enemyScanReady:Record<number,number>;
 familyModes:Partial<Record<FamilyId,string>>;talentPreset:number;
}
export function newExpedition(race:Race):ExpeditionState {
 const initial:Record<Race,{family:FamilyId;kind:string;line:ProductionLineId;tech:Record<string,number>}>= {
  terran:{family:'marine',kind:'barracks',line:'barracks',tech:{barracks:1}},
  zerg:{family:'zergling',kind:'hatchery',line:'zerg.basic',tech:{hatchery:1,pool:1}},
  protoss:{family:'zealot',kind:'gateway',line:'gateway',tech:{gateway:1}},
 };const first=initial[race];
 const production:ExpeditionState['production']={};
 for(const [id,line] of Object.entries(PRODUCTION_LINES))if(line.race===race)production[id as ProductionLineId]={outputs:id===first.line?[first.family]:[],enabled:{},cursor:0};
 production[first.line]!.enabled[first.family]=true;
 return {weaponAreas:[],spells:[],rules:MVP_RULES,race,familySlots:[first.family],tech:{...first.tech},facilities:[{id:1,kind:first.kind,line:first.line,techLab:false}],nextFacility:2,production,
 ledger:[],credits:{},nextCredit:1,tacticalPlans:{},pendingReceipt:null,completedReceipts:[],refunds:{minerals:0,gas:0},developmentTarget:null,frozenDevelopmentTarget:null,developmentBought:false,
 freeRefresh:{chapter:1,building:1,random:1},bonusRefreshRemaining:0,paidRefresh:{building:false,random:false},draftWindow:0,draftTaken:false,draftClaims:[],draftSeenHigh:false,lowWindows:0,draftHistory:[],eliteContractWindow:0,eliteContracts:[],talentLootReceipts:[],pendingTalentLoot:null,talentLootRngState:1,eliteRescueRights:[],eliteRescueCompleted:[],temporaryOrdinaryCursor:0,temporaryEliteCursor:0,cardTotals:{},resourceCards:0,mapCardsByChapter:{},elitePaths:{},detectionReady:0,detectionFields:[],enemyScanReady:{},familyModes:{},talentPreset:0};
}
export function validateExpedition(s:ExpeditionState){
 if(s.rules!==MVP_RULES||!Object.hasOwn(FAMILIES_BY_RACE,s.race)||!Array.isArray(s.familySlots)||s.familySlots.length>5||new Set(s.familySlots).size!==s.familySlots.length||s.familySlots.some(f=>!(FAMILIES_BY_RACE[s.race] as readonly string[]).includes(f)))throw Error('三族编制数据无效');
 if(!Array.isArray(s.weaponAreas)||s.weaponAreas.some(area=>!area||!Number.isSafeInteger(area.id)||!Number.isSafeInteger(area.source)||!['terran','zerg'].includes(area.owner)||!Array.isArray(area.points)||area.points.some(point=>![point.x,point.z].every(Number.isFinite))||!Number.isSafeInteger(area.nextIndex)||area.nextIndex<0||area.nextIndex>area.points.length||![area.next,area.period,area.radius,area.damage].every(Number.isFinite)||area.period<0||area.radius<0||!Array.isArray(area.hits)||new Set(area.hits).size!==area.hits.length||!Array.isArray(area.bonuses)||area.primaryTargetId!==undefined&&!Number.isSafeInteger(area.primaryTargetId)||area.primaryCrit!==undefined&&!Number.isFinite(area.primaryCrit)||area.apmDamage!==undefined&&(!Number.isFinite(area.apmDamage)||area.apmDamage<0)||area.apmBonuses!==undefined&&!Array.isArray(area.apmBonuses)||area.apmUsed!==undefined&&typeof area.apmUsed!=='boolean'))throw Error('武器范围结算数据无效');
 for(const entry of s.ledger){if(!Number.isSafeInteger(entry.id)||!Array.isArray(entry.passengers)||entry.passengers.length>5||entry.passengers.some(p=>!Number.isFinite(p.paid.minerals)||p.paid.minerals<0||!Number.isFinite(p.paid.gas)||p.paid.gas<0||!['body','rankTraining','tacticalProgress'].includes(p.purpose)||p.purpose==='tacticalProgress'&&(!Number.isSafeInteger(p.targetEntityId)||!Number.isFinite(p.targetGeneration)||!['assault','guard','mobility'].includes(p.direction??''))))throw Error('运输付款账本无效');}
 for(const [line,plan] of Object.entries(s.production))if(!Object.hasOwn(PRODUCTION_LINES,line)||PRODUCTION_LINES[line as ProductionLineId].race!==s.race||!plan||plan.outputs.length>2||new Set(plan.outputs).size!==plan.outputs.length||plan.outputs.some(f=>!PRODUCTION_LINES[line as ProductionLineId].families.includes(f)))throw Error('三族生产配置无效');
 if(!Array.isArray(s.draftClaims)||new Set(s.draftClaims).size!==s.draftClaims.length||s.draftClaims.some(id=>typeof id!=='string'||!id)||!Number.isSafeInteger(s.bonusRefreshRemaining)||s.bonusRefreshRemaining<0||s.bonusRefreshRemaining>3)throw Error('关间天赋收据无效');
 if(!Number.isSafeInteger(s.eliteContractWindow)||s.eliteContractWindow<0||!Array.isArray(s.eliteContracts)||s.eliteContracts.length>2||new Set(s.eliteContracts.map(c=>c.id)).size!==s.eliteContracts.length||s.eliteContracts.some(c=>!c||typeof c.id!=='string'||typeof c.eliteId!=='string'||!(FAMILIES_BY_RACE[s.race] as readonly string[]).includes(c.family)||!Number.isSafeInteger(c.minerals)||c.minerals<0||!Number.isSafeInteger(c.gas)||c.gas<0||typeof c.purchased!=='boolean'))throw Error('精英特约数据无效');
 if(!Array.isArray(s.talentLootReceipts)||new Set(s.talentLootReceipts).size!==s.talentLootReceipts.length||s.talentLootReceipts.some(id=>typeof id!=='string'||!id)||s.pendingTalentLoot!==null&&(!s.pendingTalentLoot||!s.talentLootReceipts.includes(s.pendingTalentLoot.receipt)||!['purple','orange'].includes(s.pendingTalentLoot.rarity)||!Array.isArray(s.pendingTalentLoot.offers)||s.pendingTalentLoot.offers.length<1||s.pendingTalentLoot.offers.length>3||new Set(s.pendingTalentLoot.offers.map(o=>o.offerId)).size!==s.pendingTalentLoot.offers.length||s.pendingTalentLoot.offers.some(o=>o.rarity!==s.pendingTalentLoot!.rarity||o.minerals!==0||o.gas!==0)))throw Error('出金奖励收据无效');
 if(!Number.isSafeInteger(s.talentLootRngState)||s.talentLootRngState<0||s.talentLootRngState>0xffffffff)throw Error('出金随机流无效');
 if(!Array.isArray(s.eliteRescueRights)||new Set(s.eliteRescueRights.map(right=>right.receipt)).size!==s.eliteRescueRights.length||s.eliteRescueRights.some(right=>!right||typeof right.receipt!=='string'||!right.receipt||typeof right.eliteId!=='string'||!right.eliteId)||!Array.isArray(s.eliteRescueCompleted)||new Set(s.eliteRescueCompleted).size!==s.eliteRescueCompleted.length||s.eliteRescueRights.some(right=>s.eliteRescueCompleted.includes(right.receipt)))throw Error('精英救援权无效');
 if(!Number.isSafeInteger(s.temporaryOrdinaryCursor)||s.temporaryOrdinaryCursor<0||!Number.isSafeInteger(s.temporaryEliteCursor)||s.temporaryEliteCursor<0)throw Error('临时兵轮换游标无效');
 if(!s.tacticalPlans||typeof s.tacticalPlans!=='object'||Object.entries(s.tacticalPlans).some(([family,plan])=>!(FAMILIES_BY_RACE[s.race] as readonly string[]).includes(family)||!plan||!Number.isSafeInteger(plan.targetEntityId)||!Number.isFinite(plan.targetGeneration)||!['assault','guard','mobility'].includes(plan.direction)||!Number.isSafeInteger(plan.bank)||plan.bank<0||plan.bank>6||typeof plan.enabled!=='boolean'))throw Error('战术进阶方案无效');
}
