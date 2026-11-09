import {beginExpeditionWindow} from '../src/simulation/progression/expedition-drafts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {chooseTutorial} from '../src/simulation/tutorial/runtime';
import {guided,guidedStep,guidedClickRef,guidedProducer,acknowledgeGuidedSave,activateGuidedTarget,beginGuidedClick,finishGuidedClick,withGuidedCommand,permitGuidedProduction,prepareGuided} from '../src/simulation/tutorial/guided';
import {dropEnemyEquipment,collectWorldEquipment} from '../src/simulation/starship/drops';
import {productionGroups} from '../src/simulation/building/expedition';
import {RunSession} from '../src/app/run-session';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';
import {readArchive} from '../src/persistence/archive';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import type {Race} from '../src/data/races';

function start(race:Race='terran'){
 const account=newEquipmentAccount(529);account.tutorial={status:'eligible',version:2};
 const w=new World({race,seed:17,terrain:campaignTerrain(chooseCampaignMap(17)),equipmentAccount:account});assert.ok(w.start());assert.ok(chooseTutorial(w,true));return w;
}
function settle(w:World,limit=3000){for(let i=0;i<limit&&guided(w)?.phase==='running';i++){acknowledgeGuidedSave(w);w.step();}assert.equal(guided(w)?.phase,'waiting',guided(w)?.step);}
function marker(w:World){acknowledgeGuidedSave(w);assert.ok(activateGuidedTarget(w));settle(w);}
function toTraining(w:World){marker(w);marker(w);marker(w);assert.equal(guidedStep(w)?.id,'train-1');}
function nativeDraft(w:World,enabled:boolean){const g=guided(w)!,p=guidedProducer(w)!;acknowledgeGuidedSave(w);assert.ok(beginGuidedClick(w,guidedClickRef(w)));g.draft=w.beginBuildingPlacement()!;g.draft.groups.find(d=>d.id===p.id)!.enabled=enabled;g.producer=p.id;assert.ok(finishGuidedClick(w));}
function applyDraft(w:World,permit=false){const g=guided(w)!;acknowledgeGuidedSave(w);assert.ok(beginGuidedClick(w,guidedClickRef(w)));if(permit)permitGuidedProduction(w);assert.ok(withGuidedCommand(w,()=>w.applyBuildingPlacement(g.draft!)));delete g.draft;w.changed();settle(w);}
class Backend implements SaveBackend {slots:(string|null)[]=[null,null,null];fail=false;async read(){return [...this.slots];}async commit(raw:string,expected?:string|null){if(this.fail)throw Error('quota');assert.ok(expected===undefined||expected===this.slots[0]);this.slots=[raw,this.slots[0],this.slots[1]];}}

test('v2 waits for a matching durable click; time, income and gameplay shortcuts cannot bypass it',()=>{
 const w=start(),before=structuredClone(w.wallet);assert.equal(beginGuidedClick(w,guidedClickRef(w)),false);acknowledgeGuidedSave(w);assert.equal(beginGuidedClick(w,'wrong-target'),false);
 w.advance(20);assert.equal(w.time,0);assert.deepEqual(w.wallet,before);assert.equal(w.issueMove(w.expedition.tutorial!.goal),false);assert.equal(w.setProductionEnabled('marine',true),false);assert.equal(w.skipReward(),false);assert.equal(w.dash(),false);assert.equal(w.stim(),false);
 assert.ok(activateGuidedTarget(w));assert.equal(activateGuidedTarget(w),false);settle(w);assert.equal(guided(w)?.step,'drone');assert.equal(guided(w)?.commands.length,1);
 // The next action is blocked until the full transaction has been acknowledged.
 assert.equal(activateGuidedTarget(w),false);
});

for(const race of ['terran','zerg','protoss'] as const)test(`v2 ${race}: exact 100/50 collection and a single paid seat, even across repeated fixed steps`,()=>{
 const w=start(race);toTraining(w);assert.deepEqual(w.wallet,{minerals:800,gas:250});assert.deepEqual(w.economyTotals.passive,{minerals:0,gas:0});assert.deepEqual(w.economyTotals.drops,{minerals:100,gas:50});
 nativeDraft(w,true);applyDraft(w,true);assert.equal(guided(w)?.step,'pause-1');assert.equal(guided(w)?.jobs.length,1);const job=w.expedition.ledger[0];assert.equal(job.passengers.length,race==='zerg'?2:1);assert.deepEqual(w.wallet,{minerals:race==='protoss'?700:750,gas:250});
 // A paid order continues after player-applied Pause; no extra orders consume the wallet.
 nativeDraft(w,false);applyDraft(w);assert.equal(guided(w)?.step,'landing-1');assert.equal(w.expedition.ledger.length,1);const wallet={...w.wallet};w.advance(15);assert.deepEqual(w.wallet,wallet);
 marker(w);assert.equal(job.state,'settled');assert.ok(job.passengers.every(p=>p.status==='released'&&p.entityId!==null));
});

