import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {commandSlots,familyAction} from '../preview/battle-ui-feedback-20261008/console-model';
import {encodeGraph} from '../src/persistence/graph-codec';
import {lineTechnology} from '../preview/battle-ui-feedback-20261008/technology-model';
test('sample keeps five independent family buttons and owned hero bindings without changing saved state',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.expedition.familySlots=['medivac','marine','hellion','tank','marauder'];w.expedition.tech['unlock.hellion']=1;w.upgrades.set('stim',1);
 for(let i=0;i<3;i++)w.addFamilyMember('marine',{x:i,z:0},i+1);w.addFamilyMember('marauder',{x:0,z:1},2);for(const id of ['raynor','tychus','nova']as const)assert.ok(w.acquireHero(id));
 const before=JSON.stringify(encodeGraph({run:w.captureRun(),profile:w.permanentProfile.exportJSON()})),slots=commandSlots(w);
 assert.equal(slots.length,8);const units=slots.filter(s=>s.family),heroes=slots.filter(s=>s.hero);assert.equal(units.length,5);assert.deepEqual(heroes.map(s=>s.action),['hero-slot-0','hero-slot-1','hero-slot-2']);assert.deepEqual(heroes.map(s=>s.hero),['raynor','tychus','nova']);
 const stim=units.filter(s=>s.action==='stim');assert.equal(stim.length,2);assert.deepEqual(stim.map(s=>s.family),['marine','marauder']);assert.deepEqual(stim.map(s=>s.count),[4,1]);assert.deepEqual(stim.map(s=>s.image),['unit.marine','unit.marauder']);
 assert.deepEqual(units.map(s=>s.family),['marine','hellion','tank','marauder','medivac']);assert.equal(units.at(-1)!.action,undefined);
 assert.equal(JSON.stringify(encodeGraph({run:w.captureRun(),profile:w.permanentProfile.exportJSON()})),before);
});
test('sample exposes each existing manual operation only after its actual technology gate',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();
 for(const f of ['marine','marauder','hellion','banshee','stalker']as const)assert.equal(familyAction(w,f),undefined);
 w.upgrades.set('stim',1);Object.assign(w.expedition.tech,{'unlock.hellion':1,cloak:1,blink:1});
 assert.deepEqual(['marine','marauder','hellion','banshee','stalker','medivac'].map(f=>familyAction(w,f as any)),['stim','stim','hellion-mode','banshee-cloak','stalker-blink',undefined]);
});
test('sample has no hero placeholders and adds only the actual owned hero skill',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();assert.equal(commandSlots(w).filter(s=>s.hero).length,0);assert.ok(commandSlots(w).every(s=>s.family));assert.equal(w.heroes.size,0);
 assert.ok(w.acquireHero('nova'));const heroes=commandSlots(w).filter(s=>s.hero);assert.equal(heroes.length,1);assert.equal(heroes[0].hero,'nova');assert.equal(heroes[0].key,'hero:0');assert.equal(heroes[0].action,'hero-slot-0');
});
test('different native skills remain separate and families without unlocked skills retain their identities',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.expedition.familySlots=['medivac','marine','tank','marauder','hellion'];
 let units=commandSlots(w).filter(s=>s.family);assert.deepEqual(units.map(s=>s.family),['tank','medivac','marine','marauder','hellion']);assert.equal(units.filter(s=>s.action).length,1);
 w.upgrades.set('stim',1);w.expedition.tech['unlock.hellion']=1;units=commandSlots(w).filter(s=>s.family);assert.deepEqual(units.map(s=>s.action),['stim','siege','stim','hellion-mode',undefined]);assert.equal(units.filter(s=>s.action==='stim').length,2);
});
test('facility technology lists unlocked and locked native units, skills and systems from current state only',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();Object.assign(w.expedition.tech,{'unlock.marine':1,'unlock.marauder':1,stim:1,'system.barracks':1});
 const before=JSON.stringify(encodeGraph(w.captureRun())),t=lineTechnology(w,'barracks');
 assert.deepEqual(t.families.map(f=>[f.family,f.unlocked]),[['marine',true],['marauder',true],['reaper',false]]);assert.deepEqual(t.skills.map(s=>[s.id,s.unlocked]),[['stim',true],['shield',false]]);assert.equal(t.system.unlocked,true);
 assert.equal(JSON.stringify(encodeGraph(w.captureRun())),before);w.expedition.tech['unlock.reaper']=1;assert.equal(lineTechnology(w,'barracks').families[2].unlocked,true);
});
