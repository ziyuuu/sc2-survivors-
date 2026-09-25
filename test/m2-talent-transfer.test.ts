import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {MVP_TALENTS} from '../src/data/mvp-talents';
import {finishTalentTransfer} from '../src/simulation/combat/talent-transfer';
import type {Race} from '../src/data/races';

function world(race:Race='terran'){const profile=new PermanentProfile(),levels=Object.fromEntries(MVP_TALENTS.filter(node=>node.race===race&&node.line==='micro').map(node=>[node.id,node.maxRank]));assert.equal(profile.award(`fixture:${race}`,64,race),true);const quote=profile.previewTalentAllocation(race,0,levels);assert.ok(quote);assert.ok(profile.commitTalentAllocation(quote,quote.expectedRevision));const w=new World({race,permanentProfile:profile,seed:146,waves:false,sandbox:true,terrain:false,obstacles:[]});assert.equal(w.start(),true);return w;}
const target=(w:World)=>({x:w.anchor.x+Math.sin(w.anchor.facing)*12,z:w.anchor.z+Math.cos(w.anchor.facing)*12});
test('M04 rejects rear targets, saves preparation and atomically preserves commands and health on success',()=>{
 const w=world(),marine=w.familyUnits('marine')[0],where=target(w),rear={x:w.anchor.x-Math.sin(w.anchor.facing)*12,z:w.anchor.z-Math.cos(w.anchor.facing)*12};
 assert.equal(w.previewTalentTransfer(rear).ok,false);assert.equal(w.airlift(rear),false);assert.equal(w.airliftReady,0);
 const preview=w.previewTalentTransfer(where);assert.equal(preview.ok,true);assert.deepEqual(preview.participantIds,[marine.id]);marine.hp-=10;marine.weaponCooldown=3;assert.equal(w.airlift(where),true);const saved=structuredClone(w.talentTransferPlan);assert.ok(saved);
 const copy=world();copy.restoreRun(w.captureRun());assert.deepEqual(copy.talentTransferPlan,saved);assert.equal(copy.paused,true);copy.step();assert.equal(copy.time,w.time);
 copy.paused=false;copy.time=copy.talentTransferPlan!.readyAt;const before={hp:copy.entities.get(marine.id)!.hp,cooldown:copy.entities.get(marine.id)!.weaponCooldown};assert.equal(finishTalentTransfer(copy),true);
 const moved=copy.entities.get(marine.id)!;assert.ok(Math.hypot(moved.x-where.x,moved.z-where.z)<=6);assert.equal(moved.hp,before.hp);assert.equal(moved.weaponCooldown,before.cooldown);assert.equal(copy.talentTransferPlan,null);assert.ok(copy.airliftReady>copy.time);
});
test('M04 final blocked landing cancels everyone without cooldown or partial movement',()=>{
 const w=world('protoss'),zealot=w.familyUnits('zealot')[0],where=target(w),original={x:zealot.x,z:zealot.z};assert.equal(w.airlift(where),true);assert.ok(w.talentTransferPlan!.readyAt-w.time<=.25+1e-8);
 const blocker=w.addUnit('roach','zerg',where.x,where.z);blocker.unitRadius=30;w.time=w.talentTransferPlan!.readyAt;assert.equal(finishTalentTransfer(w),false);assert.deepEqual({x:zealot.x,z:zealot.z},original);assert.equal(w.airliftReady,0);assert.equal(w.talentTransferPlan,null);
});
test('M04 cancellation and a new squad command do not spend cooldown',()=>{
 const w=world(),where=target(w);assert.equal(w.airlift(where),true);assert.equal(w.cancelTalentTransfer(),true);assert.equal(w.cancelTalentTransfer(),false);assert.equal(w.airliftReady,0);
 assert.equal(w.airlift(where),true);w.issueMove({x:2,z:0});assert.equal(w.talentTransferPlan,null);assert.equal(w.airliftReady,0);
});
