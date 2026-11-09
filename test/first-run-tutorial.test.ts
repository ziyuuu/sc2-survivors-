import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RunSession} from '../src/app/run-session';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';
import {readArchive,writeArchive} from '../src/persistence/archive';
import {newEquipmentAccount,grantEquipment,BACKPACK_CAPACITY} from '../src/simulation/starship/inventory';
import {chooseTutorial,tutorialBeat,tutorialTarget} from '../src/simulation/tutorial/runtime';
import {collectWorldEquipment,dropEnemyEquipment,dropWorldEquipment} from '../src/simulation/starship/drops';
import {RACES,type Race} from '../src/data/races';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
class Backend implements SaveBackend {
 slots:(string|null)[]=[null,null,null];fail=false;
 async read(){return [...this.slots];}
 async commit(raw:string,expected?:string|null){if(this.fail)throw Error('quota');if(expected!==undefined&&expected!==this.slots[0])throw Error('another page');this.slots=[raw,this.slots[0],this.slots[1]];}
}
function make(race:Race='terran',eligible=true,seed=529){const a=newEquipmentAccount(seed);if(eligible)a.tutorial={status:'eligible'};return new World({race,seed,waves:false,sandbox:true,terrain:campaignTerrain(chooseCampaignMap(seed)),equipmentAccount:a});}
function session(w:World,b=new Backend()){return {b,s:new RunSession(w,new SaveRepository(b),{run:null,savedAt:0,notice:''})};}
function begin(race:Race='terran',seed=529){const w=make(race,true,seed);assert.ok(w.start());assert.equal(tutorialBeat(w),'invite');assert.ok(w.requiresPlayerDecision);assert.ok(chooseTutorial(w,true));return w;}
function boss(w:World){while(w.stage<3){w.endStage();while(w.phase==='reward')w.skipReward();}const u=(w as any).spawnCampaignSpecial({at:30,type:'zergling',tier:'boss',role:'boss',budget:10});assert.ok(u);return u as ReturnType<World['addUnit']>;}
function kill(w:World,u:ReturnType<World['addUnit']>){w.hit(u,1e8,[],1,'terran',0,1,w.allies()[0].id);w.changed();}
async function restored(b:Backend){const repo=new SaveRepository(b),loaded=await repo.load();assert.ok(loaded.bundle);const w=make('terran',false);w.starship.account=structuredClone(loaded.bundle.equipment!);assert.ok(w.permanentProfile.importJSON(loaded.bundle.profile));const s=new RunSession(w,repo,{run:loaded.bundle.run,savedAt:loaded.savedAt,notice:loaded.notice});if(s.canResume)assert.ok(s.resume());return {w,s};}
test('eligibility: only a successful three-empty-slot read qualifies; corrupt and backups never do',async()=>{
 const b=new Backend();assert.equal((await new SaveRepository(b).load() as any).empty,true);
 b.slots=['corrupt',null,null];assert.equal((await new SaveRepository(b).load() as any).empty,false);
 const old=make('terran',false),raw=writeArchive({profile:old.permanentProfile.exportJSON(),run:null,equipment:old.starship.account});
 for(const slots of [[raw,null,null],['corrupt',raw,null],[null,null,raw]]){b.slots=slots;const r=await new SaveRepository(b).load();assert.ok(r.bundle);assert.equal((r as any).empty,undefined);}
 await assert.rejects(new SaveRepository({read:async()=>{throw Error('denied');},commit:async()=>{}}).load());
});
test('old accounts, including an ended account without continuation, never gain a tutorial',()=>{for(const ended of [false,true]){const w=make('terran',false);if(ended){assert.ok(w.start());w.endStage();assert.ok(w.extractEquipment());w.resetRun();}assert.ok(w.start());assert.equal(w.starship.account.tutorial,undefined);assert.equal(w.expedition.tutorial,undefined);}});
test('empty-menu eligibility survives saving and reopening before the first departure',async()=>{const w=make(),{b,s}=session(w);await s.saveNow();const copy=await restored(b);assert.equal(copy.w.starship.account.tutorial?.status,'eligible');assert.ok(copy.w.start());assert.equal(tutorialBeat(copy.w),'invite');});
for(const status of ['invited','active','skipped'] as const)test(`${status} restores with the same run and explicit decision`,async()=>{
 const w=make(),{b,s}=session(w);assert.ok(w.start());if(status!=='invited')chooseTutorial(w,status==='active');await s.saveNow();const copy=await restored(b);assert.equal(copy.w.starship.account.tutorial?.status,status);assert.equal(copy.w.runId,w.runId);assert.equal(copy.w.requiresPlayerDecision,status==='invited');
});
test('skip persists immediately and across replacement/another race, without rewarding the boss',async()=>{
 const w=begin(),{b,s}=session(w);chooseTutorial(w,false);await s.saveNow();const c=await restored(b);assert.equal(tutorialBeat(c.w),null);const u=boss(c.w);kill(c.w,u);assert.equal(c.w.expedition.tutorial?.boss,undefined);assert.equal(Object.keys(c.w.starship.account.items).length,1);
 c.s.keepRun();const p=c.s.prepareNewRun('zerg','normal',0,null);assert.ok(c.s.commitNewRun(p.id,'ok','ok'));assert.equal(tutorialBeat(c.w),null);assert.equal(c.w.starship.account.tutorial?.status,'skipped');
});
test('resources acknowledge the same enemy drone, excluding passive income and a different pickup',()=>{
 const w=begin(),t=w.expedition.tutorial!;const drone=w.spawnEconomic('drone',{x:w.anchor.x+2,z:w.anchor.z});w.hit(drone,1e8,[],1,'terran');w.changed();assert.equal(t.drone?.id,drone.id);assert.ok(t.drone?.pickups.length);
 w.wallet.minerals+=1000;w.changed();assert.equal(t.resources,false);
 const p=w.pickups.find(p=>p.id===t.drone!.pickups[0])!;w.anchor.x=p.x;w.anchor.z=p.z;w.step();assert.equal(t.resources,true);
});
test('movement acknowledges real displacement and early reinforcement is not queued again',()=>{const w=begin(),t=w.expedition.tutorial!;w.changed();assert.equal(t.moved,false);Object.assign(w.anchor,t.goal);w.changed();assert.equal(t.moved,true);assert.ok(tutorialTarget(w,'move'));});
for(const race of RACES)test(`${race}: same real boss items survive pickup, intermission equip, extraction and flagship equip`,async()=>{
 const w=begin(race),{b,s}=session(w),u=boss(w);kill(w,u);const plan=w.expedition.tutorial!.boss!;assert.ok([2,3].includes(plan.items.length));assert.equal(plan.items[0].template,'attribute.1');assert.equal(plan.items[1].template,'module.logistics.1');assert.ok(plan.items.every(i=>i.race===race&&i.pollution==='none'));
 const serial=w.starship.account.serial;assert.deepEqual(dropEnemyEquipment(w,u),[]);assert.equal(w.starship.account.serial,serial);
 await s.saveNow();const copy=await restored(b);assert.deepEqual(copy.w.expedition.tutorial!.boss,plan);assert.deepEqual(dropEnemyEquipment(copy.w,copy.w.entities.get(u.id)!),[]);
 for(const i of plan.items){const loc=copy.w.starship.account.locations[i.id];copy.w.paused=false;copy.w.anchor.x=loc.x!;copy.w.anchor.z=loc.z!;assert.ok(collectWorldEquipment(copy.w,i.id).ok);}
 copy.w.endStage();const attribute=plan.items[0],module=plan.items[1];assert.ok(copy.w.equipItem(attribute.id,attribute.slot).ok);assert.equal(copy.w.expedition.tutorial!.attributeEquipped,true);assert.equal(tutorialBeat(copy.w),'extract');assert.ok(copy.w.extractEquipment());assert.equal(copy.w.starship.account.locations[module.id].kind,'warehouse');assert.equal(tutorialBeat(copy.w),'flagship');
 assert.ok(copy.w.equipItem(module.id,module.slot).ok);assert.equal(copy.w.starship.account.tutorial?.status,'completed');await copy.s.saveNow();const terminal=await restored(b);assert.equal(terminal.w.starship.account.tutorial?.status,'completed');assert.equal(tutorialBeat(terminal.w),null);
});
test('two and three item plans both occur in the conservative 25 percent extra-item policy',()=>{const counts=new Set<number>();for(let seed=1;seed<=30&&counts.size<2;seed++){const w=begin('terran',seed),u=boss(w);kill(w,u);counts.add(w.expedition.tutorial!.boss!.items.length);}assert.deepEqual([...counts].sort(),[2,3]);});
test('living enemy and unrelated boss cannot trigger the tutorial plan',()=>{const w=begin(),u=boss(w);dropEnemyEquipment(w,u);assert.equal(w.expedition.tutorial!.boss,undefined);const v=w.addUnit('zergling','zerg',1,1);v.enemyTier='boss';v.hp=0;dropEnemyEquipment(w,v);assert.equal(w.expedition.tutorial!.boss,undefined);});
test('backpack full retains ground identities; skipping after creation preserves the reward',()=>{const w=begin(),u=boss(w);kill(w,u);const plan=structuredClone(w.expedition.tutorial!.boss!),a=w.starship.account;for(let i=0;i<BACKPACK_CAPACITY;i++)assert.ok(grantEquipment(a,{template:'attribute.1',race:'terran',slot:'offense1'},'full:'+i,{kind:'backpack',run:w.runId!}).ok);chooseTutorial(w,false);const id=plan.items[0].id,loc=a.locations[id];w.anchor.x=loc.x!;w.anchor.z=loc.z!;const result=collectWorldEquipment(w,id);assert.ok(!result.ok&&result.error==='背包已满');assert.equal(a.locations[id].kind,'ground');assert.deepEqual(w.expedition.tutorial!.boss,plan);});
test('pre-boss restore produces the same deterministic frozen plan and IDs on the same input',async()=>{const w=begin(),b=new Backend(),u=boss(w);b.slots[0]=writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun(),equipment:w.starship.account});kill(w,u);const plan=structuredClone(w.expedition.tutorial!.boss);const copy=await restored(b);kill(copy.w,copy.w.entities.get(u.id)!);assert.deepEqual(copy.w.expedition.tutorial!.boss,plan);});
test('failed tutorial write preserves all durable slots; retry saves a consistent intent and checkpoint',async()=>{const w=begin(),{b,s}=session(w);await s.saveNow();const old=[...b.slots];b.fail=true;chooseTutorial(w,false);await assert.rejects(s.saveNow());assert.deepEqual(b.slots,old);assert.ok(s.saveFailed);b.fail=false;await s.saveNow();assert.equal(readArchive(b.slots[0]!).bundle.equipment!.tutorial?.status,'skipped');});
test('two pages cannot overwrite an accepted skip with stale active intent',async()=>{const w=begin(),{b,s}=session(w);await s.saveNow();const stale=await restored(b);chooseTutorial(w,false);await s.saveNow();stale.w.anchor.x+=4;stale.w.changed();await assert.rejects(stale.s.saveNow(),/another page/);assert.equal(readArchive(b.slots[0]!).bundle.equipment!.tutorial?.status,'skipped');});
test('early extraction without a module and real defeat close this run without new eligibility',()=>{for(const loss of [false,true]){const w=begin();if(loss){w.phase='lost';w.changed();}else{w.endStage();assert.ok(w.extractEquipment());}assert.equal(w.starship.account.tutorial?.status,'closed');assert.equal(tutorialBeat(w),null);}});
test('full backpack can free one place and collect the same promised item after skipping',()=>{const w=begin(),u=boss(w);kill(w,u);const a=w.starship.account,id=w.expedition.tutorial!.boss!.items[1].id;let discard='';for(let i=0;i<BACKPACK_CAPACITY;i++){const r=grantEquipment(a,{template:'attribute.1',race:'terran',slot:'offense1'},'capacity:'+i,{kind:'backpack',run:w.runId!});assert.ok(r.ok);discard=r.value.id;}chooseTutorial(w,false);const loc=a.locations[id];assert.equal(loc.kind,'ground');w.anchor.x=loc.x!;w.anchor.z=loc.z!;assert.ok(!collectWorldEquipment(w,id).ok);assert.ok(dropWorldEquipment(w,discard).ok);assert.ok(collectWorldEquipment(w,id).ok);assert.equal(a.locations[id].kind,'backpack');const serial=a.serial;assert.ok(!collectWorldEquipment(w,id).ok);assert.equal(a.serial,serial);});
test('importing an existing account into an eligible empty menu does not retain new-player eligibility',()=>{const w=make(),{s}=session(w),old=make('terran',false);s.importJSON(writeArchive({profile:old.permanentProfile.exportJSON(),run:null,equipment:old.starship.account}));assert.equal(w.starship.account.tutorial,undefined);assert.ok(w.start());assert.equal(tutorialBeat(w),null);});
