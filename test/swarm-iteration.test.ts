import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {rankStats} from '../src/data/ranks';
import {SC2_UNITS} from '../src/data/sc2-units';
import {enemySpawnGrowth,ordinaryEnemyRank} from '../src/data/enemy-progression';
import {newSwarmState,planSwarm,SWARM_TYPES} from '../src/data/swarm';
import {endlessWaveTemplate,endlessEconomicEvents,nextEndlessExpansion} from '../src/data/endless';
import {setDiagnosticHealthLock,diagnosticHealthLock} from '../src/diagnostics/combat-lock';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {EngagementSlots} from '../src/simulation/formation/engagement';
import {CharTerrain} from '../src/data/terrain';
import {sourceDetails} from '../src/simulation/combat/expedition-combat';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('landing guards obey capacity, retain pending bodies through save and block receipt',()=>{
 const w=new World({waves:false,terrain:new CharTerrain(),obstacles:[]});w.start();
 for(let i=0;i<300;i++)w.addUnit('zergling','zerg',15,15);
 const pod=w.spawnPod('marine',{x:8,z:0});pod.guardTypes=['zergling','roach'];w.landPod(pod);
 assert.equal(w.enemyCount(),300);assert.equal(pod.guardianIds.size,0);w.updatePods();assert.equal(pod.status,'active');
 const copy=new World({waves:false,terrain:new CharTerrain(),obstacles:[]});copy.restoreRun(w.captureRun());copy.paused=false;
 const restored=copy.pods.find(p=>p.id===pod.id)!;const first=[...copy.entities.values()].find(e=>e.owner==='zerg')!;first.hp=0;
 copy.updatePods();assert.equal(copy.enemyCount(),300);assert.equal(restored.guardianIds.size,1);
 copy.landPod(restored);assert.equal(restored.guardianIds.size,1,'repeated landing does not duplicate guards');
 restored.hp=0;copy.updatePods();assert.equal(restored.status,'destroyed');
 [...copy.entities.values()].find(e=>e.owner==='zerg'&&e.hp>0)!.hp=0;copy.updatePods();assert.equal(copy.enemyCount(),300);assert.equal(restored.guardianIds.size,2,'destroyed carrier does not discard pending guards');
});
test('ordinary release reserves campaign Boss capacity without deleting queued bodies',()=>{
 const w=new World({waves:true,terrain:false,obstacles:[]});w.start();w.stage=18;w.stageStartedAt=0;w.prepareStage();
 const remaining=300-1;for(let i=0;i<remaining;i++)w.addUnit('zergling','zerg',15,15);
 const pod=w.spawnPod('marine',{x:8,z:0});pod.guardTypes=['zergling'];w.landPod(pod);assert.equal(pod.guardianIds.size,0);
 w.stageElapsed=45;w.tick=2700;w.time=45;w.step();
 assert.equal(w.enemyCount(),300);assert.ok([...w.entities.values()].some(e=>e.enemyTier==='boss'&&e.unitType==='ultralisk'));
 assert.equal(pod.guardianIds.size,0);assert.ok(w.swarm.pending.length>0);
});
for(const difficulty of ['easy','normal','hard','hell'] as const)test(`spawn rank and frozen HP ${difficulty}`,()=>{
 const w=new World({difficulty,waves:false,terrain:false,obstacles:[]});w.start();
 for(const stage of [1,2,3,4,6,7,12,13,18]){w.stage=stage;const u=w.addUnit('zergling','zerg',0,8),g=enemySpawnGrowth(difficulty,stage,'regular');
  close(u.hp,([18,24,30][stage-1]??35)*g.health);assert.equal(u.rank,ordinaryEnemyRank(stage));u.hp-=2;const before=[u.hp,u.maxHp,u.weaponDamage,u.attackPeriod,u.armor];w.stage=18;w.refreshStats(u);[u.hp,u.maxHp,u.weaponDamage,u.attackPeriod,u.armor].forEach((v,i)=>close(v,before[i]));
 }
 for(const type of SWARM_TYPES){const u=w.addUnit(type,'zerg',0,8,1,'swarm'),d=SC2_UNITS[type];close(u.hp,d.maxHp);close(u.weaponDamage,d.attackDamage);close(u.attackPeriod,d.attackPeriod);close(u.armor,d.armor);assert.equal(u.rank,1);}
});
test('ordinary V has five times direct weapon DPS; easy halves each increment',()=>{
 const g=enemySpawnGrowth('normal',18,'regular',5);close(g.damage*g.attackSpeed,5);close(g.health,4.2);close(g.armor,2);
 const e=enemySpawnGrowth('easy',18,'regular',5);close(e.health,2.6);close(e.armor,1);assert.equal(ordinaryEnemyRank(18,1),3);assert.equal(ordinaryEnemyRank(18,2),3);assert.equal(ordinaryEnemyRank(18,3),4);assert.equal(ordinaryEnemyRank(18,5),5);
});
test('reaper adaptation changes player hits only and composes once with ranks',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();const u=w.addUnit('reaper','terran',0,0,5);close(u.weaponDamage,6*rankStats(5).damage*1.15);assert.equal(SC2_UNITS.reaper.attackDamage,4);close(u.attackRange,5);w.refreshStats(u);close(u.weaponDamage,6*rankStats(5).damage*1.15);
});
test('special enemies do not receive ordinary early reduction or rank curve',()=>{
 const w=new World({difficulty:'easy',waves:false,terrain:false,obstacles:[]});w.start();const elite=w.spawnSpecial('zergling','elite',{x:0,z:9})!;close(elite.hp,18*3);const boss=w.spawnSpecial('zergling','boss',{x:0,z:10})!;close(boss.hp,450);
});
test('swarm totals, saved remainder, idempotent scheduling and fixed composition',()=>{
 const state=newSwarmState();for(let stage=7;stage<=18;stage++)planSwarm(state,stage,'normal',22,(stage-7)*150,150);
 assert.equal(state.planned,1260);assert.equal(state.pending.reduce((n,b)=>n+b.counts.zergling,0),882);assert.equal(state.pending.reduce((n,b)=>n+b.counts.roach,0),252);assert.equal(state.pending.reduce((n,b)=>n+b.counts.baneling,0),126);
 const count=state.pending.length;planSwarm(state,18,'normal',22,1650,150);assert.equal(state.pending.length,count);
 const e=newSwarmState();for(let round=1;round<=9;round++)planSwarm(e,18,'easy',4,(round-1)*60,60,round);assert.equal(e.planned,300);
});
test('sixty-second slices preserve four-minute wave and economy density',()=>{
 const waves=Array.from({length:4},(_,i)=>endlessWaveTemplate(41,i+1,'normal').map(w=>({...w,at:w.at+i*60}))).flat();assert.equal(waves.length,15);assert.equal(waves.at(-1)!.at,224);
 const events=Array.from({length:4},(_,i)=>endlessEconomicEvents(41,i+1)).flat();assert.equal(events.length,6);for(let r=1;r<=8;r++)assert.ok(endlessWaveTemplate(41,r,'normal').every(w=>w.at>=0&&w.at<60));
 assert.equal(nextEndlessExpansion(20),60);assert.equal(nextEndlessExpansion(60),100);assert.equal(nextEndlessExpansion(180),260);
});
for(const type of ['reaper','zealot','zergling','roach','adept','ultralisk'] as const)test(`${type} joins a visible mixed-range fight and fires`,()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],seed:928});w.start();w.entities.clear();const u=w.addUnit(type,'terran',0,0),peer=w.addUnit('tank','terran',-2,0),enemy=w.addUnit('roach','zerg',0,8);enemy.hp=enemy.maxHp=10000;enemy.weaponDamage=0;peer.attackTarget=enemy.id;w.anchorStoppedFor=1;
 for(let n=0;n<480;n++){w.tick++;w.time=w.tick/60;w.hash.rebuild(w.entities.values());w.updateUnit(u,1/60);}
 assert.ok((u.shotSequence??0)>0,JSON.stringify({type,x:u.x,z:u.z,range:u.attackRange,target:u.attackTarget}));
});
test('development-only health lock records real damage without replaying death or entering snapshots',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();const u=w.allies()[0];assert.ok(setDiagnosticHealthLock(w,true));w.hit(u,1000,[],1,'zerg');assert.equal(u.hp,1);assert.equal(u.deadAt,null);assert.equal(diagnosticHealthLock(w).prevented,1);assert.ok(!JSON.stringify(w.captureRun()).includes('prevented'));
 setDiagnosticHealthLock(w,false);w.hit(u,1000,[],1,'zerg');assert.equal(u.hp,0);
});

