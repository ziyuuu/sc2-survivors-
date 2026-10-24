import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {prepareLabCase} from '../src/diagnostics/fun-lab-cases';
import {markSpecialReady} from '../src/simulation/special-stages/runtime';
import {revealCrossingFog,crossingExplored} from '../src/simulation/special-stages/crossing-fog';
import {releaseMissionQueue,tickMissions,missionBodies} from '../src/simulation/missions/runtime';
import {escortSpawnClear} from '../src/simulation/missions/escort-spawn';
import {crossingExitDirection} from '../src/simulation/special-stages/crossing';
const fixture=()=>new World({seed:529,waves:false,terrain:new FlatTerrain(),obstacles:[],equipmentAccount:newEquipmentAccount()});
test('exit intent keeps the rear ranks marching after the anchor overshoots, including repeated exit commands',()=>{
 const w=fixture();prepareLabCase(w,'special:crossing');markSpecialReady(w);Object.assign(w.anchor,{x:0,z:-51.2});w.issueMove({x:0,z:-51});
 assert.deepEqual(crossingExitDirection(w,{x:0,z:-51}),{x:0,z:-1});w.issueMove({x:0,z:-51});assert.deepEqual(crossingExitDirection(w,{x:0,z:-51}),{x:0,z:-1});
 w.issueMove({x:0,z:-42});assert.equal(crossingExitDirection(w,{x:0,z:-42}),null);w.issueMove({x:12,z:-51});assert.equal(crossingExitDirection(w,{x:12,z:-51}),null);
});
test('a dodge collision emits native baneling death at the collision position, including contacts during grace',()=>{
 const w=fixture();prepareLabCase(w,'special:dodge');markSpecialReady(w);const a=w.specialStages.active!;
 for(let i=0;i<2;i++){
  const u=w.addUnit('baneling','zerg',w.anchor.x,w.anchor.z-1),before=w.visualEvents.length;
  a.barrage.push({id:u.id,x:u.x,z:u.z,vx:0,vz:60,radius:.42,hit:false,born:a.clock});w.step();
  const event=w.visualEvents.slice(before).find(e=>e.kind==='death'&&e.entityId===u.id);assert.ok(event);assert.equal(event.unitType,'baneling');assert.equal(event.z,w.anchor.z);assert.equal(w.entities.has(u.id),false);assert.equal(w.effects.some(e=>e.kind==='explosion'),false);
 }
 assert.equal(a.hits,1);
});
test('fog hides unexplored ground and enemies, respects walls, remembers exploration and survives a cloned active state',()=>{
 const w=fixture();prepareLabCase(w,'special:crossing');markSpecialReady(w);const a=w.specialStages.active!;
 assert.equal(crossingExplored(w,{x:0,z:48}),true);assert.equal(crossingExplored(w,{x:12,z:0}),false);
 const enemy=w.addUnit('roach','zerg',12,0);assert.equal(w.visibleTo(enemy,'terran'),false);for(const u of w.allies())Object.assign(u,{x:-8,z:0});revealCrossingFog(w);
 assert.equal(crossingExplored(w,{x:8,z:0}),false);assert.equal(crossingExplored(w,{x:-8,z:0}),true);
 for(const u of w.allies())Object.assign(u,{x:12,z:0});revealCrossingFog(w);assert.equal(w.visibleTo(enemy,'terran'),true);assert.equal(crossingExplored(w,{x:-8,z:0}),true);
 const before=structuredClone(a.crossingFog);a.crossingFog=structuredClone(a.crossingFog);revealCrossingFog(w);assert.deepEqual(a.crossingFog,before);
});
test('escort births keep worker clearance, relocate stale queues and retain the full 30/10 batch with at most eight births per tick',()=>{
 const w=fixture();prepareLabCase(w,'mission:escort');const m=w.missions.active!;m.phase='active';m.age=m.nextSpawn;
 tickMissions(w);assert.equal(m.enemyIds.length,8);assert.equal(m.queue.length,32);let types=m.enemyIds.map(id=>w.entities.get(id)!.unitType);
 for(const id of m.enemyIds)assert.ok(escortSpawnClear(w,w.entities.get(id)!,w.entities.get(id)!.unitRadius));
 const worker=missionBodies(w).find(b=>b.role==='worker')!,old={...m.queue[0].point};Object.assign(worker,old);
 while(m.queue.length){const n=m.enemyIds.length;releaseMissionQueue(w);assert.ok(m.enemyIds.length>n&&m.enemyIds.length-n<=8);for(const id of m.enemyIds.slice(n)){const u=w.entities.get(id)!;assert.ok(escortSpawnClear(w,u,u.unitRadius));types.push(u.unitType);}}
 assert.equal(types.length,40);assert.equal(types.filter(t=>t==='zergling').length,30);assert.equal(types.filter(t=>t==='baneling').length,10);
});
