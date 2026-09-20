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
