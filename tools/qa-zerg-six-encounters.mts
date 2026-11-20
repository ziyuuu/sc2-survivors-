import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {readArchive,writeArchive} from '../src/persistence/archive';
import {setDiagnosticHealthLock} from '../src/diagnostics/combat-lock';
import {World} from '../src/simulation/world';
import {FAMILIES_BY_RACE,type FamilyId,type Race} from '../src/data/races';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {TUNING} from '../src/data/game';
import type {Difficulty} from '../src/data/stages';
import {applyExperienceBody,isExperience} from '../src/simulation/zerg-encounters';
import {campaign18Schedule,campaign18StageConfig} from '../src/data/campaign18';
import {mixCampaignWaves} from '../src/data/mixed-waves';
import {planZergCampaign} from '../src/data/zerg-six-encounters';

const seed=17,seats=Number(process.env.SC2_QA_SEATS??2);
const scenarios:{race:Race;difficulty:Difficulty;stage:number}[]=[];
for(const race of ['terran','zerg','protoss'] as const)for(const stage of [6,12,18])scenarios.push({race,difficulty:'normal',stage});
scenarios.push({race:'zerg',difficulty:'hard',stage:18},{race:'zerg',difficulty:'hell',stage:18});
const roster:Record<Race,FamilyId[]>={terran:['marine','marauder','thor','viking','medivac'],
 zerg:['zergling','aberration','hydralisk','devourer','mutalisk'],protoss:['zealot','stalker','immortal','colossus','phoenix']};

function field(s:typeof scenarios[number],r2:boolean){
 const w=new World({race:s.race,difficulty:s.difficulty,seed,terrain:campaignTerrain(chooseCampaignMap(seed))});
 if(w.starship.account.tutorial)w.starship.account.tutorial.status='completed';
 assert.equal(w.difficulty,s.difficulty);
 assert.ok(w.start());
 w.expedition.ledger=[];w.pods=[];
 for(const g of w.expedition.building!.groups)g.enabled=false;
 w.entities.clear();w.expedition.zerglingPairs=[];
 w.expedition.familySlots=[...roster[s.race]];
 assert.ok(w.expedition.familySlots.every(f=>FAMILIES_BY_RACE[s.race].includes(f as never)));
 for(const [i,f] of w.expedition.familySlots.entries())for(let j=0;j<seats;j++){
  const desired={x:w.anchor.x+(i-2)*1.8,z:w.anchor.z+(j?1:-1)*1.8},p=w.freePosition(f,desired,0,4)??w.anchor;
  w.addFamilyMember(f,p,s.stage>=12?5:3);
 }
 w.stage=s.stage-1;
 // Keep the ordinary map, stage preparation, production and field loop.
 // Use a fixed entry army to compare both schedules without purchase RNG.
 w.missions.enabled=w.encounters.enabled=false;
 w.endStage();assert.equal(w.phase,'reward');
 for(let i=0;i<2&&w.phase==='reward';i++)assert.ok(w.skipReward());
 assert.equal(w.stage,s.stage);
 if(!r2)delete w.expedition.zergEncounters;
 return w;
}

