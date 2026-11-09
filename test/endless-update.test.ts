import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {ENDLESS,ENDLESS_WAVE_WINDOW,endlessRoundDuration,endlessRoundFrequency,initialEndlessPacing,advanceEndlessPacing,endlessWavePlan,endlessWaveTemplate,endlessConfig,endlessEconomicEvents,endlessSpawnStamp,baselineEndlessResources,nextEndlessExpansion,type EndlessState} from '../src/data/endless';
import {continuousEndlessGrowth,enemyGrowthSeconds,type EnemySpawnStamp} from '../src/data/enemy-tuning';
import {ambientResources,campaignMainBefore} from '../src/data/mixed-waves';
import {campaign18Schedule} from '../src/data/campaign18';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {grantEquipment,newEquipmentAccount,equip} from '../src/simulation/starship/inventory';
import {equipmentValue} from '../src/simulation/starship/modules';
import {ECONOMY} from '../src/data/economy';
import {incomeFactor} from '../src/data/stages';
import type {EquipmentAccount} from '../src/simulation/starship/types';
import type {Difficulty} from '../src/data/stages';
import type {Race} from '../src/data/races';

const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const state=(d:Difficulty):EndlessState=>({round:1,startedAt:0,elites:0,bosses:0,progress:{wave:0,elite:0,boss:0},retry:{elite:0,boss:0},last:{},pacing:initialEndlessPacing(d)});
function make(difficulty:Difficulty='normal',race:Race='terran',equipmentAccount?:EquipmentAccount){return new World({sandbox:true,waves:false,terrain:false,obstacles:[],seed:41,difficulty,race,equipmentAccount,endlessTerrain:new FlatTerrain()});}
function enter(difficulty:Difficulty='normal',race:Race='terran',equipmentAccount?:EquipmentAccount){
 const w=make(difficulty,race,equipmentAccount);assert.ok(w.start());w.stage=18;w.prepareStage();w.hive!.hp=0;
 const event=campaign18Schedule(w.config as any,41).specials[0],boss=(w as any).spawnCampaignSpecial(event);assert.ok(boss);w.hit(boss,1e12,[],1,'terran');w.stageElapsed=w.duration;w.endStage();assert.equal(w.phase,'won');
 assert.ok(w.chooseCampaignExit('endless'));while(w.phase==='reward')assert.ok(w.skipReward());
 const plan=w.previewEndlessTransition()!,token=`${plan.requestId}:${plan.expectedRevision}:${plan.mapHash}`;assert.ok(w.registerEndlessReadyToken(token));assert.ok(w.commitEndlessTransition(plan.requestId,plan.expectedRevision,token));return w;
}
function finish(w:World){w.time=w.stageStartedAt+w.duration;w.tick=Math.round(w.time*60);w.stageElapsed=w.duration;w.endStage();while(w.phase==='reward')assert.ok(w.skipReward());}
function restore(w:World){const bundle=readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun(),...w.starship.enabled?{equipment:w.starship.account}:{}})).bundle!,copy=make(w.difficulty,w.expedition.race,bundle.equipment);assert.ok(copy.permanentProfile.importJSON(bundle.profile));copy.restoreRun(bundle.run!);return copy;}

test('approved durations, linear 15% tiers and normalized round-16 growth',()=>{
 assert.deepEqual(Array.from({length:10},(_,i)=>endlessRoundDuration(i*3+1)),[60,90,120,180,240,300,360,420,480,540]);
 for(let r=1;r<=90;r++){near(endlessRoundFrequency(r),1+.15*Math.floor((r-1)/3));assert.equal(endlessRoundDuration(r),endlessRoundDuration(r-Math.floor((r-1)%3)));}
 const s=state('normal');for(let r=1;r<16;r++){s.pacing=advanceEndlessPacing(s,'normal',s.pacing!.roundStart+s.pacing!.duration);s.round++;}
 assert.equal(s.pacing!.roundStart,2070);const a=endlessSpawnStamp(s,2070),mid=endlessSpawnStamp(s,2220),end=endlessSpawnStamp(s,2370);
 assert.equal(a.endlessRound,16);near(enemyGrowthSeconds(a),900);near(enemyGrowthSeconds(mid),930);near(enemyGrowthSeconds(end),960);
 near(continuousEndlessGrowth(enemyGrowthSeconds(a)).health,1.22**15);near(continuousEndlessGrowth(enemyGrowthSeconds(mid)).damage,1.1**5*1.16**10.5);
 const oldEnd=enemyGrowthSeconds(end);s.pacing=advanceEndlessPacing(s,'normal',2370);s.round++;near(enemyGrowthSeconds(endlessSpawnStamp(s,2370)),oldEnd);
});

