import assert from 'node:assert/strict';
import {snapshot} from './performance-s01-s02-cases.mjs';
export {snapshot};
export function make(lib,race='terran',seed=529,n=0,tactical=false){
 let profile;
 if(tactical){profile=new lib.PermanentProfile(59);const levels=Object.fromEntries(lib.MVP_TALENTS.filter(n=>n.race==='terran'&&n.line==='soldiers').map(n=>[n.id,n.maxRank])),q=profile.previewTalentAllocation('terran',0,levels);assert.ok(profile.commitTalentAllocation(q,q.expectedRevision));}
 const w=new lib.World({race,seed,permanentProfile:profile,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();
 const id=w.runId;w.runId='00000000-0000-4000-8000-000000000529';if(w.starship.account.run)w.starship.account.run.id=w.runId;if(w.expedition.support.stageReceipt?.startsWith(id+':'))w.expedition.support.stageReceipt=w.runId+w.expedition.support.stageReceipt.slice(id.length);
 w.wallet={minerals:10000,gas:10000};w.entities.clear();w.expedition.zerglingPairs=[];w.expedition.ledger=history(n);w.pods=[];w.effects=[];w.visualEvents=[];
 if(tactical){const units=Array.from({length:7},(_,i)=>w.addUnit('marine','terran',i*2,0,7));w.phase='reward';assert.equal(w.setTacticalEvolutionPlan('marine',units[0].id,'assault'),true);w.phase='battle';}
 return w;
}
export function history(n){return Array.from({length:n},(_,i)=>({id:100000+i,producerId:'historical',family:'marine',line:'barracks',facilityIds:[900000+i],remaining:0,state:'settled',podId:null,passengers:[{paid:{minerals:50,gas:0},status:i%2?'released':'lost',entityId:null,purpose:'body'}]}));}
export function state(lib,w){return {world:snapshot(lib,w),queries:w.expedition.familySlots.map(f=>({f,paid:lib.paidReservations(w,f),tactical:lib.tacticalReservations(w,f),retire:lib.familyRetirementPreview(w,f)})),ui:lib.renderProductionWindow(w,'production'),receipt:lib.renderFamilyReceipt(w)};}
export function lifecycle(lib,race,seed,n,kind='normal'){
 const w=make(lib,race,seed,n,kind.startsWith('tactical')),rows=[],record=label=>rows.push({label,data:state(lib,w)});
 record('initial');lib.updateExpeditionProduction(w,0,true);assert.ok(w.expedition.ledger.length>n);record('paid');
 const job=w.expedition.ledger.at(-1),originalSpawn=w.trySpawnPod.bind(w);
 if(kind==='tactical-cancel'){const before=lib.previewTacticalCancellation(w,'marine');assert.ok(before.refund.minerals>0);assert.equal(lib.cancelTacticalPlan(w,'marine',w.revision),true);record('cancelled');assert.equal(lib.cancelTacticalPlan(w,'marine',w.revision),false);record('duplicate');return rows;}
 if(kind==='normal'){
  lib.setEnabled(w,job.family,false);record('disabled-paid-continues');
  w.trySpawnPod=()=>null;lib.updateExpeditionProduction(w,100,false);assert.equal(job.state,'awaiting');record('landing-blocked');
  w.trySpawnPod=originalSpawn;lib.updateExpeditionProduction(w,0,false);assert.equal(job.state,'awaiting');record('retry-not-due');w.time+=1;
 }
 lib.updateExpeditionProduction(w,100,false);assert.equal(job.state,'risk');record('launched');
 if(kind==='tactical-death'){w.entities.get(w.expedition.tacticalPlans.marine.targetEntityId).hp=0;lib.updateExpeditionProduction(w,0,false);record('lost-after-launch');lib.updateExpeditionProduction(w,0,false);record('duplicate');return rows;}
 if(kind==='retire'){lib.retireFamily(w,job.family,race==='terran'?'reaper':race==='zerg'?'roach':'stalker');record('retired');lib.updateExpeditionProduction(w,0,false);record('reconcile');return rows;}
 const pod=w.pods.find(p=>p.id===job.podId);
 if(kind==='inject'){const queen=w.addUnit('queen','terran',pod.x,pod.z);pod.status='active';assert.equal(lib.injectCarrier(w,queen,pod),true);record('injected');assert.equal(lib.injectCarrier(w,queen,pod),false);record('duplicate-inject');}
 for(let i=0;i<job.passengers.length;i++){const u=lib.releasePaidPassenger(w,pod,i,{x:5+i*2,z:5});assert.ok(u);record('released-'+i);assert.equal(lib.releasePaidPassenger(w,pod,i,{x:5,z:5}),null);if(kind==='twin-death'&&i===0){w.hit(u,1e9,[],1,'zerg',0,1,undefined,true);lib.tickBroods(w);record('first-twin-dead');}}
 assert.equal(job.state,'settled');lib.updateExpeditionProduction(w,0,false);record('settled');
 if(kind==='tactical-five'){for(let k=1;k<5;k++){lib.updateExpeditionProduction(w,0,true);lib.updateExpeditionProduction(w,100,false);const j=w.expedition.ledger.at(-1),p=w.pods.find(p=>p.id===j.podId);assert.ok(lib.releasePaidPassenger(w,p,0,{x:5,z:5}));record('ticket-'+(k+1));}assert.equal(w.familyUnits('marine').length,7);assert.equal(w.familyUnits('marine')[0].tacticalTier,1);}
 // Replacing ledger is the production reset/restore boundary. Derived data must rebuild.
 w.expedition.ledger=structuredClone(w.expedition.ledger);record('array-replaced');
 for(let i=0;i<60;i++)w.step();record('native-60-ticks');return rows;
}
export function draft(lib,race,seed,n){
 const state=lib.newExpedition(race);let rng=seed,serial=0;
 const ctx={state,stage:5,random:()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},nextOfferId:id=>`${id}:${++serial}`,familyInfo:family=>({name:family,alive:state.familySlots.includes(family)?1:0,canAttack:true,canSupport:false,usesEnergy:false,cultivationCapacity:10,canProduce:true,capabilities:family==='marine'?['air','ground']:['ground']}),heroes:[]};
 lib.beginExpeditionWindow(state,5);state.developmentDirection=race==='terran'?'barracks':race==='zerg'?'zerg.basic':'gateway';
 const old=structuredClone(state.draftHistory[0]);state.draftHistory=Array.from({length:n},(_,i)=>({...structuredClone(old),stage:i+1}));state.draftHistory.push({...old,stage:5});
 const rows=[];for(let i=0;i<5;i++)rows.push({offers:lib.drawExpeditionReinforcements(ctx,true),rng,serial,history:structuredClone(state.draftHistory)});return rows;
}
