import test from 'node:test';
import assert from 'node:assert/strict';
import {TalentProfile} from '../src/simulation/progression/talent-profile';
import {ThreeRaceTalentProfile} from '../src/simulation/progression/three-race-talent-profile';
import {THREE_RACE_TALENTS} from '../src/data/three-race-talents';
import {World} from '../src/simulation/world';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {encodeGraph} from '../src/persistence/graph-codec';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';
import {openSaveProfile,RunSession} from '../src/app/run-session';
class MemoryBackend implements SaveBackend{
 slots:(string|null)[]=[null,null,null];fail=false;
 async read(){return [...this.slots];}
 async commit(raw:string){if(this.fail)throw new Error('disk full');this.slots=[raw,this.slots[0],this.slots[1]];}
}
function legacy(){const profile=new TalentProfile();profile.balance=7;profile.levels={scv_savior:2,range_master:3,hero_support:1,airlift:2,apm_master:1};profile.receipts.add('legacy:stage:12');return profile;}
const make=()=>new World({sandbox:true,terrain:false,obstacles:[],waves:false});

test('real repository migrates legacy investment once and then persists the new principal and active ranks',async()=>{
 const backend=new MemoryBackend(),repository=new SaveRepository(backend),old=legacy();
 backend.slots[0]=writeArchive({profile:old.exportJSON(),run:null},100);
 const loaded=await repository.load();assert.ok(loaded.bundle);assert.equal(loaded.migratedProfile,true);
 const profile=ThreeRaceTalentProfile.parseJSON(loaded.bundle.threeRaceProfile)!;assert.equal(profile.principal,45);assert.equal(profile.balance,45);
 assert.ok(profile.buy('terran_bio_fire_control'));assert.ok(profile.award('new:stage:3',1));
 await repository.commit(writeArchive({...loaded.bundle,threeRaceProfile:profile.exportJSON()},101));
 const saved=await repository.load();assert.ok(saved.bundle);assert.equal(saved.migratedProfile,false);
 const restored=ThreeRaceTalentProfile.parseJSON(saved.bundle.threeRaceProfile)!;assert.equal(restored.principal,46);assert.equal(restored.balance,43);assert.equal(restored.level('terran_bio_fire_control'),1);
 assert.equal(restored.award('legacy:stage:12',99),false);assert.equal(restored.award('new:stage:3',1),false);
 assert.equal(saved.bundle.profile,old.exportJSON(),'legacy profile is retained, never re-refunded when new profile exists');
});

test('profile migration preserves a legacy 35-body-cap run, paid batch, frozen allocation and all living state',()=>{
 const world=make();world.talentProfile.levels.expanded_squad=1;world.start();const ally=world.allies()[0];ally.hp-=7;ally.weaponCooldown=.8;
 world.wallet.minerals=1000;const building=world.addBuilding('barracks');assert.ok(world.queue('marine',building.id));
 const snapshot=world.captureRun(),raw=writeArchive({profile:world.talentProfile.exportJSON(),run:snapshot});
 const loaded=readArchive(raw);assert.equal(loaded.migratedProfile,true);assert.equal(loaded.bundle.run!.rules,snapshot.rules);
 assert.equal(JSON.stringify(encodeGraph(loaded.bundle.run!.state)),JSON.stringify(encodeGraph(snapshot.state)));const copy=make();copy.restoreRun(loaded.bundle.run!);
 assert.equal(copy.rosterCap,7);assert.equal(copy.totalRosterCap,38);assert.equal(copy.entities.get(ally.id)!.hp,ally.hp);assert.equal(copy.entities.get(ally.id)!.weaponCooldown,.8);
 assert.deepEqual(copy.buildings.get(building.id)!.queue,building.queue);assert.equal(copy.paused,true);
});

test('provided corrupt new profile never falls back to refunding stale legacy investment',async()=>{
 const backend=new MemoryBackend(),repo=new SaveRepository(backend),old=legacy(),profile=ThreeRaceTalentProfile.migrateLegacy(old);
 const good=writeArchive({profile:old.exportJSON(),threeRaceProfile:profile.exportJSON(),run:null});await repo.commit(good);
 const bad=writeArchive({profile:old.exportJSON(),threeRaceProfile:'broken',run:null});assert.throws(()=>readArchive(bad),/三族永久档案/);
 backend.slots=[bad,good,null];const recovered=await repo.load();assert.match(recovered.notice,/备份/);assert.ok(recovered.bundle);assert.equal(recovered.migratedProfile,false);
 assert.equal(ThreeRaceTalentProfile.parseJSON(recovered.bundle.threeRaceProfile)!.principal,45);
});

