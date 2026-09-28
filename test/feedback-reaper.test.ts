import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {SC2_UNITS} from '../src/data/sc2-units';
import {distance} from '../src/simulation/movement/steering';
import {installShotDiagnostics} from '../src/diagnostics/shot-diagnostics';
import {ELITES,type EliteId} from '../src/data/elites';
import {CharTerrain} from '../src/data/terrain';
import {tickCliffTraversal} from '../src/simulation/movement/native-traversal';

const make=()=>{const w=new World({race:'terran',seed:627,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.runId='reaper-diagnostic-fixture';return w;};
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('F06 reaper has a ranged engagement slot with squad peers instead of walking into the target',()=>{
 const w=make(),u=w.addUnit('reaper','terran',0,0),peer=w.addUnit('marine','terran',-1,0),target=w.addUnit('roach','zerg',0,5);
 u.attackTarget=peer.attackTarget=target.id;
 const goal=w.engagement.goal(u,target,[u,peer],w.anchor,0,w.mapHalf,w.obstacles,w.terrain);
 assert.ok(distance(goal,target)>u.attackRange*.75,'reaper must receive a shooting arc, not the enemy body');
 assert.ok(distance(goal,target)<=u.attackRange+u.unitRadius+target.unitRadius);
 assert.ok(distance(goal,target)>u.unitRadius+target.unitRadius);
});

for(const family of ['marine','reaper'] as const)for(const scenario of ['static','moving','choke'] as const)test(`F06 ${family} ${scenario}: aim, acquisition, real shots, cooldown and ranged placement`,t=>{
 const w=make(),u=w.addUnit(family,'terran',0,0),peer=w.addUnit('marine','terran',-.8,-.5),target=w.addUnit('roach','zerg',0,4);
 target.hp=target.maxHp=10000;target.armor=0;u.facing=u.attackFacing=Math.PI;w.anchorStoppedFor=1;
 if(scenario==='choke')w.obstacles.push({x:-2,z:1.5,w:1,h:8},{x:2,z:1.5,w:1,h:8});
 const times:number[]=[];let minimumEdge=Infinity;
 for(let i=0;i<600;i++){
  w.tick++;w.time+=1/60;
  if(scenario==='moving'){w.marchDirection={x:1,z:0};w.anchor.x=w.time*2;w.anchorMovingFor=w.time;w.anchorStoppedFor=0;target.x=w.anchor.x;}
  w.hash.rebuild(w.entities.values());const sequence=u.shotSequence??0;w.updateUnit(u,1/60);
  if((u.shotSequence??0)>sequence)times.push(w.time);minimumEdge=Math.min(minimumEdge,w.edgeDistance(u,target));
 }
 assert.ok(times.length>=8,`${family}/${scenario}: ${times.length} shots`);assert.ok(times[0]<.7,'initial opposite-facing aim must complete');
 for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]+1e-8>=u.attackPeriod,'actual shots never bypass source period');
 if(scenario!=='moving')assert.ok(minimumEdge>3,'cooldown must not march a ranged soldier into melee');
 close(10000-target.hp,times.length*u.weaponDamage*SC2_UNITS[family].attacks);
 assert.equal(w.visualEvents.filter(e=>e.kind==='attack'&&e.entityId===u.id).length,times.length);
 t.diagnostic(JSON.stringify({family,scenario,shots:times.length,first:times[0],minimumEdge,meanInterval:(times.at(-1)!-times[0])/(times.length-1)}));
});

for(const elite of [undefined,'reaper.1','reaper.2','reaper.3'] as const)for(const talented of [false,true])test(`F06 reaper ${elite??'ordinary'} talents=${talented}: stable rates and actual damage`,()=>{
 const w=make();if(talented)w.runConfig!.frozenTalents.levels={'T-S01':3,'T-M01':3,'T-M02':3,'T-M03':3,'T-M04':2,'T-M05':3,'T-M06':2};
 const u=w.addUnit('reaper','terran',0,0),target=w.addUnit('roach','zerg',0,4);if(elite){u.eliteId=elite as EliteId;u.modelKey=ELITES[elite].model;w.refreshStats(u,true);}
 target.hp=target.maxHp=10000;target.armor=0;const expected={period:u.attackPeriod,range:u.attackRange,damage:u.weaponDamage},shots:number[]=[];
 for(let i=0;i<360;i++){w.tick++;w.time+=1/60;w.anchorStoppedFor=1;w.hash.rebuild(w.entities.values());const old=u.shotSequence??0;w.updateUnit(u,1/60);if((u.shotSequence??0)>old)shots.push(w.time);}
 assert.ok(shots.length>=7);for(let i=1;i<shots.length;i++)assert.ok(shots[i]-shots[i-1]+1e-8>=expected.period);
 for(let n=0;n<10;n++)w.refreshStats(u);close(u.attackPeriod,expected.period);close(u.attackRange,expected.range);close(u.weaponDamage,expected.damage);
 assert.ok(target.hp<10000);assert.equal(w.visualEvents.filter(e=>e.kind==='attack'&&e.entityId===u.id).length,shots.length);
});

