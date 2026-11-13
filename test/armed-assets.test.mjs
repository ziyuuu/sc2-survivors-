import test from 'node:test';
import assert from 'node:assert/strict';
import {loadArmedSupportAssets} from '../tools/armed-support-assets.mjs';
import {RUNTIME_ASSETS} from '../src/assets/runtime.generated';
import {ARMED_SUPPORT_ASSETS} from '../src/assets/armed-support';
import {ASSETS} from '../src/assets/manifest';
test('armed shipping models retain immutable original sources and exclude unused prototype candidates',async()=>{
 const rows=await loadArmedSupportAssets({check:true});assert.equal(rows.length,10);assert.equal(new Set(rows.map(r=>r.packedSha256)).size,9);
 assert.deepEqual(rows.filter(r=>r.id.includes('sensor_payload')),[]);
 assert.equal(rows.filter(r=>r.id.includes('supply_depot')).length,2);
 const planetary=rows.find(r=>r.id==='model.fort.planetary'),command=rows.find(r=>r.id==='model.fort.command_center');assert.equal(planetary.packedSha256,command.packedSha256);assert.ok(planetary.animations.includes('Stand A'));assert.ok(planetary.animations.includes('Attack'));
 assert.ok(rows.find(r=>r.id==='model.battlecruiser.death').sourcePath.includes('BattleCruiserDeathEx1_00'));
});
test('formal asset resolution retains distinct armed and core identities without duplicate registry entries',async()=>{
 const rows=[...RUNTIME_ASSETS,...ARMED_SUPPORT_ASSETS],armed=await loadArmedSupportAssets();assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
 for(const model of armed){assert.equal(ASSETS.get(model.id).url,model.url);assert.equal(ASSETS.get(model.id).status,'available');}
 assert.ok(ASSETS.has('model.hero.yamato_battlecruiser'));assert.ok(ASSETS.has('model.marine'));
});