test('skip immediately removes current-stage gates and restores untouched native production and income',()=>{
 const w=start(),group=productionGroups(w.expedition)[0];assert.equal(group.enabled,false);assert.ok(chooseTutorial(w,false));assert.equal(guided(w),undefined);assert.equal(w.starship.account.tutorial?.status,'skipped');assert.equal(group.enabled,true);const time=w.time,m=w.wallet.minerals;w.step();assert.ok(w.time>time);assert.ok(w.wallet.minerals>m||w.economyTotals.production.minerals>0);assert.ok(w.issueMove({x:w.anchor.x+1,z:w.anchor.z}));assert.equal(chooseTutorial(w,false),false);
});
test('skip in an unpurchased supply window replaces the fixed shelf once, preserving wallet and native quota',()=>{
 const w=start();w.phase='reward';w.rewardRound='random';beginExpeditionWindow(w.expedition,w.draftStage,w.draftWindowId,0,0);w.rewards=w.generateReinforcementDraft(w.draftWindowKey);const before=w.rewards.map(r=>r.offerId),wallet={...w.wallet};
 assert.ok(chooseTutorial(w,false));const ordinary=w.rewards.map(r=>r.offerId);assert.notDeepEqual(ordinary,before);assert.deepEqual(w.wallet,wallet);assert.equal(w.expedition.draftTaken,false);assert.equal(chooseTutorial(w,false),false);assert.deepEqual(w.rewards.map(r=>r.offerId),ordinary);
});

function thirdBoss(w:World){w.stage=3;guided(w)!.step='boss-3';prepareGuided(w);return w.entities.get(guided(w)!.bosses['3'].id)!;}
test('v2 third original boss freezes exactly the same two legal identities on death and reload; repeated deaths do not duplicate',()=>{
 const w=start(),boss=thirdBoss(w),before=w.captureRun();
 const kill=(world:World)=>{const b=guided(world)!.bosses['3'],u=world.entities.get(b.id)!;world.hit(u,1e8,[],1,'terran');world.changed();return guided(world)!.bosses['3'].items;};
 const items=kill(w);assert.equal(items.length,2);assert.deepEqual(items.map(i=>[i.template,i.slot,i.pollution]),[['attribute.1','defense2','none'],['module.logistics.1','logistics','none']]);assert.deepEqual(dropEnemyEquipment(w,boss),[]);assert.equal(Object.keys(w.starship.account.items).length,2);
 const copy=new World({seed:17});copy.restoreRun(before);const replayed=kill(copy);assert.deepEqual(replayed,items);
 const after=w.captureRun();const restored=new World({seed:17});restored.restoreRun(after);assert.deepEqual(guided(restored)!.bosses['3'].items,items);assert.equal(Object.keys(restored.starship.account.items).length,2);
});
test('v2 skip before original boss death uses ordinary drops; skip after creation keeps both drops, including a full backpack',()=>{
 const normal=start(),u=thirdBoss(normal);chooseTutorial(normal,false);normal.hit(u,1e8,[],1,'terran');assert.equal(Object.keys(normal.starship.account.items).length,1);
 const w=start(),boss=thirdBoss(w),account=w.starship.account;
 for(let i=0;i<64;i++)assert.ok(grantEquipment(account,{template:'attribute.1',slot:'offense1',race:'terran',polluted:false},`full:${i}`,{kind:'backpack',run:w.runId!}).ok);
 w.hit(boss,1e8,[],1,'terran');const items=guided(w)!.bosses['3'].items.map(i=>i.id);assert.equal(items.length,2);chooseTutorial(w,false);
 for(const id of items){assert.equal(account.locations[id].kind,'ground');assert.equal(collectWorldEquipment(w,id).ok,false);assert.equal(account.locations[id].kind,'ground');}
 assert.equal(account.tutorial?.status,'skipped');assert.equal(Object.keys(account.items).length,66);
});

test('durable checkpoint keeps click, real payment and item/run identity together; failures cannot unlock the next click',async()=>{
 const w=start(),backend=new Backend(),repo=new SaveRepository(backend),s=new RunSession(w,repo,{run:null,savedAt:0,notice:''});await s.saveNow();assert.ok(activateGuidedTarget(w));settle(w);await s.saveNow();
 const raw=backend.slots[0]!;const bundle=readArchive(raw).bundle;assert.equal(bundle.run?.state.expedition.tutorial?.guided?.step,'drone');assert.equal(bundle.run?.state.expedition.tutorial?.guided?.commands[0].done,true);
 const restored=new World({seed:17,equipmentAccount:structuredClone(bundle.equipment!)});restored.restoreRun(bundle.run!);assert.equal(guided(restored)?.step,'drone');assert.equal(restored.runId,w.runId);assert.equal(activateGuidedTarget(restored),false);acknowledgeGuidedSave(restored);assert.ok(activateGuidedTarget(restored));settle(restored);
 backend.fail=true;await assert.rejects(s.saveNow());assert.equal(s.saveFailed,true);assert.equal(w.paused,true);assert.equal(backend.slots[0],raw);assert.equal(w.interfacePaused,true);
});
