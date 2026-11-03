/** Bounded continuous-simulation audit. Synthetic survival assistance, no GPU,
 * no real player saves, no production mutation. */
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {setDiagnosticHealthLock,setDiagnosticOneHit,diagnosticHealthLock} from '../src/diagnostics/combat-lock';
import type {Race} from '../src/data/races';
import {TUNING} from '../src/data/game';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';

const race=(process.argv[2]??'terran') as Race;
assert.ok(['terran','zerg','protoss'].includes(race));
const maxStage=Number(process.argv[3]??18),started=performance.now();
// Boss receipts derive a local loot RNG from the run ID; freeze that identity
// as well as the combat seed so investigation reruns are comparable.
const fixtureRunId=process.argv[4]??`runtime-audit-${race}-529`;
Object.defineProperty(globalThis.crypto,'randomUUID',{value:()=>fixtureRunId,configurable:true});
const w=new World({seed:529,race,difficulty:'normal',waves:true,sandbox:false,terrain:campaignTerrain(chooseCampaignMap(529)),obstacles:[],equipmentAccount:newEquipmentAccount(529)});
assert.ok(w.start());assert.ok(setDiagnosticHealthLock(w,true));assert.ok(setDiagnosticOneHit(w,true));
let steps=0,assistedKills=0,decisionDeclines=0,checkpoints=0,peakEntities=0;
const windows:any[]=[];
function pairConflicts(){return [...w.entities.values()].filter(u=>u.hp>0&&u.pairId!==undefined).flatMap(u=>{const p=w.expedition.zerglingPairs.find(p=>p.id===u.pairId);return u.unitType!=='zergling'||u.team!=='player'||u.temporary||!p||!p.members.includes(u.id)||u.rank!==p.rank||u.eliteId!==p.eliteId?[{id:u.id,type:u.unitType,team:u.team,rank:u.rank,eliteId:u.eliteId,pairId:u.pairId,heldBy:u.heldBy,fun:u.fun,temporary:u.temporary,pair:p}]:[];});}
function check(label:string){
  for(const n of [w.time,w.tick,w.stageElapsed,w.wallet.minerals,w.wallet.gas])assert.ok(Number.isFinite(n),label+' world finite');
  assert.ok(w.wallet.minerals>=-1e-6&&w.wallet.gas>=-1e-6,label+' nonnegative wallet');
  for(const [id,u] of w.entities){assert.equal(id,u.id);for(const key of ['x','z','hp','maxHp','weaponDamage','attackPeriod','moveSpeed'] as const)assert.ok(Number.isFinite(u[key]),`${label} entity ${id} ${u.unitType} ${key}=${u[key]}`);assert.ok(u.hp>=0&&u.maxHp>0);}
  for(const list of [w.expedition.bossLootReceipts,w.expedition.bossLootClaimed,w.expedition.completedReceipts,w.endlessRoundReceipts])assert.equal(new Set(list).size,list.length,label+' unique receipts');
  assert.equal(new Set(w.expedition.ledger.map(j=>j.id)).size,w.expedition.ledger.length,label+' unique jobs');
  for(const id of w.expedition.bossLootClaimed)assert.ok(w.expedition.bossLootReceipts.includes(id),label+' claim source');
  peakEntities=Math.max(peakEntities,w.entities.size);
}
function decisions(){
  if(w.expedition.pendingReceipt){assert.ok(w.rejectIncomingBatch(w.expedition.pendingReceipt.id,w.revision));decisionDeclines++;}
  if(w.eliteRescueChoice){assert.ok(w.declineEliteRescueRight(w.eliteRescueChoice.receipt));decisionDeclines++;}
  if(w.eliteChoice){assert.ok(w.cancelPendingEliteChoice(w.eliteChoice));decisionDeclines++;}
  assert.equal(w.requiresPlayerDecision,false,'unexpected blocking decision');
}
function assist(){
  const source=w.allies().find(u=>!u.temporary);assert.ok(source,'survival fixture lost its player');
  // Finite artificial combat-density bound: every second, enemy bodies that
  // have had three simulation seconds to act receive one authoritative hit.
  for(const u of [...w.entities.values()])if(u.owner==='zerg'&&u.hp>0&&w.time-u.bornAt>=3){const before=u.hp;w.hit(u,1e12,[],1,'terran',0,1,source.id);if(before>0&&u.hp===0)assistedKills++;}
  if(w.stage===18&&!w.endless&&w.hive?.hp&&w.stageElapsed>=w.duration-2)w.hit(w.hive,1e12,[],1,'terran',0,1,source.id);
  for(let slot=0;slot<3;slot++)w.castHeroSlot(slot);
  const pod=w.pods.find(p=>p.status==='active'||p.status==='opening');
  if(pod)w.issueMove(pod);else w.issueMove({x:Math.sin(w.time/10)*6,z:Math.cos(w.time/10)*6});
}
function checkpoint(label:string){
  check(label);const snapshot=w.captureRun(),ids=[...w.entities.keys()],time=w.time,receipts=[...w.expedition.bossLootClaimed];
  w.restoreRun(snapshot);w.paused=false;
  assert.equal(w.time,time);assert.deepEqual([...w.entities.keys()],ids);assert.deepEqual(w.expedition.bossLootClaimed,receipts);check(label+' restored');checkpoints++;
}
async function combat(){
  const stage=w.stage,round=w.endless?.round??0,startSteps=steps;
  // Random portals are held for separate targeted scene-boundary checks.
  w.specialStages.portalChecked=w.stage;
  while(w.phase==='battle'){
    decisions();if(w.tick%60===0)assist();w.step();steps++;
    if(steps%60===0)check(`${race}/${stage}/${round}/${steps}`);
    assert.ok(steps-startSteps<10000,'bounded phase exceeded 10000 ticks');
    if(steps%1800===0)await new Promise(resolve=>setImmediate(resolve));
  }
  assert.ok(['reward','won'].includes(w.phase),`unexpected terminal ${w.phase}`);
  checkpoint(`stage ${stage} round ${round}`);
  const row={stage,round,phase:w.phase,steps:steps-startSteps,time:w.time,kills:w.stats.kills,shots:w.stats.shots,produced:w.stats.produced,rescued:w.stats.rescued,entities:w.entities.size,ledger:w.expedition.ledger.length,bossClaims:w.expedition.bossLootClaimed.length};windows.push(row);console.log(JSON.stringify({progress:row}));
  const wallet={...w.wallet},claims=[...w.expedition.bossLootClaimed];w.endStage();assert.deepEqual(w.wallet,wallet);assert.deepEqual(w.expedition.bossLootClaimed,claims);
}
try{
  for(let stage=1;stage<=maxStage;stage++){
    assert.equal(w.stage,stage);await combat();if(stage===18)break;
    while(w.phase==='reward')assert.ok(w.skipReward());
  }
  if(maxStage===18){
    assert.equal(w.phase,'won');assert.ok(w.chooseCampaignExit('endless'));while(w.phase==='reward')assert.ok(w.skipReward());
    const plan=w.previewEndlessTransition();assert.ok(plan);const token=`${plan.requestId}:${plan.expectedRevision}:${plan.mapHash}`;
    assert.ok(w.registerEndlessReadyToken(token));assert.ok(w.commitEndlessTransition(plan.requestId,plan.expectedRevision,token));
    for(let round=1;round<=2;round++){assert.equal(w.endless?.round,round);await combat();while(w.phase==='reward')assert.ok(w.skipReward());}
  }
  console.log(JSON.stringify({result:'passed',race,runId:w.runId,maxStage,steps,simulatedSeconds:steps*TUNING.step,checkpoints,assistedKills,decisionDeclines,peakEntities,healthLock:diagnosticHealthLock(w),wallMs:Math.round(performance.now()-started),windows}));
}catch(error){console.log(JSON.stringify({result:'failed',race,runId:w.runId,maxStage,steps,time:w.time,stage:w.stage,round:w.endless?.round,phase:w.phase,pairConflicts:pairConflicts(),error:String(error),stack:(error as Error).stack,wallMs:Math.round(performance.now()-started)}));process.exitCode=1;}
