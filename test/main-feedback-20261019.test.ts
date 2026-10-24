import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RunSession} from '../src/app/run-session';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {takeUnitArrivals} from '../src/simulation/boss-loot';
import {equipmentDropPolicy} from '../src/simulation/starship/drops';
const make=()=>{const w=new World({seed:73,waves:false,terrain:false,obstacles:[],sandbox:true,equipmentAccount:newEquipmentAccount(73)});w.start();return w;};
test('Boss Reaper absorbed by Lone Hunter settles once and simulation continues',()=>{
 for(const variant of ['reaper.1','reaper.2'] as const){const w=make();w.expedition.familySlots.push('reaper');assert.ok(w.acquireElite('reaper.3'));const hunter=w.eliteOwned('reaper.3')!;
 const boss=w.spawnSpecial('zergling','boss',{x:10,z:0})!;w.hit(boss,1e9,[],1,'terran');const d=w.rewardDrops.find(d=>d.bossLootReceipt)!;
 (d.reward as any).expeditionEffect={kind:'elite',family:'reaper'};d.bossLootVariant=variant;
 assert.ok(w.collectRewardDrop(d.id));assert.equal(w.eliteOwned(variant),undefined);assert.ok(hunter.eliteCombat!.absorbed>0);const absorbed=hunter.eliteCombat!.absorbed;
 assert.equal(w.collectRewardDrop(d.id),false);assert.equal(hunter.eliteCombat!.absorbed,absorbed);assert.equal(w.expedition.bossLootClaimed.filter(r=>r===d.bossLootReceipt).length,1);
 const arrivals=takeUnitArrivals(w);assert.equal(arrivals.length,1);assert.ok(arrivals[0].absorbedBy);const time=w.time;w.step();assert.ok(w.time>time);
 }
});
test('isolated in-page continuation preserves live combat, equipment, pending decisions and reward phases without serialization',()=>{
 for(const phase of ['battle','reward','won','endless-ready'] as const){const w=make(),session=new RunSession(w,null,{run:null,savedAt:0,notice:'',memoryOnly:true});w.phase=phase;w.time=31;w.wallet.minerals=123;const entities=w.entities,ship=w.starship,expedition=w.expedition,run=w.runId;
 w.captureRun=()=>{throw Error('must not serialize');};session.keepRun();assert.equal(w.phase,'menu');assert.ok(session.canResume);w.step();assert.equal(w.time,31);assert.equal(ship.account.run!.ended,false);
 assert.ok(session.resume());assert.equal(w.phase,phase);assert.equal(w.runId,run);assert.equal(w.entities,entities);assert.equal(w.starship,ship);assert.equal(w.expedition,expedition);assert.equal(w.wallet.minerals,123);assert.equal(session.canResume,false);if(phase==='battle')assert.equal(w.paused,true);
 session.keepRun();w.resetRun();assert.equal(session.canResume,false);
 }
});
test('easy regular drops use the calibrated run yield and preserve white weights',()=>{
 const p=equipmentDropPolicy({difficulty:'easy',stage:1,tier:'regular'});assert.equal(p.baseChance,.027);assert.equal(p.base.find(r=>r.quality===1)!.weight,85);
});

test('complete easy-run yield is approximately bell-shaped and usually within the requested 45–90 items',()=>{
 // Eligible kill cohorts from seed 529 native campaign, actual terrain/economy/production,
 // white starter equipment, no health lock, through 12 endless rounds. Not a human win-rate claim.
 for(const [rounds,endRegular,elite,boss] of [[6,264,6,4],[12,557,13,8]]){
  const cohorts=[{stage:1,n:183},{stage:7,n:377},{stage:13,n:837},{stage:18,n:endRegular,endlessRound:rounds}];
  const probabilities:number[]=[];let guaranteed=0;
  for(const c of cohorts)for(let n=0;n<c.n;n++)probabilities.push(equipmentDropPolicy({...c,difficulty:'easy',tier:'regular'}).baseChance);
  for(const c of [{stage:1,n:2,tier:'boss' as const},{stage:7,n:2,tier:'boss' as const},{stage:13,n:2,tier:'boss' as const},{stage:18,n:elite,tier:'elite' as const,endlessRound:rounds},{stage:18,n:boss,tier:'boss' as const,endlessRound:rounds}])for(let n=0;n<c.n;n++){const p=equipmentDropPolicy({...c,difficulty:'easy'});guaranteed++;probabilities.push(p.baseChance);if(p.additionalChance)probabilities.push(p.additionalChance);}
  let pmf=[1];for(const p of probabilities){const next=Array(pmf.length+1).fill(0);for(let i=0;i<pmf.length;i++){next[i]+=pmf[i]*(1-p);next[i+1]+=pmf[i]*p;}pmf=next;}
  const mean=guaranteed+probabilities.reduce((a,p)=>a+p,0),variance=probabilities.reduce((a,p)=>a+p*(1-p),0),skew=probabilities.reduce((a,p)=>a+p*(1-p)*(1-2*p),0)/variance**1.5;
  assert.ok(mean>(rounds===6?55:70)&&mean<(rounds===6?65:82));assert.ok(skew<.2);
  assert.ok(pmf.reduce((sum,p,i)=>sum+(i+guaranteed>=45&&i+guaranteed<=90?p:0),0)>.95);
 }
});
