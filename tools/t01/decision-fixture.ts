import type {World} from '../../src/simulation/world';
import {FAMILIES_BY_RACE,type Race,type FamilyId} from '../../src/data/races';
import {ELITES} from '../../src/data/elites';
import {familyLine} from '../../src/data/expedition-buildings';
import {receiptNeeded} from '../../src/simulation/expedition-production';
import {draftContext,openTalentLoot} from '../../src/simulation/expedition-economy';
import {prepareCardWorld,inspection} from './card-fixture';

/** Controlled prerequisites only. Each choice is opened by its native command. */
export function prepareDecision(w:World,race:Race,target:string){
 const families=[...FAMILIES_BY_RACE[race]] as FamilyId[],family=families[0];
 prepareCardWorld(w,family);w.paused=true;
 if(target.startsWith('loot-')){
  w.phase='battle';w.wallet={minerals:0,gas:0};const receipt='t01:'+target;
  w.expedition.talentLootReceipts.push(receipt);
  if(!openTalentLoot(w,receipt,target.includes('orange')?'orange':'purple'))throw Error('Native free loot did not open');
 }else if(target.startsWith('rescue')){
  w.phase='battle';const oldTalent=w.talent,oldRandom=w.random;
  try{w.talent=id=>id==='elite_scout'?1:oldTalent.call(w,id);w.random=()=>0;
   const egg=w.spawnEconomic('egg',{x:3,z:0});w.hit(egg,egg.maxHp+20,[],1,'terran');
  }finally{w.talent=oldTalent;w.random=oldRandom;}
  if(!w.eliteRescueChoice)throw Error('Native elite rescue did not open');
 }else if(target.startsWith('elite')){
  while(w.familySeatCount(family)<w.rosterCap)w.addFamilyMember(family,{x:-4+w.familySeatCount(family)*2,z:0},1);
  const elite=Object.values(ELITES).find(e=>e.family===family)!;
  if(target.startsWith('elite-shop')){
   const ctx=draftContext(w),item=inspection.t01NativePool(ctx).find(p=>p.effect.kind==='elite'&&p.effect.family===family);
   if(!item)throw Error('Native elite shop quote unavailable');
   const q=inspection.t01NativeQuote(ctx,item.id);w.rewards=[q];
   if(!w.choose(q.offerId,elite.id)||!w.expedition.pendingShopElite)throw Error('Native shop promotion did not open');
  }else{
   w.phase='battle';if(!w.acquireElite(elite.id)||!w.eliteChoice)throw Error('Native free promotion did not open');
  }
 }else if(target.startsWith('supply')){
  const incoming=families[5];prepareCardWorld(w,incoming,{},true);w.entities.clear();w.expedition.zerglingPairs=[];
  w.expedition.familySlots=families.slice(0,5);
  for(const [i,f]of w.expedition.familySlots.entries())w.addFamilyMember(f,{x:-6+i*3,z:-2},3);
  const ctx=draftContext(w),item=inspection.t01NativePool(ctx).find(p=>p.effect.kind==='supply'&&p.effect.family===incoming&&p.effect.mode==='direct');
  if(!item)throw Error('Native direct reinforcement quote unavailable');
  const q=inspection.t01NativeQuote(ctx,item.id);w.rewards=[q];
  if(!w.choose(q.offerId)||!w.expedition.pendingShopSupply)throw Error('Native supply replacement did not open');
 }else if(target.startsWith('receipt')){
  const incoming=families[5];w.phase='battle';w.entities.clear();w.expedition.zerglingPairs=[];w.expedition.familySlots=families.slice(0,5);
  for(const [i,f]of w.expedition.familySlots.entries())w.addFamilyMember(f,{x:-6+i*3,z:-3},3);
  const jobId=w.nextJob++,pod=w.spawnPod(incoming,{x:8,z:5},jobId,1);pod.status='opening';pod.resolvedAt=0;pod.guardianIds.clear();
  w.expedition.ledger.push({id:jobId,family:incoming,line:familyLine(incoming),facilityIds:[],remaining:0,state:'risk',podId:pod.id,passengers:[{paid:{minerals:125,gas:75},status:'waiting',entityId:null,purpose:'body'}]});
  if(!receiptNeeded(w,pod,0)||!w.expedition.pendingReceipt)throw Error('Native family receipt did not open');
  if(target==='receipt-blocked'){const enemy=w.addUnit('zergling','zerg',pod.x+1,pod.z);pod.guardianIds.add(enemy.id);}
 }else throw Error('Unsupported decision '+target);
 w.changed();return {assets:target.startsWith('elite'),detail:target.endsWith('-detail')};
}
