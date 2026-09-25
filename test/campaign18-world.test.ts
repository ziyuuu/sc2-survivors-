import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {MAIN_HIVE_EVENTS} from '../src/simulation/combat/main-hive';
import {type Race} from '../src/data/races';
import {CAMPAIGN18_STAGES,CAMPAIGN18_WEIGHTS,campaign18GuardCounts,campaign18Runtime,campaign18Schedule,campaign18StageConfig,campaign18TerrainStage,type Campaign18Enemy} from '../src/data/campaign18';

function make(race:Race='terran',difficulty:'easy'|'normal'|'hard'|'hell'='normal'){return new World({race,difficulty,sandbox:true,terrain:false,obstacles:[],waves:false,seed:421});}
function enter(w:World,stage:number){w.stage=stage;w.stageElapsed=0;w.stageStartedAt=w.time;w.prepareStage();}
const threat=(types:readonly Campaign18Enemy[])=>types.reduce((n,t)=>n+CAMPAIGN18_WEIGHTS[t],0);
function enemyCleanup(w:World){for(const [id,u] of w.entities)if(u.owner==='zerg')w.entities.delete(id);}
function hiveTick(w:World,seconds:number){w.time=seconds;w.stageElapsed=seconds-w.stageStartedAt;(w as any).updateHives();}