test('swarm backlog waits behind original waves, stays below cap, survives save and earns normal rewards',()=>{
 const w=new World({waves:false,terrain:new FlatTerrain(),obstacles:[],seed:928});w.start();w.stage=7;w.prepareStage();w.time=5;w.tick=300;w.stageElapsed=5;w.stageStartedAt=0;
 planSwarm(w.swarm,7,'normal',928,0,w.duration);const access=w as any;access.specialPlan=[];
 for(let i=0;i<299;i++)w.addUnit('zergling','zerg',20+i%10,20+Math.floor(i/10));
 access.ambientBacklog=[{type:'roach',at:0,bearing:0}];access.releaseSwarm();assert.equal(w.swarm.spawned,0);
 access.releaseAmbient();access.releaseSwarm();assert.equal(w.swarm.spawned,0);assert.equal([...w.entities.values()].filter(u=>u.team==='enemy'&&u.hp>0).length,300);
 const old=[...w.entities.values()].find(u=>u.team==='enemy')!;old.hp=0;access.releaseSwarm();assert.equal(w.swarm.spawned,1);
 const raw=writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()}),bundle=readArchive(raw),copy=new World({waves:false,terrain:new FlatTerrain(),obstacles:[],seed:928});copy.restoreRun(bundle.bundle.run!);assert.deepEqual(copy.swarm,w.swarm);
 const fodder=[...copy.entities.values()].find(u=>u.enemyOrigin==='swarm')!,count=copy.stats.kills;copy.hit(fodder,1e5,[],1,'terran',.5,0,copy.allies()[0].id);assert.equal(copy.stats.kills,count+1);assert.equal(copy.swarm.kills,1);assert.ok(copy.swarm.minerals>0);assert.equal(copy.swarm.talentChecks,1);
 const invalid=w.captureRun();invalid.state.swarm.pending[0].counts.zergling++;assert.throws(()=>copy.restoreRun(invalid),/虫海数量/);assert.equal(copy.swarm.kills,1);
});

