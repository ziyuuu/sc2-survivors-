import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AnimationClip} from 'three';
import {mapAnimations} from '../src/render/loaders/animations.ts';

test('animation scan distinguishes siege from unsiege regardless of clip order',()=>{
 const names=['Tank_UnSiege','Tank_Stand','Tank_Walk','Tank_Run','Tank_Attack','Tank_Death','Tank_Birth','Tank_Siege'];
 const mapped=mapAnimations(names.map(name=>new AnimationClip(name,1,[])));
 assert.equal(mapped.sieging?.name,'Tank_Siege');
 assert.equal(mapped.unsieging?.name,'Tank_UnSiege');
 assert.equal(mapped.move?.name,'Tank_Run');
 assert.equal(mapped.idle?.name,'Tank_Stand');
 assert.equal(mapped.dead?.name,'Tank_Death');
 assert.equal(mapped.spawn?.name,'Tank_Birth');
 assert.equal(mapped.attack?.name,'Tank_Attack');
});

test('actual SC2 clip names prioritize full walking/attack and distinguish healing and morphs',()=>{
 const names=['Walk Start','Walk 01','Walk','Attack Cover','Attack','Stand Work Start','Stand Work','Stand','Morph Start','Morph End','Birth Walk','Birth','Flail'];
 const m=mapAnimations(names.map(name=>new AnimationClip(name,1,[])));
 assert.equal(m.move?.name,'Walk');assert.equal(m.attack?.name,'Attack');assert.equal(m.idle?.name,'Stand');
 assert.equal(m.heal?.name,'Stand Work');assert.equal(m.sieging?.name,'Morph Start');assert.equal(m.unsieging?.name,'Morph End');
 assert.equal(m.spawn?.name,'Birth');assert.equal(m.hit,undefined,'Flail is not falsely labeled as a hit reaction');
});
