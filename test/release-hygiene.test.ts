import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {ASSETS} from '../src/assets/manifest';
import {HEROES} from '../src/data/heroes';
import {heroPresentation,heroSkillPresentation} from '../src/data/combat-presentation';

test('release catalog does not preload retired rescue pod or never-emitted textures',()=>{
 for(const id of ['model.droppod','fx.blast.7','fx.bile.8','fx.marauder.missile.0'])assert.equal(ASSETS.has(id),false,id);
 for(const id of ['model.barracks','model.hatchery','model.pylon','fx.pod.0','fx.bile.4'])assert.ok(ASSETS.has(id),id);
});
test('all current hero attacks and skills keep their texture dependencies',()=>{
 for(const id of Object.keys(HEROES) as (keyof typeof HEROES)[])for(const profile of [heroPresentation(id),heroSkillPresentation(id)]){
  assert.ok(ASSETS.has(profile.asset),`${id} launch ${profile.asset}`);assert.ok(ASSETS.has(profile.impact),`${id} impact ${profile.impact}`);
 }
});
test('every explicitly named combat texture remains in the runtime catalog',async()=>{
 for(const file of ['src/render/effects/battle-effects.ts','src/data/combat-presentation.ts']){
  const source=await fs.readFile(file,'utf8');for(const [id] of source.matchAll(/fx\.[a-zA-Z0-9_.]+/g))assert.ok(ASSETS.has(id),`${file}: ${id}`);
 }
});