test('a crowded melee contact ring is marked temporarily unavailable without moving into target center',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();const target=w.addUnit('roach','zerg',0,0),units=Array.from({length:18},(_,i)=>w.addUnit('zealot','terran',10+i,0));for(const u of units)u.attackTarget=target.id;
 const slots=new EngagementSlots(),blocked=units.filter(u=>{const goal=slots.goal(u,target,units,{x:0,z:0},1,76,[],undefined);assert.ok(Math.hypot(goal.x-target.x,goal.z-target.z)>target.unitRadius);return slots.unavailable(u.id,target.id,1);});
 assert.ok(blocked.length>0);assert.equal(slots.unavailable(blocked[0].id,target.id,2),false);
});

test('diagnostic health lock never protects delivery carriers or fortifications',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();setDiagnosticHealthLock(w,true);const pod=w.spawnPod('marine',{x:8,z:8});
 w.hit(pod,1e5,[],1,'zerg');assert.equal(pod.hp,0);assert.equal(diagnosticHealthLock(w).prevented,0);
 const fort={id:99999,x:20,z:20,hp:500,maxHp:500,armor:0,unitRadius:1,flying:false,attributes:['Mechanical','Structure'],owner:'terran' as const,team:'player' as const};w.hit(fort,1e5,[],1,'zerg');assert.equal(fort.hp,0);
});

test('ordinary movement stage upgrades are fixed at birth while swarm uses source speed',()=>{
 const w=new World({waves:false,terrain:false,obstacles:[]});w.start();w.stage=8;const old=w.addUnit('baneling','zerg',0,8),speed=old.moveSpeed;w.stage=9;w.refreshStats(old);close(old.moveSpeed,speed);
 const next=w.addUnit('baneling','zerg',0,9),swarm=w.addUnit('baneling','zerg',0,10,1,'swarm');assert.ok(next.moveSpeed>old.moveSpeed);close(swarm.moveSpeed,SC2_UNITS.baneling.movementSpeed*sourceDetails('baneling').creep);
});

test('a nearby target across a cliff does not pin melee in a false firing position',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();const u=w.addUnit('zergling','terran',23.6,8),enemy=w.addUnit('zergling','zerg',24.4,8),terrain=new CharTerrain();u.attackTarget=enemy.id;
 const slots=new EngagementSlots(),goal=slots.goal(u,enemy,[u],u,1,56,[],terrain);
 assert.ok(terrain.lineOfFire(goal,enemy,false,false,true));assert.ok(Math.hypot(goal.x-u.x,goal.z-u.z)>.1);
});

test('capacity-delayed campaign boss survives transition/save and endless specials also respect the cap',()=>{
 const w=new World({difficulty:'normal',waves:false,terrain:new FlatTerrain(),obstacles:[]});w.start();w.stage=3;w.prepareStage();const a=w as any;
 for(let i=0;i<300;i++)w.addUnit('zergling','zerg',20+i%10,20+Math.floor(i/10));
 const boss=a.specialPlan.find((e:any)=>e.tier==='boss');assert.ok(boss);assert.equal(a.spawnCampaignSpecial(boss),undefined);assert.equal(w.spawnSpecial('queen','boss',{x:30,z:30}),undefined);
 a.nextStage();assert.equal(w.stage,4);const deferred=a.specialPlan.find((e:any)=>e.sourceStage===3&&e.tier==='boss');assert.ok(deferred);assert.equal(deferred.at,0);
 const copy=new World({difficulty:'normal',waves:false,terrain:new FlatTerrain(),obstacles:[]});copy.restoreRun(w.captureRun());assert.deepEqual((copy as any).specialPlan,a.specialPlan);
 [...copy.entities.values()].find(e=>e.owner==='zerg')!.hp=0;
 const spawned=(copy as any).spawnCampaignSpecial(deferred);assert.ok(spawned);close(spawned.maxHp,810);close(spawned.specialDamageMultiplier,1);assert.equal(copy.enemyCount(),300);
});

test('blocked guard queues count capacity once instead of scanning all enemies per carrier',()=>{
 const w=new World({waves:false,terrain:false,obstacles:[]});w.start();for(let i=0;i<300;i++)w.addUnit('zergling','zerg',15,15);
 for(let i=0;i<100;i++){const p=w.spawnPod('marine',{x:8,z:0});p.guardTypes=['zergling'];p.status='destroyed';p.hp=0;}
 let calls=0;const count=w.enemyCount.bind(w);w.enemyCount=()=>{calls++;return count();};w.updatePods();
 assert.equal(calls,1);assert.ok(w.pods.every(p=>p.guardianIds.size===0));
});
