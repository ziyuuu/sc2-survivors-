import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {naturalEventChance,eventCategoryWeights,tickEventPacing,encounterCandidates} from '../src/simulation/field-events/pacing';
import {eventWindowSafe,observeEventWindow,noteEventAdmission,majorEventBusy} from '../src/simulation/field-events/event-window';
import {HORDE_KINDS,HORDE_RULES,validateEventPacing} from '../src/simulation/field-events/state';
import {startReplacementHorde,tickReplacementHorde,replacementDensity} from '../src/simulation/field-events/hordes';
import {spawnFunEncounter} from '../src/simulation/encounters/expanded';
import {tickBait} from '../src/simulation/fun-shop/bait';
import {beginSpecialStage,finishSpecialStage,offerSpecialTicket,specialStageAvailable,tickSpecialEntrance} from '../src/simulation/special-stages/runtime';
import {tickMissions} from '../src/simulation/missions/runtime';
import {tickEncounters} from '../src/simulation/encounters/runtime';

function world(stage=8){const w=new World({difficulty:'hard',seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],initial:['marine','marauder','reaper','hellion'],equipmentAccount:newEquipmentAccount()});assert.ok(w.start());w.stage=stage;w.prepareStage();w.pods=[];w.nextFreePodAt=Infinity;w.nextExpansionAt=Infinity;(w as any).specialPlan=[];(w as any).nextSpecial=0;Object.defineProperty(w,'diagnosticRun',{value:false});Object.defineProperty(w,'missionAutoEnabled',{get:()=>!w.fieldEvents.horde});return w;}
function at(w:World,t:number,elapsed=t){w.time=t;w.stageElapsed=elapsed;}

