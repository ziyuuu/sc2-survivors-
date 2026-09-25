import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {SC2_UNITS,ZERG} from '../src/data/sc2-units';
import {BOSSES} from '../src/data/enemies';
import {enemyPressure,stageConfig,stageSchedule,chapterGrowth,eliteGrowth} from '../src/data/stages';

test('Hell shares Hard stages one to three, then increases counts without multiplying wave count into total',()=>{
 for(let stage=1;stage<=3;stage++){
  assert.deepEqual(stageConfig(stage,'hell'),{...stageConfig(stage,'hard'),difficulty:'hell'});
  const hard=stageSchedule(stageConfig(stage,'hard'),421),hell=stageSchedule(stageConfig(stage,'hell'),421);
  assert.deepEqual(hard.waves,hell.waves);assert.deepEqual(hard.specials,hell.specials);
 }
 for(let stage=4;stage<=12;stage++){
  const normal=stageConfig(stage,'normal'),hard=stageConfig(stage,'hard'),hell=stageConfig(stage,'hell');
  const sum=(c:typeof normal)=>ZERG.reduce((n,type)=>n+c.ambient[type],0);
  assert.ok(sum(hell)>sum(hard)&&sum(hard)>sum(normal),String(stage));
  for(const difficulty of ['hard','hell'] as const){const config=stageConfig(stage,difficulty),schedule=stageSchedule(config,421);
   assert.ok(schedule.waves.every(w=>w.types.length>0&&w.at>0&&w.at<config.durationSeconds));
   for(const type of ZERG)assert.equal(schedule.waves.flatMap(w=>w.types).filter(t=>t===type).length+schedule.specials.filter(e=>e.tier==='elite'&&e.type===type).length,config.ambient[type]);
  }
 }
});

test('new ordinary and elite enemies lock chapter, level, and difficulty at spawn',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],difficulty:'hell'});w.stage=12;
 const regular=w.addUnit('zergling','zerg',12,0),chapter=chapterGrowth('hell',12),pressure=enemyPressure('hell',12);
 assert.equal(regular.maxHp,SC2_UNITS.zergling.maxHp*chapter.health*pressure.health);
 assert.equal(regular.weaponDamage,SC2_UNITS.zergling.attackDamage*chapter.damage*pressure.damage);
 const elite=w.spawnSpecial('zergling','elite',{x:16,z:0})!,level=eliteGrowth('hell',12);
 assert.equal(elite.enemyLevel,5);assert.equal(elite.maxHp,regular.maxHp*3*level.health);
 assert.equal(elite.weaponDamage,regular.weaponDamage*1.3*level.damage);
 w.stage=1;assert.equal(regular.maxHp,SC2_UNITS.zergling.maxHp*chapter.health*pressure.health);
});

test('fixed Boss template receives the selected difficulty only once',()=>{
 for(const difficulty of ['normal','hard','hell'] as const){const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],difficulty});w.stage=12;
  const boss=w.spawnSpecial('ravager','boss',{x:12,z:0})!,pressure=enemyPressure(difficulty,12),base=BOSSES[12];
  assert.ok(Math.abs(boss.maxHp-base.hp*.9*pressure.health)<1e-7);
  assert.ok(Math.abs(boss.weaponDamage-SC2_UNITS.ravager.attackDamage*2*1.2*pressure.damage)<1e-7);
  assert.ok(Math.abs(boss.attackPeriod-SC2_UNITS.ravager.attackPeriod/(1.2*pressure.attackSpeed))<1e-7);
 }
});

test('Hell hive warns, spawns a bounded batch, and clears frenzy and rewards once on destruction',()=>{
 const w=new World({sandbox:true,waves:true,terrain:false,obstacles:[],difficulty:'hell',initial:['marine']});w.start();w.stage=4;w.stageStartedAt=w.time;w.prepareStage();w.updateUnit=()=>{};
 w.advance(15);assert.ok(w.hiveWarningPoint);assert.equal(w.expansionHives.size,0);
 w.advance(5);assert.equal(w.expansionHives.size,1);assert.equal(w.hiveFrenzy,true);
 const hive=[...w.expansionHives.values()][0];w.advance(8);assert.ok(hive.batchSerial>=1);assert.ok([...w.entities.values()].some(e=>e.owner==='zerg'&&e.guardOrigin));
 const drops=w.pickups.length;w.hit(hive,1e9);assert.equal(w.expansionHives.size,0);assert.equal(w.hiveFrenzy,false);assert.equal(w.pickups.length,drops+1);
 w.hit(hive,1e9);assert.equal(w.pickups.length,drops+1);
});

test('an uncleared Hell expansion hive blocks stage completion',()=>{
 const w=new World({sandbox:true,waves:true,terrain:false,obstacles:[],difficulty:'hell',initial:['marine']});w.start();w.stage=4;w.stageStartedAt=w.time;w.prepareStage();w.updateUnit=()=>{};w.advance(20);
 assert.equal(w.expansionHives.size,1);w.stageElapsed=w.duration;w.endStage();assert.equal(w.phase,'lost');
});
