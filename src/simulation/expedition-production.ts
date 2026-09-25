import type {World} from './world';
import type {Point,Pod} from './types';
import {SC2_UNITS,type UnitType} from '../data/sc2-units';
import {SOURCE_PRODUCTION_RECIPES} from '../data/expansion-units';
import {FAMILY_REQUIREMENTS,HEAVY_FAMILIES,PRODUCTION_LINES,familyLine,type ProductionLineId} from '../data/expedition-buildings';
import {familyRace,inheritedRank,type FamilyId} from '../data/races';
import type {TacticalDirection,TacticalPlan,DeliveryPassenger} from './expedition-state';
import {CAMPAIGN_SCIENCE_VESSEL_RECIPE} from '../data/campaign-science-vessel';
import {ELITES} from '../data/elites';

export function availableFamily(w:World,f:FamilyId):f is UnitType {
 const s=w.expedition,productionStage=w.phase==='reward'?w.stage+1:w.stage;return !!s&&f in SC2_UNITS&&familyRace(f)===s.race&&FAMILY_REQUIREMENTS[f].every(id=>(s.tech[id]??0)>0)&&(!HEAVY_FAMILIES.includes(f)||productionStage>=10);
}
export function setOutputs(w:World,line:ProductionLineId,outputs:FamilyId[]){
 const s=w.expedition,p=s?.production[line];if(!s||!p||!['menu','reward'].includes(w.phase)||outputs.length>2||new Set(outputs).size!==outputs.length||outputs.some(f=>!PRODUCTION_LINES[line].families.includes(f)||!availableFamily(w,f)))return false;
 p.outputs=[...outputs];for(const f of outputs)p.enabled[f]??=true;p.cursor%=Math.max(1,outputs.length);w.changed();return true;
}
export function setEnabled(w:World,f:FamilyId,on:boolean){const s=w.expedition,p=s?.production[familyLine(f)];if(!s||!p||!p.outputs.includes(f)||!['menu','reward','battle'].includes(w.phase))return false;p.enabled[f]=on;w.changed();return true;}
export function assignHatchery(w:World,id:number,line:ProductionLineId){const s=w.expedition,f=s?.facilities.find(f=>f.id===id);if(!s||s.race!=='zerg'||w.phase!=='reward'||!f||!line.startsWith('zerg.')||line==='zerg.evolution'&&!s.tech.lair||line==='zerg.air'&&!s.tech.spire||s.ledger.some(j=>j.state==='training'&&j.facilityIds.includes(id)))return false;f.line=line;w.changed();return true;}
export function paidReservations(w:World,f:UnitType){const s=w.expedition!;return s.ledger.filter(j=>j.family===f).reduce((n,j)=>n+j.passengers.filter(p=>p.status==='waiting'&&p.purpose!=='tacticalProgress').length,0)+(s.credits[f]??[]).reduce((n,c)=>n+c.rank-1,0);}
export function validTacticalTarget(w:World,f:FamilyId,plan:TacticalPlan){const u=w.entities.get(plan.targetEntityId);return !!u&&u.bornAt===plan.targetGeneration&&u.team==='player'&&u.unitType===f&&u.hp>0&&!u.heroId&&!u.eliteId&&!u.temporary&&u.rank>=5&&(u.tacticalTier??0)<5&&!(u.lastStandUntil&&u.lastStandUntil>w.time);}
export function tacticalReservations(w:World,f:FamilyId){return w.expedition.ledger.filter(j=>j.family===f).reduce((sum,j)=>sum+j.passengers.filter(p=>p.status==='waiting'&&p.purpose==='tacticalProgress').length,0);}
export function setTacticalPlan(w:World,f:FamilyId,targetId:number,direction:TacticalDirection,enabled=true){const s=w.expedition,u=w.entities.get(targetId),current=s?.tacticalPlans[f];
 if(!s||w.phase!=='reward'||!w.talent('star_warrior')||!s.familySlots.includes(f)||!u||u.unitType!==f||!['assault','guard','mobility'].includes(direction)||!validTacticalTarget(w,f,{targetEntityId:targetId,targetGeneration:u.bornAt,direction,bank:0,enabled})||u.tacticalDirection&&u.tacticalDirection!==direction)return false;
 if(current&&(current.bank>0||tacticalReservations(w,f)>0)&&(current.targetEntityId!==targetId||current.direction!==direction))return false;
 s.tacticalPlans[f]={targetEntityId:targetId,targetGeneration:u.bornAt,direction,bank:current?.targetEntityId===targetId&&current.direction===direction?current.bank:0,enabled};w.changed();return true;
}
export function setTacticalEnabled(w:World,f:FamilyId,enabled:boolean){const plan=w.expedition?.tacticalPlans[f];if(!plan||!['reward','battle'].includes(w.phase))return false;plan.enabled=enabled;w.changed();return true;}
export function previewTacticalCancellation(w:World,f:FamilyId){const plan=w.expedition?.tacticalPlans[f];if(!plan)return null;let minerals=0,gas=0,lost=0;for(const j of w.expedition.ledger.filter(j=>j.family===f))for(const p of j.passengers)if(p.status==='waiting'&&p.purpose==='tacticalProgress'&&p.targetEntityId===plan.targetEntityId&&p.targetGeneration===plan.targetGeneration){if(j.state==='training'||j.state==='awaiting'){minerals+=p.paid.minerals;gas+=p.paid.gas;}else lost++;}return {family:f,revision:w.revision,refund:{minerals,gas},lost,bank:plan.bank};}
export function cancelTacticalPlan(w:World,f:FamilyId,expectedRevision:number){const preview=previewTacticalCancellation(w,f);if(!preview||preview.revision!==expectedRevision)return false;const s=w.expedition;
 for(const j of s.ledger.filter(j=>j.family===f))for(const [index,p] of j.passengers.entries())if(p.status==='waiting'&&p.purpose==='tacticalProgress'){if(j.state==='training'||j.state==='awaiting'){p.status='refunded';w.wallet.minerals+=p.paid.minerals;w.wallet.gas+=p.paid.gas;s.refunds.minerals+=p.paid.minerals;s.refunds.gas+=p.paid.gas;}else {p.status='lost';const pod=w.pods.find(pod=>pod.id===j.podId);if(pod?.passengers[index])pod.passengers[index].status='lost';}if(j.passengers.every(passenger=>passenger.status!=='waiting'))j.state='settled';}
 delete s.tacticalPlans[f];w.changed();return true;
}
function reconcileTacticalPlans(w:World){const s=w.expedition;
 for(const [f,plan] of Object.entries(s.tacticalPlans) as [FamilyId,TacticalPlan][])if(!validTacticalTarget(w,f,plan))cancelTacticalPlan(w,f,w.revision);
}
export function productionQuote(w:World,f:UnitType){const d=f==='science_vessel'?CAMPAIGN_SCIENCE_VESSEL_RECIPE:SOURCE_PRODUCTION_RECIPES[f],s=w.expedition!,factor=1-.1*w.talent('permanent_discount');if(!d)throw Error('Unverified production recipe');return {minerals:d.mineralCost?Math.max(1,Math.ceil(d.mineralCost*factor)):0,gas:d.gasCost?Math.max(1,Math.ceil(d.gasCost*factor)):0,seconds:d.productionTime*(1-Math.min(.25,s.cardTotals['production.'+f]??0))};}
export function updateExpeditionProduction(w:World,dt:number,automatic=true){const s=w.expedition!;
 reconcileTacticalPlans(w);
 for(const j of s.ledger){if(j.state==='risk'){const p=w.pods.find(p=>p.id===j.podId);if(p){p.passengers.forEach((passenger,i)=>{if(j.passengers[i].status==='waiting'&&passenger.status!=='waiting'){j.passengers[i].status=passenger.status;j.passengers[i].entityId=passenger.entityId;}});if(!j.passengers.some(p=>p.status==='waiting'))j.state='settled';}}
  if(j.state==='training'){j.remaining=Math.max(0,j.remaining-dt);if(j.remaining<=1e-8)j.state='awaiting';}
  if(j.state==='awaiting'){const p=w.spawnPod(j.family as UnitType,undefined,j.id,j.passengers.length);j.podId=p.id;j.state='risk';w.stats.produced+=j.passengers.length;}
 }
 if(!automatic||w.phase!=='battle'||w.requiresPlayerDecision)return;
 for(const [key,p] of Object.entries(s.production)){const line=key as ProductionLineId;if(!p||!p.outputs.length||s.ledger.some(j=>j.line===line&&j.state!=='settled'))continue;
  const facilities=s.facilities.filter(f=>f.line===line&&!s.ledger.some(j=>j.state==='training'&&j.facilityIds.includes(f.id)));if(!facilities.length)continue;
  for(let i=0;i<p.outputs.length;i++){const at=(p.cursor+i)%p.outputs.length,f=p.outputs[at];if(!p.enabled[f]||!availableFamily(w,f))continue;
   const eligible=facilities.filter(b=>!['marauder','tank','thor','banshee'].includes(f)||b.techLab);if(!eligible.length)continue;
   const waiting=s.ledger.filter(j=>j.family===f).reduce((n,j)=>n+j.passengers.filter(p=>p.status==='waiting'&&p.purpose!=='tacticalProgress').length,0),normalCapacity=s.familySlots.includes(f)?w.availableCapacity(f):w.rosterCap-waiting,plan=s.tacticalPlans[f],ticket=normalCapacity<=0&&!!plan?.enabled&&validTacticalTarget(w,f,plan),capacity=ticket?7-plan!.bank-tacticalReservations(w,f):normalCapacity;
   const bodies=f==='zergling'?2:1,quote=productionQuote(w,f),count=Math.max(0,Math.min(5,capacity,eligible.length*bodies,quote.minerals?Math.floor((w.wallet.minerals+1e-8)/quote.minerals):5,quote.gas?Math.floor((w.wallet.gas+1e-8)/quote.gas):5));if(!count)continue;
   const participants=eligible.slice(0,Math.ceil(count/bodies));w.wallet.minerals-=quote.minerals*count;w.wallet.gas-=quote.gas*count;w.economyTotals.production.minerals+=quote.minerals*count;w.economyTotals.production.gas+=quote.gas*count;
   s.ledger.push({id:w.nextJob++,family:f,line,facilityIds:participants.map(b=>b.id),remaining:quote.seconds,state:'training',podId:null,passengers:Array.from({length:count},()=>({paid:{minerals:quote.minerals,gas:quote.gas},status:'waiting',entityId:null,purpose:ticket?'tacticalProgress':w.familyUnits(f).length<w.rosterCap?'body':'rankTraining',...(ticket?{targetEntityId:plan!.targetEntityId,targetGeneration:plan!.targetGeneration,tacticalTierAtOrder:w.entities.get(plan!.targetEntityId)?.tacticalTier??0,direction:plan!.direction}:{} as Partial<DeliveryPassenger>)}))});p.cursor=(at+1)%p.outputs.length;w.stats.started+=count;w.changed();break;
  }
 }
}
export function receiptNeeded(w:World,p:Pod,index:number){const s=w.expedition!;if(s.familySlots.includes(p.unitType))return false;if(s.familySlots.length<5){s.familySlots.push(p.unitType);w.changed();return false;}if(!s.pendingReceipt){s.pendingReceipt={id:`${p.jobId}:${p.id}:${index}`,podId:p.id,passengerIndex:index,family:p.unitType,readyTick:w.tick};w.changed();}return true;}
function validRequest(w:World,id:string){const s=w.expedition,r=s?.pendingReceipt;if(!s||!r||r.id!==id||w.phase!=='battle')return null;const p=w.pods.find(p=>p.id===r.podId),j=s.ledger.find(j=>j.id===p?.jobId);if(!p||!j||p.status!=='opening'||p.hp<=0||p.passengers[r.passengerIndex]?.status!=='waiting'||j.passengers[r.passengerIndex]?.status!=='waiting'||[...w.entities.values()].some(u=>u.owner==='zerg'&&u.hp>0&&(p.guardianIds.has(u.id)||Math.hypot(u.x-p.x,u.z-p.z)<=6+u.unitRadius)))return null;const position=w.freePosition(p.unitType,p,1.8,4.5);return position?{s,r,p,j,position}:null;}
export function previewReplacement(w:World,id:string,old:FamilyId){const q=validRequest(w,id);if(!q||!q.s.familySlots.includes(old)||old===q.r.family)return null;
 const members=w.allies().filter(u=>u.unitType===old&&!u.heroId&&!u.temporary),credits=[...members.map(u=>({sourceId:u.id,rank:u.eliteId?1:inheritedRank(u.rank)})),...(q.s.credits[old]??[]).map(c=>({sourceId:c.sourceId,rank:inheritedRank(c.rank)}))].sort((a,b)=>b.rank-a.rank||a.sourceId-b.sourceId).slice(0,w.rosterCap);
 let minerals=0,gas=0,lost=0;for(const j of q.s.ledger.filter(j=>j.family===old))for(const c of j.passengers.filter(c=>c.status==='waiting')){if(j.state==='training'||j.state==='awaiting'){minerals+=c.paid.minerals;gas+=c.paid.gas;}else lost++;}
 return {requestId:id,oldFamily:old,newFamily:q.r.family,revision:w.revision,members:members.map(u=>({id:u.id,rank:u.rank,toRank:u.eliteId?1:inheritedRank(u.rank),eliteId:u.eliteId})),credits,refund:{minerals,gas},lostPassengers:lost,position:q.position};
}
export function releasePaidPassenger(w:World,p:Pod,index:number,position:Point){const s=w.expedition!,j=s.ledger.find(j=>j.id===p.jobId),c=p.passengers[index];
 if(c.status!=='waiting'||j&&j.passengers[index].status!=='waiting'||!j&&!p.freeConscript)return null;
 const cargo=j?.passengers[index];if(cargo?.purpose==='tacticalProgress'){
  const plan=s.tacticalPlans[p.unitType],target=plan&&w.entities.get(plan.targetEntityId);
  if(!plan||!target||!validTacticalTarget(w,p.unitType,plan)||cargo.targetEntityId!==target.id||cargo.targetGeneration!==target.bornAt||cargo.direction!==plan.direction||plan.bank+tacticalReservations(w,p.unitType)>7||plan.bank>=7)return null;
  c.status='released';c.entityId=target.id;cargo.status='released';cargo.entityId=target.id;p.recruitId=target.id;p.nextExitAt=w.time+.35;plan.bank++;
  if(plan.bank===7){plan.bank=0;target.tacticalTier=(target.tacticalTier??0)+1;target.tacticalDirection=plan.direction;w.refreshStats(target);}
  if(p.passengers.every(passenger=>passenger.status!=='waiting')){p.status='rescued';p.resolvedAt=w.time;j!.state='settled';}w.changed();return target;
 }
 const body=w.familyUnits(p.unitType).length<w.rosterCap,u=body?w.addUnit(p.unitType,'terran',position.x,position.z,(s.credits[p.unitType]??[]).shift()?.rank??1):w.reinforce(p.unitType,position);
 c.status='released';c.entityId=u.id;if(j){j.passengers[index].status='released';j.passengers[index].entityId=u.id;}p.recruitId=u.id;p.nextExitAt=w.time+.35;w.stats.rescued++;
 if(p.freeConscript&&body){u.freeConscript=true;w.refreshStats(u,true);}
 const paid=!!j&&j.passengers[index].paid.minerals+j.passengers[index].paid.gas>0;
 const eligible=s.race==='terran'?['marine','marauder','reaper']:s.race==='zerg'?['zergling','baneling','roach','queen']:['zealot','adept','stalker','sentry'];
 if(paid&&body&&eligible.includes(p.unitType)&&w.talent('elite_classroom')>0&&w.random()<.15*w.talent('elite_classroom')){
  if(!w.familyUnits(p.unitType).some(member=>member.id!==u.id&&!!member.eliteId)){
   const variants=Object.values(ELITES).filter(e=>e.family===p.unitType).sort((a,b)=>a.id.localeCompare(b.id)),locked=s.elitePaths[p.unitType],variant=locked?variants.find(e=>e.id===locked):variants[0];
   if(variant&&w.canAcquireElite(variant.id)){u.eliteId=variant.id;u.modelKey=variant.model;u.rank=1;s.elitePaths[p.unitType]=variant.id;w.refreshStats(u,true);}
   else if(w.availableCapacity(p.unitType)>=Math.max(0,5-u.rank)){u.rank=Math.max(5,u.rank);w.refreshStats(u,true);}
  }else if(w.availableCapacity(p.unitType)>=Math.max(0,5-u.rank)){u.rank=Math.max(5,u.rank);w.refreshStats(u,true);}
 }
 if(!u.eliteId&&w.talent('skilled_troop')&&u.rank<w.soldierCap()&&w.availableCapacity(p.unitType)>0&&w.random()<[0,.03,.06,.1][w.talent('skilled_troop')]){u.rank++;w.refreshStats(u);}
 if(p.passengers.every(c=>c.status!=='waiting')){p.status='rescued';p.resolvedAt=w.time;if(j)j.state='settled';}return u;
}
export function commitReplacement(w:World,id:string,old:FamilyId,revision:number){const s=w.expedition;if(!s||revision!==w.revision||s.completedReceipts.includes(id))return false;const preview=previewReplacement(w,id,old),q=validRequest(w,id);if(!preview||!q)return false;
 // Everything above is read-only validation; the transaction below cannot await or call listeners.
 for(const plan of Object.values(s.production))if(plan){plan.outputs=plan.outputs.filter(f=>f!==old);plan.enabled[old]=false;plan.cursor%=Math.max(1,plan.outputs.length);}
 for(const j of s.ledger.filter(j=>j.family===old)){for(const [i,c] of j.passengers.entries())if(c.status==='waiting'){c.status=j.state==='training'||j.state==='awaiting'?'refunded':'lost';const pod=w.pods.find(p=>p.id===j.podId);if(pod?.passengers[i])pod.passengers[i].status='lost';}j.state='settled';}
 for(const u of preview.members){const retired=w.entities.get(u.id);if(retired)retired.hp=0;w.entities.delete(u.id);w.statuses.removeTarget(u.id);}w.pendingElites=w.pendingElites.filter(id=>ELITES[id].family!==old);delete s.credits[old];s.credits[q.r.family]=preview.credits.map(c=>({...c,id:s.nextCredit++}));s.familySlots[s.familySlots.indexOf(old)]=q.r.family;
 w.wallet.minerals+=preview.refund.minerals;w.wallet.gas+=preview.refund.gas;s.refunds.minerals+=preview.refund.minerals;s.refunds.gas+=preview.refund.gas;
 releasePaidPassenger(w,q.p,q.r.passengerIndex,q.position);s.completedReceipts.push(id);s.pendingReceipt=null;w.changed();return true;
}
export function rejectReceipt(w:World,id:string,revision:number){const s=w.expedition,r=s?.pendingReceipt;if(!s||!r||w.phase!=='battle'||id!==r.id||revision!==w.revision||s.completedReceipts.includes(id))return false;const p=w.pods.find(p=>p.id===r.podId),j=s.ledger.find(j=>j.id===p?.jobId);if(!p||!j||p.status!=='opening'||p.passengers[r.passengerIndex]?.status!=='waiting')return false;for(const c of p.passengers)if(c.status==='waiting')c.status='lost';for(const c of j.passengers)if(c.status==='waiting')c.status='lost';j.state='settled';p.status='destroyed';p.resolvedAt=w.time;const plan=s.production[familyLine(r.family)];if(plan)plan.enabled[r.family]=false;s.completedReceipts.push(id);s.pendingReceipt=null;w.changed();return true;}