for(const difficulty of ['easy','normal','hard','hell'] as const)test(`${difficulty}: 30 rounds preserve wave phase, mixture lanes and per-round resource budgets`,()=>{
 const s=state(difficulty),base=baselineEndlessResources(difficulty);let serial=campaignMainBefore(19,difficulty,41),waveCount=0,integral=0,totalM=0,totalG=0;
 for(let round=1;round<=30;round++){
  const p=s.pacing!,plan=endlessWavePlan(round,difficulty,p),waves=endlessWaveTemplate(41,round,difficulty,p),config=endlessConfig(difficulty,round,p),resources={minerals:0,gas:0};
  assert.equal(waves.length,plan.waves.length);near(waves[0].at,(1-p.wavePhase)*15/endlessRoundFrequency(round));assert.ok(waves.at(-1)!.at<p.duration);
  if(round===5)assert.ok(waves[0].at>0,'round opening does not award a bonus wave');
  for(const wave of waves){const laneGroups=new Map<number,number[]>();for(const m of wave.members!){
   assert.equal(m.stamp.endlessRound,round);near(m.stamp.endlessSeconds!,p.roundStart+Math.min(p.duration,wave.at+m.offset));near(m.stamp.endlessGrowthSeconds!,60*(round-1+Math.min(1,(wave.at+m.offset)/p.duration)));
   const [min,gas]=ambientResources(m.type);resources.minerals+=min*m.resources.minerals;resources.gas+=gas*m.resources.gas;
   if(!laneGroups.has(m.lane))laneGroups.set(m.lane,[]);laneGroups.get(m.lane)!.push(m.stamp.density);
  }for(const [lane,densities] of laneGroups){assert.equal(lane,serial++);assert.deepEqual(densities,(lane+1)%4===0?[1,.3,.5]:[1,.3]);}}
  near(resources.minerals,base.minerals*p.duration/60);near(resources.gas,base.gas*p.duration/60);near(config.reward[0],300*p.duration/60);near(config.reward[1],250*p.duration/60);assert.equal(config.durationSeconds,p.duration);
  totalM+=resources.minerals;totalG+=resources.gas;waveCount+=waves.length;integral+=p.duration*endlessRoundFrequency(round)/15;near(plan.next.wavePhase,1+integral-waveCount);
  s.pacing=advanceEndlessPacing(s,difficulty,p.roundStart+p.duration);s.round++;
 }
 near(totalM,base.minerals*s.pacing!.roundStart/60);near(totalG,base.gas*s.pacing!.roundStart/60);
});

test('actual 240-second economic cycles survive split and multi-cycle rounds',()=>{
 const s=state('normal'),events:{at:number;kind:string}[]=[];
 for(let r=1;r<=24;r++){const p=s.pacing!;events.push(...endlessEconomicEvents(41,r,p).map(e=>({...e,at:e.at+p.roundStart})));s.pacing=advanceEndlessPacing(s,'normal',p.roundStart+p.duration);s.round++;}
 const duration=s.pacing!.roundStart,whole=endlessEconomicEvents(41,1,{...initialEndlessPacing('normal'),duration});assert.deepEqual(events,whole);assert.equal(new Set(events.map(e=>e.kind+e.at)).size,events.length);assert.equal(events.length,Math.floor(duration/240)*6);
 let t=0;const expansions:number[]=[];while((t=nextEndlessExpansion(t))<duration)expansions.push(t);assert.equal(expansions.filter(t=>t<240).length,5);assert.deepEqual(expansions.slice(5,10),expansions.slice(0,5).map(t=>t+240));
});

