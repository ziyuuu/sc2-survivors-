import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {commandSlots,familyAction} from '../preview/battle-ui-feedback-20261008/console-model';
import {encodeGraph} from '../src/persistence/graph-codec';
test('sample groups all soldiers into five family slots and three hero slots without changing saved state',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.expedition.familySlots=['medivac','marine','hellion','tank','marauder'];w.expedition.tech['unlock.hellion']=1;w.upgrades.set('stim',1);
 for(let i=0;i<3;i++)w.addFamilyMember('marine',{x:i,z:0},i+1);for(const id of ['raynor','tychus','nova']as const)assert.ok(w.acquireHero(id));
 const before=JSON.stringify(encodeGraph({run:w.captureRun(),profile:w.permanentProfile.exportJSON()})),slots=commandSlots(w);
 assert.equal(slots.length,8);assert.equal(new Set(slots.slice(0,5).map(s=>s.family)).size,5);assert.equal(slots.filter(s=>s.family==='marine').length,1);assert.equal(slots.find(s=>s.family==='marine')!.count,4);
 assert.equal(slots[4].family,'medivac');assert.deepEqual(slots.slice(5).map(s=>s.action),['hero-slot-0','hero-slot-1','hero-slot-2']);
 assert.equal(JSON.stringify(encodeGraph({run:w.captureRun(),profile:w.permanentProfile.exportJSON()})),before);
});
test('sample exposes each existing manual operation only after its actual technology gate',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();
 for(const f of ['marine','marauder','hellion','banshee','stalker']as const)assert.equal(familyAction(w,f),undefined);
 w.upgrades.set('stim',1);Object.assign(w.expedition.tech,{'unlock.hellion':1,cloak:1,blink:1});
 assert.deepEqual(['marine','marauder','hellion','banshee','stalker','medivac'].map(f=>familyAction(w,f as any)),['stim','stim','hellion-mode','banshee-cloak','stalker-blink',undefined]);
});
test('sample retains three empty hero positions without inventing skills or deployed heroes',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();const heroes=commandSlots(w).slice(5);
 assert.equal(heroes.length,3);assert.ok(heroes.every(s=>!s.action&&!s.hero&&!s.image&&!s.enabled));assert.equal(w.heroes.size,0);
});
