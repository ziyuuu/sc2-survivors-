import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newSupportMine,advanceTrackingMine,TRACKING_MINE,minePlacementLegal} from '../src/simulation/combat/tracking-mines';
import {tickShopSupport} from '../src/simulation/combat/shop-support';
import {CharTerrain} from '../src/data/terrain';
import {blocked,distance} from '../src/simulation/movement/steering';
const make=(race:'terran'|'zerg'|'protoss'='terran',obstacles:any[]=[])=>{const w=new World({race,sandbox:true,waves:false,terrain:false,obstacles});w.start();w.entities.clear();for(const p of Object.values(w.expedition.production))p!.enabled={};tickShopSupport(w);return w;};
test('tracking mine discovers ground only, emerges for .25 seconds and moves at six units/second',()=>{
 const w=make(),m=newSupportMine(w.nextId++,{x:0,z:0}),air=w.addUnit('mutalisk','zerg',1,0),ground=w.addUnit('zergling','zerg',3,0);
 assert.equal(advanceTrackingMine(w,m,[air]),false);assert.equal(m.phase,'buried');assert.equal(advanceTrackingMine(w,m,[ground,air]),false);assert.equal(m.targetId,ground.id);assert.equal(m.phase,'emerging');w.time=.249;advanceTrackingMine(w,m,[ground]);assert.equal(m.point.x,0);w.time=.25;advanceTrackingMine(w,m,[ground]);assert.equal(m.phase,'chasing');assert.ok(Math.abs(m.point.x-.1)<1e-9);assert.equal(TRACKING_MINE.damage,120);
});
test('target identity remains stable, lost targets stop and legal replacement is selected',()=>{
 const w=make(),m=newSupportMine(w.nextId++,{x:0,z:0}),a=w.addUnit('zergling','zerg',3,0),b=w.addUnit('zergling','zerg',0,2);advanceTrackingMine(w,m,[a]);w.time=.25;advanceTrackingMine(w,m,[a,b]);assert.equal(m.targetId,a.id);const p={...m.point};advanceTrackingMine(w,m,[]);assert.deepEqual(m.point,p);assert.equal(m.targetId,null);advanceTrackingMine(w,m,[b]);assert.equal(m.targetId,b.id);
});
test('mine follows a legal detour instead of crossing a wall or triggering through it',()=>{
 const w=make('terran',[{x:1,z:0,w:.4,h:2}]),m=newSupportMine(w.nextId++,{x:0,z:0}),target=w.addUnit('zergling','zerg',2,0);advanceTrackingMine(w,m,[target]);let exploded=false;for(let i=15;i<180;i++){w.time=i/60;exploded=advanceTrackingMine(w,m,[target]);assert.equal(blocked(m.point,.3,w.obstacles),false);if(exploded)break;}assert.ok(exploded,JSON.stringify(m));assert.ok(distance(m.point,target)<=1.2);
 const sealed=make('terran',[{x:1,z:0,w:.4,h:200}]),n=newSupportMine(sealed.nextId++,{x:0,z:0}),other=sealed.addUnit('zergling','zerg',1.1,0);advanceTrackingMine(sealed,n,[other]);sealed.time=.25;assert.equal(advanceTrackingMine(sealed,n,[other]),false);assert.deepEqual(n.point,{x:0,z:0});
});
test('saved emerging and chasing state restores paused without restarting timer or damaging twice',()=>{
 const w=make(),target=w.addUnit('zergling','zerg',3,0);target.hp=target.maxHp=500;const m=newSupportMine(w.nextId++,{x:0,z:0});w.expedition.support.mines=[m];tickShopSupport(w);w.time=.1;const c=make();c.restoreRun(w.captureRun());assert.equal(c.paused,true);assert.deepEqual(c.expedition.support.mines,[m]);tickShopSupport(c);assert.deepEqual(c.expedition.support.mines,[m]);c.paused=false;c.time=.25;tickShopSupport(c);assert.equal(c.expedition.support.mines[0].phase,'chasing');const chasing=make();chasing.restoreRun(c.captureRun());assert.deepEqual(chasing.expedition.support.mines,c.expedition.support.mines);chasing.paused=false;for(let i=0;i<80&&chasing.expedition.support.mines.length;i++){chasing.time+=1/60;tickShopSupport(chasing);}assert.equal(chasing.expedition.support.mines.length,0);assert.equal(chasing.entities.get(target.id)!.hp,380);tickShopSupport(chasing);assert.equal(chasing.entities.get(target.id)!.hp,380);const after=make();after.restoreRun(chasing.captureRun());after.paused=false;tickShopSupport(after);assert.equal(after.entities.get(target.id)!.hp,380);
});
test('race limits, visibility, air targets, decision freeze and mine counts remain unchanged',()=>{
 for(const race of ['terran','zerg','protoss'] as const){const w=make(race);w.expedition.support.levels.mines=3;w.stage++;tickShopSupport(w);assert.equal(w.expedition.support.mines.length,12);const m=newSupportMine(w.nextId++,{x:0,z:0});w.expedition.support.mines=[m];const target=w.addUnit('zergling','zerg',3,0);tickShopSupport(w);assert.equal(m.phase,race==='terran'?'emerging':'buried');if(race!=='terran'){target.x=.5;target.hp=target.maxHp=500;tickShopSupport(w);assert.equal(w.expedition.support.mines.length,0);assert.equal(target.hp,380);}}
 const w=make(),m=newSupportMine(w.nextId++,{x:0,z:0});w.expedition.support.mines=[m];const target=w.addUnit('zergling','zerg',.5,0);target.cloaked=true;tickShopSupport(w);assert.equal(m.phase,'buried');target.cloaked=false;w.paused=true;tickShopSupport(w);assert.equal(m.phase,'buried');
});
test('invalid mine timers, target IDs and duplicate mine IDs fail restore atomically',()=>{
 const w=make();w.expedition.support.mines=[newSupportMine(w.nextId++,{x:0,z:0})];for(const corrupt of [(m:any)=>m.emergeAt=NaN,(m:any)=>m.targetId=-1,(m:any)=>m.phase='teleport']){const snap=w.captureRun();corrupt(snap.state.expedition.support.mines[0]);assert.throws(()=>make().restoreRun(snap),/支援状态/);}const snap=w.captureRun();snap.state.expedition.support.mines.push({...snap.state.expedition.support.mines[0]});assert.throws(()=>make().restoreRun(snap),/支援状态/);
});