for(const difficulty of ['easy','normal','hard','hell'] as const)test(`${difficulty}: special timers carry across boundaries with frozen pending admission`,()=>{
 const w=enter(difficulty);const births:{source:string;stamp:EnemySpawnStamp}[]=[];let allow=true;
 (w as any).spawnSpecial=(_type:string,tier:string,_point:unknown,stamp:EnemySpawnStamp)=>{if(!allow)return null;births.push({source:tier,stamp:{...stamp}});if(tier==='elite')w.endless!.elites++;else w.endless!.bosses++;return {};};
 let integral=0;
 for(let r=1;r<=7;r++){
  const duration=w.duration,f=endlessRoundFrequency(r);for(let i=0;i<duration*60;i++){w.time=w.stageStartedAt+(i+1)/60;(w as any).updateEndlessSpawns(1/60);}
  integral+=duration*f;assert.equal(w.endless!.elites,Math.floor((integral+1e-7)/(difficulty==='easy'?60:30)));assert.equal(w.endless!.bosses,Math.floor((integral+1e-7)/90));finish(w);
 }
 assert.ok(births.some(b=>b.source==='lord'));const boss=w.endless!.bosses;allow=false;w.endless!.progress.boss=1;w.time+=1/60;(w as any).updateEndlessSpawns(1/60);const pending=structuredClone(w.endless!.pending!.boss);assert.ok(pending);
 finish(w);w.time+=10;(w as any).updateEndlessSpawns(10);assert.deepEqual(w.endless!.pending!.boss,pending);allow=true;w.time+=1;(w as any).updateEndlessSpawns(1);assert.equal(w.endless!.bosses,boss+1);assert.deepEqual(births.filter(b=>b.source!=='elite').at(-1)!.stamp,pending);
});

for(const race of ['terran','zerg','protoss'] as const)test(`${race}: new schedule, actual minute payouts, reward windows and archive restore`,()=>{
 let w=enter('normal',race);const principal=w.permanentProfile.balance;
 for(let r=1;r<=7;r++){
  const duration=w.duration;w.time=w.stageStartedAt+duration-1/60;w.tick=Math.round(w.time*60);w.stageElapsed=duration-1/60;w.step();assert.equal(w.phase,'reward');
  assert.equal(w.permanentProfile.balance,principal+Math.floor(w.endlessElapsed/60));assert.equal(w.clearReceipt!.minerals,300*duration/60);assert.equal(w.clearReceipt!.gas,250*duration/60);assert.equal(w.rewardRound,r%4===0?'building':'random');assert.equal(w.endlessRoundReceipts.length,r);
  const paid={...w.wallet},offers=structuredClone(w.rewards);w.endStage();assert.deepEqual(w.wallet,paid);const copy=restore(w);assert.deepEqual(copy.wallet,paid);assert.deepEqual(copy.rewards,offers);assert.deepEqual(copy.endless,w.endless);copy.endStage();assert.deepEqual(copy.wallet,paid);
  while(copy.phase==='reward')assert.ok(copy.skipReward());assert.equal(copy.duration,endlessRoundDuration(r+1));w=copy;w.paused=false;
 }
});

for(const phase of ['battle','reward'] as const)test(`legacy ${phase} save keeps its current round and switches once at the next boundary`,()=>{
 let w=enter();finish(w);finish(w);finish(w);delete w.endless!.pacing;(w as any).configStage=-1;w.prepareStage();assert.equal(w.duration,60);
 w.time=w.stageStartedAt+40;w.tick=Math.round(w.time*60);w.stageElapsed=40;w.endless!.progress.elite=.75;w.endless!.pending={boss:{stage:18,progress:1,density:1,endlessSeconds:w.endlessElapsed-3}};
 (w as any).spawnWave();const waves=structuredClone(w.waves),backlog=structuredClone(w.ambientBacklog),pending=structuredClone(w.endless!.pending),progress=w.endless!.progress.elite;
 if(phase==='reward'){w.time=w.stageStartedAt+60;w.tick=Math.round(w.time*60);w.stageElapsed=60;w.endStage();}
 w=restore(w);assert.equal(w.duration,60);assert.equal(w.endless!.pacing,undefined);assert.deepEqual(w.waves,waves);assert.deepEqual(w.ambientBacklog,backlog);assert.deepEqual(w.endless!.pending,pending);assert.equal(w.endless!.progress.elite,progress);
 if(phase==='battle'){w.time=w.stageStartedAt+60;w.stageElapsed=60;w.endStage();}assert.equal(w.clearReceipt!.minerals,300);const paid={...w.wallet};w.endStage();assert.deepEqual(w.wallet,paid);
 while(w.phase==='reward')assert.ok(w.skipReward());assert.equal(w.endless!.round,5);assert.equal(w.duration,90);assert.equal(w.endless!.pacing!.roundStart,240);assert.deepEqual(w.endless!.pending,pending);assert.equal(w.endless!.progress.elite,progress);
 const newer=restore(w);assert.deepEqual(newer.endless,w.endless);assert.deepEqual(newer.waves,w.waves);assert.equal(newer.duration,90);
});

