import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AnimationClip} from 'three';
import {mapAnimations,attackAction,weaponAttachmentNames} from '../src/render/loaders/animations.ts';

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

test('Nova uses original canister-rifle animation group A rather than unarmed standby or blade attacks',()=>{const m=mapAnimations(['Stand','Walk','Death','Stand A','Walk A','Attack A','Death A','Spell E A','Attack C'].map(n=>new AnimationClip(n,1,[])),'hero.nova');assert.equal(m.idle?.name,'Stand A');assert.equal(m.move?.name,'Walk A');assert.equal(m.attack?.name,'Attack A');assert.equal(m.dead?.name,'Death A');assert.equal(m.skill?.name,'Spell E A');});


test('Marauder alternates original arms and resolves the matching original socket',()=>{
 const m=mapAnimations(['Stand','Stand Ready','Attack Right','Attack Left','Walk'].map(n=>new AnimationClip(n,2,[])));
 assert.equal(m[attackAction('marauder',1)]?.name,'Attack Right');assert.equal(m[attackAction('marauder',2)]?.name,'Attack Left');assert.equal(m.ready?.name,'Stand Ready');
 assert.equal(weaponAttachmentNames(m.attackLeft!.name)[0],'Ref_Weapon Left');assert.equal(weaponAttachmentNames(m.attackRight!.name)[0],'Ref_Weapon Right');assert.ok(weaponAttachmentNames('Attack Left').includes('Ref_Weapon_Left'));assert.ok(weaponAttachmentNames('Attack Right').includes('Ref_Weapon_Right'));assert.equal(attackAction('marine',1),'attack');
});

test('native burrow and Thor mode clips keep their distinct original animations',()=>{
 const m=mapAnimations(['Stand','Attack','Burrow','Unburrow','Stand Burrow','Attack Burrow','Morph Stand','Spell D'].map(n=>new AnimationClip(n,1,[])));
 assert.equal(m.burrow?.name,'Burrow');assert.equal(m.unburrow?.name,'Unburrow');assert.equal(m.burrowIdle?.name,'Stand Burrow');assert.equal(m.burrowAttack?.name,'Attack Burrow');assert.equal(m.highImpactIdle?.name,'Morph Stand');assert.equal(m.highImpactAttack?.name,'Spell D');
});

test('original aircraft without an Attack clip still fire from the Stand weapon mount',()=>{
 const battlecruiser=mapAnimations(['Stand','Walk','Spell A'].map(n=>new AnimationClip(n,1,[])),'hero.yamato_battlecruiser');
 assert.equal(battlecruiser.attack?.name,'Stand');
 assert.equal(battlecruiser.skill?.name,'Spell A');
 const leviathan=mapAnimations(['Stand','Walk','Spell'].map(n=>new AnimationClip(n,1,[])),'hero.hots_leviathan');
 assert.equal(leviathan.attack?.name,'Stand');
 assert.equal(leviathan.skill?.name,'Spell');
});

test('source weapon attachments cover side, bottom and Banshee pod nodes without a center fallback',()=>{
 const names=weaponAttachmentNames('Attack');
 for(const sourceNode of ['Ref_Weapon Right','Ref_Weapon Left','Ref_Weapon Bottom','Banshee_Pod1'])assert.ok(names.includes(sourceNode));
 const meleeSkill=mapAnimations(['Stand','Attack'].map(name=>new AnimationClip(name,1,[])));
 assert.equal(meleeSkill.skill?.name,'Attack');
 const shipSkill=mapAnimations([new AnimationClip('Stand',1,[])]);
 assert.equal(shipSkill.skill?.name,'Stand');
});
