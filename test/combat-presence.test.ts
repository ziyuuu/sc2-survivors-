import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {THREE_RACE_RULES} from '../src/data/races';
import {SC2_UNITS,type UnitType} from '../src/data/sc2-units';
import {hasCombatPotential} from '../src/simulation/combat/combat-presence';
import {ownedInterceptors,tickCarrierSubsystem} from '../src/simulation/combat/carriers';

function single(type:UnitType){const w=new World({rulesVersion:THREE_RACE_RULES,race:type==='lurker'?'zerg':type==='medivac'||type==='science_vessel'?'terran':'protoss',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();const u=w.addUnit(type,'terran',0,0);return {w,u};}
function finale(w:World){w.stage=18;w.stageElapsed=150;w.prepareStage();w.hive!.hp=0;w.endStage();}
function enterEndless(w:World){assert.equal(w.chooseCampaignExit('endless'),true);assert.equal(w.skipReward(),true);assert.equal(w.skipReward(),true);const plan=w.previewEndlessTransition()!;assert.ok(plan);const token=`${plan.requestId}:${plan.expectedRevision}:${plan.mapHash}`;assert.equal(w.registerEndlessReadyToken(token),true);assert.equal(w.commitEndlessTransition(plan.requestId,plan.expectedRevision,token),true);}

test('a lone carrier remains a fighter and can win then enter endless with indirect weapons',()=>{
 const {w,u}=single('carrier');assert.equal(SC2_UNITS.carrier.attackDamage,0);w.step();assert.equal(w.phase,'battle');assert.equal(hasCombatPotential(w,u),true);assert.equal(ownedInterceptors(w,u.id).length,4);finale(w);assert.equal(w.phase,'won');enterEndless(w);assert.equal(w.phase,'battle');
});
test('both deployed and mobile Lurkers retain their legal native combat potential at all gates',()=>{
 assert.equal(SC2_UNITS.lurker.attackDamage,0);
 for(const buried of [false,true]){const {w,u}=single('lurker');if(buried){u.nativeMode='lurker_burrowed';w.refreshStats(u);}assert.equal(hasCombatPotential(w,u),true);w.step();assert.equal(w.phase,'battle');finale(w);assert.equal(w.phase,'won');enterEndless(w);}
});
test('High Templar has the verified basic weapon without requiring Psi Storm research',()=>{
 const {w,u}=single('high_templar');assert.equal(w.expedition!.tech.storm,undefined);assert.ok(SC2_UNITS.high_templar.attackDamage>0);assert.equal(hasCombatPotential(w,u),true);w.step();assert.equal(w.phase,'battle');finale(w);assert.equal(w.phase,'won');enterEndless(w);
});
test('only pure medical/support units cannot prevent defeat or enter endless',()=>{
 for(const type of ['medivac','science_vessel'] as const){const {w,u}=single(type);assert.equal(hasCombatPotential(w,u),false);w.step();assert.equal(w.phase,'lost');w.phase='battle';finale(w);assert.equal(w.phase,'lost');w.phase='won';assert.equal(w.startEndless(),false);}
});
test('dead carriers and detached summons do not preserve the battle after the mother is gone',()=>{
 const {w,u}=single('carrier');tickCarrierSubsystem(w,0);const children=ownedInterceptors(w,u.id);assert.equal(children.length,4);assert.ok(children.every(child=>!hasCombatPotential(w,child)));u.hp=0;assert.equal(hasCombatPotential(w,u),false);w.step();assert.equal(w.phase,'lost');
});
test('legacy ordinary fighters and pure Medivacs keep their previous terminal classification',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();const medic=w.addUnit('medivac','terran',0,0);assert.equal(hasCombatPotential(w,medic),false);const marine=w.addUnit('marine','terran',2,0);assert.equal(hasCombatPotential(w,marine),true);w.step();assert.equal(w.phase,'battle');marine.hp=0;w.step();assert.equal(w.phase,'lost');
});
