import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {updateExpeditionProduction,releasePaidPassenger} from '../src/simulation/expedition-production';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {MVP_TALENTS} from '../src/data/mvp-talents';

function setup(){const profile=new PermanentProfile(59),levels=Object.fromEntries(MVP_TALENTS.filter(n=>n.race==='terran'&&n.line==='soldiers').map(n=>[n.id,n.maxRank]));const quote=profile.previewTalentAllocation('terran',0,levels);assert.ok(quote);assert.ok(profile.commitTalentAllocation(quote,quote.expectedRevision));const w=new World({race:'terran',permanentProfile:profile,waves:false,sandbox:true,terrain:false,obstacles:[],seed:90});w.start();w.entities.clear();
 const units=Array.from({length:7},(_,i)=>w.addUnit('marine','terran',i*2,0,7));w.wallet={minerals:5000,gas:0};w.phase='reward';assert.equal(w.setTacticalEvolutionPlan('marine',units[0].id,'assault'),true);w.phase='battle';return {w,target:units[0]};}
function payAndDeliver(w:World){updateExpeditionProduction(w,0,true);const job=w.expedition.ledger.at(-1)!;assert.equal(job.state,'training');assert.equal(job.passengers.length,1);assert.equal(job.passengers[0].purpose,'tacticalProgress');assert.equal(job.passengers[0].paid.minerals,50);
 updateExpeditionProduction(w,100,false);const pod=w.pods.find(p=>p.jobId===job.id)!;assert.ok(pod);const delivered=releasePaidPassenger(w,pod,0,{x:5,z:5});assert.ok(delivered);assert.equal(job.state,'settled');return job;}
test('S16 pays for seven final bodies through the existing ledger and grants one tier without adding an eighth soldier',()=>{
 const {w,target}=setup(),before=w.wallet.minerals,baseDamage=target.weaponDamage;
 for(let i=0;i<7;i++){payAndDeliver(w);assert.equal(w.familyUnits('marine').length,7);assert.equal(w.expedition.tacticalPlans.marine?.bank,(i+1)%7);}
 assert.equal(w.wallet.minerals,before-350);assert.equal(target.tacticalTier,1);assert.equal(target.tacticalDirection,'assault');assert.ok(target.weaponDamage>baseDamage);
 const snapshot=w.captureRun(),copy=new World({race:'terran',waves:false,sandbox:true,terrain:false,obstacles:[],seed:90});copy.restoreRun(snapshot);
 assert.equal(copy.entities.get(target.id)?.tacticalTier,1);assert.equal(copy.expedition.tacticalPlans.marine?.bank,0);
});
test('death refunds paid training tickets once, while an already launched ticket is lost',()=>{
 const {w,target}=setup(),before=w.wallet.minerals;
 updateExpeditionProduction(w,0,true);assert.equal(w.wallet.minerals,before-50);
 target.hp=0;updateExpeditionProduction(w,0,false);
 assert.equal(w.wallet.minerals,before);assert.equal(w.expedition.ledger[0].passengers[0].status,'refunded');
 updateExpeditionProduction(w,0,false);assert.equal(w.wallet.minerals,before);
 const later=setup();updateExpeditionProduction(later.w,0,true);updateExpeditionProduction(later.w,100,false);
 const pod=later.w.pods.at(-1)!;assert.ok(pod);const afterPay=later.w.wallet.minerals;later.target.hp=0;updateExpeditionProduction(later.w,0,false);
 assert.equal(later.w.wallet.minerals,afterPay);assert.equal(later.w.expedition.ledger[0].passengers[0].status,'lost');
});
test('R15 failed elite conversion can use only the remaining rank capacity of an inherited Rank 3 body',()=>{
 const w=new World({race:'terran',waves:false,sandbox:true,terrain:false,obstacles:[],seed:91});w.start();w.entities.clear();
 for(let i=0;i<4;i++)w.addUnit('marine','terran',i*2,0,5);
 w.runConfig!.frozenTalents.levels={'T-R15':2};w.expedition.credits.marine=[{id:1,sourceId:99,rank:3}];
 const jobId=77,pod=w.spawnPod('marine',{x:10,z:10},jobId,1);
 w.expedition.ledger.push({id:jobId,family:'marine',line:'barracks',facilityIds:[1],remaining:0,state:'risk',podId:pod.id,passengers:[{paid:{minerals:50,gas:0},status:'waiting',entityId:null,purpose:'body'}]});
 w.random=()=>0;w.canAcquireElite=()=>false;
 const unit=releasePaidPassenger(w,pod,0,{x:10,z:10})!;
 assert.equal(unit.rank,5);assert.equal(unit.eliteId,undefined);assert.equal(w.familyUnits('marine').length,5);assert.equal(w.availableCapacity('marine'),0);
});