function run(s:typeof scenarios[number],r2:boolean){
 const w=field(s,r2);
 const duration=w.duration,target=Math.min(duration-1,Number(process.env.SC2_QA_WINDOW??Math.max(62,duration*.44)));
 const marks:number[]=[];
 let peak=0,experiencePeak=0,motherPeak=0,empty=0;
 while(w.phase==='battle'&&w.stageElapsed<target){
  const start=performance.now();w.step();if(w.tick>180)marks.push(performance.now()-start);
  let n=0,e=0,m=0;
  for(const u of w.entities.values())if(u.owner==='zerg'&&u.hp>0){
   n++;
   if(isExperience(u))e++;
   if(u.enemySix&&!u.zergSix?.temp)m++;
  }
  peak=Math.max(peak,n);experiencePeak=Math.max(experiencePeak,e);motherPeak=Math.max(motherPeak,m);
  if(!n)empty+=TUNING.step;
  assert.ok(n<=300);
 }
 marks.sort((a,b)=>a-b);
 const p95=marks[Math.floor((marks.length-1)*.95)]??0;
 return {r2,elapsed:Number(w.stageElapsed.toFixed(3)),phase:w.phase,peak,experiencePeak,motherPeak,
  empty:Number(empty.toFixed(2)),normalKills:w.stats.kills,normalBirths:w.stats.ambientSpawned,
  deaths:seats*5-w.expedition.familySlots.reduce((n,f)=>n+w.familySeatCount(f),0),
  drops:w.economyTotals.drops,equipment:Object.keys(w.starship.account.items).length,p95:Number(p95.toFixed(3)),
  actual:w.expedition.zergEncounters?.counters};
}
function fixedCrowd(r2:boolean){
 const s={race:'terran',difficulty:'normal',stage:12} as const;
 const w=field(s,r2);
 const add=()=>{for(let i=0;i<300;i++){
  const u=w.addUnit('zergling','zerg',9+i%25*.51,8+Math.floor(i/25)*.56,1,'regular',12);
  if(r2&&i<150)applyExperienceBody(w,u,.05,'r2');
  u.hp=u.maxHp=1e8;u.moveSpeed=0;u.weaponDamage=0;u.weaponCooldown=100;
 }};
 add();
 for(const u of w.allies()){u.moveSpeed=0;u.weaponDamage=0;u.weaponCooldown=100;}
 const times:number[]=[];
 for(let i=0;i<240;i++){
  const t=performance.now();w.step();
  if(i>=60)times.push(performance.now()-t);
  assert.equal(w.enemyCount(),300);
 }
 times.sort((a,b)=>a-b);
 return Number(times[Math.floor(.95*times.length)].toFixed(3));
}
function checkEndlessBoundaries(r2:boolean){
 const scenario={race:'zerg',difficulty:'normal',stage:18} as const;
 const w=field(scenario,r2);
 w.phase='won';
 if(w.hive)w.hive.hp=0;
 assert.ok(w.chooseCampaignExit('endless'));
 while(w.phase==='reward')assert.ok(w.skipReward());
 const transition=w.previewEndlessTransition()!;
 const token=transition.requestId+':'+transition.expectedRevision+':'+transition.mapHash;
 assert.ok(w.registerEndlessReadyToken(token));
 assert.ok(w.commitEndlessTransition(transition.requestId,transition.expectedRevision,token));
 if(!r2)delete w.expedition.zergEncounters;
 // Keep the same army across sampled windows so defeat cannot prevent boundary coverage.
 assert.ok(setDiagnosticHealthLock(w,true));
 const checks=[];
 for(let round=1;round<=10;round++){
  assert.equal(w.endless!.round,round);
  const keep=[4,7,10].includes(round),duration=w.duration;
  const sampled=keep?8:1/60;
  w.tick=Math.round((w.stageStartedAt+duration-sampled)*60);
  w.time=w.tick/60;
  w.stageElapsed=duration-sampled;
  let peak=0;
  const sample=(limit:number)=>{
   for(let i=0;i<limit&&w.phase==='battle';i++){
    w.step();
    peak=Math.max(peak,w.enemyCount());
    assert.ok(peak<=300);
   }
  };
  const start=structuredClone(w.expedition.zergEncounters?.counters);
  sample(Math.round(sampled*60)+2);
  assert.equal(w.phase,'reward','endless round '+round);
  const pending=w.expedition.zergEncounters;
  const saved=keep&&r2?readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),
   run:w.captureRun(),...(w.starship.enabled?{equipment:w.starship.account}:{})})).bundle.run!:null;
  if(saved){
   w.restoreRun(saved);
   assert.deepEqual(w.expedition.zergEncounters,pending);
  }
  while(w.phase==='reward')assert.ok(w.skipReward());
  if(!r2)delete w.expedition.zergEncounters;
  if(keep){
   sample(420);
   const end=w.expedition.zergEncounters?.counters;
   checks.push({round,duration,peak,experience:end&&start?end.experience.entered-start.experience.entered:0,
    mothers:end&&start?end.mother.entered-start.mother.entered:0,phase:w.phase});
   assert.equal(w.phase,'battle');
  }
 }
 return checks;
}

if(process.argv.includes('--endless-boundaries')){
 console.log(JSON.stringify({seed,baseline:checkEndlessBoundaries(false),r2:checkEndlessBoundaries(true)}));
}else if(process.argv.includes('--fixed')){
 const baseline=[],current=[];
 for(let i=0;i<3;i++){if(i%2){current.push(fixedCrowd(true));baseline.push(fixedCrowd(false));}else{baseline.push(fixedCrowd(false));current.push(fixedCrowd(true));}}
 console.log(JSON.stringify({seed,fixedEnemies:300,ticksPerRun:240,baselineP95:baseline,currentP95:current}));
}else for(const s of scenarios.filter(s=>!process.env.SC2_QA_SAMPLE||process.env.SC2_QA_SAMPLE.split(',').includes(s.race+':'+s.difficulty+':'+s.stage))){
 const config=campaign18StageConfig(s.stage,s.difficulty),old=mixCampaignWaves(campaign18Schedule(config,seed).waves,s.stage,s.difficulty,seed);
 const p=planZergCampaign(s.stage,s.difficulty,old,config.durationSeconds);
 console.log(JSON.stringify({seed,...s,planned:{old:old.reduce((n,w)=>n+(w.members?.length??0),0),mother:p.mothers.length,experience:p.experience.length},
  baseline:run(s,false),current:run(s,true)}));
}
