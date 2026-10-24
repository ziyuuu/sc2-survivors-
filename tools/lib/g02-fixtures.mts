import fs from 'node:fs';import assert from 'node:assert/strict';
import {World} from '../../src/simulation/world';
import {familyWorld} from './i03-fixtures.mts';
import {ATTRIBUTE_SLOTS,isOffensiveSlot,type Quality} from '../../src/simulation/starship/types';
import {newEquipmentAccount,grantEquipment} from '../../src/simulation/starship/inventory';
import {equipmentTotals} from '../../src/simulation/starship/runtime';
import {syncBuildingViews} from '../../src/simulation/building/expedition';
import {beginExpeditionWindow,inspectReinforcementPool,type ExpeditionReward} from '../../src/simulation/progression/expedition-drafts';
import {draftContext,purchaseOffer} from '../../src/simulation/expedition-economy';
import type {FamilyId,Race} from '../../src/data/races';
export const oldCards=JSON.parse(fs.readFileSync('reports/local/integration-i03-20261022/cards-paths-expanded.json','utf8')).rows;
const cache=new Map<string,{building:any;witness:any;familySlots:any}>();
export const lcg=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
export const mainFamily=(race:Race,stage:number):FamilyId=>race==='terran'?'marine':race==='zerg'?(stage===3?'zergling':'hydralisk'):(stage===3?'zealot':'stalker');
export interface Case {race:Race;stage:number;quality:0|3|4|5;seed:number;targets?:number;family?:FamilyId;members?:number;rank?:number;channelOnly?:boolean}
export function scenario(c:Case){
 const family=c.family??mainFamily(c.race,c.stage);let path=cache.get(family);if(!path){const old=familyWorld(family);path={building:structuredClone(old.w.expedition.building),witness:old.witness,familySlots:[...old.w.expedition.familySlots]};cache.set(family,path);}if(!c.channelOnly)assert.ok(path.witness.stage<c.stage,`${family} must have a prior legal building path`);
 const w=new World({race:c.race,difficulty:'normal',seed:c.seed,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(c.seed)});
 if(c.quality)for(const slot of ATTRIBUTE_SLOTS){const r=grantEquipment(w.starship.account,{template:c.quality===5?'set.orange.survivor.5':'attribute.'+c.quality,race:c.race,slot},'g02:'+slot,{kind:'warehouse'});assert.ok(r.ok,JSON.stringify(r));r.value.allocation=2;const keys=isOffensiveSlot(slot)?['attack','trueDps','range','crit','critDamage']:['defense','health','reduction','dodge','move'];r.value.affixes=keys.slice(0,c.quality===5?3:c.quality).map(key=>({key,score:200})) as typeof r.value.affixes;assert.ok(w.equipItem(r.value.id,slot).ok);}
 assert.ok(w.start());w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();w.missions.enabled=false;w.encounters.enabled=false;w.stage=c.stage;w.time=w.tick=w.stageElapsed=0;
 const b=structuredClone(path.building);w.expedition.building=b;w.expedition.familySlots=[...path.familySlots];w.expedition.tech=b.tech;w.wallet=b.wallet;w.wallet.minerals=w.wallet.gas=100000;syncBuildingViews(w.expedition);if(!c.channelOnly)for(const g of b.groups)g.enabled=false;for(const p of Object.values(w.expedition.production))p.enabled={};
 const members=c.members??(c.stage===3?4:5),rank=c.rank??(c.stage===3?1:c.stage===9?3:5);for(let i=0;i<members;i++){const u=w.addUnit(family,'terran',(i%4-1.5)*.55,-Math.floor(i/4)*.55,rank);w.refreshStats(u,true);}
 assert.ok(w.familyUnits(family).length<=w.familyMemberCap(family),'legal family capacity');
 w.phase='reward';w.rewardRound='random';beginExpeditionWindow(w.expedition,c.stage);w.rewards=[];w.random=lcg(c.seed);w.hash.rebuild(w.entities.values());
 return {w,family,gear:equipmentTotals(w),loadout:c.quality===5?'8x orange survivor, three maximum legal affixes; native set effects retained':c.quality?'8x attribute.'+c.quality+', maximum legal affixes':'none',buildingWitness:{stage:path.witness.stage,seed:path.witness.seed,path:path.witness.path.map((x:any)=>x.quote.id)},members,rank};
}
/** Controlled shelf, only candidates in the real current pool, normalized to native undiscounted prices. */
export function buy(w:World,id:string){const row=oldCards[id];assert.ok(row,id);const legal=inspectReinforcementPool(draftContext(w)).some(c=>c.id===id);if(!legal)return null;
 const offer:ExpeditionReward=structuredClone(row.offer);offer.offerId='g02:'+w.nextId+++':'+id;offer.expeditionWindow=w.draftWindowId;offer.expeditionRound='random';offer.sold=false;delete offer.purchaseReceipt;offer.minerals=offer.baseMinerals;offer.gas=offer.baseGas;offer.discount=0;w.rewards=[offer];const before={...w.wallet};assert.ok(purchaseOffer(w,offer.offerId),id);assert.deepEqual(offer.purchaseReceipt,{minerals:offer.baseMinerals,gas:offer.baseGas,freeSource:null});assert.equal(purchaseOffer(w,offer.offerId),false);return {id,name:offer.name,effect:offer.expeditionEffect,cost:{minerals:offer.baseMinerals,gas:offer.baseGas},walletBefore:before,walletAfter:{...w.wallet},receipt:offer.purchaseReceipt};
}