test('R4 natural stage bands have exact chance thresholds, one roll and no first-20-second trigger',()=>{
 for(const stage of [1,3,4,6,7,12,13,18])for(const above of [false,true]){
  const w=world(stage),chance=naturalEventChance(stage);let calls=0;w.random=()=>{calls++;return chance+(above?.00001:-.00001);};
  const boss=w.spawnSpecial('roach','boss',{x:30,z:0})!;at(w,19.99);tickEventPacing(w);assert.equal(calls,0);at(w,20);tickEventPacing(w);
  assert.equal(calls,chance?1:0);assert.equal(w.fieldEvents.pacing.pending,!!chance&&!above);at(w,21);tickEventPacing(w);assert.equal(calls,chance?1:0);assert.ok(boss.hp>0);
 }
 assert.deepEqual([4,7,13].map(naturalEventChance),[.6,.7,.8]);
});
test('R4 native scheduler uses weighted legal categories, starts once, and cancels unfulfilled rolls on stage change',()=>{
 const w=world(4),rolls=[0,.99,0];w.random=()=>rolls.shift()??0;at(w,20);tickEventPacing(w);assert.equal(w.fieldEvents.horde?.kind,'zerglings');assert.equal(w.fieldEvents.pacing.started,true);assert.equal(w.fieldEvents.pacing.pending,false);
 const first=w.fieldEvents.horde!;at(w,40);tickReplacementHorde(w);tickEventPacing(w);at(w,56);tickEventPacing(w);assert.equal(w.fieldEvents.horde,null);assert.equal(first.spawned,15);
 const b=world(6);b.random=()=>0;const boss=b.spawnSpecial('roach','boss',{x:30,z:0})!;at(b,20);tickEventPacing(b);assert.ok(b.fieldEvents.pacing.pending);b.stage=7;b.prepareStage();boss.hp=0;b.random=()=>.99;at(b,90,20);tickEventPacing(b);assert.equal(b.fieldEvents.pacing.pending,false);assert.equal(b.fieldEvents.pacing.started,false);
});
test('R4 tavern changes only category weights; queen belongs to the unified encounter pool',()=>{
 for(const [level,multiplier] of [1,1.3,1.7,2.2].entries())assert.deepEqual(eventCategoryWeights(level),{mission:45*multiplier,encounter:35,horde:20});
 assert.ok(encounterCandidates(world()).includes('cruelQueen'));
 const w=world();w.random=()=>0;at(w,35);for(let i=0;i<1500;i++){tickMissions(w);tickEncounters(w);tickReplacementHorde(w);}assert.equal(w.missions.active,null);assert.equal(w.encounters.active,null);assert.equal(w.encounters.expanded.queen,null);assert.equal(w.fieldEvents.horde,null);
});
for(const kind of HORDE_KINDS)test('R4 '+kind+' unlocks at its own stage and releases at most ten fixed pulses with continuous density',()=>{
 const rule=HORDE_RULES[kind],locked=world(rule.stage-1);assert.equal(startReplacementHorde(locked,kind),false);
 const w=world(rule.stage);assert.ok(startReplacementHorde(w,kind));const h=w.fieldEvents.horde!,rows=[...w.entities.values()].filter(u=>u.owner==='zerg');assert.equal(h.spawned,rule.pulse);
 for(let pulse=1;pulse<10;pulse++){for(const u of w.entities.values())if(u.owner==='zerg')u.hp=0;at(w,pulse*2-.01);tickReplacementHorde(w);assert.equal(h.spawned,pulse*rule.pulse);at(w,pulse*2);tickReplacementHorde(w);rows.push(...[...w.entities.values()].filter(u=>u.owner==='zerg'&&u.hp>0));}
 assert.equal(h.spawned,rule.total);assert.deepEqual(rows.map(u=>u.enemySpawn?.density),rows.map((_,i)=>replacementDensity(i)));at(w,20);tickReplacementHorde(w);assert.equal(w.fieldEvents.horde,null);
});
test('R4 blocked/missed pulses never bank bodies; dead bodies never refund a birth allowance',()=>{
 const w=world(10);assert.ok(startReplacementHorde(w,'ultralisks'));const h=w.fieldEvents.horde!,occupy=w.terrain!.canOccupy;w.terrain!.canOccupy=()=>false;at(w,2);tickReplacementHorde(w);assert.equal(h.spawned,3);w.terrain!.canOccupy=occupy;at(w,7);tickReplacementHorde(w);assert.equal(h.spawned,6);at(w,7.5);tickReplacementHorde(w);assert.equal(h.spawned,6);for(const u of w.entities.values())if(u.owner==='zerg')u.hp=0;at(w,18);tickReplacementHorde(w);assert.equal(h.spawned,9);at(w,20);tickReplacementHorde(w);assert.equal(h.spawned,9);
});
test('R4 cooldown is 15 normal-world seconds after completion and survives a stage boundary and special freeze',()=>{
 const w=world();at(w,20);assert.ok(startReplacementHorde(w,'zerglings'));noteEventAdmission(w,'horde:zerglings');at(w,40);tickReplacementHorde(w);observeEventWindow(w);assert.equal(w.fieldEvents.pacing.restUntil,55);at(w,54.99);assert.equal(eventWindowSafe(w),false);at(w,55);assert.equal(eventWindowSafe(w),true);
 const p=w.fieldEvents.pacing;w.stage=9;w.prepareStage();assert.equal(w.fieldEvents.pacing,p);at(w,56,20);assert.ok(beginSpecialStage(w,'resources','fixture'));finishSpecialStage(w,'timeout');assert.equal(w.fieldEvents.pacing,p);assert.equal(p.restUntil,55);
});
test('R4 neutral queen and corrupt site allow later events, nearby bug fighting occupies the shared slot',()=>{
 const w=world();assert.ok(spawnFunEncounter(w,'corruptedProtoss',{x:22,z:0}));assert.equal(majorEventBusy(w),false);at(w,20);assert.equal(eventWindowSafe(w),true);
 const m=w.encounters.expanded.short!,u=w.entities.get(m.actors[0])!;u.action='attack';assert.equal(majorEventBusy(w),true);observeEventWindow(w);u.action='idle';observeEventWindow(w);assert.equal(eventWindowSafe(w),false);at(w,35);assert.equal(eventWindowSafe(w),true);
 const q=world();assert.ok(spawnFunEncounter(q,'cruelQueen'));at(q,20);assert.equal(eventWindowSafe(q),true);q.encounters.expanded.queen!.attackRequested=true;assert.equal(eventWindowSafe(q),false);
});
test('R4 bait pending categories wait through Boss and another admitted event, expire at the end and never bank across stages',()=>{
 const w=world();w.funShop.levels.bait=3;w.random=()=>0;const boss=w.spawnSpecial('roach','boss',{x:30,z:0})!;at(w,20);tickBait(w);assert.deepEqual(w.funShop.bait.pending,{encounter:true,elite:true,horde:true});boss.hp=0;tickBait(w);assert.deepEqual(w.funShop.bait.counts,{encounter:1,elite:0,horde:0});tickBait(w);assert.equal(w.funShop.bait.counts.elite,0);at(w,100,w.duration-19);tickBait(w);assert.deepEqual(w.funShop.bait.pending,{encounter:false,elite:false,horde:false});w.stage=9;w.prepareStage();at(w,120,1);tickBait(w);assert.deepEqual(w.funShop.bait.counts,{encounter:0,elite:0,horde:0});
});
test('R4 special entrances share three total uses and S+3 spacing; unused offers cost nothing and kind selection avoids repeat',()=>{
 const w=world(4);assert.ok(beginSpecialStage(w,'resources','fixture'));finishSpecialStage(w,'timeout');assert.deepEqual([...w.specialStages.used],[4]);assert.equal(specialStageAvailable(w,5),false);assert.equal(specialStageAvailable(w,6),false);assert.equal(specialStageAvailable(w,7),true);
 w.stage=6;w.prepareStage();w.phase='reward';w.random=()=>0;offerSpecialTicket(w);assert.equal(w.specialStages.ticket?.stage,7);assert.notEqual(w.specialStages.ticket?.kind,'resources');assert.equal(w.specialStages.used.size,1);w.specialStages.ticket=null;
 for(const stage of [7,10]){w.phase='battle';w.stage=stage;w.prepareStage();assert.ok(beginSpecialStage(w,'resources','fixture'));finishSpecialStage(w,'timeout');}
 w.stage=13;w.prepareStage();assert.equal(beginSpecialStage(w,'resources','fixture'),false);w.phase='reward';offerSpecialTicket(w);assert.equal(w.specialStages.ticket,null);w.phase='battle';w.specialStages.portal={kind:'resources',point:{...w.anchor},until:100};tickSpecialEntrance(w);assert.equal(w.specialStages.portal,null);assert.equal(w.specialStages.active,null);
});
test('R4 pacing schema rejects impossible queued state',()=>{const p=world().fieldEvents.pacing;validateEventPacing(p);p.started=true;p.pending=true;assert.throws(()=>validateEventPacing(p));});