test('new rules expose 18 distinct stages and map the authored twelve reveals monotonically',()=>{
 const reveals=CAMPAIGN18_STAGES.map(s=>campaign18TerrainStage(s.id));assert.equal(reveals[0],1);assert.equal(reveals.at(-1),12);assert.equal(new Set(reveals).size,12);
 const w=make();for(let stage=1;stage<=18;stage++){enter(w,stage);assert.equal(w.config.id,stage);assert.equal(w.terrainStage,reveals[stage-1]);assert.equal(w.duration,CAMPAIGN18_STAGES[stage-1].durationSeconds);assert.equal(w.hive!==null,stage===18);}
 const standard=new World({sandbox:true,terrain:false,obstacles:[],waves:false});standard.stage=12;standard.prepareStage();assert.equal(standard.config.id,12);assert.equal(standard.hive,null);assert.ok(standard.campaign18Runtime);
});
test('all three races traverse exactly 17 free choice windows and get the complete fixed clear budget',()=>{
 for(const race of ['terran','zerg','protoss'] as const){const w=make(race);w.start();const initial={...w.wallet};
  for(let stage=1;stage<=17;stage++){assert.equal(w.stage,stage);w.endStage();assert.equal(w.phase,'reward');assert.equal(w.rewardRound,'building');assert.ok(w.rewards.length>0);assert.equal(w.expedition!.draftWindow,stage);assert.equal(w.skipReward(),true);assert.equal(w.rewardRound,'random');assert.equal(w.rewards.length,3);assert.ok(w.rewards.every(r=>r.minerals===0&&r.gas===0));assert.equal(w.skipReward(),true);}
  assert.equal(w.stage,18);assert.equal(w.expedition!.draftHistory.length,17);w.hive!.hp=0;w.stageElapsed=w.duration;w.endStage();assert.equal(w.phase,'won');assert.equal(w.wallet.minerals-initial.minerals,2755);assert.equal(w.wallet.gas-initial.gas,2055);assert.deepEqual(w.rewards,[]);assert.equal(w.permanentProfile.balance,6);const final={...w.wallet};w.endStage();assert.deepEqual(w.wallet,final);
 }
});
test('destroying the final hive early still requires survival, and stage 12 does not end the campaign',()=>{
 const w=make();w.start();enter(w,12);w.endStage();assert.equal(w.phase,'reward');assert.equal(w.hive,null);
 w.skipReward();w.skipReward();enter(w,18);w.hive!.hp=0;const initial={...w.wallet};w.endStage();assert.equal(w.phase,'battle');assert.deepEqual(w.wallet,initial);assert.equal(w.startEndless(),false);
 w.stageElapsed=150;w.endStage();assert.equal(w.phase,'won');assert.equal(w.startEndless(),false,'direct entry remains unavailable');assert.equal(w.chooseCampaignExit('endless'),true);assert.equal(w.phase,'reward');assert.equal(w.skipReward(),true);assert.equal(w.skipReward(),true);const plan=w.previewEndlessTransition()!;assert.ok(plan);const token=`${plan.requestId}:${plan.expectedRevision}:${plan.mapHash}`;assert.equal(w.registerEndlessReadyToken(token),true);assert.equal(w.commitEndlessTransition(plan.requestId,plan.expectedRevision,token),true);assert.equal(w.stage,18);assert.equal(w.endless!.round,1);assert.equal(w.phase,'battle');
});
test('a living final hive loses at the deadline and never awards the last clear income',()=>{
 const w=make();w.start();enter(w,18);const initial={...w.wallet};w.stageElapsed=150;w.endStage();assert.equal(w.phase,'lost');assert.deepEqual(w.wallet,initial);assert.equal(w.startEndless(),false);
});
test('guard threat is independent of army size and its per-stage rounding serial survives save/load',()=>{
 const w=make('protoss','hell');w.start();enter(w,14);const first=w.spawnPod('zealot',{x:8,z:0});assert.equal(threat(first.guardTypes as Campaign18Enemy[]),campaign18GuardCounts(14,'hell',0).budget);
 for(let i=0;i<20;i++)w.addUnit('zealot','terran',0,i);const second=w.spawnPod('zealot',{x:10,z:0});assert.equal(threat(second.guardTypes as Campaign18Enemy[]),campaign18GuardCounts(14,'hell',1).budget);
 const copy=make('protoss','hell');copy.restoreRun(w.captureRun());assert.equal(copy.campaign18Runtime!.guardSerial,2);const third=copy.spawnPod('zealot',{x:12,z:0});assert.equal(threat(third.guardTypes as Campaign18Enemy[]),campaign18GuardCounts(14,'hell',2).budget);enter(copy,15);assert.equal(copy.campaign18Runtime!.guardSerial,0);
});
test('all hive structures and their finite adds fit the preallocated stage reserve',()=>{
 for(const difficulty of ['easy','normal','hard','hell'] as const)for(let stage=1;stage<=18;stage++){
  const config=campaign18StageConfig(stage,difficulty),runtime=campaign18Runtime(config,campaign18Schedule(config,421));
  assert.equal(runtime.mainStructureBudget+runtime.hiveBatches.filter(b=>b.kind==='main').reduce((n,b)=>n+threat(b.types),0),config.reserves.mainHive);
  assert.equal(runtime.expansionStructureBudget+runtime.hiveBatches.filter(b=>b.kind==='expansion').reduce((n,b)=>n+threat(b.types),0),config.reserves.expansionHive);
 }
});
test('main hive does not heal or create unbudgeted waves across 45/100 second phase changes',()=>{
 const w=make();w.start();enter(w,18);const hive=w.hive!,damaged=hive.maxHp-123;hive.hp=damaged;
 for(let second=0;second<=160;second++){enemyCleanup(w);hiveTick(w,second);assert.equal(hive.hp,damaged);}
 const runtime=w.campaign18Runtime!;assert.equal(runtime.mainPhase,2);assert.equal(runtime.hiveBatches.reduce((n,b)=>n+b.types.length,0),0);assert.equal(runtime.spawned.mainHive,campaign18StageConfig(18,'normal').reserves.mainHive);
 const spent=runtime.spawned.mainHive;for(let second=200;second<=240;second+=10){enemyCleanup(w);hiveTick(w,second);}assert.equal(runtime.spawned.mainHive,spent);assert.equal(runtime.mainCombat!.nextEvent,MAIN_HIVE_EVENTS.length);
});
test('destroyed main hive withholds remaining reserve instead of respawning or reissuing its adds',()=>{
 const w=make();w.start();enter(w,18);const id=w.hive!.id;hiveTick(w,0);w.hive!.hp=0;hiveTick(w,1);const runtime=w.campaign18Runtime!;assert.equal(runtime.spawned.mainHive+runtime.withheld,runtime.accounting.mainHive);assert.ok(runtime.withheld>0);w.prepareStage();assert.equal(w.hive!.id,id);assert.equal(w.hive!.hp,0);hiveTick(w,150);assert.equal(runtime.spawned.mainHive+runtime.withheld,runtime.accounting.mainHive);
});
test('Hell creates at most one expansion per stage after a five-second warning, with finite reserve',()=>{
 const w=make('terran','hell');w.start();enter(w,4);const expected=w.duration*.45;
 hiveTick(w,expected-5);assert.ok(w.hiveWarningPoint);assert.equal(w.expansionHives.size,0);hiveTick(w,expected-.01);assert.equal(w.expansionHives.size,0);hiveTick(w,expected);assert.equal(w.expansionHives.size,1);
 for(let second=Math.ceil(expected);second<=200;second++){enemyCleanup(w);hiveTick(w,second);}assert.equal(w.expansionHives.size,1);const runtime=w.campaign18Runtime!;assert.equal(runtime.spawned.expansionHive,runtime.accounting.expansionHive);assert.equal(w.nextExpansionAt,Infinity);
});
test('special campaign events include only approved captains and bosses, including safe queen captain',()=>{
 const w=make();w.start();for(const stage of [3,6,9,12,15,18]){enemyCleanup(w);enter(w,stage);const plan=(w as any).specialPlan as {at:number;tier:string;type:string;budget:number}[];assert.equal(plan.length,stage===18?0:1);
  if(plan.length){const entity=(w as any).spawnCampaignSpecial(plan[0]);assert.ok(entity);assert.ok(Number.isFinite(entity.hp));assert.equal(w.campaign18Runtime!.spawned.specials,plan[0].budget);if(stage===9){assert.equal(entity.unitType,'queen');assert.equal(entity.specialReady,Infinity);assert.equal(w.enemySpecials.act(entity,.05),false);}}
 }
});
