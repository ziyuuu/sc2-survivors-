import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {THREE_RACE_RULES} from '../src/data/races';
import {SOURCE_ABILITIES} from '../src/data/expansion-units';
import {MapTerrain} from '../src/simulation/movement/map-terrain';
import {CharTerrain} from '../src/data/terrain';
import type {MapDefinition} from '../src/data/map-definition';
import {CLIFF_TRAVERSAL,legalCliffCrossing,cliffLanding,tickCliffTraversal,cliffRenderPosition,tickZealotCharge} from '../src/simulation/movement/native-traversal';

function fixture():MapDefinition {const width=21,height=21,walkWidth=40,walkHeight=40;return {version:1,source:{name:'one cliff fixture',sha256:'cliff-fixture',worldUnitsPerSc2Unit:1},width,height,bounds:[0,0,20,20],origin:[0,20,0],start:{x:3,z:10},hive:{x:18,z:10},heights:Array.from({length:width*height},(_,i)=>i%width>=10?3:0),syncHeights:[],levels:Array.from({length:width*height},(_,i)=>i%width>=10?2:1),walkWidth,walkHeight,cellSize:.5,walk:Array.from({length:1600},(_,i)=>i%walkWidth>=18&&i%walkWidth<20?0:1),opening:Array.from({length:1600},(_,i)=>i%walkWidth>=18&&i%walkWidth<20?0:1),reveal:Array(1600).fill(1),clearance:Array.from({length:1600},(_,i)=>i%walkWidth>=18&&i%walkWidth<20?0:3),placements:[],ramps:[],stageAreas:Array(12).fill(380)};}
function make(terrain:MapTerrain|CharTerrain|false=false){const w=new World({rulesVersion:THREE_RACE_RULES,race:'protoss',waves:false,sandbox:true,terrain,obstacles:[],seed:912});w.start();return w;}
function jumper(type:'reaper'|'colossus'='reaper'){const data=fixture(),terrain=new MapTerrain(data),w=make(terrain),u=w.addUnit(type,'terran',7.5,10);return {w,u,data,terrain,to:{x:11.5,z:10}};}
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('Reaper and Colossus cross exactly one legal cliff while ordinary ground units still need the ramp',()=>{
 for(const type of ['reaper','colossus'] as const){const {w,u,to,terrain}=jumper(type);assert.equal(terrain.walkLine(u,to,u.unitRadius),false);assert.equal(legalCliffCrossing(w,u,to),true);assert.ok(cliffLanding(w,u,to));}
 const {w,to}=jumper();for(const type of ['marine','zealot','tank'] as const){const u=w.addUnit(type,'terran',7.5,10);assert.equal(legalCliffCrossing(w,u,to),false);}
});
test('cliff transitions reject unopened destinations and unrevealed cliff bands',()=>{
 const {w,u,data,terrain,to}=jumper();data.opening=data.opening.map((value,i)=>i%data.walkWidth>=20?2:value);assert.equal(legalCliffCrossing(w,u,to),false);w.stage=4;terrain.setStage(w.terrainStage);assert.equal(legalCliffCrossing(w,u,to),true);
 data.reveal=data.reveal.map((value,i)=>i%data.walkWidth>=18&&i%data.walkWidth<20?3:value);assert.equal(legalCliffCrossing(w,u,to),false);
});
test('flat walls, painted hazards, deep pits and two-level cliffs never become shortcuts',()=>{
 {const {w,u,data,to}=jumper();data.heights.fill(0);data.levels.fill(1);assert.equal(legalCliffCrossing(w,u,to),false);}
 {const {w,u,data,to}=jumper();data.walk=data.walk.map((value,i)=>i%data.walkWidth===16?0:value);data.opening=data.opening.map((value,i)=>i%data.walkWidth===16?0:value);assert.equal(legalCliffCrossing(w,u,to),false);}
 {const {w,u,data,to}=jumper();for(let i=0;i<data.levels.length;i++)if(i%data.width===8)data.levels[i]=0;assert.equal(legalCliffCrossing(w,u,to),false);}
 {const {w,u,data,to}=jumper();data.heights=data.heights.map(h=>h?6:0);data.levels=data.levels.map(level=>level===2?3:level);assert.equal(legalCliffCrossing(w,u,to),false);}
});
test('jump/stride footprints respect explicit obstacles, authored blocking placements and occupied landings',()=>{
 {const {w,u,to}=jumper();w.obstacles.push({x:9.5,z:10,w:.3,h:4});assert.equal(legalCliffCrossing(w,u,to),false);}
 {const {w,u,data,to}=jumper();data.placements.push({type:'PathingBlocker',blockerSize:1,position:[9.5,10,0],rotation:0,scale:[1,1,1],unit:false});assert.equal(legalCliffCrossing(w,u,to),false);}
 {const {w,u,to}=jumper();w.addUnit('roach','zerg',to.x,to.z);assert.equal(legalCliffCrossing(w,u,to),false);}
});
test('the native Char map supports its known single-level cliffs without changing ground movement globally',()=>{
 const w=make(new CharTerrain()),u=w.addUnit('reaper','terran',22.5,8),to={x:25.5,z:8};assert.equal(legalCliffCrossing(w,u,to),true);assert.equal(w.terrain!.walkLine(u,to,u.unitRadius),false);assert.equal(legalCliffCrossing(w,u,{x:28,z:8}),false,'maximum crossing distance remains bounded');
});
test('a timed crossing keeps simulation on legal takeoff/landing cells and renders a bounded jump arc',()=>{
 const {w,u,to,terrain}=jumper(),before={x:u.x,z:u.z};assert.equal(tickCliffTraversal(w,u,to,.05),true);assert.deepEqual({x:u.x,z:u.z},before);assert.equal(u.cliffTransit!.kind,'jump');const half=cliffRenderPosition(u,.25);assert.ok(half.x>u.x&&half.x<to.x);near(half.lift,1.1);w.time=.49;tickCliffTraversal(w,u,to,.05);assert.deepEqual({x:u.x,z:u.z},before);w.time=.5;tickCliffTraversal(w,u,to,.05);assert.equal(u.cliffTransit,undefined);assert.ok(terrain.canOccupy(u,u.unitRadius));assert.ok(u.x>10);assert.equal(cliffLanding(w,u,before),null,'cooldown prevents repeated instant crossbacks');
});
test('landing is rechecked when an actor occupies it during the saved crossing animation',()=>{
 const {w,u,to}=jumper();tickCliffTraversal(w,u,to,.05);const landing={...u.cliffTransit!.to},copy=make(new MapTerrain(fixture()));copy.restoreRun(w.captureRun());const saved=copy.entities.get(u.id)!;assert.deepEqual(saved.cliffTransit,u.cliffTransit);copy.paused=false;copy.addUnit('roach','zerg',landing.x,landing.z);copy.time=CLIFF_TRAVERSAL.reaper.seconds;tickCliffTraversal(copy,saved,to,.05);assert.equal(saved.x,7.5);assert.equal(saved.cliffTransit,undefined);
});
function charger(){const w=make(),u=w.addUnit('zealot','terran',0,0),target=w.addUnit('roach','zerg',3,0);w.expedition!.tech.charge=1;return {w,u,target};}
test('Charge uses verified range, duration, speed and cooldown, without dealing free impact damage',()=>{
 const {w,u,target}=charger(),beforeHp=target.hp,base=u.moveSpeed;u.weaponCooldown=.4;u.nextShotAt=3;assert.equal(tickZealotCharge(w,u,target,.05),true);near(u.x,base*SOURCE_ABILITIES.charge.speedMultiplier*.05);near(u.chargeReadyAt!,SOURCE_ABILITIES.charge.cooldown);near(u.chargeState!.until,SOURCE_ABILITIES.charge.duration);assert.equal(target.hp,beforeHp);assert.equal(u.weaponCooldown,.4);assert.equal(u.nextShotAt,3);
});
test('Charge requires the correct research, a hostile ground target and a legal path',()=>{
 {const {w,u,target}=charger();delete w.expedition!.tech.charge;assert.equal(tickZealotCharge(w,u,target,.05),false);}
 {const {w,u,target}=charger();target.owner='terran';assert.equal(tickZealotCharge(w,u,target,.05),false);}
 {const {w,u}=charger(),air=w.addUnit('mutalisk','zerg',3,0);assert.equal(tickZealotCharge(w,u,air,.05),false);}
 {const {w,u,target}=charger();w.obstacles.push({x:1.5,z:0,w:.3,h:5});assert.equal(tickZealotCharge(w,u,target,.05),false);}
 {const {w,u,to}=jumper();const zealot=w.addUnit('zealot','terran',u.x,u.z),target=w.addUnit('roach','zerg',to.x,to.z);w.expedition!.tech.charge=1;assert.equal(tickZealotCharge(w,zealot,target,.05),false);}
});
test('Charge respects its strict trigger range and stops at melee reach without crossing the target',()=>{
 for(const edge of [.59,4.01]){const {w,u,target}=charger();target.x=u.unitRadius+target.unitRadius+edge;assert.equal(tickZealotCharge(w,u,target,.05),false);}
 const {w,u,target}=charger();for(let i=0;i<50;i++){w.time=i*.05;tickZealotCharge(w,u,target,.05);}assert.ok(w.edgeDistance(u,target)>=.075);assert.equal(u.chargeState,undefined);assert.ok(u.x<target.x);target.x=u.x+u.unitRadius+target.unitRadius+2;assert.equal(tickZealotCharge(w,u,target,.05),false,'cooldown is not reset on contact');
});
test('a new obstruction, expired duration or manual movement cancels an active charge while retaining cooldown',()=>{
 {const {w,u,target}=charger();tickZealotCharge(w,u,target,.05);const x=u.x,ready=u.chargeReadyAt;w.obstacles.push({x:1.5,z:0,w:.3,h:5});assert.equal(tickZealotCharge(w,u,target,.05),false);assert.equal(u.x,x);assert.equal(u.chargeState,undefined);assert.equal(u.chargeReadyAt,ready);}
 {const {w,u,target}=charger();tickZealotCharge(w,u,target,.05);w.time=SOURCE_ABILITIES.charge.duration;assert.equal(tickZealotCharge(w,u,target,.05),false);assert.equal(u.chargeState,undefined);}
 {const {w,u,target}=charger();tickZealotCharge(w,u,target,.05);w.input={x:1,z:0};assert.equal(tickZealotCharge(w,u,target,.05),false);assert.equal(u.chargeState,undefined);}
});
test('World.updateUnit starts native traversal from the raw command and completes its saved transit',()=>{
 const {w,u,to}=jumper();w.order={kind:'move',point:to,arrived:false,issuedAt:w.time};w.updateUnit(u,.05);assert.ok(u.cliffTransit,'ordinary navigation must not divert native movers before the cliff check');const landing={...u.cliffTransit.to};w.time=u.cliffTransit.until;w.updateUnit(u,.05);assert.equal(u.cliffTransit,undefined);near(u.x,landing.x);near(u.z,landing.z);
});
test('World.updateUnit applies researched Charge during a legal approach',()=>{
 const {w,u,target}=charger();u.attackTarget=target.id;u.thinkAt=Infinity;w.updateUnit(u,.05);assert.ok(u.chargeState);assert.ok(u.x>u.moveSpeed*.05);assert.equal(target.hp,target.maxHp);
});
