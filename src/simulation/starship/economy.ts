import type {World} from '../world';
import type {Reward} from '../types';
import type {Project} from '../building/rules';
import {PROJECTS,eligible,facilityCount,type FacilityKind} from '../building/rules';
import {worldBuildingContext,grantProductionFacility} from '../building/expedition';
import {activeEquipmentEffects,equipmentValue,lockEquipmentSource} from './modules';
import {equipmentRandom} from './inventory';
import {equipmentCanGrow} from './eligibility';
import {refreshEquipmentMember} from './members';
import {HEROES,type HeroId} from '../../data/heroes';
import {ELITES,type EliteId} from '../../data/elites';
import type {ExpeditionReward} from '../progression/expedition-drafts';

export function startEquipmentEconomy(w:World){for(const e of activeEquipmentEffects(w))if(e.key==='loan'){w.wallet.minerals+=e.values[0];w.wallet.gas+=e.values[1];lockEquipmentSource(w,e);}equipmentStageEconomy(w);}
export function equipmentStageEconomy(w:World){const run=w.starship.account.run;if(!run)return;for(const e of activeEquipmentEffects(w))if(e.key==='loan'&&!w.endless&&w.stage>=e.values[4]&&w.stage<e.values[4]+e.values[5]){const receipt=e.source+':clear:'+w.stage;if(!run.receipts.has(receipt)){w.wallet.minerals=0;w.wallet.gas=0;run.receipts.add(receipt);}}
 for(const u of w.allies())if(w.starship.members.get(u.id)?.origin==='rescue_elite'){w.entities.delete(u.id);w.statuses.removeTarget(u.id);}
}
export function equipmentDevelopmentLimit(w:World){const loan=activeEquipmentEffects(w).find(e=>e.key==='loan');if(loan&&!w.endless&&!w.endlessEntry){if(w.draftStage>=loan.values[4]&&w.draftStage<loan.values[4]+loan.values[5])return 0;const count=w.draftStage<=loan.values[2]?loan.values[3]:1;return count+(equipmentValue(w,'development_double')?1:0);}return 1+(equipmentValue(w,'development_double')?1:0);}
export function equipmentDevelopmentLegal(w:World,d:Project){const key='development-first:'+w.draftWindowId,first=w.starship.numbers.get(key),taken=w.starship.numbers.get('development-count:'+w.draftWindowId)??0;return !(equipmentValue(w,'development_double')&&taken===1&&first===PROJECTS.findIndex(p=>p.id===d.id));}
/** Continue the same normal window. The extra first choice cannot select the same project. */
export function equipmentDevelopmentCompleted(w:World,projectId:string){const key='development-count:'+w.draftWindowId,taken=(w.starship.numbers.get(key)??0)+1;w.starship.numbers.set(key,taken);if(taken===1)w.starship.numbers.set('development-first:'+w.draftWindowId,PROJECTS.findIndex(p=>p.id===projectId));if(taken>=equipmentDevelopmentLimit(w))return false;
 const s=w.expedition,b=s.building;s.developmentBought=false;s.directionOffers={};s.developmentQuotes={};if(b){b.bought=false;const retain=taken===1&&equipmentValue(w,'development_double');if(retain)for(const [direction,offers] of Object.entries(b.offers))b.offers[direction as keyof typeof b.offers]=offers?.filter(q=>q.projectId!==projectId);else {b.offers={};b.quotes={};}}return true;
}
export function equipmentPurchasePrice(w:World,r:Reward){const firstFree=w.rewardRound==='random'&&equipmentValue(w,'first_purchase_free')>0&&!w.starship.account.run?.receipts.has('first-purchase:'+w.draftWindowId+':'+w.expedition.shopPage)&&(r.minerals>0||r.gas>0);return {minerals:firstFree?0:r.minerals,gas:firstFree?0:r.gas,firstFree};}
export function recordEquipmentPurchase(w:World,r:ExpeditionReward,paid:{minerals:number;gas:number},firstFree:boolean,variant?:EliteId){const run=w.starship.account.run;if(!run)return;if(firstFree)run.receipts.add('first-purchase:'+w.draftWindowId+':'+w.expedition.shopPage);if(paid.minerals+paid.gas<=0)return;
 const effect=r.expeditionEffect;
 if(equipmentValue(w,'purchase_rank')){const u=effect.kind==='hero'?w.heroEntity(effect.heroId as HeroId):effect.kind==='elite'&&variant?w.eliteOwned(variant):undefined;if(u&&equipmentCanGrow(w,u)){const cap=u.heroId?Math.max(5,equipmentValue(w,'hero_cap')):5;if(u.rank<cap){refreshEquipmentMember(w,u,()=>{u.rank=Math.min(cap,u.rank+equipmentValue(w,'purchase_rank'));});if(u.heroId)w.heroes.get(u.heroId)!.rank=u.rank;}}}
 const key='purchase-copy:'+w.draftWindowId;if(equipmentValue(w,'purchase_copy')&&!run.receipts.has(key)&&['hero','elite','supply','card','teamCard'].includes(effect.kind)){run.receipts.add(key);w.starship.cards.push({id:'equipment-card-'+w.nextId++,reward:{...structuredClone(r),sold:false,minerals:0,gas:0},variant,origin:'purchase'});}
}
export function recordEquipmentCardPickup(w:World,r:Reward,receipt:string,variant?:EliteId){const run=w.starship.account.run;if(!run||run.receipts.has('card-pickup:'+receipt))return;run.receipts.add('card-pickup:'+receipt);const count=equipmentValue(w,'card_copy');if(!count||!('expeditionEffect' in r))return;const n=(w.starship.numbers.get('card-pickups')??0)+1;w.starship.numbers.set('card-pickups',n);if(n%count===0)w.starship.cards.push({id:'equipment-card-'+w.nextId++,reward:{...structuredClone(r as ExpeditionReward),sold:false,minerals:0,gas:0},variant,origin:'drop'});}
export function equipmentPeriodicResources(w:World,source:string,minerals:number,gas:number){const n=(w.starship.numbers.get(source+':supply')??0)+1;w.starship.numbers.set(source+':supply',n);const interest=activeEquipmentEffects(w).find(e=>e.key==='supply_interest');if(interest&&n%interest.values[0]===0){minerals+=Math.min(interest.values[2],w.wallet.minerals*interest.values[1]);gas+=Math.min(interest.values[3],w.wallet.gas*interest.values[1]);}w.wallet.minerals+=minerals;w.wallet.gas+=gas;}
export function tickEquipmentEconomy(w:World){for(const e of activeEquipmentEffects(w)){const key=e.source+':'+e.key;if(e.key==='periodic_worker'&&w.time+1e-8>=(w.starship.cycles.get(key)??Infinity)){w.workers++;w.starship.numbers.set(e.source+':workers',(w.starship.numbers.get(e.source+':workers')??1)+1);w.starship.cycles.set(key,w.time+e.values[0]);lockEquipmentSource(w,e);}
 if(e.key==='worker_building'){const workers=w.starship.numbers.get(e.source+':workers')??1,spent=w.starship.numbers.get(e.source+':worker-buildings')??0;if(Math.floor(workers/e.values[0])<=spent)continue;const b=worldBuildingContext(w);if(!b)continue;const candidates=PROJECTS.filter(p=>p.kind==='facility'&&facilityCount(b,p.id)>0&&eligible(b,p)).sort((a,c)=>facilityCount(b,a.id)-facilityCount(b,c.id)||PROJECTS.indexOf(a)-PROJECTS.indexOf(c));const next=candidates[0];if(next&&grantProductionFacility(w,next.id as FacilityKind)){w.starship.numbers.set(e.source+':worker-buildings',spent+1);lockEquipmentSource(w,e);}}
 }}
