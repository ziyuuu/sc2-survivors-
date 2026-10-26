import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {MotionAudio} from '../src/render/effects/motion-audio';
import {CombatAudioRouter} from '../src/render/effects/combat-audio-router';
import {SOUND_DATA,SoundVariation} from '../src/render/effects/audio-source-data';
import {prepareEquipmentPreview,beforeEquipmentPreview} from '../tools/t01/equipment-preview-runtime';
import {DYNAMIC_CASES} from '../tools/t01/catalogue';
import type {UnitType} from '../src/data/sc2-units';
import {SC2_UNITS} from '../src/data/sc2-units';
import {HEROES} from '../src/data/heroes';
const make=()=>{const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.visualEvents=[];w.time=0;return w;};
test('native movement follows actual velocity, identity and stop/death, with bounded crowd voices',()=>{
 const w=make(),r=new MotionAudio(),u=w.addUnit('hellion','terran',0,0);
 assert.equal(r.update(w).channels.length,0);u.velocity={x:1,z:0};assert.equal(r.update(w).channels[0].bank,'melee:Hellion_Movement');
 u.nativeMode='hellbat';assert.equal(r.update(w).channels[0].bank,'melee:HellionTank_Movement');u.velocity={x:0,z:0};assert.equal(r.update(w).channels.length,0);
 u.velocity={x:1,z:0};u.hp=0;assert.equal(r.update(w).channels.length,0);
 for(let i=0;i<30;i++){const a=w.addUnit('thor','terran',i*.1,0);a.velocity={x:1,z:0};}assert.equal(r.update(w).channels.length,8);
});
test('all ten native transformation directions play once, with source event timing and no movement engine',()=>{
 for(const [key,banks]of Object.entries(SOUND_DATA.transforms)){
  const [family,mode]=key.split(':'),w=make(),r=new MotionAudio(),u=w.addUnit(family as UnitType,'terran',0,0);r.update(w);
  u.velocity={x:1,z:0};if(family==='tank'){u.desiredMode=mode as 'tank'|'siege';u.modeTimer=3;}else{u.desiredNativeMode=mode;u.nativeModeUntil=3;}
  const played:string[]=[];for(let n=0;n<180;n++){w.time=n/60;if(family==='tank')u.modeTimer=3-w.time;const f=r.update(w);played.push(...f.cues.filter(c=>c.group!=='dialogue').map(c=>c.bank));assert.equal(f.channels.length,0);assert.equal(r.update(w).cues.filter(c=>c.group!=='dialogue').length,0);}
  assert.deepEqual(played,banks,key);
 }
});
test('cancel, death and restore discard pending transformation events',()=>{
 for(const reason of ['cancel','death','restore']){
  const w=make(),r=new CombatAudioRouter(),u=w.addUnit('thor','terran',0,0);r.update(w);u.desiredNativeMode='thor_high_impact';u.nativeModeUntil=3;r.update(w);
  if(reason==='cancel')u.nativeModeUntil=undefined;else if(reason==='death')u.hp=0;else r.resumeAt(w);
  w.time=.95;assert.equal(r.update(w).cues.filter(c=>c.bank.includes('HighImpact')).length,0,reason);
 }
});
test('pause silences current voices but resumes only future transformation stages',()=>{
 const w=make(),r=new CombatAudioRouter(),u=w.addUnit('thor','terran',0,0);r.update(w);u.desiredNativeMode='thor_high_impact';u.nativeModeUntil=3;r.update(w);
 w.time=.6;assert.deepEqual(r.update(w).cues.map(c=>c.bank),[SOUND_DATA.transforms['thor:thor_high_impact'][0]]);
 w.paused=true;assert.equal(r.update(w).silentStop,true);w.paused=false;assert.equal(r.update(w).cues.length,0);
 w.time=1;assert.deepEqual(r.update(w).cues.map(c=>c.bank),[SOUND_DATA.transforms['thor:thor_high_impact'][1]]);
});
test('dialogue rotates living friendly speakers and each original sample without consuming gameplay randomness',()=>{
 const w=make(),r=new MotionAudio(),a=w.addUnit('marine','terran',0,0),b=w.addUnit('tank','terran',1,0);w.addUnit('thor','zerg',2,0);
 const seed=(w as unknown as {rngState:number}).rngState,shots=w.entities.size;w.time=2;const first=r.update(w).cues.find(c=>c.group==='dialogue');assert.ok(first?.bank.includes('Marine_'));
 w.time=30;assert.ok(r.update(w).cues.find(c=>c.group==='dialogue')?.bank.includes('SiegeTank_'));
 a.hp=0;w.time=60;assert.ok(r.update(w).cues.find(c=>c.group==='dialogue')?.bank.includes('SiegeTank_'));assert.equal((w as unknown as {rngState:number}).rngState,seed);assert.equal(w.entities.size,shots);assert.ok(b.hp>0);
 const bank=SOUND_DATA.banks['melee:Marine_What'],variation=new SoundVariation(),played=Array.from({length:bank.samples.length},()=>variation.sample('voice',bank,true).asset);assert.equal(new Set(played).size,bank.samples.length);
});
test('moving-fire equipment preview lets its ordinary tank shoot during real movement',()=>{
 const c=DYNAMIC_CASES.find(c=>c.id==='equipment:module.moving_fire.3:terran:1:unbound')!,w=make(),p=prepareEquipmentPreview(w,c),tank=w.allies().find(u=>u.unitType==='tank')!;let movingShots=0;
 for(let n=0;n<480;n++){beforeEquipmentPreview(w,p);const before=tank.shotSequence??0;w.step();if((tank.shotSequence??0)>before&&Math.hypot(tank.velocity.x,tank.velocity.z)>.01)movingShots++;}
 assert.ok(movingShots>0);assert.ok(w.entities.get(p.targetId)!.hp<w.entities.get(p.targetId)!.maxHp);
});
test('every hero has original dialogue, including the actual Leviathan, carrier flagship and Dragoon Fenix',()=>{
 for(const hero of Object.keys(HEROES))assert.ok(SOUND_DATA.dialogue['hero:'+hero]?.length,'missing hero dialogue: '+hero);
 assert.ok(SOUND_DATA.dialogue['hero:hots_leviathan'].every(k=>k.startsWith('swarm:Leviathan_')));
 assert.ok(SOUND_DATA.dialogue['hero:purifier_flagship'].every(k=>k.startsWith('melee:Carrier_')));
 assert.ok(SOUND_DATA.dialogue['hero:fenix'].every(k=>k.startsWith('coop:FenixDragoon_')));
});
test('short scene resets rotate through selection, acknowledgement and original idle lines',()=>{
 const r=new MotionAudio(),w=make();w.addUnit('marine','terran',0,0);const banks=[];
 for(let loop=0;loop<3;loop++){r.reset();w.time=2;banks.push(r.update(w).cues.find(c=>c.group==='dialogue')?.bank);}
 assert.deepEqual(banks,SOUND_DATA.dialogue.marine);assert.equal(new Set(banks).size,3);
});
test('sequential original dialogue preserves line order across complete rounds',()=>{
 const bank=SOUND_DATA.banks['coop:FenixDragoon_Pissed'],variation=new SoundVariation();assert.equal(bank.fields.Select.value,'Sequential');
 const played=Array.from({length:bank.samples.length*2},()=>variation.sample('fenix-dialogue',bank,true).asset);
 assert.deepEqual(played,[...bank.samples,...bank.samples].map(s=>s.asset));
});
test('Zagara footsteps use all four original Walk events and the same distance clock as rendering',()=>{
 const w=make(),r=new MotionAudio(),u=w.addUnit('queen','terran',0,0);u.heroId='zagara';u.action='move';u.velocity={x:1,z:0};r.update(w);
 const heard:{time:number;bank:string}[]=[];
 for(let n=1;n<=100;n++){w.time=n/100;u.distanceWalked=w.time*SC2_UNITS.queen.movementSpeed;for(const c of r.update(w).cues)heard.push({time:w.time,bank:c.bank});assert.equal(r.update(w).cues.length,0);}
 assert.deepEqual(heard,SOUND_DATA.walkEvents['hero:zagara'].events.map(e=>({time:e.time,bank:e.bank})));
});
test('Dragoon movement start is one-shot; stopping, death and restore do not replay footstep backlog',()=>{
 const w=make(),r=new MotionAudio(),u=w.addUnit('immortal','terran',0,0);u.heroId='fenix';u.action='move';u.velocity={x:1,z:0};
 const start=SOUND_DATA.motionStart['hero:fenix'];assert.deepEqual(r.update(w).cues.map(c=>c.bank),[start]);assert.equal(r.update(w).cues.length,0);assert.equal(r.update(w).channels.length,0);
 u.distanceWalked=.23*SC2_UNITS.immortal.movementSpeed;assert.equal(r.update(w).cues.length,1);
 u.velocity={x:0,z:0};u.distanceWalked=3*SC2_UNITS.immortal.movementSpeed;assert.equal(r.update(w).cues.length,0);
 u.velocity={x:1,z:0};assert.deepEqual(r.update(w).cues.map(c=>c.bank),[start]);u.distanceWalked=9*SC2_UNITS.immortal.movementSpeed;r.resumeAt(w);assert.equal(r.update(w).cues.length,0);
 u.hp=0;assert.equal(r.update(w).cues.length,0);
});
