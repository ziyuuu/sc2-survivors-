import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RunState} from '../src/simulation/run-state';
import {TalentProfile} from '../src/simulation/progression/talent-profile';
import {RUN_FIELDS,RUN_REBUILT_FIELDS} from '../src/simulation/persistence/run-fields';
import {RUN_RULES,splitPassengerPayment} from '../src/simulation/persistence/run-snapshot';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {encodeGraph,decodeGraph} from '../src/persistence/graph-codec';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';
import {RunSession} from '../src/app/run-session';
const make=()=>new World({sandbox:true,terrain:false,obstacles:[],waves:false});
test('legacy passenger payments retain exact aggregate, order and fractional remainder',()=>{assert.deepEqual(splitPassengerPayment({minerals:101,gas:7},3),[{minerals:34,gas:3},{minerals:34,gas:2},{minerals:33,gas:2}]);const rows=splitPassengerPayment({minerals:25.5,gas:1.25},3);assert.equal(rows.reduce((n,p)=>n+p.minerals,0),25.5);assert.equal(rows.reduce((n,p)=>n+p.gas,0),1.25);assert.throws(()=>splitPassengerPayment({minerals:100,gas:0},0));});
const roundTrip=(w:World)=>readArchive(writeArchive({profile:w.talentProfile.exportJSON(),run:w.captureRun()})).bundle;
class MemoryBackend implements SaveBackend {
 slots:(string|null)[]=[null,null,null];fail=false;
 async read(){return this.slots;}
 async commit(raw:string){if(this.fail)throw Error('disk full');this.slots=[raw,this.slots[0],this.slots[1]];}
}
test('every mutable RunState field is explicitly saved or rebuilt',()=>{
 const declared=[...RUN_FIELDS,...RUN_REBUILT_FIELDS];assert.equal(new Set(declared).size,declared.length);
 for(const key of Object.keys(new RunState()))assert.ok(declared.includes(key as any),'unclassified field: '+key);
});
test('portable graph preserves infinity, Maps, Sets and shared object identity',()=>{
 const job={remaining:4},hits=new Set([1,3]),data={a:[job],b:new Map([[9,job]]),hits,c:hits,infinite:Infinity,negative:-Infinity,optional:undefined};
 const restored=decodeGraph(JSON.parse(JSON.stringify(encodeGraph(data)))) as typeof data;
 assert.equal(restored.a[0],restored.b.get(9));assert.equal(restored.hits,restored.c);assert.equal(restored.infinite,Infinity);assert.equal(restored.negative,-Infinity);assert.equal(restored.optional,undefined);
});
test('battle checkpoint retains paid batch identity, HP, timers, statuses, pods and RNG',()=>{
 const w=make();w.start();w.advance(.2);const ally=w.allies()[0];ally.hp-=9;ally.weaponCooldown=.7;ally.shotSequence=3;
 const a=w.addBuilding('barracks'),b=w.addBuilding('barracks'),job={id:123,unitType:'marine' as const,quantity:2,buildingIds:[a.id,b.id],group:'barracks' as const,remaining:12,paid:{minerals:100,gas:0}};a.queue=[job];b.queue=[job];w.nextJob=124;
 w.statuses.apply(ally.id,900,'bleed',.2,3,w.time);w.spawnPod('marauder');
 const hits=new Set([ally.id]);w.enemySpecials.missiles=[{cast:7,source:900,x:30,z:30,angle:0,remaining:2,damage:3,hits,level:1,percent:0},{cast:7,source:900,x:31,z:30,angle:0,remaining:2,damage:3,hits,level:1,percent:0}];
 const snapshot=roundTrip(w).run!,copy=make();copy.restoreRun(snapshot);
 assert.equal(copy.paused,true);assert.equal(copy.time,w.time);assert.deepEqual(copy.wallet,w.wallet);assert.equal(copy.entities.get(ally.id)!.hp,ally.hp);assert.equal(copy.entities.get(ally.id)!.weaponCooldown,.7);assert.equal(copy.entities.get(ally.id)!.shotSequence,3);
 assert.equal(copy.buildings.get(a.id)!.queue[0],copy.buildings.get(b.id)!.queue[0]);assert.equal(copy.buildings.get(a.id)!.queue[0].remaining,12);assert.ok(copy.pods[0].guardianIds instanceof Set);
 assert.equal(copy.enemySpecials.missiles[0].hits,copy.enemySpecials.missiles[1].hits);assert.equal(copy.statuses.value(ally.id,'bleed',copy.time),.2);
 assert.equal(copy.captureRun().state.rngState,w.captureRun().state.rngState);assert.equal((copy as any).random(),(w as any).random());
 copy.statuses.tick(copy.time+4);assert.equal(copy.statuses.count,0);
});
test('reward menus restore exact offers, receipts, paid revivals and future rolls',()=>{
 const w=make();w.start();w.wallet={minerals:5000,gas:5000};w.stage=3;w.prepareStage();w.endStage();w.reroll();w.acquireHero('raynor');const hero=w.heroEntity('raynor')!;w.hit(hero,hero.maxHp+100,[],1,'zerg',0,1,undefined,true);w.reviveHero('raynor');
 const bundle=roundTrip(w),profile=new TalentProfile();profile.importJSON(bundle.profile);const copy=new World({sandbox:true,terrain:false,obstacles:[],waves:false,talentProfile:profile});copy.restoreRun(bundle.run!);
 assert.equal(copy.phase,'reward');assert.deepEqual(copy.rewards,w.rewards);assert.deepEqual(copy.heroes,w.heroes);assert.equal(copy.rerolls,w.rerolls);assert.deepEqual(copy.clearReceipt,w.clearReceipt);
 const balance=profile.balance;copy.endStage();assert.equal(profile.balance,balance,'already awarded receipt must not award again');
 w.reroll();copy.reroll();assert.deepEqual(copy.rewards,w.rewards);assert.deepEqual(copy.wallet,w.wallet);
});
test('resumed run keeps its talent selection when the permanent profile changes',()=>{
 const w=make();w.talentProfile.levels.expanded_squad=1;w.start();const saved=roundTrip(w).run!;w.talentProfile.levels={};w.resetRun();w.restoreRun(saved);assert.equal(w.rosterCap,7);assert.equal(w.totalRosterCap,38);assert.equal(w.talentProfile.level('expanded_squad'),0);
 w.resetRun();w.start();assert.equal(w.rosterCap,5);assert.equal(w.totalRosterCap,28);
});
test('invalid version, changed map and corrupt archive cannot mutate the current run',()=>{
 const w=make();w.start();const s=roundTrip(w).run!,before=w.entities;
 assert.throws(()=>w.restoreRun({...s,map:'different-map'}),/地图/);assert.equal(w.entities,before);
 assert.throws(()=>w.restoreRun({...s,rules:'future' as any}),/版本/);assert.equal(w.entities,before);
 const raw=writeArchive({profile:w.talentProfile.exportJSON(),run:s});assert.throws(()=>readArchive(raw.replace(RUN_RULES,'survivors-future')),/校验/);
});
test('V23 run migrates production defaults while retaining paid work',()=>{
 const w=make();w.start();const b=w.addBuilding('barracks');w.wallet.minerals=50;assert.equal(w.queue('marine',b.id),true);
 const old=w.captureRun() as any;old.rules='survivors-v23';delete old.state.productionChoices;
 const migrated=readArchive(writeArchive({profile:w.talentProfile.exportJSON(),run:old})).bundle.run!;
 assert.equal(migrated.rules,RUN_RULES);assert.deepEqual(migrated.state.productionChoices.barracks,['marine','marauder']);
 const copy=make();copy.restoreRun(migrated);assert.equal(copy.buildings.get(b.id)?.queue[0].unitType,'marine');assert.deepEqual(copy.productionChoices,w.productionChoices);
});
test('legacy profile recovers missing-primary backups and interrupted pending commits',()=>{
 const key='sc2-survivors-talents-v1',donor=new TalentProfile();donor.award('a',7);const backup=donor.exportJSON();donor.award('b',4);const pending=donor.exportJSON();
 for(const pairs of [[[key+'-backup',backup]],[[key,backup],[key+'-pending',pending]]]){const map=new Map(pairs),profile=new TalentProfile({getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);},removeItem:k=>{map.delete(k);}});assert.equal(profile.balance,pairs.length===1?7:11);assert.ok(profile.recoveryNotice);}
});
test('repository falls back from corruption, but never revives a valid ended run',async()=>{
 const backend=new MemoryBackend(),repo=new SaveRepository(backend),w=make();w.start();const first=writeArchive({profile:w.talentProfile.exportJSON(),run:w.captureRun()});await repo.commit(first);w.phase='lost';await repo.commit(writeArchive({profile:w.talentProfile.exportJSON(),run:w.captureRun()}));
 assert.equal((await repo.load()).bundle!.run!.state.phase,'lost');backend.slots[0]='broken';const recovered=await repo.load();assert.equal(recovered.bundle!.run!.state.phase,'battle');assert.match(recovered.notice,/备份/);
});
test('failed commits preserve the previous archive and exportable in-memory progress',async()=>{
 const backend=new MemoryBackend(),repo=new SaveRepository(backend),w=make(),session=new RunSession(w,repo,{run:null,savedAt:0,notice:''});w.start();await session.saveNow();const previous=backend.slots[0];backend.fail=true;w.wallet.minerals+=10;await assert.rejects(()=>session.saveNow());assert.equal(backend.slots[0],previous);assert.match(session.message,/保存失败/);assert.equal(readArchive(session.exportJSON()).bundle.run!.state.wallet.minerals,w.wallet.minerals);
});
test('returning to the title retains a detached resume slot and ending the run disables Continue',async()=>{
 const w=make(),session=new RunSession(w,new SaveRepository(new MemoryBackend()),{run:null,savedAt:0,notice:''});w.start();w.advance(.5);const time=w.time;session.keepRun();w.resetRun();assert.equal(session.canResume,true);assert.equal(session.resume(),true);assert.equal(w.time,time);assert.equal(w.paused,true);w.phase='lost';session.keepRun();w.resetRun();assert.equal(session.canResume,false);await session.saveNow();
});


test('autosave uses combat time and includes intermission hero revival transactions',async()=>{
 const backend=new MemoryBackend(),w=make(),session=new RunSession(w,new SaveRepository(backend),{run:null,savedAt:0,notice:''});w.start();await new Promise(r=>setTimeout(r,0));const first=backend.slots[0];
 w.advance(9);await new Promise(r=>setTimeout(r,0));assert.equal(backend.slots[0],first);
 w.advance(1.1);await new Promise(r=>setTimeout(r,0));assert.ok(readArchive(backend.slots[0]!).bundle.run!.state.time>=10);
 w.wallet={minerals:5000,gas:5000};w.endStage();w.acquireHero('raynor');const hero=w.heroEntity('raynor')!;w.hit(hero,hero.maxHp+100,[],1,'zerg',0,1,undefined,true);await new Promise(r=>setTimeout(r,0));assert.ok(w.reviveHero('raynor'));await new Promise(r=>setTimeout(r,0));assert.equal(readArchive(backend.slots[0]!).bundle.run!.state.heroes.get('raynor')!.revivePaid,true);assert.equal(session.busy,false);
});
