import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/simulation/world';
import {SourceCombatEffects} from '../src/render/effects/source-combat-effects';
test('a returning Protoss menu cannot request a live Zealot ribbon while source preparation is partial',()=>{
 const w=new World({race:'protoss',terrain:false,sandbox:true,waves:false,obstacles:[]}),effects=new SourceCombatEffects(new THREE.Scene(),new THREE.PerspectiveCamera(),{sourceEventIds:new Set()} as any);
 effects.player.ready=true;const pose=()=>({matrix:new THREE.Matrix4().toArray(),clip:'Stand',seconds:0});
 assert.doesNotThrow(()=>effects.render(w,()=>({x:0,y:0,z:0}),pose));assert.doesNotThrow(()=>effects.render(w,()=>({x:0,y:0,z:0}),pose));
 // Real battle still requires its actual resources; the menu fix cannot hide a missing effect.
 assert.ok(w.start());assert.throws(()=>effects.render(w,()=>({x:0,y:0,z:0}),pose),/Unknown required combat effect Zealot/);
});
