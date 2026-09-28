import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import type {Difficulty} from '../src/data/stages';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';

const difficulties:Difficulty[]=['easy','normal','hard','hell'];
const near=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-8,`expected ${expected}, got ${actual}`);
// Literal fixtures preserve the approved early base HP and six-chapter growth.
const health:Record<Difficulty,readonly number[]>={
 easy:[18,24,30,37.1,39.9,44.1,49,54.25],
 normal:[18,24,30,39.2,44.8,53.2,63,73.5],
 hard:[19.8,26.4,33,45.472,54.656,68.096,84.42,102.9],
 hell:[19.8,26.4,33,47.824,60.48,79.8,103.95,132.3],
};
const stages=[1,2,3,4,7,10,13,18];

for(const difficulty of difficulties)test(`F01 ${difficulty}: wave and pod ling HP retain early baseline and survive current archive`,()=>{
 const world=new World({difficulty,terrain:new FlatTerrain(),waves:false});world.start();
 for(const [index,stage] of stages.entries()){
  world.stage=stage;
  const wave=world.addUnit('zergling','zerg',20,20);
  near(wave.maxHp,health[difficulty][index]);
  const pod=world.spawnPod('marine',{x:10,z:10});
  // A controlled paid-delivery fixture isolates guard stat generation from budget rounding.
  pod.guardTypes=['zergling'];world.landPod(pod);
  const guard=world.entities.get([...pod.guardianIds][0])!;
  near(guard.maxHp,health[difficulty][index]);
  wave.hp-=3;guard.hp-=2;
  const archive=writeArchive({profile:world.permanentProfile.exportJSON(),run:world.captureRun()});
  const copy=new World({terrain:new FlatTerrain(),waves:false});copy.restoreRun(readArchive(archive).bundle.run!);
  assert.equal(copy.difficulty,difficulty);assert.equal(copy.paused,true);
  near(copy.entities.get(wave.id)!.maxHp,health[difficulty][index]);
  near(copy.entities.get(wave.id)!.hp,health[difficulty][index]-3);
  near(copy.entities.get(guard.id)!.maxHp,health[difficulty][index]);
  near(copy.entities.get(guard.id)!.hp,health[difficulty][index]-2);
 }
});

test('F01 late-delivery ling guards use their saved departure stage rather than current stage',()=>{
 const world=new World({difficulty:'normal',terrain:false,waves:false});world.start();world.stage=2;
 const pod=world.spawnPod('marine',{x:10,z:10});pod.guardTypes=['zergling'];world.stage=4;world.landPod(pod);
 near(world.entities.get([...pod.guardianIds][0])!.maxHp,24);
});
