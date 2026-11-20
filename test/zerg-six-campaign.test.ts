import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {ECONOMY} from '../src/data/economy';
import {FAMILIES_BY_RACE} from '../src/data/races';
import {ZERG_SIX,ZERG_SIX_PRODUCTION,ZERG_SIX_WEAPON_RESEARCH,type ZergSixFamily} from '../src/data/zerg-six';
import {canProduce,canUnlock} from '../src/simulation/building/rules';
import {familyLine,lineResearch} from '../src/data/expedition-buildings';
import {productionQuote,releasePaidPassenger,retireFamily} from '../src/simulation/expedition-production';
import {draftContext} from '../src/simulation/expedition-economy';
import {supplyEligibility} from '../src/simulation/progression/supply-cards';
import {readArchive,writeArchive} from '../src/persistence/archive';

function campaign() {
 const w=new World({race:'zerg',seed:201120,waves:false,terrain:campaignTerrain(chooseCampaignMap(201120)),obstacles:[]});
 if(w.starship.account.tutorial)w.starship.account.tutorial.status='completed';
 assert.ok(w.start());
 w.expedition.ledger=[];
 w.missions.enabled=w.encounters.enabled=false;
 return w;
}

function setPrerequisites(w:World,family:ZergSixFamily){
 const b=w.expedition.building!,group=b.groups[0],air=familyLine(family)==='zerg.air';
 group.directions=air?['ground','air']:['ground'];
 group.outputs=[];group.enabled=true;
 for(const f of air?['mutalisk','corruptor']:['hydralisk','ravager'])w.expedition.tech['unlock.'+f]=1;
 b.tech=w.expedition.tech;
 return {b,group};
}

for(const family of ZERG_SIX)test(family+' unlocks at its own window and trains a single free formal seat',()=>{
 const w=campaign(),{b,group}=setPrerequisites(w,family),{firstBattle,trainingSeconds}=ZERG_SIX_PRODUCTION[family];
 assert.equal(FAMILIES_BY_RACE.zerg.length,16);
 assert.equal(w.squadCap(),5);
 b.stage=firstBattle-2;
 assert.equal(canUnlock(b,family),false);
 w.expedition.tech['unlock.'+family]=1;
 assert.equal(canProduce(b,group,family,firstBattle-1),false);
 assert.equal(canProduce(b,group,family,firstBattle),true);
 delete w.expedition.tech['unlock.'+family];
 assert.ok(supplyEligibility(w,family,3,'direct').reasons.includes('unlock'));
 w.stage=firstBattle-1;
 w.endStage();
 assert.ok(w.setDevelopmentTarget('unlock.'+family));
 b.offers={};b.quotes={};
 w.generateDevelopmentOffers(w.draftWindowKey);
 assert.ok(w.setDevelopmentDirection(familyLine(family)));
 for(let retry=0;retry<5&&!w.rewards.some(r=>r.value==='unlock.'+family);retry++){
  w.expedition.bonusRefreshRemaining=1;
  assert.ok(w.refreshOffers());
 }
 const offer=w.rewards.find(r=>r.value==='unlock.'+family);
 assert.ok(offer,JSON.stringify(w.rewards));
 w.wallet={minerals:0,gas:0};
 assert.ok(w.purchaseDevelopmentOffer(w.draftWindowKey,offer.offerId));
 assert.deepEqual(w.wallet,{minerals:0,gas:0});
 assert.deepEqual(w.eliteVariants(family),[]);
 assert.ok(w.setBuildingGroupOutputs(group.id,[family]));
 if(family==='brood_lord')w.expedition.familySlots.push('roach','queen','mutalisk','corruptor');
 assert.ok(w.finishIntermission());
 assert.equal(w.stage,firstBattle);
 assert.ok(w.isFamilyAvailable(family));
 assert.equal(productionQuote(w,family).baseSeconds,trainingSeconds);
 assert.equal(draftContext(w).familyInfo(family).canAttack,true);
 assert.equal(draftContext(w).familyInfo(family).summonerCombat,family==='swarm_host');
 w.updateProduction(0);
 const job=w.expedition.ledger.find(j=>j.family===family)!;
 assert.ok(job,JSON.stringify({blocked:w.requiresPlayerDecision,phase:w.phase,groups:b.groups,facilities:w.expedition.facilities,orders:w.expedition.ledger,cap:w.familyMemberCap(family)}));
 assert.equal(job.remaining,trainingSeconds);
 assert.equal(job.passengers.length,1);
 assert.deepEqual(job.passengers[0].paid,{minerals:0,gas:0});
 assert.equal(w.expedition.familySlots.includes(family),false);
 w.updateProduction(trainingSeconds+.01);
 const pod=w.pods.find(p=>p.jobId===job.id)!;
 assert.ok(pod);
 pod.guardTypes=[];
 w.landPod(pod);
 w.updatePods();
 w.time+=ECONOMY.openingSeconds+.02;
 w.updatePods();
 if(family==='brood_lord'){
  const request=w.expedition.pendingReceipt!;
  assert.equal(request.family,family);
  assert.equal(w.expedition.familySlots.includes(family),false);
  const replacement=w.previewFamilyReplacement(request.id,'roach')!;
  assert.ok(w.commitFamilyReplacement(request.id,'roach',replacement.revision));
  assert.equal(w.expedition.familySlots.length,5);
 }
 const member=w.familyUnits(family)[0];
 assert.equal(member?.race,'zerg');
 assert.equal(w.familyUnits(family).length,1);
 assert.equal(job.state,'settled');
 assert.equal(releasePaidPassenger(w,pod,0,{x:3,z:2}),null);
});

