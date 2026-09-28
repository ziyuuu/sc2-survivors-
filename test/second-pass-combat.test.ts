import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {SC2_UNITS} from '../src/data/sc2-units';
import {ELITES} from '../src/data/elites';

for(const elite of [undefined,'reaper.1','reaper.2','reaper.3'] as const)test(`second pass ${elite??'reaper'} can retarget after a squadmate kills its aim target`,()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();
 const u=w.addUnit('reaper','terran',0,0),peer=w.addUnit('tank','terran',1,0),first=w.addUnit('roach','zerg',0,4),second=w.addUnit('roach','zerg',.5,4);
 if(elite){u.eliteId=elite;u.modelKey=ELITES[elite].model;w.refreshStats(u,true);}
 u.facing=u.attackFacing=0;w.anchorStoppedFor=1;w.hash.rebuild(w.entities.values());u.attackTarget=first.id;u.thinkAt=Infinity;
 w.updateUnit(u,1/60);assert.ok(u.windup>0);first.hp=0;peer.attackTarget=second.id;
 for(let i=0;i<12;i++){w.tick++;w.time+=1/60;w.hash.rebuild(w.entities.values());w.updateUnit(u,1/60);}
 assert.ok((u.shotSequence??0)>0,'cancelled aim must not consume a full shot cooldown');
 const shotAt=u.lastShotAt,period=u.attackPeriod;for(let i=0;i<10;i++){w.time+=1/60;w.updateUnit(u,1/60);}assert.ok(u.lastShotAt===shotAt||u.lastShotAt-shotAt+1e-8>=period,'real shots still respect their period');
});

test('second pass reaper closes toward a visible squad target beyond its firing range',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();
 const u=w.addUnit('reaper','terran',0,0),peer=w.addUnit('tank','terran',0,1),enemy=w.addUnit('roach','zerg',0,10);
 enemy.hp=enemy.maxHp=10000;peer.attackTarget=enemy.id;w.anchorStoppedFor=1;
 for(let i=0;i<240;i++){w.tick++;w.time+=1/60;w.hash.rebuild(w.entities.values());w.updateUnit(u,1/60);}
 assert.ok((u.shotSequence??0)>0,'must approach the squad target and fire rather than remain in formation');
 assert.ok(w.edgeDistance(u,enemy)<=u.attackRange+.1);
});

test('second pass a ranged soldier already able to fire holds during cooldown instead of reforming',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();
 const u=w.addUnit('reaper','terran',2,0),peer=w.addUnit('marine','terran',-1,0),enemy=w.addUnit('roach','zerg',0,4);
 u.attackTarget=peer.attackTarget=enemy.id;u.weaponCooldown=.6;u.nextShotAt=1;w.anchorStoppedFor=1;
 w.hash.rebuild(w.entities.values());w.updateUnit(u,1/60);
 assert.equal(u.x,2);assert.equal(u.z,0);assert.deepEqual(u.velocity,{x:0,z:0});
});

for(const stage of [1,2,3])for(const difficulty of ['easy','normal'] as const)test(`second pass marine actual World stage ${stage} ${difficulty}`,t=>{
 const w=new World({race:'terran',difficulty,waves:false,terrain:false,obstacles:[],seed:928});w.start();w.stage=stage;w.entities.clear();w.pods=[];
 const u=w.addUnit('marine','terran',0,0),enemy=w.addUnit('zergling','zerg',0,5.6);u.facing=u.attackFacing=0;
 const hp=enemy.hp,shots:number[]=[];let seq=0;
 for(let n=0;n<600&&u.hp>0&&enemy.hp>0;n++){
  if(difficulty==='normal')w.input={x:0,z:w.edgeDistance(u,enemy)<3?-1:0};
  w.step();if((u.shotSequence??0)>seq){seq=u.shotSequence??0;shots.push(w.time);}
 }
 assert.equal(u.weaponDamage,6*1.15);assert.equal(u.attackRange,5);assert.equal(u.attackPeriod,SC2_UNITS.marine.attackPeriod/1.15);
 assert.ok(shots.length>0);t.diagnostic(JSON.stringify({stage,difficulty,enemyHP:hp,shots,marineHP:u.hp,enemyRemaining:enemy.hp}));
});

for(const mixed of [false,true])for(const moving of [false,true])test(`second pass reaper actual World mixed=${mixed} moving=${moving}`,t=>{
 const w=new World({race:'terran',waves:false,sandbox:true,terrain:false,obstacles:[],seed:928});w.start();w.entities.clear();
 const u=w.addUnit('reaper','terran',0,0);if(mixed)w.addUnit('marine','terran',-1,0);
 const enemy=w.addUnit('roach','zerg',0,4);enemy.hp=enemy.maxHp=10000;enemy.weaponDamage=0;
 const times:number[]=[];let seq=0;
 for(let n=0;n<300;n++){if(moving)w.input={x:.3,z:0};w.step();if((u.shotSequence??0)>seq){seq=u.shotSequence??0;times.push(w.time);}}
 assert.ok(times.length>=4,`deadlock: ${times.length} shots; ${JSON.stringify({x:u.x,z:u.z,target:u.attackTarget,windup:u.windup,cooldown:u.weaponCooldown})}`);
 t.diagnostic(JSON.stringify({mixed,moving,shots:times.length,first:times[0],last:times.at(-1)}));
});
