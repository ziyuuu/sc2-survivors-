import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AnimationClip,NumberKeyframeTrack} from 'three';
import {mapAnimations,attackAction,weaponAttachmentNames,selectAttackPresentation,sourceAnimationName} from '../src/render/loaders/animations.ts';

test('Thor high-impact walking retains the native leg motion and deployed cannon tracks',()=>{
 const leg=new NumberKeyframeTrack('Bone_Leg_Upper_L.position[x]',[0,1],[0,2]);
 const ordinaryCannon=new NumberKeyframeTrack('CannonMount_L.position[x]',[0,1],[1,2]);
 const deployedCannon=new NumberKeyframeTrack('CannonMount_L.position[x]',[0,2],[10,10]);
 const clips=[new AnimationClip('Stand',1,[]),new AnimationClip('Walk',1,[leg,ordinaryCannon]),new AnimationClip('Morph Stand',2,[deployedCannon])];
 const before=clips.map(clip=>clip.toJSON());
 for(const profile of ['thor','elite.thor.1']){
  const mapped=mapAnimations(clips,profile),move=mapped.highImpactMove;
  assert.ok(move,'the deployed mode needs its own locomotion pose');
  assert.equal(move.duration,1);
  assert.equal(move.tracks.find(t=>t.name===leg.name),leg,'keep the exact authored walk');
  assert.equal(move.tracks.find(t=>t.name===deployedCannon.name),deployedCannon,'keep the exact deployed cannon pose');
  assert.equal(move.tracks.length,2,'no duplicate bindings may blend the cannon back to ordinary mode');
  assert.equal(mapped.move,clips[1]);assert.equal(mapped.highImpactIdle,clips[2]);
 }
 assert.deepEqual(clips.map(clip=>clip.toJSON()),before,'the source clips remain unchanged');
 assert.equal(mapAnimations(clips,'marine').highImpactMove,undefined);
});

test('Thor high-impact aim and both weapons retain deployment without changing authored body motion',()=>{
 const cannon=new NumberKeyframeTrack('CannonMount_L.position[x]',[0,2],[10,10]);
 const clips=['Stand','Walk','Stand Ready','Attack','Spell D'].map((name,i)=>new AnimationClip(name,2,[new NumberKeyframeTrack('Torso.position[x]',[0,2],[i,i+1])]));
 clips.push(new AnimationClip('Morph Stand',2,[cannon]));
 const before=clips.map(c=>c.toJSON());
 for(const key of ['thor','elite.thor.1']){
  const a=mapAnimations(clips,key);
  for(const [action,source]of [['highImpactMove','Walk'],['highImpactReady','Stand Ready'],['highImpactGroundAttack','Attack'],['highImpactAttack','Spell D']] as const){
   const pose=a[action],original=clips.find(c=>c.name===source)!;assert.ok(pose);
   assert.equal(pose.tracks.find(t=>t.name===cannon.name),cannon);assert.equal(pose.tracks.find(t=>t.name==='Torso.position[x]'),original.tracks[0]);
   assert.equal(sourceAnimationName(pose),source,'material timelines use the corresponding original clip');
  }
  assert.equal(new Set(Object.values(a).filter(Boolean).map(c=>c!.name)).size,new Set(Object.values(a).filter(Boolean)).size,'pose atlas keys cannot collide');
 }
 assert.deepEqual(clips.map(c=>c.toJSON()),before);
});

test('Thor high-impact windup and shot recovery use the selected native weapon even after the target is gone',()=>{
 const a=mapAnimations(['Stand','Stand Ready','Attack','Spell D'].map(name=>new AnimationClip(name,2,[])).concat(new AnimationClip('Morph Stand',2,[new NumberKeyframeTrack('CannonMount_L.position[x]',[0,2],[10,10])])),'thor');
 const unit={unitType:'thor',nativeMode:'thor_high_impact',hp:100,action:'idle',lastShotAt:10,shotSequence:1,shotInterval:1,windup:0,modeTimer:0} as const;
 for(const [weapon,action]of [['LanceMissileLaunchers','highImpactAttack'],['ThorsHammer','highImpactGroundAttack']]){
  const u={...unit,activeWeapon:weapon},before={...u};
  assert.equal(selectAttackPresentation({...u,action:'attack',windup:.2},10,a)?.action,'highImpactReady');
  assert.equal(selectAttackPresentation(u,10.1,a)?.action,action);
  assert.equal(selectAttackPresentation(u,12,a),null);assert.deepEqual(u,before);
 }
 assert.equal(selectAttackPresentation({...unit,nativeMode:'thor',activeWeapon:'ThorsHammer'},10.1,a)?.action,'attack');
});

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
