import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {encodeGraph} from '../src/persistence/graph-codec';
import {minimapSource} from '../preview/battle-ui-feedback-20261008/minimap-model';
function arena(){const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();return w;}
const archive=(w:World)=>JSON.stringify(encodeGraph({run:w.captureRun(),profile:w.permanentProfile.exportJSON()}));
test('minimap arena display shares real state and preserves the original terrain, bounds and archive',()=>{
 const w=arena(),before=archive(w),m=minimapSource(w);assert.equal(w.terrain,undefined);assert.ok(m.terrain);assert.equal(m.terrain!.height(w.anchor),0);assert.equal(m.terrain!.isOpen!({x:0,z:0}),true);assert.equal(m.terrain!.isOpen!({x:w.mapHalf+1,z:0}),false);assert.equal(m.entities,w.entities);assert.equal(m.anchor,w.anchor);assert.deepEqual(m.allies(),w.allies());assert.equal(archive(m),before);assert.equal(archive(w),before);assert.throws(()=>{m.paused=true;});assert.equal(w.paused,false);
});
test('minimap commands use the real World and retain the original movement bounds',()=>{
 const w=arena(),m=minimapSource(w);assert.ok(m.issueMove({x:3,z:2}));assert.ok(w.order);assert.equal(m.order,w.order);const before=archive(w);assert.equal(m.issueMove({x:w.mapHalf+1,z:0}),false);assert.equal(archive(w),before);assert.equal(w.terrain,undefined);
});
test('an existing game terrain is passed to the original minimap without an adapter',()=>{
 const terrain=new FlatTerrain(),w=new World({sandbox:true,waves:false,terrain,obstacles:[]});assert.equal(minimapSource(w),w);assert.equal(w.terrain,terrain);
});
