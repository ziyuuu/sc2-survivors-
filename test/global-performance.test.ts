import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceEventIndex,SourceEventIndex} from '../src/render/effects/source/event-index';
import type {VisualEvent} from '../src/simulation/types';

test('audio and effects share immutable receipts until append, pruning or restore',()=>{
 const a={kind:'attack',entityId:1,serial:1,time:1} as VisualEvent;
 const b={kind:'hit',entityId:2,hitSourceId:1,serial:2,time:1} as VisualEvent;
 const events=[a,b],initial=sourceEventIndex(events);
 assert.equal(sourceEventIndex(events),initial);
 events.push({...b,serial:3});
 const appended=sourceEventIndex(events);assert.notEqual(appended,initial);assert.equal(appended.duplicate(events[2]),true);
 events.shift();events.push({...a,time:2,serial:4});
 const pruned=sourceEventIndex(events);assert.notEqual(pruned,appended);assert.equal(pruned.attack(1,1),undefined);
 const restored=structuredClone(events);assert.notEqual(sourceEventIndex(restored),pruned);
 assert.deepEqual(sourceEventIndex(restored),new SourceEventIndex(restored));
 events.length=0;assert.equal(sourceEventIndex(events).attack(1,2),undefined);
});
