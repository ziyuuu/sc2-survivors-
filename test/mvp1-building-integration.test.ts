import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {World} from '../src/simulation/world';
import {productionQuote,receiptNeeded,updateExpeditionProduction} from '../src/simulation/expedition-production';
import {PRODUCTION_LINES} from '../src/data/expedition-buildings';
import {PROJECTS,type FacilityKind} from '../src/simulation/building/rules';
import type {ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import type {Race,FamilyId} from '../src/data/races';

const world=(race:Race='terran',sandbox=true)=>{const w=new World({race,sandbox,waves:false,terrain:false,obstacles:[],difficulty:'easy',seed:529});w.start();w.wallet.minerals=10000;w.wallet.gas=10000;return w;};
function window(w:World,id:string){w.expedition.developmentTarget=id;w.endStage();const d=PROJECTS.find(d=>d.id===id)!;assert.ok(w.setDevelopmentDirection(d.line!));const offer=(d.kind==='evolution'?Object.values(w.expedition.developmentQuotes):w.rewards).find(r=>(r as ExpeditionReward).expeditionEffect.kind==='development'&&(r as ExpeditionReward).expeditionEffect.definitionId===id);assert.ok(offer,'draw '+id);return offer as ExpeditionReward;}
function next(w:World){if(w.rewardRound==='building')w.skipReward();if(w.phase==='reward')w.skipReward();}

for(const [race,kind,family,producer,hero] of [
 ['terran','factory','hellion','factory','yamato_battlecruiser'],
 ['zerg','hatchery','zergling','h2','kerrigan'],
 ['protoss','crystal','zealot','crystal-pair','artanis']
] as const){
 test(race+': real purchase/build/native step/guard combat/arrival/open/release is one paid transaction',()=>{
  // Fixed native starter hero makes this a transport-contract test, not a balance benchmark.
  // No carrier/guardian/passenger phase, health, damage, or arrival time is forced.
  const w=world(race,false);assert.ok(w.acquireHero(hero));
  const offer=window(w,kind),oldJobs=structuredClone(w.expedition.ledger),before={...w.wallet},revision=w.expedition.shopRevision;
  assert.ok(w.purchaseDevelopmentOffer(w.draftWindowKey,offer.offerId,revision));
  assert.equal(w.wallet.minerals,before.minerals-offer.minerals);assert.equal(w.wallet.gas,before.gas-offer.gas);assert.deepEqual(w.expedition.ledger,oldJobs);
  assert.equal(w.purchaseDevelopmentOffer(w.draftWindowKey,offer.offerId,revision),false);next(w);
  const first=Object.values(PRODUCTION_LINES).find(l=>l.race===race)!.families[0];assert.ok(w.setProductionEnabled(first,false));
  const g=w.expedition.building!.groups.find(g=>g.id===producer)!;assert.ok(w.setBuildingGroupEnabled(producer,true));
  const paymentBefore={...w.economyTotals.production},cash={...w.wallet},income={...w.economyTotals.passive};w.step();
  const job=w.expedition.ledger.find(j=>j.producerId===producer&&(race!=='zerg'||!oldJobs.some(old=>old.id===j.id)))!;assert.ok(job,'new facility starts production');
  const quote=productionQuote(w,family),width=family==='zergling'?2:1,facilities=kind==='crystal'?2:1,count=facilities*width;
  assert.equal(job.passengers.length,count);assert.deepEqual(job.facilityIds,g.ids);
  assert.equal(w.economyTotals.production.minerals-paymentBefore.minerals,quote.minerals*count);assert.equal(w.economyTotals.production.gas-paymentBefore.gas,quote.gas*count);
  assert.ok(Math.abs(cash.minerals+(w.economyTotals.passive.minerals-income.minerals)-w.wallet.minerals-quote.minerals*count)<1e-6);
  assert.ok(w.setProductionEnabled(family,false));
  const lifecycle:{tick:number;time:number;job:string;pod:string|null;passengers:string[];guardsAlive:number}[]=[];let previous='',moved=false;
  for(let tick=0;tick<7200&&job.state!=='settled';tick++){
   assert.equal(w.phase,'battle','delivery must finish through native combat without advancing a fixture phase');
   w.step();const pod=w.pods.find(p=>p.id===job.podId);
   if(pod&&!moved&&pod.status!=='falling'){assert.ok(w.issueMove({x:pod.x,z:pod.z}));moved=true;}
   const signature=[job.state,pod?.status,job.passengers.map(p=>p.status).join()].join(':');
   if(signature!==previous){lifecycle.push({tick:w.tick,time:w.time,job:job.state,pod:pod?.status??null,passengers:job.passengers.map(p=>p.status),guardsAlive:pod?[...pod.guardianIds].filter(id=>(w.entities.get(id)?.hp??0)>0).length:0});previous=signature;}
  }
  assert.equal(job.state,'settled');assert.ok(job.passengers.every(p=>p.status==='released'));assert.ok(lifecycle.some(row=>row.pod==='falling'));assert.ok(lifecycle.some(row=>row.pod==='active'));assert.ok(lifecycle.some(row=>row.pod==='opening'));
  assert.equal(w.expedition.ledger.filter(j=>j.producerId===producer&&!oldJobs.some(old=>old.id===j.id)).length,1,'disabled output does not silently re-order');
  if(process.env.MVP1_TRANSPORT_EVIDENCE_DIR){const root=path.resolve('reports/local/mvp1-building-main-20261013'),out=path.resolve(process.env.MVP1_TRANSPORT_EVIDENCE_DIR),relative=path.relative(root,out);assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,race+'.json'),JSON.stringify({scope:'native transport with fixed hero input; not whole-run balance acceptance',race,kind,offer:{cost:[offer.minerals,offer.gas],base:[offer.baseMinerals,offer.baseGas]},paidBatch:job,lifecycle,final:{time:w.time,tick:w.tick,phase:w.phase,produced:w.stats.produced,rescued:w.stats.rescued}},null,2),{flag:'wx'});}
 });
}
test('main purchase and refresh reject insufficient funds, stale window/revision and replay before any mutation',()=>{
 const w=world(),r=window(w,'barracks'),revision=w.expedition.shopRevision;w.wallet.minerals=0;const before=w.captureRun();
 assert.equal(w.purchaseDevelopmentOffer(w.draftWindowKey,r.offerId,revision),false);assert.deepEqual(w.captureRun(),before);
 assert.equal(w.purchaseDevelopmentOffer('old',r.offerId,revision),false);assert.equal(w.purchaseDevelopmentOffer(w.draftWindowKey,r.offerId,revision-1),false);assert.deepEqual(w.captureRun(),before);
 assert.ok(w.refreshOffers(w.draftWindowKey,revision));assert.equal(w.wallet.minerals,0);assert.equal(w.rerollCost(),50);
 const after=w.captureRun();assert.equal(w.refreshOffers(w.draftWindowKey,revision),false);assert.equal(w.refreshOffers(),false);assert.deepEqual(w.captureRun(),after);
});
test('Zerg evolution uses a real target and payment; old free line assignment cannot bypass it',()=>{
 const w=world('zerg');w.grantFacility('hatchery');w.expedition.tech['unlock.roach']=1;const r=window(w,'evolve-zerg.evolution');
 const before=w.captureRun();assert.equal(w.assignHatcherySequence(2,'zerg.air'),false);assert.deepEqual(w.captureRun(),before);
 assert.equal(w.purchaseDevelopmentOffer(w.draftWindowKey,r.offerId,w.expedition.shopRevision,99),false);assert.deepEqual(w.captureRun(),before);
 const cash={...w.wallet};assert.ok(w.purchaseDevelopmentOffer(w.draftWindowKey,r.offerId,w.expedition.shopRevision,2));assert.deepEqual(w.expedition.building!.groups.map(g=>g.directions),[[],['ground']]);assert.equal(w.wallet.minerals,cash.minerals-r.minerals);assert.equal(w.wallet.gas,cash.gas-r.gas);assert.equal(w.expedition.tech['unlock.hydralisk'],1);
 next(w);const sky=window(w,'evolve-zerg.air');assert.ok(w.purchaseDevelopmentOffer(w.draftWindowKey,sky.offerId,w.expedition.shopRevision,2));assert.deepEqual(w.expedition.building!.groups[1].directions,['ground','air']);
 const draft=w.beginBuildingPlacement()!;draft.groups[1].outputs=['hydralisk','mutalisk'];assert.ok(w.applyBuildingPlacement(draft));assert.deepEqual(w.expedition.building!.groups[0].outputs,['zergling']);
});
test('trusted event/equipment facility port and paid construction share physical caps and whole crystal pairs',()=>{
 for(const [race,kind,cap] of [['terran','barracks',5],['zerg','hatchery',15],['protoss','crystal',4]] as const){const w=world(race);while(w.expedition.facilities.filter(f=>f.kind===kind).length<cap)assert.ok(w.grantFacility(kind));const before=w.captureRun();assert.equal(w.grantFacility(kind),null);assert.deepEqual(w.captureRun(),before);}
});
test('expanding an existing empty disabled group preserves its configuration and paid ledger',()=>{
 const w=world();w.endStage();const draft=w.beginBuildingPlacement()!;draft.groups[0].outputs=[];draft.groups[0].enabled=false;assert.ok(w.applyBuildingPlacement(draft));
 const before=structuredClone(w.expedition.ledger),group=w.grantFacility('barracks')!;assert.equal(group.ids.length,2);assert.deepEqual(group.outputs,[]);assert.equal(group.enabled,false);assert.deepEqual(w.expedition.ledger,before);
 next(w);updateExpeditionProduction(w,0);assert.equal(w.expedition.ledger.length,before.length);
});
test('rejecting a new-family receipt pauses only its producer and never cancels another paid hatchery order',()=>{
 const w=new World({race:'zerg',sandbox:true,waves:false,terrain:false,obstacles:[],seed:529});w.expedition.tech['unlock.roach']=1;w.grantFacility('hatchery');
 for(const g of w.expedition.building!.groups)assert.ok(w.setBuildingGroupOutputs(g.id,['roach']));
 w.expedition.familySlots=['zergling','baneling','hydralisk','ravager','mutalisk'];w.start();w.wallet={minerals:10000,gas:10000};updateExpeditionProduction(w,0);updateExpeditionProduction(w,60);
 const [first,other]=w.expedition.ledger,otherBefore=structuredClone(other),pod=w.pods.find(p=>p.id===first.podId)!;
 // Fixture isolates receipt rejection. Natural transport is covered by the three tests above.
 pod.status='opening';pod.guardianIds.clear();assert.ok(receiptNeeded(w,pod,0));const request=w.expedition.pendingReceipt!,cash={...w.wallet};
 assert.ok(w.rejectIncomingBatch(request.id,w.revision));assert.equal(w.expedition.building!.groups[0].enabled,false);assert.equal(w.expedition.building!.groups[1].enabled,true);assert.deepEqual(other,otherBefore);assert.deepEqual(w.wallet,cash);
 const before=w.captureRun();assert.equal(w.rejectIncomingBatch(request.id,w.revision),false);assert.deepEqual(w.captureRun(),before);
});
