import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {TalentProfile} from '../src/simulation/progression/talent-profile';
import {ThreeRaceTalentProfile} from '../src/simulation/progression/three-race-talent-profile';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {checksum,encodeGraph} from '../src/persistence/graph-codec';
import {inspectDevArchive,wrapDevTalentProfile} from '../src/persistence/dev-profile-import';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';
import {openSaveProfile,RunSession} from '../src/app/run-session';
import type {Race} from '../src/data/races';
import type {Difficulty} from '../src/data/stages';
class MemoryBackend implements SaveBackend {
 slots:(string|null)[]=[null,null,null];fail=false;
 async read(){return [...this.slots];}
 async commit(raw:string){if(this.fail)throw Error('disk full');this.slots=[raw,this.slots[0],this.slots[1]];}
}
function oldArchive(profile:TalentProfile,three?:ThreeRaceTalentProfile){
 const data={profile:profile.exportJSON(),threeRaceProfile:three?.exportJSON(),run:null};
 const payload={format:'sc2-survivors-save',version:1,savedAt:100,data:encodeGraph(data)};
 return JSON.stringify({...payload,checksum:checksum(JSON.stringify(payload))});
}
test('M1 new archives have one permanent profile, frozen zero talents and preserve 3x4 difficulty',()=>{
 for(const race of ['terran','zerg','protoss'] as Race[])for(const difficulty of ['easy','normal','hard','hell'] as Difficulty[]){
  const w=new World({race,difficulty,terrain:false,waves:false,sandbox:true});w.start();
  const snapshot=w.captureRun(),raw=writeArchive({profile:w.permanentProfile.exportJSON(),run:snapshot});
  assert.equal(JSON.parse(raw).version,2);assert.equal(snapshot.schema,6);
  assert.equal(snapshot.config.rulesId,'mvp-1.0');assert.deepEqual(snapshot.config.frozenTalents.levels,{});
  const parsed=readArchive(raw);assert.deepEqual(Object.keys(parsed.bundle).sort(),['profile','run']);
  const copy=new World({race:'terran',difficulty:'normal',terrain:false,waves:false,sandbox:true});
  copy.restoreRun(parsed.bundle.run!);
  assert.equal(copy.expedition.race,race);assert.equal(copy.difficulty,difficulty);assert.equal(copy.paused,true);
  assert.equal(copy.runConfig?.difficulty,difficulty);
 }
});
test('old developer archive is inspected but cannot be loaded as a current battle',async()=>{
 const old=new TalentProfile();old.balance=7;old.levels={scv_savior:2,range_master:3,hero_support:1,airlift:2,apm_master:1};old.receipts.add('old:stage:12');
 const raw=oldArchive(old),report=inspectDevArchive(raw);
 assert.equal(report.principal,45);assert.ok(report.awardReceipts.includes('old:stage:12'));
 assert.throws(()=>readArchive(raw),/版本不兼容/);
 const backend=new MemoryBackend();backend.slots[0]=raw;const repo=new SaveRepository(backend),loaded=await repo.load();
 assert.equal(loaded.bundle,null);assert.equal(loaded.legacy?.raw,raw);
 const world=new World({terrain:false,waves:false,sandbox:true}),session=new RunSession(world,repo,{run:null,savedAt:0,notice:loaded.notice,legacy:loaded.legacy});
 assert.equal(session.canResume,false);assert.equal(session.confirmLegacyImport(report.sourceArchiveChecksum),true);
 assert.equal(world.permanentProfile.principal,45);assert.equal(session.confirmLegacyImport(report.sourceArchiveChecksum),false);
 await session.saveNow();assert.equal((await repo.load()).bundle?.run,null);
});
test('conflicting old profiles reject conversion without changing the current profile',()=>{
 const old=new TalentProfile();old.balance=20;old.receipts.add('receipt-a');
 const three=new ThreeRaceTalentProfile(10);
 assert.throws(()=>inspectDevArchive(oldArchive(old,three)),/矛盾/);
 const profile=new PermanentProfile(9);assert.equal(profile.principal,9);
});
test('a verified but contradictory developer save remains exportable and is never imported',async()=>{
 const old=new TalentProfile();old.balance=20;old.receipts.add('receipt-a');
 const raw=oldArchive(old,new ThreeRaceTalentProfile(10));
 const backend=new MemoryBackend();backend.slots[0]=raw;
 const loaded=await new SaveRepository(backend).load();
 assert.equal(loaded.bundle,null);
 assert.equal(loaded.legacy?.raw,raw);
 assert.equal(loaded.legacy?.report,null);
 assert.match(loaded.legacy?.error??'',/矛盾/);
 const world=new World({terrain:false,waves:false,sandbox:true});
 const session=new RunSession(world,new SaveRepository(backend),{run:null,savedAt:0,notice:loaded.notice,legacy:loaded.legacy});
 assert.equal(session.exportLegacyJSON(),raw);
 assert.equal(session.confirmLegacyImport('any'),false);
 world.permanentProfile.activatePreset('zerg',0);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(backend.slots[0],raw,'menu preference must not overwrite an unconfirmed developer save');
});
test('candidate import failure does not change current profile or running defaults',()=>{
 const world=new World({terrain:false,waves:false,sandbox:true,difficulty:'hard',permanentProfile:new PermanentProfile(5)});
 const session=new RunSession(world,null,{run:null,savedAt:0,notice:''});
 const old=world.permanentProfile.exportJSON();
 assert.throws(()=>session.importJSON('broken'));assert.equal(world.permanentProfile.exportJSON(),old);
 assert.equal(world.difficulty,'hard');
});

