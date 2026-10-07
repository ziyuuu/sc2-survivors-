import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {commandSlots,familyAction} from '../preview/battle-ui-feedback-20261008/console-model';
import {encodeGraph} from '../src/persistence/graph-codec';
import {lineTechnology} from '../preview/battle-ui-feedback-20261008/technology-model';
test('sample places heroes first, merges shared skills and retains every family without changing saved state',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.expedition.familySlots=['medivac','marine','hellion','tank','marauder'];w.expedition.tech['unlock.hellion']=1;w.upgrades.set('stim',1);
 for(let i=0;i<3;i++)w.addFamilyMember('marine',{x:i,z:0},i+1);w.addFamilyMember('marauder',{x:0,z:1},2);for(const id of ['raynor','tychus','nova']as const)assert.ok(w.acquireHero(id));
 const before=JSON.stringify(encodeGraph({run:w.captureRun(),profile:w.permanentProfile.exportJSON()})),slots=commandSlots(w);
 assert.equal(slots.length,7);assert.deepEqual(slots.slice(0,3).map(s=>s.action),['hero-slot-0','hero-slot-1','hero-slot-2']);assert.deepEqual(slots.slice(0,3).map(s=>s.hero),['raynor','tychus','nova']);
 const shared=slots.filter(s=>s.action==='stim');assert.equal(shared.length,1);assert.deepEqual(shared[0].families,['marine','marauder']);assert.equal(shared[0].count,5);assert.equal(shared[0].image,'tech.stim');
 assert.deepEqual(slots.slice(3).flatMap(s=>s.families??[]),['marine','marauder','hellion','tank','medivac']);assert.equal(slots.at(-1)!.family,'medivac');assert.equal(slots.at(-1)!.action,undefined);
 assert.equal(JSON.stringify(encodeGraph({run:w.captureRun(),profile:w.permanentProfile.exportJSON()})),before);
});
test('sample exposes each existing manual operation only after its actual technology gate',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();
 for(const f of ['marine','marauder','hellion','banshee','stalker']as const)assert.equal(familyAction(w,f),undefined);
 w.upgrades.set('stim',1);Object.assign(w.expedition.tech,{'unlock.hellion':1,cloak:1,blink:1});
 assert.deepEqual(['marine','marauder','hellion','banshee','stalker','medivac'].map(f=>familyAction(w,f as any)),['stim','stim','hellion-mode','banshee-cloak','stalker-blink',undefined]);
});
test('sample retains three empty hero positions at the front without inventing skills or deployed heroes',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();const heroes=commandSlots(w).slice(0,3);
 assert.equal(heroes.length,3);assert.ok(heroes.every(s=>!s.action&&!s.hero&&!s.image&&!s.enabled));assert.equal(w.heroes.size,0);
});
test('different native skills remain separate and families without unlocked skills retain their identities',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.expedition.familySlots=['medivac','marine','tank','marauder','hellion'];
 let units=commandSlots(w).slice(3);assert.deepEqual(units.map(s=>s.family),['tank','medivac','marine','marauder','hellion']);assert.equal(units.filter(s=>s.action).length,1);
 w.upgrades.set('stim',1);w.expedition.tech['unlock.hellion']=1;units=commandSlots(w).slice(3);assert.deepEqual(units.map(s=>s.action),['stim','siege','hellion-mode',undefined]);assert.equal(units.filter(s=>s.action==='stim').length,1);
});
test('facility technology lists unlocked and locked native units, skills and systems from current state only',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();Object.assign(w.expedition.tech,{'unlock.marine':1,'unlock.marauder':1,stim:1,'system.barracks':1});
 const before=JSON.stringify(encodeGraph(w.captureRun())),t=lineTechnology(w,'barracks');
 assert.deepEqual(t.families.map(f=>[f.family,f.unlocked]),[['marine',true],['marauder',true],['reaper',false]]);assert.deepEqual(t.skills.map(s=>[s.id,s.unlocked]),[['stim',true],['shield',false]]);assert.equal(t.system.unlocked,true);
 assert.equal(JSON.stringify(encodeGraph(w.captureRun())),before);w.expedition.tech['unlock.reaper']=1;assert.equal(lineTechnology(w,'barracks').families[2].unlocked,true);
});
