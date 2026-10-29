import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';import {ELITES} from '../src/data/elites';
import {setup} from '../tools/performance-s09-cases.mjs';
const lib={World,ELITES};
for(const id of ['baneling','baneling.1','baneling.2','baneling.3'])test(`${id} autonomously goes around firing allies and attacks again after recovery`,()=>{
 const {w,u,target}=setup(lib,{id,scenario:'mixed-live'}),times:number[]=[];let shots=0,previous={x:u.x,z:u.z};
 for(let i=0;i<900;i++){w.step();assert.ok(Math.hypot(u.x-previous.x,u.z-previous.z)<.2);previous={x:u.x,z:u.z};if((u.shotSequence??0)>shots){shots=u.shotSequence??0;times.push(w.time);assert.equal(u.recoveryUntil,w.time+1.5);}}
 assert.ok(shots>=2);assert.ok(times[0]<5);for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]>=1.5-1e-8);
 assert.equal(u.attackRange,.25);assert.ok(u.hp>0);assert.ok(target.hp<target.maxHp);
});
test('baneling can use another contact position around a dense 24-body formation',()=>{
 const {w,u}=setup(lib,{scenario:'mixed-live',n:24,angle:1.4});for(let i=0;i<900;i++)w.step();assert.ok((u.shotSequence??0)>=2);
});
test('baneling abandons the former target and pursues a new ground target during approach',()=>{
 const {w,u,target}=setup(lib,{scenario:'mixed-live'});for(let i=0;i<60;i++)w.step();target.hp=0;
 const next=w.addUnit('roach','zerg',-4,6);next.hp=next.maxHp=1e6;next.stoppedUntil=1e9;next.weaponDamage=0;
 for(let i=0;i<540;i++)w.step();assert.ok((u.shotSequence??0)>0);assert.ok(next.hp<next.maxHp);
});
test('baneling respects blocking terrain and the absence of ground targets',()=>{
 for(const scenario of ['wall','air-only','move-order']){const {w,u}=setup(lib,{scenario});for(let i=0;i<600;i++)w.step();assert.equal(u.shotSequence??0,0,scenario);}
});
test('temporary hero banelings still explode once and enemy banelings keep their native attack',()=>{
 for(const id of ['temporary','enemy']){const {w,u}=setup(lib,{id,scenario:'mixed'});for(let i=0;i<900;i++)w.step();assert.equal(u.shotSequence,1,id);assert.ok(u.hp<=0);assert.equal(u.recoveryUntil,undefined);}
});
