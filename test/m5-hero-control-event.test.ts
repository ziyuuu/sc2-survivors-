import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';

test('Vorazun control emits one impact for the real stopped target and does not repeat it',()=>{
 const w=new World({race:'protoss',sandbox:true,waves:false,terrain:false,obstacles:[]});
 assert.equal(w.start(),true);w.entities.clear();w.heroes.clear();
 assert.equal(w.acquireHero('vorazun'),true);
 const source=w.heroEntity('vorazun')!;source.x=source.z=0;
 const target=w.addUnit('roach','zerg',3,0);target.hp=target.maxHp=10000;
 w.hash.rebuild(w.entities.values());
 assert.equal(w.castHero('vorazun'),true);
 const castId=w.visualEvents.find(event=>event.kind==='skill-launch'&&event.heroId==='vorazun')?.castId;
 assert.ok(castId);
 w.time=.25;resolveExpeditionHeroCasts(w);
 assert.ok((target.stoppedUntil??0)>w.time);
 assert.equal(w.visualEvents.filter(event=>event.kind==='skill-impact'&&event.castId===castId).length,1);
 resolveExpeditionHeroCasts(w);
 assert.equal(w.visualEvents.filter(event=>event.kind==='skill-impact'&&event.castId===castId).length,1);
});
