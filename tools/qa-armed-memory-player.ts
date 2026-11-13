import {BUILDS,createCampaignController} from './qa-p6-controller';
import type {World} from '../src/simulation/world';
import type {ExpeditionReward} from '../src/simulation/progression/expedition-drafts';

export function createMemoryRunPlayer(w:World){
 const build=BUILDS.find(b=>b.id==='bio')!;
 const player=createCampaignController(w,{...build,actions:['unlock.reaper','unlock.marauder','factory','starport','unlock.medivac','unlock.viking','stim','system.barracks']},undefined,{advanceIntermission:false});
 const priority=['hero','elite','armed','supply','resource'];
 function nodes(){
  const pending=w.expedition.build?.milestones.find(m=>m.branch==='armed'&&!m.claimed);
  if(!pending || pending.deferredWindow===w.expedition.draftWindow)return;
  for(const id of pending.offers)if(w.claimBuildChoice(pending.id,w.expedition.shopRevision,id))return;
  w.deferBuildChoice(pending.id,w.expedition.shopRevision);
 }
 function decisions(){nodes();player.decisions();}
 function shop(){w.autoEquipItems(new Set());
  decisions();
  if(w.rewardRound==='building'){
   w.setDevelopmentDirection('barracks');
   const rank=(r:ExpeditionReward)=>r.expeditionEffect.kind==='development'?['unlock.reaper','unlock.marauder','stim','shield','system.barracks','research.barracks.weapon'].indexOf(r.expeditionEffect.definitionId):-1;
   const offers=[...w.rewards as ExpeditionReward[]].sort((a,b)=>(rank(a)<0?99:rank(a))-(rank(b)<0?99:rank(b)));
   for(const r of offers)if(r.expeditionEffect.kind==='development'&&w.canChooseReward(r)&&w.purchaseDevelopmentOffer(w.draftWindowKey,r.offerId,w.expedition.shopRevision,r.expeditionEffect.targetFacilityId))break;
  }
  player.intermission();decisions();
  for(let draw=0;draw<4&&w.rewardRound==='random';draw++){
   const score=(r:ExpeditionReward)=>r.id.startsWith('armed.')?2:(priority.includes(r.expeditionEffect.kind)?priority.indexOf(r.expeditionEffect.kind):6);
   for(const r of [...w.rewards as ExpeditionReward[]].sort((a,b)=>score(a)-score(b))){
    if(!w.canChooseReward(r)||r.minerals>w.wallet.minerals-125||r.gas>w.wallet.gas-45)continue;
    const effect=r.expeditionEffect,variant=effect.kind==='elite'?w.eliteVariants(effect.family)[0]?.id:undefined;
    w.purchaseShopOffer(w.draftWindowKey,r.offerId,w.expedition.shopRevision,variant);
    decisions();
   }
   if(draw===3||w.wallet.minerals<300+w.rerollCost()||!w.refreshOffers())break;
  }
  for(const contract of w.expedition.eliteContracts)if(!contract.purchased&&w.wallet.minerals>contract.minerals+100){w.buyEliteContract(contract.id,w.eliteVariants(contract.family)[0]?.id);decisions();}
  const ids=w.allies().filter(u=>u.hp<u.maxHp).map(u=>u.id);
  const q=w.previewRepair(ids);if(q)w.purchaseRepair(q.id);
  player.configure();
 }
 function think(){
  const near=(p:{x:number;z:number})=>Math.hypot(p.x-w.anchor.x,p.z-w.anchor.z);
  const enemies=[...w.entities.values()].filter(u=>u.owner==='zerg'&&u.hp>0&&w.visibleTo(u,'terran')).sort((a,b)=>near(a)-near(b));
  if(enemies[0]&&near(enemies[0])<15){w.castTactical(enemies[0]);if(w.allies().some(u=>u.unitType==='marine'&&u.hp>u.maxHp*.7))w.castFamilyAbility('marine');}
  if(!w.specialStages.active&&w.stage<18&&(!enemies[0]||near(enemies[0])>8)){
   const drops=Object.values(w.starship.account.locations).flatMap(location=>{
    if(location.kind!=='ground'||location.run!==w.runId||typeof location.x!=='number'||typeof location.z!=='number')return [];
    const point={x:location.x,z:location.z};
    return near(point)<14?[point]:[];
   });
   if(drops.length){const target=drops.sort((a,b)=>near(a)-near(b))[0];if(!w.order||Math.hypot(w.order.point.x-target.x,w.order.point.z-target.z)>1)w.issueMove({x:target.x,z:target.z});return;}
  }
  player.think();
 }
 return {initialize:player.initialize,think,decisions,intermission:shop};
}
