import test from 'node:test';
import assert from 'node:assert/strict';
import {SC2_UNITS} from '../src/data/sc2-units';
import {ALL_FAMILIES,AIR_HERO_TYPES} from '../src/data/races';
import {CAMPAIGN_SCIENCE_VESSEL,SCIENCE_VESSEL_SOURCE,SCIENCE_VESSEL_REPAIR,SCIENCE_VESSEL_ADAPTATION,CAMPAIGN_SCIENCE_VESSEL_RECIPE} from '../src/data/campaign-science-vessel';
import {SOURCE_ABILITIES,SOURCE_WEAPON_PATTERNS,SOURCE_MOVEMENT,sourceWeaponsForUnit} from '../src/data/expansion-units';
import {EXPANSION_ELITES} from '../src/data/expansion-elites';
import {RUNTIME_ASSETS} from '../src/assets/runtime.generated';
test('science vessel is a separate verified campaign profile with the approved repair-only adapter',()=>{
 assert.equal(ALL_FAMILIES.length,30);assert.equal(Object.keys(AIR_HERO_TYPES).length,3);assert.equal(Object.keys(SC2_UNITS).length,33);assert.equal(SC2_UNITS.science_vessel,CAMPAIGN_SCIENCE_VESSEL);
 assert.equal(SCIENCE_VESSEL_SOURCE.version,'5.0.16.97563');assert.equal(CAMPAIGN_SCIENCE_VESSEL.attackDamage,0);
 assert.equal(CAMPAIGN_SCIENCE_VESSEL_RECIPE.productionTime,60/1.4);assert.equal(CAMPAIGN_SCIENCE_VESSEL_RECIPE.mineralCost,100);assert.equal(CAMPAIGN_SCIENCE_VESSEL_RECIPE.gasCost,200);
 assert.equal(SCIENCE_VESSEL_REPAIR.energyPerHp,.33);assert.equal(SCIENCE_VESSEL_ADAPTATION.biologicalRecoveryMultiplier,1/3);assert.equal(SCIENCE_VESSEL_ADAPTATION.passiveDetector,false);assert.equal(SCIENCE_VESSEL_ADAPTATION.irradiate,false);
});
test('weapon patterns preserve source target reuse and time domains',()=>{
 assert.deepEqual(SOURCE_WEAPON_PATTERNS.mutalisk.damage,[9,3,1]);assert.equal(SOURCE_WEAPON_PATTERNS.mutalisk.repeatTarget,false);
 assert.equal(SOURCE_WEAPON_PATTERNS.lurker.offsets.length,9);assert.equal(SOURCE_WEAPON_PATTERNS.lurker.searchRadius,.5);
 assert.equal(SOURCE_WEAPON_PATTERNS.colossus.forwardOffsets.length,11);assert.equal(SOURCE_WEAPON_PATTERNS.colossus.reverseOffsets.length,11);
 assert.ok(SOURCE_WEAPON_PATTERNS.voidRay.damageCooldownSeconds>SOURCE_WEAPON_PATTERNS.voidRay.beamSearchSeconds);assert.equal(SOURCE_WEAPON_PATTERNS.voidRay.hasAutomaticDamageRamp,false);
 assert.equal(SOURCE_ABILITIES.charge.duration,2.5);assert.equal(SOURCE_ABILITIES.charge.speedMultiplier,2.2);assert.equal(SOURCE_MOVEMENT.CliffJumper.pathMode,'Jumper');assert.equal(SOURCE_MOVEMENT.Colossus.pathMode,'Scaler');
 assert.equal(sourceWeaponsForUnit('thor','thor' as never).length,2);assert.equal(sourceWeaponsForUnit('thor','thor_high_impact')[0].targetType,'ground');
});
test('25 expansion families each have three recruitable effects on a verified original family model',()=>{
 const all=Object.values(EXPANSION_ELITES),available=new Set(RUNTIME_ASSETS.filter(a=>a.status==='available').map(a=>a.id));assert.equal(all.length,75);assert.equal(new Set(all.map(e=>e.family)).size,25);
 for(const family of new Set(all.map(e=>e.family)))assert.deepEqual(all.filter(e=>e.family===family).map(e=>e.id).sort(),[`${family}.1`,`${family}.2`,`${family}.3`]);
 for(const elite of all){assert.ok(elite.model.startsWith('elite.'+elite.family+'.'));assert.ok(available.has('model.'+elite.model));assert.ok(elite.sourceModel.length>0);assert.ok(Number.isFinite(elite.effect.amount));}
 assert.equal(EXPANSION_ELITES['adept.1'].effect.stat,'lightBonusMultiplier');assert.equal(EXPANSION_ELITES['stalker.1'].effect.stat,'armoredDamageMultiplier');
});
