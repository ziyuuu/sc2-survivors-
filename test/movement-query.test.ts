import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {EngagementSlots} from '../src/simulation/formation/engagement';
import {SquadFormation} from '../src/simulation/formation/squad';
import {CharTerrain} from '../src/data/terrain';
import {cliffLanding,legalCliffCrossing} from '../src/simulation/movement/native-traversal';
import {eliteAfterHit} from '../src/simulation/combat/terran-elite-runtime';
const make=()=>{const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[],seed:529});w.start();w.entities.clear();w.hive=null;return w;};
test('engagement cache responds to same-time eligibility, range, flight and roster changes',()=>{
 const changes=[(u:any)=>u.hp=0,(u:any)=>u.weaponDamage=0,(u:any)=>u.mode='siege',(u:any)=>u.modeTimer=1,(u:any)=>u.nativeMode='lurker_burrowed',(u:any)=>u.attackTarget=null,(u:any)=>u.attackRange+=1,(u:any)=>u.flying=true];
 for(const change of changes){const w=make(),u=w.addUnit('marine','terran',0,0),v=w.addUnit('zealot','terran',1,0),t=w.addUnit('roach','zerg',0,6),allies=[u,v],slots=new EngagementSlots();u.attackTarget=v.attackTarget=t.id;
  const goal=(s:EngagementSlots)=>s.goal(u,t,allies,w.anchor,0,w.mapHalf,[],undefined);
  goal(slots);change(v);assert.deepEqual(goal(slots),goal(new EngagementSlots()));allies.reverse();assert.deepEqual(goal(slots),goal(new EngagementSlots()));}
});
test('engagement cache honors target displacement and expiry without changing slot reuse',()=>{
 const w=make(),u=w.addUnit('zealot','terran',0,0),t=w.addUnit('roach','zerg',0,6),s=new EngagementSlots();u.attackTarget=t.id;
 const goal=(x:EngagementSlots,time:number)=>x.goal(u,t,[u],w.anchor,time,w.mapHalf,[],undefined);
 const p=goal(s,0);u.x=2;assert.deepEqual(goal(s,.1),p);assert.deepEqual(goal(s,.41),goal(new EngagementSlots(),.41));t.x+=1;assert.deepEqual(goal(s,.42),goal(new EngagementSlots(),.42));
});
test('squad roster changes and same-time anchor turns invalidate the original slot cache',()=>{
 const w=make(),a=w.addUnit('marine','terran',0,0),b=w.addUnit('tank','terran',1,0),units=[a,b],s=new SquadFormation();
 const plan=(f:SquadFormation)=>{f.plan(units,w.anchor,0,w.mapHalf,[]);return units.map(u=>f.goal(u));};
 plan(s);units.reverse();assert.deepEqual(plan(s),plan(new SquadFormation()));w.anchor.facing=1;assert.deepEqual(plan(s),plan(new SquadFormation()));units.pop();assert.deepEqual(plan(s),plan(new SquadFormation()));
});
test('cliff search rereads moved, dead and newly reserved blockers within the same tick',()=>{
 const w=make();w.terrain=new CharTerrain();const u=w.addUnit('reaper','terran',22.5,8),to={x:25.5,z:8};
 assert.ok(legalCliffCrossing(w,u,to));const b=w.addUnit('roach','zerg',to.x,to.z);assert.equal(legalCliffCrossing(w,u,to),false);b.hp=0;assert.ok(legalCliffCrossing(w,u,to));b.hp=b.maxHp;b.x=40;b.cliffTransit={kind:'jump',from:{x:40,z:8},to,startedAt:0,until:.5};assert.equal(legalCliffCrossing(w,u,to),false);b.cliffTransit=undefined;assert.ok(cliffLanding(w,u,to));
});
test('marauder knockback rereads ground blockers each hit and keeps current contact boundaries',()=>{
 const w=make(),u=w.addUnit('marauder','terran',0,0),t=w.addUnit('roach','zerg',0,3);u.eliteId='marauder.3';w.refreshStats(u,true);t.hp=t.maxHp=1e6;w.random=()=>0;
 eliteAfterHit(w,u,t,1,1,true);assert.ok(t.z>4.9);const blocker=w.addUnit('tank','terran',0,4.5);t.z=3;w.time=2;eliteAfterHit(w,u,t,1,1,true);const held=t.z;assert.ok(held<4.5);blocker.hp=0;t.z=3;w.time=4;eliteAfterHit(w,u,t,1,1,true);assert.ok(t.z>held+.1);
});