test('mine crosses the real Char ramp legally and cannot cut across a cliff',()=>{
 const w=make(),terrain=new CharTerrain();w.terrain=terrain;const m=newSupportMine(w.nextId++,{x:24,z:0}),target=w.addUnit('zergling','zerg',28,0);advanceTrackingMine(w,m,[target]);let hit=false;for(let i=15;i<100;i++){w.time=i/60;const before={...m.point};hit=advanceTrackingMine(w,m,[target]);assert.ok(terrain.canStep(before,m.point,.3));if(hit)break;}assert.ok(hit);assert.ok(terrain.height(m.point)>2);
 const n=newSupportMine(w.nextId++,{x:23,z:6});target.x=25;target.z=6;advanceTrackingMine(w,n,[target]);w.time+=.25;const before={...n.point};assert.equal(advanceTrackingMine(w,n,[target]),false);assert.ok(terrain.canStep(before,n.point,.3));assert.ok(distance(before,n.point)<=.100001);
});

test('invalidated routes release target and prefer reachable replacements; planting rejects occupied footprints',()=>{
 const w=make(),m=newSupportMine(w.nextId++,{x:0,z:0}),a=w.addUnit('zergling','zerg',3,0),b=w.addUnit('zergling','zerg',0,3);advanceTrackingMine(w,m,[a]);w.time=.25;w.obstacles.push({x:1,z:0,w:.4,h:200});assert.equal(advanceTrackingMine(w,m,[a,b]),false);assert.equal(m.targetId,null);assert.deepEqual(m.point,{x:0,z:0});advanceTrackingMine(w,m,[a,b]);assert.equal(m.targetId,b.id);assert.ok(m.point.z>0);assert.equal(minePlacementLegal(w,{x:1,z:0}),false);w.fortifications.set(100,{id:100,x:0,z:0,hp:100,maxHp:100,armor:0,unitRadius:1,flying:false,attributes:[],owner:'terran',kind:'bunker',nextActionAt:0});assert.equal(minePlacementLegal(w,{x:0,z:0}),false);assert.equal(minePlacementLegal(w,{x:0,z:3}),true);
});
