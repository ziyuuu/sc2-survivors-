import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import type {Difficulty} from '../src/data/stages';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {enemySpawnGrowth} from '../src/data/enemy-progression';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';

const difficulties:Difficulty[]=['easy','normal','hard','hell'];
const near=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-8,`expected ${expected}, got ${actual}`);
// Current approved ordinary rank curve replaces the F01 chapter multiplier.
const stages=[1,2,3,4,7,10,13,18];

for(const difficulty of difficulties)test(`F01 ${difficulty}: wave and pod ling HP use current approved spawn profile and survive current archive`,()=>{
 const world=new World({difficulty,terrain:new FlatTerrain(),waves:false});world.start();
 for(const [index,stage] of stages.entries()){
  world.stage=stage;
  const wave=world.addUnit('zergling','zerg',20,20);
  near(wave.maxHp,([18,24,30][stage-1]??35)*enemySpawnGrowth(difficulty,stage,'regular').health);
  const pod=world.spawnPod('marine',{x:10,z:10});
  // A controlled paid-delivery fixture isolates guard stat generation from budget rounding.
  pod.guardTypes=['zergling'];world.landPod(pod);
  const guard=world.entities.get([...pod.guardianIds][0])!;
  near(guard.maxHp,([18,24,30][stage-1]??35)*enemySpawnGrowth(difficulty,stage,'regular').health);
  wave.hp-=3;guard.hp-=2;
  const archive=writeArchive({profile:world.permanentProfile.exportJSON(),run:world.captureRun()});
  const copy=new World({terrain:new FlatTerrain(),waves:false});copy.restoreRun(readArchive(archive).bundle.run!);
  assert.equal(copy.difficulty,difficulty);assert.equal(copy.paused,true);
  near(copy.entities.get(wave.id)!.maxHp,([18,24,30][stage-1]??35)*enemySpawnGrowth(difficulty,stage,'regular').health);
  near(copy.entities.get(wave.id)!.hp,([18,24,30][stage-1]??35)*enemySpawnGrowth(difficulty,stage,'regular').health-3);
  near(copy.entities.get(guard.id)!.maxHp,([18,24,30][stage-1]??35)*enemySpawnGrowth(difficulty,stage,'regular').health);
  near(copy.entities.get(guard.id)!.hp,([18,24,30][stage-1]??35)*enemySpawnGrowth(difficulty,stage,'regular').health-2);
 }
});

test('F01 late-delivery ling guards use the approved actual birth-stage profile',()=>{
 const world=new World({difficulty:'normal',terrain:false,waves:false});world.start();world.stage=2;
 const pod=world.spawnPod('marine',{x:10,z:10});pod.guardTypes=['zergling'];world.stage=4;world.landPod(pod);
 near(world.entities.get([...pod.guardianIds][0])!.maxHp,31.5);
});
