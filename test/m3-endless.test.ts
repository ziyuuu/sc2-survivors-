import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {ENDLESS_ENTRANCES,endlessConfig,endlessWaveTemplate} from '../src/data/endless';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';

function victorious(){const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],seed:41,endlessTerrain:new FlatTerrain()});assert.ok(w.start());w.stage=18;w.prepareStage();w.hive!.hp=0;w.stageElapsed=w.duration;w.endStage();assert.equal(w.phase,'won');return w;}
function prepared(){const w=victorious();assert.ok(w.chooseCampaignExit('endless'));const first=w.rewards.map(r=>r.offerId);assert.ok(w.backFromEndlessPreparation());assert.ok(w.chooseCampaignExit('endless'));assert.deepEqual(w.rewards.map(r=>r.offerId),first,'returning does not reroll offers');assert.ok(w.skipReward());assert.ok(w.skipReward());assert.equal(w.phase,'endless-ready');const revision=w.endlessEntry!.revision;assert.ok(w.backFromEndlessPreparation());assert.ok(w.chooseCampaignExit('endless'));assert.equal(w.phase,'endless-ready');assert.equal(w.endlessEntry!.revision,revision,'completed preparation is not reopened or rerolled');return w;}
function enter(w:World){const plan=w.previewEndlessTransition()!;assert.ok(plan);const token=`${plan.requestId}:${plan.expectedRevision}:${plan.mapHash}`;assert.ok(w.registerEndlessReadyToken(token));assert.ok(w.commitEndlessTransition(plan.requestId,plan.expectedRevision,token));return plan;}

test('flat field has 160 square footprint, constant height, eight safe entrances and independent 240-second rounds',()=>{
 const flat=new FlatTerrain();assert.equal(flat.height({x:50,z:-35}),0);assert.ok(flat.canOccupy({x:76,z:0},0));assert.equal(flat.canOccupy({x:76.01,z:0},0),false);
 assert.equal(ENDLESS_ENTRANCES.length,8);for(const point of ENDLESS_ENTRANCES)assert.ok(flat.canOccupy(point,2));
 const config=endlessConfig('normal');assert.equal(config.durationSeconds,240);assert.deepEqual(config.reward,[300,250]);assert.equal(config.width,160);const waves=endlessWaveTemplate(41,1,'normal');assert.equal(waves.length,15);assert.equal(waves[0].at,0);assert.equal(waves.at(-1)?.at,224);
});
test('stale or absent readiness never switches map; committed transition preserves bodies and paid pods',()=>{
 const w=prepared(),before=w.captureRun(),body=w.allies()[0],health=body.hp;const pod=w.spawnPod('marine',{x:8,z:0});const originalWallet={...w.wallet};
 const plan=w.previewEndlessTransition()!;assert.ok(plan);assert.equal(w.commitEndlessTransition(plan.requestId,plan.expectedRevision,'missing'),false);assert.equal(w.terrain instanceof FlatTerrain,false);assert.equal(w.battlefield.mode,'campaign');assert.deepEqual(w.wallet,originalWallet);
 enter(w);assert.ok(w.terrain instanceof FlatTerrain);assert.equal(w.battlefield.mapId,'endless-flat-v1');assert.equal(w.duration,240);assert.equal(w.entities.get(body.id)?.hp,health);assert.ok(w.pods.some(p=>p.id===pod.id));assert.equal(w.endlessTransitionReceipt,plan.requestId);assert.equal(w.commitEndlessTransition(plan.requestId,plan.expectedRevision,`${plan.requestId}:${plan.expectedRevision}:${plan.mapHash}`),false);
 assert.equal(before.state.battlefield.mode,'campaign');assert.equal(w.fortifications.size,5);
 const copy=new World({sandbox:true,waves:false,terrain:false,obstacles:[],seed:41,endlessTerrain:new FlatTerrain()});copy.restoreRun(w.captureRun());assert.ok(copy.terrain instanceof FlatTerrain);assert.equal(copy.difficulty,w.difficulty);assert.equal(copy.paused,true);
});
test('multiple unresolved pods and their guards receive distinct legal flat-map positions',()=>{
 const w=prepared(),podA=w.spawnPod('marine',{x:8,z:0}),podB=w.spawnPod('marine',{x:-8,z:0}),podC=w.spawnPod('marine',{x:0,z:8});
 podA.status='active';podB.status='opening';const guard=w.addUnit('zergling','zerg',9,0);podA.guardianIds.add(guard.id);
 const plan=w.previewEndlessTransition()!;assert.ok(plan);assert.equal(plan.pods.size,3);assert.ok(plan.guards.has(guard.id));
 enter(w);const flat=w.terrain as FlatTerrain,positions=[...w.pods.map(p=>({x:p.x,z:p.z})),{x:guard.x,z:guard.z}];
 assert.equal(w.pods.length,3);assert.equal(w.entities.get(guard.id)?.hp,guard.hp);
 for(const point of positions)assert.ok(flat.canOccupy(point,1));
 for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++)assert.ok(Math.hypot(positions[i].x-positions[j].x,positions[i].z-positions[j].z)>2);
});
test('first 60/120 battle seconds and 240-second round each pay once with stable receipts',()=>{
 const w=prepared();enter(w);const principal=w.permanentProfile.balance;
 w.tick=3593;w.time=w.tick/60;w.stageElapsed=w.time;w.step();assert.equal(w.permanentProfile.balance,principal);
 w.tick=3599;w.time=w.tick/60;w.stageElapsed=w.time;w.step();assert.equal(w.permanentProfile.balance,principal+1);
 w.tick=7199;w.time=w.tick/60;w.stageElapsed=w.time;w.step();assert.equal(w.permanentProfile.balance,principal+2);
 w.tick=14393;w.time=w.tick/60;w.stageElapsed=239.9;for(let i=0;i<5;i++)w.step();assert.equal(w.phase,'battle');w.step();assert.equal(w.phase,'reward');assert.equal(w.endlessRoundReceipts.length,1);assert.equal(w.clearReceipt?.minerals,300);assert.equal(w.clearReceipt?.gas,250);const wallet={...w.wallet};w.endStage();assert.deepEqual(w.wallet,wallet);
 assert.ok(w.skipReward());assert.ok(w.skipReward());assert.equal(w.endless?.round,2);assert.equal(w.duration,240);assert.equal(w.stageElapsed,0);assert.equal(w.endlessRoundReceipts.length,1);
});
test('old Acropolis endless snapshot remains exportable but is never remapped into flat play',async()=>{
 const w=prepared();enter(w);const run=w.captureRun() as any;run.schema=3;delete run.state.battlefield;delete run.state.endlessEntry;delete run.state.endlessTransitionReceipt;delete run.state.endlessRoundReceipts;
 const raw=writeArchive({profile:w.permanentProfile.exportJSON(),run});assert.throws(()=>readArchive(raw),/旧 Acropolis 无尽档/);
 const backend:SaveBackend={read:async()=>[raw,null,null],commit:async()=>{}};const loaded=await new SaveRepository(backend).load();assert.equal(loaded.bundle,null);assert.equal(loaded.incompatible?.raw,raw);
});
