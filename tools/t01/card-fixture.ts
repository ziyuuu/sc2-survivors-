import {World} from '../../src/simulation/world';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {familyRace,type FamilyId} from '../../src/data/races';
import {familyLine,lineSystem,lineResearch} from '../../src/data/expedition-buildings';
import {groupFamilies} from '../../src/simulation/building/rules';
import {syncBuildingViews} from '../../src/simulation/building/expedition';
import {beginExpeditionWindow,type ExpeditionDraftContext,type ExpeditionReward} from '../../src/simulation/progression/expedition-drafts';
import * as native from '../../src/simulation/progression/expedition-drafts';
import {draftContext,purchaseOffer} from '../../src/simulation/expedition-economy';
import type {FunShopId} from '../../src/simulation/fun-shop/state';
export const inspection=native as typeof native&{t01NativePool:(ctx:ExpeditionDraftContext)=>{id:string;name:string;effect:ExpeditionReward['expeditionEffect'];rarity:string}[];t01NativeQuote:(ctx:ExpeditionDraftContext,id:string)=>ExpeditionReward};
/** Controlled eligibility setup, with the production pool, quote, purchase and effects. */
export function prepareCardWorld(w:World,family:FamilyId,levels:Partial<Record<FunShopId,number>>={},supplyResearch=false){
 const race=familyRace(family);w.resetRun('hard');w.starship.account=newEquipmentAccount(529);w.selectRace(race);if(!w.start())throw Error('Card scene start');
 w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.swarm.pending=[];w.expedition.ledger=[];w.expedition.zerglingPairs=[];w.expedition.heroRewardsUnlocked=true;
 w.stage=17;w.phase='reward';w.rewardRound='random';w.wallet={minerals:1e6,gas:1e6};w.expedition.familySlots=[family];
 const b=w.expedition.building!,line=familyLine(family);
 if(race==='zerg')b.groups[0].directions=['ground','air'];
 else if(!b.groups.some(g=>g.line===line)&&!w.grantFacility(line as any))throw Error('Controlled facility unavailable');
 w.expedition.tech['unlock.'+family]=1;
 if(supplyResearch){w.expedition.tech[lineSystem(line)]=1;w.expedition.tech[lineResearch(line,'weapon')]=2;w.expedition.tech[lineResearch(line,'defense')]=2;}
 const g=b.groups.find(g=>groupFamilies(g).includes(family));if(!g)throw Error('Family group missing');g.outputs=[family];g.enabled=true;g.enabledFamilies={[family]:true};syncBuildingViews(w.expedition);
 for(let i=0;i<2;i++)w.addFamilyMember(family,{x:-2+i*4,z:0},1);
 Object.assign(w.funShop.levels,levels);beginExpeditionWindow(w.expedition,17);w.rewards=[];w.paused=true;return draftContext(w);
}
export function isolatedCardWorld(family:FamilyId){const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});prepareCardWorld(w,family);return w;}
export function prepareCardQuote(w:World,c:{family?:string;actor?:string;data?:unknown}){const data=c.data as {levels?:Partial<Record<FunShopId,number>>;prerequisitePurchases?:number;supplyResearch?:boolean};prepareCardWorld(w,c.family as FamilyId,data.levels,data.supplyResearch);for(let i=0;i<(data.prerequisitePurchases??0);i++){const q=inspection.t01NativeQuote(draftContext(w),c.actor!);w.rewards=[q];if(!purchaseOffer(w,q.offerId))throw Error('Native prerequisite purchase failed');}const q=inspection.t01NativeQuote(draftContext(w),c.actor!);w.rewards=[q];return q;}
