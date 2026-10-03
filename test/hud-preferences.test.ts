import test from 'node:test';
import assert from 'node:assert/strict';
import {HudSettings} from '../src/ui/hud/preferences';

test('map and army folds survive another run without changing input settings or gameplay saves',()=>{
 const values=new Map([['sc2.controls.v1','{"touch":"tap"}'],['battle-save','paid-ledger']]);const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)};
 const p=new HudSettings(storage);assert.deepEqual(p.report(),{mapCollapsed:false,armyCollapsed:false});p.toggle('mapCollapsed');assert.equal(p.armyCollapsed,false);p.toggle('armyCollapsed');const restored=new HudSettings(storage);assert.deepEqual(restored.report(),{mapCollapsed:true,armyCollapsed:true});restored.toggle('mapCollapsed');assert.equal(restored.armyCollapsed,true);assert.equal(values.get('battle-save'),'paid-ledger');assert.equal(values.get('sc2.controls.v1'),'{"touch":"tap"}');
});
test('missing, malformed or blocked UI storage leaves usable controls and keeps session folds',()=>{
 for(const raw of ['null','{"mapCollapsed":"true","armyCollapsed":1}','bad JSON']){const p=new HudSettings({getItem:()=>raw,setItem:()=>{throw Error('blocked');}});assert.equal(p.mapCollapsed,false);assert.equal(p.armyCollapsed,false);p.toggle('armyCollapsed');assert.equal(p.armyCollapsed,true);}
 const p=new HudSettings({getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}});p.toggle('mapCollapsed');assert.equal(p.mapCollapsed,true);
});
