import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {World} from '../src/simulation/world';
import {sourceHologramDeath} from '../src/render/effects/combat-fx-profile';
import {SourceCombatEffects} from '../src/render/effects/source-combat-effects';
import {SOURCE_EFFECTS} from '../src/render/effects/source/player';
import {sourceLife} from '../src/render/effects/source/timeline';
import type {SourceEffectRequest} from '../src/render/effects/source/types';

test('three elite Science Vessel identities resolve the exact pinned skin death replacement, ordinary Science Vessel stays separate',()=>{
 const evidence=JSON.parse(fs.readFileSync('reports/qa/science-vessel-source-20261013.json','utf8'));
 assert.equal(evidence.hologram.skin,'PurifierHologram');assert.deepEqual(evidence.hologram.replacements.map((r:any)=>r.to),['Hologram_Skin_ScienceVessel','Hologram_Death_Large']);
 for(const eliteId of ['science_vessel.1','science_vessel.2','science_vessel.3']as const)assert.equal(sourceHologramDeath({unitType:'science_vessel',eliteId}),true);
 assert.equal(sourceHologramDeath({unitType:'science_vessel'}),false);assert.equal(sourceHologramDeath({unitType:'medivac',eliteId:'science_vessel.1'}),false);
 assert.equal(SOURCE_EFFECTS.Hologram_Death_Large.particles.length,4);assert.deepEqual(SOURCE_EFFECTS.Hologram_Death_Large.scale,[2,2,2]);
});

test('real elite death owns one source effect, freezes on pause, survives unit reclamation, expires and does not replay on restore',()=>{
 for(const eliteId of ['science_vessel.1','science_vessel.2','science_vessel.3']as const){
  const w=new World({race:'terran',seed:79,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();w.effects=[];for(const p of Object.values(w.expedition.production))p.enabled={};
  const u=w.addUnit('science_vessel','terran',0,0);u.eliteId=eliteId;u.modelKey='elite.science_vessel.1';w.time=5;w.tick=300;w.hit(u,1e9,[],1,'zerg');assert.equal(u.hp,0);
  const requests:SourceEffectRequest[]=[],fx={sourceEventIds:new Set<number>()},effects=new SourceCombatEffects(new THREE.Scene(),new THREE.PerspectiveCamera(),fx as any);Object.assign(effects.player,{ready:true,begin:()=>requests.splice(0),add:(r:SourceEffectRequest)=>requests.push(r),end:()=>{},reset:()=>{}});
  const render=()=>{const before=w.captureRun();effects.render(w,e=>({x:e.x,y:e.y,z:e.z}),()=>undefined);assert.deepEqual(w.captureRun(),before);return structuredClone(requests);};
  const first=render();assert.equal(first.length,1);assert.equal(first[0].model,'Hologram_Death_Large');assert.equal(first[0].clip,'Death');assert.ok(fx.sourceEventIds.has(w.visualEvents.find(e=>e.kind==='death')!.serial));assert.deepEqual(render(),first);
  w.entities.delete(u.id);w.time+=.2;assert.ok(Math.abs(render()[0].age-.2*1.4)<1e-12);w.time+=sourceLife(SOURCE_EFFECTS.Hologram_Death_Large)/1.4+1;assert.equal(render().length,0);
  w.restoreRun(w.captureRun());effects.reset();assert.equal(render().length,0);
 }
});