test('free production preserves legacy paid receipts and the same formal cooldown through save and replenishment',()=>{
 const w=campaign();w.stage=8;
 const {b,group}=setPrerequisites(w,'viper');
 b.stage=8;w.expedition.tech['unlock.viper']=1;w.expedition.familySlots.push('viper');
 const v=w.addFamilyMember('viper',{x:3,z:0});
 w.expedition.tech[lineResearch('zerg.air','weapon')]=2;
 w.expedition.tech[lineResearch('zerg.air','defense')]=1;
 w.refreshStats(v,true);
 assert.equal(v.weaponDamage,9+2*ZERG_SIX_WEAPON_RESEARCH.viper);
 assert.equal(v.armor,2);
 v.zergSix={ready:40};v.weaponCooldown=3;v.nextShotAt=3;
 w.hit(v,1e6,[],1,'zerg',0,1);
 w.expedition.ledger.push({id:w.nextJob++,family:'viper',line:'zerg.air',facilityIds:[group.ids[0]],remaining:2,state:'training',podId:null,passengers:[{paid:{minerals:95,gas:70},status:'waiting',entityId:null,purpose:'body'}]});
 const original=w.expedition.ledger.at(-1)!;
 const archive=readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()}));
 const restored=campaign();restored.restoreRun(archive.bundle.run!);
 const paid=restored.expedition.ledger.find(j=>j.id===original.id)!;
 assert.deepEqual(paid.passengers[0].paid,{minerals:95,gas:70});
 restored.updateProduction(3);
 const pod=restored.pods.find(p=>p.jobId===paid.id)!;
 assert.ok(pod);
 const replacement=releasePaidPassenger(restored,pod,0,{x:3,z:0})!;
 assert.equal(replacement.slot,v.slot);
 assert.equal(replacement.zergSix?.ready,40);
 assert.equal(replacement.nextShotAt,3);
 const before={...w.wallet};
 retireFamily(w,'viper','roach');
 assert.deepEqual(w.wallet,{minerals:before.minerals+95,gas:before.gas+70});
 assert.equal(original.passengers[0].status,'refunded');
 assert.equal(productionQuote(restored,'viper').gas,0);
});
