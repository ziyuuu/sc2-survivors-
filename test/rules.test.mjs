import test from 'node:test';
import assert from 'node:assert/strict';
import {canAfford,spend} from '../src/simulation/rules.mjs';
test('spending validates both currencies and is atomic', () => { const w={minerals:500,gas:0}; assert.equal(spend(w,{minerals:120,gas:40}),false); assert.deepEqual(w,{minerals:500,gas:0}); });
test('negative cost cannot mint resources', () => assert.throws(() => spend({minerals:1000,gas:1000},{minerals:-1,gas:0})));
test('current wallet spends both costs exactly once',()=>{const w={minerals:120,gas:40};assert.equal(canAfford(w,{minerals:120,gas:40}),true);assert.equal(spend(w,{minerals:120,gas:40}),true);assert.deepEqual(w,{minerals:0,gas:0});assert.equal(spend(w,{minerals:1,gas:0}),false);});
