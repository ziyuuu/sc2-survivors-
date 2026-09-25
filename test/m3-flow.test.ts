import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RunSession} from '../src/app/run-session';
import {writeArchive} from '../src/persistence/archive';

const world=(race:'terran'|'zerg'|'protoss'='terran',difficulty:'easy'|'normal'|'hard'|'hell'='normal')=>new World({race,difficulty,sandbox:true,waves:false,terrain:false,obstacles:[],seed:53});
test('new-run preview and readiness token leave the previous slot untouched until one commit',()=>{
 const previous=world();assert.ok(previous.start());const old=previous.captureRun();
 const live=world(),session=new RunSession(live,null,{run:old,archiveProfile:previous.permanentProfile.exportJSON(),savedAt:1,notice:''});
 const ticket=session.prepareNewRun('zerg','easy',0,null);assert.equal(live.phase,'menu');assert.equal(session.canResume,true);
 assert.equal(session.commitNewRun(ticket.id,'new:ready','new:other'),false);assert.equal(live.phase,'menu');assert.equal(session.canResume,true);
 assert.equal(session.commitNewRun(ticket.id,'new:ready','new:ready'),true);assert.equal(live.expedition.race,'zerg');assert.equal(live.difficulty,'easy');assert.equal(live.runConfig?.difficulty,'easy');assert.equal(session.canResume,false);
 assert.equal(session.commitNewRun(ticket.id,'new:ready','new:ready'),false);
});
test('load preview and cancel are read-only; confirmed load keeps archived race and difficulty',()=>{
 const saved=world('protoss','hard');assert.ok(saved.start());saved.advance(2);const raw=writeArchive({profile:saved.permanentProfile.exportJSON(),run:saved.captureRun()});
 const live=world('terran','easy'),session=new RunSession(live,null,{run:null,savedAt:0,notice:''});live.setDifficulty('hell');
 const preview=session.prepareLoad(raw);assert.match(preview.summary,/神族／困难/);assert.equal(live.phase,'menu');assert.equal(live.difficulty,'hell');
 session.cancelPreparedLoad();assert.equal(session.commitLoad(preview.id,'load:ready','load:ready'),false);
 const second=session.prepareLoad(raw);assert.equal(session.commitLoad(second.id,'load:ready','load:other'),false);assert.equal(live.difficulty,'hell');
 assert.equal(session.commitLoad(second.id,'load:ready','load:ready'),true);assert.equal(live.difficulty,'hard');assert.equal(live.expedition.race,'protoss');assert.equal(live.paused,true);assert.equal(live.runConfig?.difficulty,'hard');
 assert.equal(session.commitLoad(second.id,'load:ready','load:ready'),false);
});
test('all three races and four archived difficulties survive opposite new-game defaults',()=>{
 for(const race of ['terran','zerg','protoss'] as const)for(const difficulty of ['easy','normal','hard','hell'] as const){
  const saved=world(race,difficulty);assert.ok(saved.start());saved.advance(1);
  const raw=writeArchive({profile:saved.permanentProfile.exportJSON(),run:saved.captureRun()});
  const live=world(race==='terran'?'protoss':'terran',difficulty==='easy'?'hell':'easy');live.setDifficulty(difficulty==='easy'?'hell':'easy');
  const session=new RunSession(live,null,{run:null,savedAt:0,notice:''}),preview=session.prepareLoad(raw);
  assert.match(preview.summary,/第1关/);
  assert.equal(session.commitLoad(preview.id,'load:ready','load:ready'),true);
  assert.equal(live.expedition.race,race);assert.equal(live.difficulty,difficulty);assert.equal(live.runConfig?.difficulty,difficulty);assert.equal(live.paused,true);
  assert.equal(live.captureRun().state.difficulty,difficulty);
 }
});
