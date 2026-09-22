import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FixedStepper} from '../src/simulation/fixed-stepper.ts';
test('variable render intervals preserve every fixed rule tick and drain debt after recovery',()=>{let ticks=0;const s=new FixedStepper(1/60,()=>{ticks++;return true;},()=>0);for(const elapsed of [.01,.03,.1,.2,.66])s.advance(elapsed);while(s.accumulator>1e-8)s.advance(0);assert.equal(ticks,60);assert.ok(s.accumulator<1e-8);});
test('overload yields after its work budget without skipping combat or production time',()=>{let ticks=0,clock=0;const s=new FixedStepper(1/60,()=>{ticks++;clock+=10;return true;},()=>clock);s.advance(1);assert.equal(ticks,1);assert.ok(s.accumulator>.98);for(let i=0;i<59;i++)s.advance(0);assert.equal(ticks,60);assert.ok(s.accumulator<1e-8);});
test('transition stops catch-up immediately and pause reset cannot advance a hidden battle',()=>{let ticks=0;const s=new FixedStepper(1/60,()=>{ticks++;return false;},()=>0);s.advance(2);assert.equal(ticks,1);assert.equal(s.accumulator,0);s.advance(.01);s.reset();s.advance(.01);assert.equal(ticks,1);});