test('failed atomic save retains the previous run and profile together while memory remains exportable',async()=>{
 const backend=new MemoryBackend(),repo=new SaveRepository(backend),old=legacy(),profile=ThreeRaceTalentProfile.migrateLegacy(old),world=make();world.start();
 const first=writeArchive({profile:old.exportJSON(),threeRaceProfile:profile.exportJSON(),run:world.captureRun()});await repo.commit(first);
 world.wallet.minerals+=123;profile.award('new:stage:3',1);profile.buy('terran_bio_light_protection');backend.fail=true;
 const next=writeArchive({profile:old.exportJSON(),threeRaceProfile:profile.exportJSON(),run:world.captureRun()});await assert.rejects(()=>repo.commit(next),/disk full/);
 assert.equal(backend.slots[0],first);const saved=await repo.load();assert.equal(ThreeRaceTalentProfile.parseJSON(saved.bundle!.threeRaceProfile)!.principal,45);
 const portable=readArchive(next);assert.equal(ThreeRaceTalentProfile.parseJSON(portable.bundle.threeRaceProfile)!.principal,46);assert.equal(portable.bundle.run!.state.wallet.minerals,world.wallet.minerals);
});

test('local-only old profile is migrated even when IndexedDB is unavailable',async()=>{
 const old=legacy(),map=new Map([['sc2-survivors-talents-v1',old.exportJSON()]]),storage={getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>{map.set(key,value);},removeItem:(key:string)=>{map.delete(key);}};
 const opened=await openSaveProfile(storage);assert.equal(opened.repository,null);assert.equal(opened.threeRaceProfile.principal,45);assert.equal(opened.threeRaceProfile.balance,45);assert.equal(opened.profile.exportJSON(),old.exportJSON());
 assert.equal(opened.threeRaceProfile.award('legacy:stage:12',5),false);
});

test('session exports both profiles atomically and new-profile purchases trigger autosave',async()=>{
 const backend=new MemoryBackend(),repo=new SaveRepository(backend),profile=new ThreeRaceTalentProfile(150),world=new World({sandbox:true,terrain:false,obstacles:[],waves:false,threeRaceTalentProfile:profile});
 const session=new RunSession(world,repo,{run:null,savedAt:0,notice:''});assert.ok(profile.buy('terran_bio_fire_control'));await new Promise(resolve=>setTimeout(resolve,0));
 const saved=await repo.load();assert.ok(saved.bundle);assert.equal(ThreeRaceTalentProfile.parseJSON(saved.bundle.threeRaceProfile)!.balance,147);assert.equal(saved.bundle.profile,world.talentProfile.exportJSON());
 assert.equal(readArchive(session.exportJSON()).bundle.threeRaceProfile,profile.exportJSON());
});

test('full archive import restores nine presets and receipts without exposing an intermediate profile save',async()=>{
 const backend=new MemoryBackend(),repo=new SaveRepository(backend),world=new World({sandbox:true,terrain:false,obstacles:[],waves:false,threeRaceTalentProfile:new ThreeRaceTalentProfile()}),session=new RunSession(world,repo,{run:null,savedAt:0,notice:''});
 const donor=new ThreeRaceTalentProfile(258);for(const race of ['terran','zerg','protoss'] as const){const node=THREE_RACE_TALENTS.find(node=>node.race===race&&node.tier===1)!;for(const slot of [0,1,2] as const)assert.ok(donor.savePreset(race,slot,{[node.id]:slot+1}));}
 donor.activatePreset('protoss',2);donor.award('restored:18',1);
 const raw=writeArchive({profile:legacy().exportJSON(),threeRaceProfile:donor.exportJSON(),run:null});session.importJSON(raw);await session.saveNow();
 const loaded=await repo.load();assert.equal(loaded.bundle!.threeRaceProfile,donor.exportJSON());assert.equal(world.threeRaceTalentProfile.activeRace,'protoss');assert.equal(world.threeRaceTalentProfile.activePreset,2);assert.equal(world.threeRaceTalentProfile.balance,250);
 assert.equal(world.threeRaceTalentProfile.award('restored:18',1),false);
});
