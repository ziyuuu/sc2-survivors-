import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {prepareLabCase} from '../src/diagnostics/fun-lab-cases';
import {markSpecialReady,finishSpecialStage} from '../src/simulation/special-stages/runtime';
import {CROSSING_FORKS,CROSSING_WAVE,CROSSING_WALLS} from '../src/simulation/special-stages/crossing-layout';
import {SpecialTerrain} from '../src/simulation/special-stages/terrain';
import {tickCrossing,tickCrossingGuard} from '../src/simulation/special-stages/crossing';
import {steerGoal,clearLine,distance} from '../src/simulation/movement/steering';
import {teamCardEffects} from '../src/simulation/progression/team-cards';
import {tickExpandedEncounters} from '../src/simulation/encounters/expanded';
import {heldPose,nydusPose} from '../src/render/units/fun-presentation';
import {FUN_NYDUS} from '../src/simulation/encounters/expanded-state';
const fixture=()=>new World({seed:529,waves:false,terrain:new FlatTerrain(),obstacles:[],equipmentAccount:newEquipmentAccount()});

test('maze has two legal entrance routes, solid walls, blocked ground fire and connected exit',()=>{
 const t=new SpecialTerrain('crossing');
 for(const x of [-11,12]){assert.ok(t.walkLine({x,z:42},{x,z:18},.65));let p={x,z:42};for(let i=0;i<1000&&distance(p,{x:0,z:-50})>.2;i++){const q=steerGoal(p,{x:0,z:-50},.65,t.walls,t,56),d=distance(p,q);assert.ok(d>0,'route may not dead-end');const next={x:p.x+(q.x-p.x)/d*Math.min(.4,d),z:p.z+(q.z-p.z)/d*Math.min(.4,d)};assert.ok(t.canStep(p,next,.65));p=next;}assert.ok(p.z<-49);}
 assert.equal(t.canOccupy({x:0,z:31},.1),false);assert.equal(t.canStep({x:-4,z:31},{x:4,z:31},.4),false);assert.equal(t.lineOfFire({x:-4,z:31},{x:4,z:31}),false);assert.equal(t.lineOfFire({x:-4,z:31},{x:4,z:31},true),true);
});
test('each of three fork choices creates one dense wave, then backtracking cannot refill it',()=>{
 const w=fixture();prepareLabCase(w,'special:crossing');markSpecialReady(w);const a=w.specialStages.active!;assert.equal(w.enemyCount(),0);
 for(const [index,z] of CROSSING_FORKS.entries()){
  const side=index%2?1:-1;Object.assign(w.anchor,{x:side*10,z:z+12});for(const u of w.allies())Object.assign(u,{x:side*10,z:z+12});tickCrossing(w);
  assert.equal(a.crossingChoices!.length,index+1);const g=a.crossingGuards![index];assert.equal(g.members.length,CROSSING_WAVE.count);assert.equal(g.members.filter(id=>w.entities.get(id)!.unitType==='roach').length,16);
  for(const id of g.members)w.entities.get(id)!.hp=0;for(let i=0;i<10;i++)tickCrossing(w);assert.equal(a.crossingGuards!.length,index+1);
 }
 assert.deepEqual(a.crossingChoices,[-1,1,-1]);Object.assign(w.anchor,{x:10,z:42});tickCrossing(w);assert.equal(a.crossingGuards!.length,3);assert.equal(w.enemyCount(),0);
 finishSpecialStage(w,'failed');assert.equal(w.obstacles.length,0);assert.equal(w.terrain instanceof SpecialTerrain,false);
});
test('unreached fork lanes do not spawn enemies, and guards stay within their chosen corridor',()=>{
 const w=fixture();prepareLabCase(w,'special:crossing');markSpecialReady(w);const a=w.specialStages.active!;
 for(let i=0;i<120;i++)w.step();assert.equal(w.enemyCount(),0);Object.assign(w.anchor,{x:10,z:42});tickCrossing(w);const g=a.crossingGuards![0],u=w.entities.get(g.members[0])!;
 assert.equal(g.alerted,false);assert.equal(tickCrossingGuard(w,u,1/60),true);u.lastDamagedAt=w.time;tickCrossing(w);assert.equal(g.alerted,true);assert.equal(tickCrossingGuard(w,u,1/60),false);
});
test('reinforced practice stats survive native refresh and retry while ordinary and dodge starts remain unbuffed',()=>{
 const w=fixture();w.start();assert.equal(teamCardEffects(w.expedition).damage,0);prepareLabCase(w,'mission:escort');const ids=w.allies().map(u=>u.id),before=w.allies().map(u=>[u.maxHp,u.weaponDamage]);
 assert.equal(ids.length,12);assert.ok(w.allies().every(u=>u.rank===5));assert.ok(teamCardEffects(w.expedition).damage>1);for(const u of w.allies())w.refreshStats(u);assert.deepEqual(w.allies().map(u=>[u.maxHp,u.weaponDamage]),before);
 prepareLabCase(w,'mission:escort');assert.equal(w.allies().length,12);assert.deepEqual(w.allies().map(u=>[u.maxHp,u.weaponDamage]),before);prepareLabCase(w,'special:dodge');assert.equal(w.allies().length,4);assert.equal(teamCardEffects(w.expedition).damage,0);
 prepareLabCase(w,'fun:infectedTerrans');assert.ok(w.allies().every(u=>!['medivac','science_vessel'].includes(u.unitType)));prepareLabCase(w,'fun:infectedTerrans:heal');assert.ok(w.allies().some(u=>u.unitType==='medivac'));
});
test('eruption swallows every selected seat immediately while birth and digestion run concurrently',()=>{
 const w=fixture();prepareLabCase(w,'fun:devourer');const m=w.encounters.expanded.short!,pit=w.entities.get(m.actors[0])!,held=m.held.flatMap(s=>s.ids).map(id=>w.entities.get(id)!);
 assert.equal(m.phase,'rescue');assert.equal(m.clock,0);assert.ok(m.held.every(s=>s.swallowed));assert.ok(held.every(u=>u.heldBy===m.id&&!w.allies().includes(u)));assert.equal(nydusPose(w,pit)?.clip,'Birth');assert.ok(heldPose(w,held[0]));
 for(let i=0;i<FUN_NYDUS.pickupTicks;i++)tickExpandedEncounters(w);assert.equal(heldPose(w,held[0]),null);assert.equal(nydusPose(w,pit)?.clip,'Birth');assert.equal(m.clock,FUN_NYDUS.pickupTicks);
 for(let i=m.clock;i<1799;i++)tickExpandedEncounters(w);assert.ok(held.every(u=>u.hp>0));tickExpandedEncounters(w);assert.equal(m.phase,'departing');assert.ok(held.every(u=>u.hp<=0));
});
