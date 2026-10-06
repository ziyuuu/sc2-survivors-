import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {LockedCatalog,child,number,value,summarizeUnits} from '../tools/resolve-expansion-data.mjs';
const directory=fileURLToPath(new URL('./fixtures/sc2-data/',import.meta.url));
test('pinned resolver applies later layer scalar changes and explicit removed attributes',()=>{
 const c=new LockedCatalog(directory),units=summarizeUnits(c);assert.equal(units.science_vessel,null);
 assert.equal(units.viking.hp,135);assert.equal(units.viking.cost.Minerals,'125');assert.equal(units.colossus.hp,250);assert.equal(units.sentry.attributes.Light,'0');
 assert.equal(units.colossus.layers[0],'liberty'); // A const named Colossus is not its CUnit.
});
test('parent effects and struct attribute overrides do not retain obsolete child values',()=>{
 const c=new LockedCatalog(directory);assert.equal(number(c.resolve('effect','TalonsMissileDamage'),'Amount'),4);
 const response=child(c.resolve('behavior','ImmortalOverload'),'DamageResponse');assert.equal(number(response,'ModifyLimit'),100);
 assert.equal(child(response,'ModifyLimit'),undefined);
 const train=child(c.resolve('abil','StargateTrain'),'InfoArray','Train5');assert.equal(train.attributes.Time,'52');
});
test('source graph has explicit weapon layers and no science-vessel combat substitute',()=>{
 const c=new LockedCatalog(directory);assert.equal(value(c.resolve('weapon','JavelinMissileLaunchers'),'TargetFilters').split(';')[0],'Air,Visible');
 assert.equal(c.resolve('unit','ScienceVessel'),null);assert.ok(c.resolve('unit','ScienceVesselACGluescreenDummy'));
});