test('new birth names and stats stay frozen through a blocked cross-round queue and restore',()=>{
 let w=enter('hard');for(let r=1;r<16;r++)finish(w);const stamp=endlessSpawnStamp(w.endless!,w.endlessElapsed+100),a=w.spawnSpecial('roach','boss',{x:30,z:30},stamp)!;assert.ok(a);assert.match(a.enemyName!,/无尽 16$/);const stats=[a.maxHp,a.weaponDamage,a.attackPeriod];
 w.endless!.pending={boss:stamp};w.endless!.progress.boss=1;const saved=restore(w);assert.deepEqual(saved.entities.get(a.id)!.enemySpawn,stamp);w=saved;finish(w);w.entities.delete(a.id);w.time+=1;const b=w.spawnSpecial('roach','boss',{x:30,z:30},w.endless!.pending!.boss)!;assert.match(b.enemyName!,/无尽 16$/);assert.deepEqual([b.maxHp,b.weaponDamage,b.attackPeriod],stats);
});

test('malformed new pacing or birth fields fail restore before mutating the live world',()=>{
 const w=enter();for(const alter of [(run:any)=>run.state.endless.pacing.version=2,(run:any)=>run.state.endless.pacing.duration=90,(run:any)=>run.state.endless.pacing.wavePhase=1.1,(run:any)=>run.state.waves[0].members[0].stamp.endlessGrowthSeconds=120]){
  const target=make();target.start();const run=w.captureRun(),before=target.captureRun();alter(run);assert.throws(()=>target.restoreRun(run),/无尽/);assert.deepEqual(target.captureRun(),before);
 }
});

for(const difficulty of ['easy','normal','hard','hell'] as const)test(`${difficulty}: longer-round actual mixed kills pay the scaled budget once`,()=>{
 const w=enter(difficulty);for(let r=1;r<7;r++)finish(w);w.entities.clear();w.pickups=[];const members=w.waves.flatMap(wave=>wave.members!),attempts=w.expedition.mapLootStats.regular.attempts;
 for(const m of members){const u=w.addUnit(m.type,'zerg',20,20,1,'regular',18,m.stamp);u.enemyResources=m.resources;w.hit(u,1e12,[],1,'terran');const n=w.pickups.length;w.hit(u,1e12,[],1,'terran');assert.equal(w.pickups.length,n);w.entities.delete(u.id);}
 const base=baselineEndlessResources(difficulty),factor=incomeFactor(difficulty)*ECONOMY.dropMultiplier*w.duration/60;
 near(w.pickups.reduce((n,p)=>n+p.minerals,0),base.minerals*factor);near(w.pickups.reduce((n,p)=>n+p.gas,0),base.gas*factor*ECONOMY.gasDropMultiplier);assert.equal(w.expedition.mapLootStats.regular.attempts-attempts,members.filter(m=>m.stamp.density===1).length);
});

for(const quality of [2,3])test(`round-end equipment quality ${quality} keeps fixed grants once and percentage grants proportional`,()=>{
 const account=newEquipmentAccount(41),grant=grantEquipment(account,{template:`module.supply.${quality}`,race:'terran',slot:'logistics',polluted:false},'fixture-supply',{kind:'warehouse'});assert.ok(grant.ok);assert.ok(equip(account,'terran',grant.value.id,'logistics').ok);
 let w=enter('easy','terran',account);for(let r=1;r<10;r++)finish(w);
 const fixed=[equipmentValue(w,'stage_resources'),equipmentValue(w,'stage_resources',1)],percent=equipmentValue(w,'stage_reward_percent');assert.ok(quality===2?fixed[0]>0:percent>0);
 w.time=w.stageStartedAt+w.duration;w.stageElapsed=w.duration;w.endStage();near(w.clearReceipt!.minerals,900*1.25*(1+percent)+fixed[0]);near(w.clearReceipt!.gas,750*1.25*(1+percent)+fixed[1]);
 const wallet={...w.wallet},receipts=[...w.starship.account.run!.receipts];w=restore(w);w.endStage();assert.deepEqual(w.wallet,wallet);assert.deepEqual([...w.starship.account.run!.receipts],receipts);assert.equal(receipts.filter(r=>r==='stage-resource:endless:10').length,1);
});

