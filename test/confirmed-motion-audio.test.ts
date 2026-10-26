import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {MotionAudio} from '../src/render/effects/motion-audio';
import {CombatAudioRouter} from '../src/render/effects/combat-audio-router';
import {SOUND_DATA} from '../src/render/effects/audio-source-data';
import {SC2_UNITS} from '../src/data/sc2-units';
const make=()=>{const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.pods=[];w.visualEvents=[];w.time=0;w.anchor.x=w.anchor.z=0;return w;};
const group=(w:World,type:'zergling'|'queen',n:number,x=0)=>Array.from({length:n},(_,i)=>{const u=w.addUnit(type,'terran',x+i*.001,0);u.velocity={x:SC2_UNITS[type].movementSpeed,z:0};u.action='move';return u;});
test('Dehaka actual Slow Walk emits source contacts once and never replays stopped or restored footsteps',()=>{
 const w=make(),r=new MotionAudio(),u=group(w,'zergling',1)[0];u.heroId='dehaka';r.update(w);const heard=[];
 for(let i=1;i<=1000;i++){w.time=i/1000;u.distanceWalked=w.time*SC2_UNITS.zergling.movementSpeed;heard.push(...r.update(w).cues.filter(c=>c.group!=='dialogue').map(c=>({time:w.time,bank:c.bank})));assert.equal(r.update(w).cues.length,0);}
 assert.deepEqual(heard,SOUND_DATA.walkEvents['hero:dehaka'].events.map(e=>({time:e.time,bank:e.bank})));
 u.velocity.x=0;u.distanceWalked+=10;assert.equal(r.update(w).cues.length,0);u.velocity.x=1;r.resumeAt(w);assert.equal(r.update(w).cues.length,0);u.hp=0;assert.equal(r.update(w).cues.length,0);
});
test('zergling herd uses local moving weight thresholds with cumulative source layers',()=>{
 const w=make(),r=new MotionAudio(),units=group(w,'zergling',9),channels=()=>r.update(w).channels.filter(c=>c.key.startsWith('herd:'));
 assert.equal(channels().length,0);units.push(...group(w,'zergling',1));assert.equal(channels().length,1);assert.equal(channels()[0].bank,'melee:zZerg_moveHerdSmall_loop');
 units.push(...group(w,'zergling',15));assert.equal(channels().length,2);units.push(...group(w,'zergling',75));assert.equal(channels().length,3);
 for(const u of units)u.velocity.x=0;assert.equal(channels().length,0);
});
test('distant squads, heroes, enemies and held/dead/invisible units cannot inflate a herd',()=>{
 const w=make(),r=new MotionAudio(),a=group(w,'zergling',5),b=group(w,'zergling',5,10);
 assert.equal(r.update(w).channels.length,0);for(const u of b)u.x=0;assert.equal(r.update(w).channels.length,1);
 b[0].hp=0;assert.equal(r.update(w).channels.length,0);b[0].hp=1;b[0].heldBy='test';assert.equal(r.update(w).channels.length,0);b[0].heldBy=undefined;b[0].heroId='dehaka';assert.equal(r.update(w).channels.length,0);b[0].heroId=undefined;b[0].owner='zerg';assert.equal(r.update(w).channels.length,0);b[0].owner='terran';b[0].x=100;assert.equal(r.update(w).channels.length,0);assert.ok(a.length);
});
test('queen herd pitch follows speed limits; pause and death release all group channels',()=>{
 const w=make(),r=new CombatAudioRouter(),units=group(w,'queen',7);let channels=r.update(w).channels;assert.equal(channels.length,1);assert.equal(channels[0].bank,'melee:zZerg_moveQueenHerdMedium_loop');assert.equal(channels[0].rate,1);
 for(const u of units)u.velocity.x*=2;assert.equal(r.update(w).channels[0].rate,1.3);for(const u of units)u.velocity.x=.04;assert.equal(r.update(w).channels[0].rate,.75);
 w.paused=true;assert.equal(r.update(w).channels.length,0);w.paused=false;assert.equal(r.update(w).channels.length,1);for(const u of units)u.hp=0;assert.equal(r.update(w).channels.length,0);
});
test('barracks propulsion runs only during the actual Terran carrier descent',()=>{
 for(const race of ['terran','zerg','protoss'] as const){const w=make(),r=new CombatAudioRouter();w.expedition.race=race;const p=w.spawnPod('marine',{x:0,z:0});assert.ok(p);w.time=p.createdAt+.1;
  const expected=race==='terran'?1:0;assert.equal(r.update(w).channels.filter(c=>c.key.startsWith('carrier-movement:')).length,expected);
  w.paused=true;assert.equal(r.update(w).channels.length,0);w.paused=false;r.resumeAt(w);assert.equal(r.update(w).channels.filter(c=>c.key.startsWith('carrier-movement:')).length,expected);
  w.time=p.landedAt;assert.equal(r.update(w).channels.length,0);w.time=p.createdAt+.1;p.status='destroyed';assert.equal(r.update(w).channels.length,0);
 }
});
