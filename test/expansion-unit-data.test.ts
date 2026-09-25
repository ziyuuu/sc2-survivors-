import test from 'node:test';
import assert from 'node:assert/strict';
import {ADDED_UNIT_IDS,EXPANSION_FAMILIES,EXPANSION_UNITS,VERIFIED_EXPANSION_UNITS,SOURCE_UNIT_DETAILS,SOURCE_UNIT_MODES,SOURCE_WEAPONS,SOURCE_PRODUCTION_RECIPES} from '../src/data/expansion-units';
const approximately=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
test('catalog names 30 families without counting modes and blocks missing science vessel data',()=>{
 assert.equal(EXPANSION_FAMILIES.length,30);assert.equal(new Set(EXPANSION_FAMILIES).size,30);
 assert.equal(ADDED_UNIT_IDS.length,20);assert.equal(Object.keys(VERIFIED_EXPANSION_UNITS).length,19);
 assert.equal(EXPANSION_UNITS.science_vessel,null);assert.equal(SOURCE_PRODUCTION_RECIPES.science_vessel,null);
 assert.ok(!EXPANSION_FAMILIES.includes('hellbat' as never));
});
test('Faster rates and durations convert in opposite directions and creep is not baked twice',()=>{
 const reaper=VERIFIED_EXPANSION_UNITS.reaper;approximately(reaper.movementSpeed,3.75*1.4);approximately(reaper.attackPeriod,1.1/1.4);
 approximately(reaper.hpRegenPerSecond,2*1.4);approximately(reaper.hpRegenDelay,10/1.4);
 const queen=VERIFIED_EXPANSION_UNITS.queen;approximately(queen.movementSpeed,.9375*1.4);assert.equal(queen.creepSpeedMultiplier,2.6665);
 approximately(queen.movementSpeed*queen.creepSpeedMultiplier,3.49978125);
});
test('latest selected balance layers override obsolete remembered stats',()=>{
 assert.equal(VERIFIED_EXPANSION_UNITS.viking.maxHp,135);assert.equal(VERIFIED_EXPANSION_UNITS.viking.mineralCost,125);
 assert.equal(VERIFIED_EXPANSION_UNITS.queen.mineralCost,175);assert.equal(VERIFIED_EXPANSION_UNITS.lurker.maxHp,190);
 assert.equal(VERIFIED_EXPANSION_UNITS.immortal.mineralCost,275);assert.equal(VERIFIED_EXPANSION_UNITS.void_ray.mineralCost,200);
 assert.equal(VERIFIED_EXPANSION_UNITS.colossus.maxHp,250);assert.equal(VERIFIED_EXPANSION_UNITS.colossus.maxShields,100);
 assert.ok(!VERIFIED_EXPANSION_UNITS.sentry.attributes.includes('Light'));
});
test('morph recipes include precursor time once and already-total unit price once',()=>{
 const bane=SOURCE_PRODUCTION_RECIPES.baneling!,rav=SOURCE_PRODUCTION_RECIPES.ravager!,lurker=SOURCE_PRODUCTION_RECIPES.lurker!;
 assert.deepEqual([bane.mineralCost,bane.gasCost],[50,25]);approximately(bane.productionTime,44/1.4);
 assert.deepEqual([rav.mineralCost,rav.gasCost],[100,100]);approximately(rav.productionTime,44/1.4);
 assert.deepEqual([lurker.mineralCost,lurker.gasCost],[150,150]);approximately(lurker.productionTime,58.25/1.4);
 assert.equal(SOURCE_PRODUCTION_RECIPES.zergling!.batchBodyCount,2);assert.equal(SOURCE_PRODUCTION_RECIPES.zergling!.mineralCost,25);
});
test('weapons retain target layers, attack multiplicity, source bonuses, and exact modes',()=>{
 assert.equal(VERIFIED_EXPANSION_UNITS.reaper.attacks,2);assert.deepEqual(VERIFIED_EXPANSION_UNITS.reaper.bonusDamage,[]);
 assert.equal(SOURCE_WEAPONS.ThorsHammer.targetType,'ground');assert.equal(SOURCE_WEAPONS.JavelinMissileLaunchers.targetType,'air');
 assert.equal(SOURCE_WEAPONS.TalonsMissile.attacks,2);assert.equal(SOURCE_WEAPONS.AcidSpines.attacks,1);assert.equal(SOURCE_WEAPONS.AcidSpines.attackRange,7);
 assert.equal(SOURCE_WEAPONS.DisruptionBeam.shieldBonus,4);assert.equal(SOURCE_UNIT_MODES.viking_assault.weapon.targetType,'ground');
 assert.equal(VERIFIED_EXPANSION_UNITS.lurker.attackDamage,0);assert.equal(SOURCE_UNIT_MODES.lurker_burrowed.weapon.attackDamage,20);
 assert.equal(VERIFIED_EXPANSION_UNITS.carrier.attackDamage,0);assert.equal(SOURCE_WEAPONS.InterceptorBeam.attackDamage,5);
 assert.deepEqual(VERIFIED_EXPANSION_UNITS.colossus.targetPlanes,['ground','air']);assert.equal(VERIFIED_EXPANSION_UNITS.colossus.flying,false);
});
test('every verified body has finite source combat and production fields',()=>{
 for(const [id,unit] of Object.entries(VERIFIED_EXPANSION_UNITS)) {
  for(const key of ['maxHp','armor','movementSpeed','attackDamage','attacks','attackPeriod','attackRange','productionTime','mineralCost','gasCost','unitRadius','damagePoint','maxShields','energyRegenPerSecond'] as const)assert.ok(Number.isFinite(unit[key]),`${id}.${key}`);
  assert.ok(unit.maxHp>0);assert.ok(unit.productionTime>0);assert.ok(unit.unitRadius>0);assert.ok(SOURCE_UNIT_DETAILS[id as keyof typeof SOURCE_UNIT_DETAILS]);
 }
});
