import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGES,enemyPressure,chapterGrowth,type Difficulty} from '../src/data/stages';
import {
 CAMPAIGN18_STAGES,CAMPAIGN18_DURATIONS,CAMPAIGN18_BUDGETS,CAMPAIGN18_TOTALS,CAMPAIGN18_CHAPTER_REWARDS,
 CAMPAIGN18_ENEMIES,CAMPAIGN18_WEIGHTS,CAMPAIGN18_HERO_WINDOWS,CAMPAIGN18_PURPLE_WINDOWS,
 campaign18StageConfig,campaign18Schedule,campaign18EnemyPressure,campaign18ChapterGrowth,campaign18GuardCounts,
 campaign18Threat,allocateCampaign18Threat,emptyCampaign18Counts,
} from '../src/data/campaign18';

const difficulties:Difficulty[]=['easy','normal','hard','hell'];
const total=(values:readonly number[])=>values.reduce((a,b)=>a+b,0);
test('eighteen stages retain the approved 30-minute / 4684-point contract without changing legacy stages',()=>{
 assert.equal(STAGES.length,12);
 assert.equal(CAMPAIGN18_STAGES.length,18);
 assert.deepEqual(CAMPAIGN18_STAGES.map(s=>s.durationSeconds),[60,60,60,75,75,75,90,90,90,105,105,105,120,120,120,150,150,150]);
 assert.equal(total(CAMPAIGN18_DURATIONS),1800);
 assert.equal(total(CAMPAIGN18_BUDGETS),4684);
 assert.deepEqual(CAMPAIGN18_TOTALS,{stages:18,chapters:6,intermissions:17,combatSeconds:1800,baseThreat:4684,minerals:2755,gas:2055});
 assert.equal(CAMPAIGN18_STAGES[9].budget,185,'the transition stage is below stage nine pressure');
 assert.equal(CAMPAIGN18_STAGES[0].lingHp,STAGES[0].lingHp);
 assert.equal(CAMPAIGN18_STAGES[17].podHp,STAGES[11].podHp);
 assert.equal(CAMPAIGN18_STAGES[17].width,STAGES[11].width);
});
test('chapter rewards use 30/30/remainder and retain the complete legacy mineral/gas budget',()=>{
 for(let chapter=0;chapter<6;chapter++)for(const currency of [0,1] as const){
  const expected=CAMPAIGN18_CHAPTER_REWARDS[chapter][currency],values=CAMPAIGN18_STAGES.slice(chapter*3,chapter*3+3).map(s=>s.reward[currency]);
  assert.deepEqual(values,[Math.floor(expected*.3),Math.floor(expected*.3),expected-2*Math.floor(expected*.3)]);
 }
 assert.equal(total(CAMPAIGN18_STAGES.map(s=>s.reward[0])),2755);
 assert.equal(total(CAMPAIGN18_STAGES.map(s=>s.reward[1])),2055);
 for(const difficulty of difficulties)assert.deepEqual(campaign18StageConfig(18,difficulty).reward,CAMPAIGN18_STAGES[17].reward,'income multipliers belong to the award transaction');
});
test('difficulty interpolation preserves the four-profile endpoints and uses six distinct chapters',()=>{
 for(const difficulty of difficulties){
  assert.deepEqual(campaign18EnemyPressure(difficulty,1),enemyPressure(difficulty,1));
  assert.deepEqual(campaign18EnemyPressure(difficulty,18),enemyPressure(difficulty,12));
  assert.deepEqual(campaign18ChapterGrowth(difficulty,1),chapterGrowth(difficulty,1));
  assert.deepEqual(campaign18ChapterGrowth(difficulty,18),chapterGrowth(difficulty,12));
  for(let chapter=0;chapter<6;chapter++)assert.deepEqual(campaign18EnemyPressure(difficulty,chapter*3+1),campaign18EnemyPressure(difficulty,chapter*3+3));
 }
 assert.equal(new Set([1,4,7,10,13,16].map(s=>campaign18EnemyPressure('hard',s).total)).size,6);
 assert.ok(Math.abs(campaign18EnemyPressure('hard',4).total-1.26)<1e-9);
 assert.ok(Math.abs(campaign18ChapterGrowth('normal',7).health-1.28)<1e-9);
});
test('cumulative rounding does not inflate small waves and Hard/Hell pressure does not undercut Normal',()=>{
 let raw=0,normal=0,easy=0;
 for(let stage=1;stage<=18;stage++){
  raw+=CAMPAIGN18_BUDGETS[stage-1];normal+=campaign18StageConfig(stage,'normal').budget;easy+=campaign18StageConfig(stage,'easy').budget;
  assert.equal(normal,Math.round(raw*.9));assert.equal(easy,Math.floor(raw*.5));
  assert.ok(campaign18StageConfig(stage,'hard').budget>=campaign18StageConfig(stage,'normal').budget);
  assert.ok(campaign18StageConfig(stage,'hell').budget>=campaign18StageConfig(stage,'hard').budget);
 }
 assert.equal(normal,4216);assert.equal(easy,2342);
});
test('weighted mixes allocate threat, not hundreds of heavy-unit bodies, and never introduce a forbidden family',()=>{
 for(const s of CAMPAIGN18_STAGES){
  assert.equal(total(Object.values(s.mix)),100);
  assert.equal(campaign18Threat(s.ambient),s.waveBudget);
  for(const type of CAMPAIGN18_ENEMIES){assert.ok(Number.isInteger(s.ambient[type])&&s.ambient[type]>=0);if(s.mix[type]===0)assert.equal(s.ambient[type],0);}
 }
 const late=campaign18StageConfig(13,'normal');assert.ok(late.ambient.ultralisk>0&&late.ambient.ultralisk<=5);
 const isolated={...emptyCampaign18Counts(),ultralisk:100},allocation=allocateCampaign18Threat(25,isolated);
 assert.equal(allocation.counts.ultralisk,2);assert.equal(allocation.spent,24);assert.equal(allocation.unspent,1);
 assert.equal(allocateCampaign18Threat(25,emptyCampaign18Counts()).unspent,25);
});
test('special and hive reserves are inside the stage budget, including Hell combined reserves',()=>{
 for(const difficulty of difficulties)for(let stage=1;stage<=18;stage++)for(const seed of [1,42,8672]){
  const s=campaign18StageConfig(stage,difficulty),p=campaign18Schedule(s,seed),a=p.accounting;
  assert.equal(a.unspent,0);assert.equal(a.withheld,0);assert.equal(a.waves+a.specials+a.mainHive+a.expansionHive,a.budget);
  assert.equal(a.waves,campaign18Threat(s.ambient));
  assert.equal(a.specials,s.reserves.captain+s.reserves.boss);
  assert.ok(p.waves.every(w=>w.at>0&&w.at<s.durationSeconds));
  assert.ok([...p.events,...p.specials].every(e=>e.at>0&&e.at<s.durationSeconds));
  assert.ok(p.waves.every((w,i)=>i===0||w.at>p.waves[i-1].at));
  assert.equal(p.waves.length,Math.ceil(s.durationSeconds/10));
  const delivered=emptyCampaign18Counts();for(const w of p.waves)for(const type of w.types)delivered[type]++;
  assert.deepEqual(delivered,s.ambient);
 }
});
test('captains occur on 3/9/15, bosses on 6/12, and eighteen has only the shared-budget main hive',()=>{
 const schedules=CAMPAIGN18_STAGES.map(s=>campaign18Schedule(campaign18StageConfig(s.id,'normal'),42));
 assert.deepEqual(schedules.flatMap((p,i)=>p.specials.some(e=>e.role==='captain')?[i+1]:[]),[3,9,15]);
 assert.deepEqual(schedules.flatMap((p,i)=>p.specials.some(e=>e.role==='boss')?[i+1]:[]),[6,12]);
 const final=schedules[17];assert.equal(final.specials.length,0);assert.ok(final.mainHive);
 assert.deepEqual(final.mainHive.phases?.map(p=>[p.from,p.until]),[[0,45],[45,100],[100,150]]);
 assert.equal(final.mainHive.alwaysAttackable,true);assert.equal(final.mainHive.requiresSurvival,true);assert.equal(final.mainHive.healBetweenPhases,false);
 assert.deepEqual(CAMPAIGN18_HERO_WINDOWS,[6,9,12]);assert.deepEqual(CAMPAIGN18_PURPLE_WINDOWS,[15]);
});
test('new threats have fixed introduction stages and do not enter the first two introductory waves',()=>{
 const introductions={roach:2,baneling:3,hydralisk:5,mutalisk:7,ravager:8,queen:9,lurker:11,ultralisk:13,corruptor:14};
 for(const [type,stage] of Object.entries(introductions)){
  assert.ok(CAMPAIGN18_STAGES.slice(0,stage-1).every(s=>s.mix[type as keyof typeof CAMPAIGN18_WEIGHTS]===0));
  const plan=campaign18Schedule(campaign18StageConfig(stage,'normal'),42);
  assert.ok(plan.waves.slice(0,2).every(w=>!w.types.includes(type as typeof CAMPAIGN18_ENEMIES[number])));
  assert.ok(plan.waves.slice(2).some(w=>w.types.includes(type as typeof CAMPAIGN18_ENEMIES[number])));
 }
});
test('Hell expansion-hive requests reserve budget, warn five seconds and carry fixed count limits',()=>{
 for(const difficulty of difficulties)for(let stage=1;stage<=18;stage++){
  const p=campaign18Schedule(campaign18StageConfig(stage,difficulty),42);
  if(difficulty!=='hell'||stage<4){assert.equal(p.expansionHive,null);continue;}
  const hive=p.expansionHive!;assert.equal(hive.kind,'expansion');assert.equal(hive.at-hive.warningAt!,5);
  assert.equal(hive.maxNewPerStage,1);assert.equal(hive.maxAlive,2);assert.ok(hive.warningAt!>0&&hive.at<CAMPAIGN18_DURATIONS[stage-1]);
  assert.equal(hive.budget,p.accounting.expansionHive);
 }
});
test('seeded schedules reproduce exactly and disabling specials does not add their threat to ordinary waves',()=>{
 const config=campaign18StageConfig(18,'hell'),a=campaign18Schedule(config,42),b=campaign18Schedule(config,42),other=campaign18Schedule(config,43),plain=campaign18Schedule(config,42,false);
 assert.deepEqual(a,b);assert.notDeepEqual(a.waves,other.waves);assert.deepEqual(a.waves,plain.waves);assert.deepEqual(a.events,plain.events);
 assert.equal(plain.specials.length,0);assert.equal(plain.mainHive,null);assert.equal(plain.expansionHive,null);assert.equal(plain.accounting.unspent,0);
 assert.equal(plain.accounting.withheld,a.accounting.specials+a.accounting.mainHive+a.accounting.expansionHive);
});
test('eighteen stages redistribute, rather than multiply, legacy worker/drone income events',()=>{
 for(const seed of [1,42,8672]){let eggs=0,drones=0;
  for(let stage=1;stage<=18;stage++){const s=campaign18StageConfig(stage,'normal'),p=campaign18Schedule(s,seed);const e=p.events.filter(e=>e.kind==='egg').length,d=p.events.filter(e=>e.kind==='drone').length;assert.equal(e,s.eggs);assert.equal(d,s.drones);eggs+=e;drones+=d;}
  assert.equal(eggs,26);assert.equal(drones,40);
 }
 assert.equal(CAMPAIGN18_STAGES[0].eggs,3);assert.equal(CAMPAIGN18_STAGES[0].drones,4);
});
test('separate per-delivery guard carry preserves the target threat without affecting ambient waves',()=>{
 for(const difficulty of difficulties){const stage=8,base=CAMPAIGN18_STAGES[stage-1],target=base.guardBudget*(difficulty==='easy'?.5:.9)*campaign18EnemyPressure(difficulty,stage).guards;let spent=0;
  for(let serial=0;serial<10;serial++){const guards=campaign18GuardCounts(stage,difficulty,serial);spent+=guards.spent;assert.equal(guards.unspent,0);assert.equal(spent,difficulty==='easy'?Math.floor((serial+1)*target+1e-8):Math.floor((serial+1)*target+.5+1e-8));}
 }
});
test('config callers cannot mutate shared base-stage counts, rewards or reserve data',()=>{
 const a=campaign18StageConfig(9,'normal'),expected=campaign18StageConfig(9,'normal');a.ambient.zergling=999;a.mix.queen=0;a.reserves.captain=0;(a.reward as number[])[0]=0;
 assert.deepEqual(campaign18StageConfig(9,'normal'),expected);
 assert.throws(()=>campaign18StageConfig(19,'normal'),RangeError);
});