test('F06 cliff traversal suspends reaper fire and resumes after legal landing; marine cannot jump',()=>{
 const w=new World({race:'terran',terrain:new CharTerrain(),waves:false,sandbox:true,obstacles:[]});w.start();w.entities.clear();
 const u=w.addUnit('reaper','terran',22.5,8),marine=w.addUnit('marine','terran',22.5,5),to={x:25.5,z:8};
 assert.equal(tickCliffTraversal(w,marine,{x:25.5,z:5},1/60),false);assert.ok(tickCliffTraversal(w,u,to,1/60));
 const target=w.addUnit('roach','zerg',28.5,8);target.hp=target.maxHp=10000;target.armor=0;w.anchor.x=25.5;w.anchor.z=8;w.anchorStoppedFor=1;
 for(let i=0;i<29;i++){w.time+=1/60;w.hash.rebuild(w.entities.values());w.updateUnit(u,1/60);assert.equal(u.shotSequence??0,0);assert.equal(u.x,22.5);}
 for(let i=0;i<180;i++){w.tick++;w.time+=1/60;w.hash.rebuild(w.entities.values());w.updateUnit(u,1/60);}
 assert.ok(u.x>24);assert.equal(u.cliffTransit,undefined);assert.ok((u.shotSequence??0)>=3);assert.ok(w.terrain!.canOccupy(u,u.unitRadius));
});

test('F06 illegal air target and target lost during windup do not create phantom reaper shots',()=>{
 const w=make(),u=w.addUnit('reaper','terran',0,0),air=w.addUnit('mutalisk','zerg',0,3);w.hash.rebuild(w.entities.values());
 assert.equal(w.findTarget(u,7),undefined);assert.equal(w.canFireAt(u,air),false);w.fire(u,air);assert.equal(u.shotSequence??0,0);
 const ground=w.addUnit('roach','zerg',0,3);u.facing=u.attackFacing=0;w.hash.rebuild(w.entities.values());w.time=.1;w.updateUnit(u,1/60);assert.ok(u.windup>0);ground.hp=0;
 w.time+=1/60;w.updateUnit(u,1/60);assert.equal(u.shotSequence??0,0);assert.equal(u.pendingTarget,null);
});

test('F06 reaper source profile stays locked while approved hits become six',()=>{
 const w=make(),u=w.addUnit('reaper','terran',0,0),target=w.addUnit('roach','zerg',0,3);
 close(u.attackRange,5);close(u.attackPeriod,1.1/1.4/1.15);close(u.weaponDamage,6*1.15);assert.equal(SC2_UNITS.reaper.attacks,2);
 target.hp=target.maxHp=1000;target.armor=3;w.fire(u,target);close(target.hp,1000-(6*1.15-3)*2);
 assert.equal(u.shotSequence,1);assert.equal(w.visualEvents.filter(e=>e.kind==='attack'&&e.entityId===u.id).length,1);
});

test('F06 diagnostic is bounded, records real shots and leaves saved simulation bytes unchanged',()=>{
 const run=(enabled:boolean)=>{const w=make(),u=w.addUnit('reaper','terran',0,0),target=w.addUnit('roach','zerg',0,3);target.hp=target.maxHp=10000;target.armor=0;
  const diagnostics=enabled?installShotDiagnostics(w):undefined;diagnostics?.setEnabled(true);
  for(let i=0;i<900;i++){w.tick++;w.time+=1/60;w.anchorStoppedFor=1;w.hash.rebuild(w.entities.values());w.updateUnit(u,1/60);}
  const report=diagnostics?.report();if(report){assert.ok(report.rows.length<=600);assert.ok(report.units.length<=16);assert.ok(report.units[0].shots>=15);assert.ok(report.rows.some(r=>r.reason==='shot'&&Math.abs((r.damage??0)-12*1.15)<1e-6));assert.ok(report.rows.some(r=>r.reason==='cooldown'));}
  diagnostics?.dispose();return w.captureRun();
 };
 assert.deepEqual(run(true),run(false));
});
