import test from 'node:test';
import assert from 'node:assert/strict';
import {deathPoseTime} from '../src/render/units/death-clock';
test('long source deaths finish before corpse reclamation; short clips are not slowed',()=>{
 assert.equal(deathPoseTime(5,13.333,5),13.333);
 assert.equal(deathPoseTime(6,10,6),10);
 assert.equal(deathPoseTime(.5,1,1.5),.5);
 assert.equal(deathPoseTime(1.4,1,1.5),1);
 assert.equal(deathPoseTime(-1,10,5),0);
 assert.equal(deathPoseTime(5.4,10,5),10);
});