test('old localStorage profile is offered for explicit import without auto spending or deletion',async()=>{
 const old=new TalentProfile();old.balance=11;old.levels={scv_savior:2};
 const map=new Map([['sc2-survivors-talents-v1',old.exportJSON()]]);
 const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};
 const loaded=await openSaveProfile(storage);
 assert.equal(loaded.profile.principal,0);assert.equal(loaded.legacy?.report.principal,13);
 assert.equal(map.get('sc2-survivors-talents-v1'),old.exportJSON());
 assert.equal(inspectDevArchive(wrapDevTalentProfile(old.exportJSON())).sourceArchiveChecksum,
  inspectDevArchive(wrapDevTalentProfile(old.exportJSON())).sourceArchiveChecksum);
 assert.equal(JSON.parse(wrapDevTalentProfile(old.exportJSON())).savedAt,0);
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

test('legacy import receipt survives archive round-trip and rejects the same source again',()=>{
 const old=new TalentProfile();old.balance=11;old.levels={scv_savior:2};
 const raw=wrapDevTalentProfile(old.exportJSON()),report=inspectDevArchive(raw);
 const current=new PermanentProfile();
 assert.equal(current.replaceWithLegacy(report.sourceArchiveChecksum,report.principal,report.awardReceipts),true);
 const copy=PermanentProfile.parseJSON(current.exportJSON())!;
 assert.equal(copy.replaceWithLegacy(report.sourceArchiveChecksum,report.principal,report.awardReceipts),false);
 assert.equal(copy.principal,report.principal);
 assert.equal(copy.allocated,0);
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

test('a mixed current archive and developer backup expose both without loading the old run',async()=>{
 const backend=new MemoryBackend();
 const world=new World({terrain:false,waves:false,sandbox:true});world.start();
 const current=writeArchive({profile:world.permanentProfile.exportJSON(),run:world.captureRun()});
 const old=new TalentProfile();old.balance=7;
 const legacy=oldArchive(old);
 backend.slots=[current,legacy,null];
 const loaded=await new SaveRepository(backend).load();
 assert.equal(loaded.raw,current);
 assert.equal(loaded.legacy?.raw,legacy);
 assert.equal(loaded.bundle?.run?.rules,'mvp-1.0');
});

test('importing a current archive dismisses a staged developer candidate',()=>{
 const old=new TalentProfile();old.balance=2;const rawOld=oldArchive(old);
 const source=new World({terrain:false,waves:false,sandbox:true});source.start();
 const rawCurrent=writeArchive({profile:source.permanentProfile.exportJSON(),run:source.captureRun()});
 const target=new World({terrain:false,waves:false,sandbox:true});
 const session=new RunSession(target,null,{run:null,savedAt:0,notice:'',legacy:{raw:rawOld,report:inspectDevArchive(rawOld)}});
 assert.equal(session.importJSON(rawCurrent),'current');
 assert.equal(session.hasLegacyCandidate,false);
 assert.equal(target.phase,'battle');
 assert.equal(target.paused,true);
});
