import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';
import {RunSession} from '../src/app/run-session';
import type {Race} from '../src/data/races';
import type {Difficulty} from '../src/data/stages';
import {RUN_SCHEMA} from '../src/simulation/persistence/run-snapshot';
class MemoryBackend implements SaveBackend {
 slots:(string|null)[]=[null,null,null];fail=false;
 async read(){return [...this.slots];}
 async commit(raw:string){if(this.fail)throw Error('disk full');this.slots=[raw,this.slots[0],this.slots[1]];}
}
test('M1 new archives have one permanent profile, frozen zero talents and preserve 3x4 difficulty',()=>{
 for(const race of ['terran','zerg','protoss'] as Race[])for(const difficulty of ['easy','normal','hard','hell'] as Difficulty[]){
  const w=new World({race,difficulty,terrain:false,waves:false,sandbox:true});w.start();
  const snapshot=w.captureRun(),raw=writeArchive({profile:w.permanentProfile.exportJSON(),run:snapshot});
  assert.equal(JSON.parse(raw).version,2);assert.equal(snapshot.schema,RUN_SCHEMA);
  assert.equal(snapshot.config.rulesId,'mvp-1.0');assert.deepEqual(snapshot.config.frozenTalents.levels,{});
  const parsed=readArchive(raw);assert.deepEqual(Object.keys(parsed.bundle).sort(),['profile','run']);
  const copy=new World({race:'terran',difficulty:'normal',terrain:false,waves:false,sandbox:true});
  copy.restoreRun(parsed.bundle.run!);
  assert.equal(copy.expedition.race,race);assert.equal(copy.difficulty,difficulty);assert.equal(copy.paused,true);
  assert.equal(copy.runConfig?.difficulty,difficulty);
 }
});
test('valid foreign seed restores from RunConfig without changing the candidate during preview',()=>{
 const source=new World({seed:7,race:'zerg',difficulty:'easy',terrain:false,waves:false,sandbox:true});source.start();source.advance(1);const snap=source.captureRun(),target=new World({seed:89241,terrain:false,waves:false,sandbox:true});target.start();const before=target.captureRun();target.restoreRun(snap,true);assert.deepEqual(target.captureRun(),before);
 target.restoreRun(snap);assert.equal(target.runConfig!.seed,7);assert.equal(target.captureRun().seed,7);assert.equal(target.rngState,snap.state.rngState);assert.equal(target.difficulty,'easy');assert.equal(target.paused,true);assert.deepEqual(target.runConfig!.frozenTalents,snap.config.frozenTalents);
 const invalid=structuredClone(snap);invalid.seed=8;assert.throws(()=>target.restoreRun(invalid),/不兼容/);assert.equal(target.captureRun().seed,7);
});
test('candidate import failure does not change current profile or running defaults',()=>{
 const world=new World({terrain:false,waves:false,sandbox:true,difficulty:'hard',permanentProfile:new PermanentProfile(5)});
 const session=new RunSession(world,null,{run:null,savedAt:0,notice:''});
 const old=world.permanentProfile.exportJSON();
 assert.throws(()=>session.importJSON('broken'));assert.equal(world.permanentProfile.exportJSON(),old);
 assert.equal(world.difficulty,'hard');
});

test('loading a run ignores opposite menu defaults and keeps battle paused',()=>{
 const source=new World({race:'zerg',difficulty:'hell',terrain:false,waves:false,sandbox:true});
 source.start();source.step();const archive=writeArchive({profile:source.permanentProfile.exportJSON(),run:source.captureRun()});
 const target=new World({race:'protoss',difficulty:'easy',terrain:false,waves:false,sandbox:true});
 const session=new RunSession(target,null,{run:null,savedAt:0,notice:''});
 assert.equal(session.importJSON(archive),'current');
 assert.equal(target.expedition.race,'zerg');
 assert.equal(target.difficulty,'hell');
 assert.equal(target.config.id,1);
 assert.equal(target.paused,true);
 const before=target.time;target.step();assert.equal(target.time,before);
 assert.equal(target.runConfig?.difficulty,'hell');
});

test('an invalid current candidate leaves the live battle and profile untouched',()=>{
 const source=new World({race:'zerg',difficulty:'hell',terrain:false,waves:false,sandbox:true});source.start();
 const target=new World({race:'terran',difficulty:'normal',terrain:false,waves:false,sandbox:true});target.start();
 const session=new RunSession(target,null,{run:null,savedAt:0,notice:''});
 const before=target.captureRun(),profile=target.permanentProfile.exportJSON();
 const bad=source.captureRun();bad.state.stage=19;
 assert.throws(()=>target.restoreRun(bad),/续局基本状态无效/);
 assert.deepEqual(target.captureRun(),before);
 assert.equal(target.permanentProfile.exportJSON(),profile);
 assert.throws(()=>session.inspectSave(writeArchive({profile:source.permanentProfile.exportJSON(),run:bad})));
});

test('repository accepts an intact backup when current is corrupt',async()=>{
 const backend=new MemoryBackend();
 const world=new World({terrain:false,waves:false,sandbox:true});world.start();
 const raw=writeArchive({profile:world.permanentProfile.exportJSON(),run:world.captureRun()});
 backend.slots=['corrupt',raw,null];
 const loaded=await new SaveRepository(backend).load();
 assert.equal(loaded.raw,raw);
 assert.match(loaded.notice,/备份/);
});