test('300-body pressure preserves ordinary backlog stamps and resources through the next round and archive',()=>{
 let w=enter('hell');for(let r=1;r<16;r++)finish(w);for(let i=0;i<300;i++)w.addUnit('zergling','zerg',30,30);(w as any).spawnWave();const backlog=structuredClone(w.ambientBacklog);assert.ok(backlog.length);const first=backlog[0];
 finish(w);w=restore(w);assert.deepEqual(w.ambientBacklog,backlog);w.entities.clear();w.time+=30;(w as any).releaseAmbient();assert.ok(w.ambientBacklog.length<backlog.length);const born=[...w.entities.values()].find(u=>u.enemySpawn?.endlessRound===16)!;assert.ok(born);assert.deepEqual(born.enemySpawn,first.stamp);assert.deepEqual(born.enemyResources,first.resources);assert.ok(w.enemyCount()<=300);
 const reference=make('hell');reference.start();const same=reference.addUnit(born.unitType,'zerg',30,30,1,'regular',18,first.stamp);near(born.maxHp,same.maxHp);near(born.weaponDamage,same.weaponDamage);
});

test('hell hive health and queued guards use the same round growth as ordinary enemies',()=>{
 const w=enter('hell');for(let r=1;r<16;r++)finish(w);w.time=w.stageStartedAt+20;w.nextExpansionAt=w.time;w.hiveWarningPoint={x:20,z:0};(w as any).updateHives();const hive=[...w.expansionHives.values()][0];assert.ok(hive);near(hive.maxHp,24000*1.22**(15+20/300));
 for(let i=0;i<300;i++)w.addUnit('zergling','zerg',30,30);w.time=hive.nextBatchAt;(w as any).updateHives();const stamp=structuredClone(hive.pendingStamp);assert.equal(stamp!.endlessRound,16);near(stamp!.endlessGrowthSeconds!,60*(15+28/300));finish(w);const copy=restore(w);assert.deepEqual([...copy.expansionHives.values()][0].pendingStamp,stamp);
});

test('bounded windows reproduce whole-round births, local RNG order and economy across a save boundary',()=>{
 let w=enter('hard');for(let r=1;r<43;r++)finish(w);const p=w.endless!.pacing!,whole=endlessWaveTemplate(w.seed,43,w.difficulty,p,0,Infinity);assert.ok(whole.length>ENDLESS_WAVE_WINDOW);assert.equal(w.waves.length,ENDLESS_WAVE_WINDOW);
 assert.deepEqual(w.waves,whole.slice(0,ENDLESS_WAVE_WINDOW));const rng=w.rngState;(w as any).releaseAmbient=()=>{};
 for(let i=0;i<ENDLESS_WAVE_WINDOW-1;i++)w.spawnWave();w=restore(w);(w as any).releaseAmbient=()=>{};w.spawnWave();assert.equal(w.stageWave,0);assert.deepEqual(w.waves,whole.slice(ENDLESS_WAVE_WINDOW));assert.deepEqual(w.missionWaveMembers(),whole[ENDLESS_WAVE_WINDOW-1].members);assert.equal(w.rngState,rng);near(w.nextWave,w.stageStartedAt+whole[ENDLESS_WAVE_WINDOW].at);
 while(w.waves.length)w.spawnWave();assert.equal(w.nextWave,Infinity);assert.equal(w.endless!.pacing!.nextWaveIndex,whole.length);assert.equal(w.ambientBacklog.length,whole.flatMap(w=>w.members!).length);
 const budget=baselineEndlessResources(w.difficulty),totals={minerals:0,gas:0};for(const member of w.ambientBacklog){const [m,g]=ambientResources(member.type);totals.minerals+=m*member.resources!.minerals;totals.gas+=g*member.resources!.gas;}near(totals.minerals,budget.minerals*w.duration/60);near(totals.gas,budget.gas*w.duration/60);assert.deepEqual(restore(w).ambientBacklog,w.ambientBacklog);
});

test('round 4097 migration prepares a bounded window while retaining the full million-wave schedule',()=>{
 const w=enter();w.endless!.round=4097;delete w.endless!.pacing;(w as any).configStage=-1;w.prepareStage();finish(w);
 assert.equal(w.endless!.round,4098);assert.ok(w.config.waves>1_000_000);assert.equal(w.waves.length,ENDLESS_WAVE_WINDOW);assert.equal(w.endless!.pacing!.nextWaveIndex,ENDLESS_WAVE_WINDOW);assert.ok(w.waves.flatMap(w=>w.members!).length<10_000);assert.equal(w.duration,endlessRoundDuration(4098));
});
