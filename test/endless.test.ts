import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';import {ENDLESS,endlessInterval,endlessGrowth} from '../src/data/endless';import {SC2_UNITS} from '../src/data/sc2-units';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function victory(){const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.stage=12;w.prepareStage();w.hive!.hp=0;w.endStage();assert.equal(w.phase,'won');return w;}
test('only campaign victory unlocks endless, preserving the final map, squad and paid state',()=>{
 const early=new World({sandbox:true});early.start();assert.equal(early.startEndless(),false);
 const w=victory(),u=w.allies()[0];u.hp=22;u.weaponCooldown=.4;const b=w.addBuilding('barracks',0),enemy=w.addUnit('roach','zerg',15,0),pod=w.spawnPod('marine',{x:20,z:0});
 const wallet={...w.wallet},hive=w.hive,entities=w.entities,buildings=w.buildings;assert.ok(w.startEndless());assert.equal(w.startEndless(),false);assert.equal(w.stage,12);assert.equal(w.hive,hive);assert.equal(w.hive!.hp,0);assert.equal(w.entities,entities);assert.equal(w.entities.get(enemy.id),enemy);assert.equal(w.buildings,buildings);assert.ok(w.buildings.has(b.id));assert.ok(w.pods.includes(pod));assert.deepEqual(w.wallet,wallet);assert.equal(u.hp,22);assert.equal(u.weaponCooldown,.4);assert.equal(w.endless!.round,1);
});
test('endless spawn intervals accelerate independently at 30/60/90 seconds',()=>{
 for(const [source,every,base,factor] of [['wave',30,8,.9],['elite',60,30,.85],['boss',90,90,.85]] as const){near(endlessInterval(source,every-.001),base);near(endlessInterval(source,every),base*factor);near(endlessInterval(source,every*2),base*factor*factor);}
 near(endlessInterval('elite',30),30);near(endlessInterval('boss',60),90);for(const source of ['wave','elite','boss'] as const)assert.equal(endlessInterval(source,1e8),ENDLESS[source].minInterval);
});
test('each new endless special grows HP damage and attack speed without changing living enemies or ordinary units',()=>{
 const w=victory();w.startEndless();for(const tier of ['elite','boss'] as const){const a=w.spawnSpecial('hydralisk',tier,{x:10,z:0})!,hp=a.hp,damage=a.weaponDamage,period=a.attackPeriod;const b=w.spawnSpecial('hydralisk',tier,{x:15,z:0})!;
  assert.equal(a.endlessLevel,1);assert.equal(b.endlessLevel,2);near(b.maxHp,hp*1.4);near(b.weaponDamage,damage*1.25);near(b.attackPeriod,period/1.15);near(a.hp,hp);near(a.weaponDamage,damage);near(a.attackPeriod,period);}
 const normal=w.addUnit('hydralisk','zerg',20,0);assert.equal(normal.maxHp,SC2_UNITS.hydralisk.maxHp);assert.equal(normal.weaponDamage,SC2_UNITS.hydralisk.attackDamage);assert.equal(normal.endlessLevel,undefined);
});
test('endless skill damage grows once while original ground warning duration remains dodgeable',()=>{
 const w=victory();w.startEndless();const b=w.spawnSpecial('ravager','boss',{x:0,z:0})!,a=w.allies()[0];a.x=0;a.z=5;a.hp=a.maxHp=100000;b.specialReady=0;w.hash.rebuild([b,a]);w.enemySpecials.act(b,1/60);const cast=w.enemySpecials.casts[0];near(cast.damage,70*1.2*endlessGrowth(1).damage);near(cast.at-w.time,1.5);
});
test('endless schedule continues with all four elite and Boss types and keeps Easy elite pressure halved',()=>{
 const run=(difficulty:'easy'|'normal')=>{const w=victory();w.difficulty=difficulty;w.startEndless();const events:{tier:string;at:number;type:string}[]=[],waves:number[]=[];
  w.spawnWave=()=>{waves.push(w.time);};w.spawnSpecial=(type,tier)=>{events.push({tier,type,at:w.time});if(tier==='elite')w.endless!.elites++;else w.endless!.bosses++;return {} as any;};
  for(let i=1;i<=600*60;i++){w.time=i/60;(w as any).updateEndlessSpawns(1/60);}return {events,waves};};
 const normal=run('normal'),easy=run('easy');assert.ok(normal.waves.filter(t=>t>=30&&t<60).length>normal.waves.filter(t=>t<30).length);
 assert.ok(normal.events.filter(e=>e.tier==='elite').length>10);assert.ok(normal.events.filter(e=>e.tier==='boss').length>=4);
 for(const tier of ['elite','boss'])assert.equal(new Set(normal.events.filter(e=>e.tier===tier).map(e=>e.type)).size,4);
 const n=normal.events.filter(e=>e.tier==='elite').length,e=easy.events.filter(e=>e.tier==='elite').length;assert.equal(e,Math.floor(n/2));assert.deepEqual(easy.waves,normal.waves);
});
test('endless rounds keep two reward phases, freeze on pause, and never award campaign victory again',()=>{
 const w=victory();w.startEndless();w.allies()[0].weaponCooldown=.7;w.paused=true;const time=w.time;w.advance(10);assert.equal(w.time,time);assert.equal(w.allies()[0].weaponCooldown,.7);w.paused=false;
 const oldClear={...w.economyTotals.clear};w.endStage();assert.equal(w.phase,'reward');const cleared={...w.economyTotals.clear};assert.ok(cleared.minerals>oldClear.minerals);w.endStage();assert.deepEqual(w.economyTotals.clear,cleared);w.advance(10);assert.equal(w.time,time);
 assert.equal(w.rewardRound,'building');w.skipReward();assert.equal(w.rewardRound,'random');w.skipReward();assert.equal(w.phase,'battle');assert.equal(w.stage,12);assert.equal(w.endless!.round,2);assert.equal(w.hive!.hp,0);assert.equal(w.stageElapsed,0);
 w.hit(w.allies()[0],99999);w.step();assert.equal(w.phase,'lost');assert.equal(w.startEndless(),false);
});

test('changing endless archetypes never lowers the next special HP damage or fire rate',()=>{
 const w=victory();w.startEndless();for(const tier of ['elite','boss'] as const){let previous:ReturnType<World['spawnSpecial']>;for(let i=0;i<12;i++){const u=w.spawnSpecial(ENDLESS.types[i%4],tier,{x:12,z:0})!;if(previous){assert.ok(u.maxHp>=previous.maxHp*1.4-1e-7);assert.ok(u.weaponDamage>=previous.weaponDamage*1.25-1e-7);assert.ok(u.attackPeriod<=previous.attackPeriod/1.15+1e-7);}previous=u;}}
});
