import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {TERRAN_HERO_IDS,terranHeroGrowth} from '../src/data/terran-heroes';
import {HEROES,type HeroId} from '../src/data/heroes';
import {resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';
import {tickTerranHero,heroState,heroAttackSpeed} from '../src/simulation/combat/terran-hero-passives';
import {settleWeaponFlights} from './helpers/weapon-flight';
import {bindBattleView,activateBattleAction} from '../src/ui/controls/battle-actions';
import {activateHeroSlot} from '../src/ui/controls/skills';
import type {BattleView} from '../src/simulation/combat/battle-view';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const view:BattleView={ground:[{x:-20,z:-20},{x:20,z:-20},{x:20,z:20},{x:-20,z:20}],air:[{x:-20,z:-20},{x:20,z:-20},{x:20,z:20},{x:-20,z:20}],occludedGround:[],occludedAir:[]};
function setup(id:HeroId,rank=1){const w=new World({race:'terran',seed:1003,waves:false,sandbox:true,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();assert.ok(w.acquireHero(id));const u=w.heroEntity(id)!;u.x=u.z=0;u.rank=rank;w.heroes.get(id)!.rank=rank;w.refreshStats(u,true);return {w,u};}
function enemy(w:World,x=3,z=0,air=false){const u=w.addUnit('roach','zerg',x,z);u.hp=u.maxHp=100000;u.armor=0;u.flying=air;w.hash.rebuild(w.entities.values());return u;}
function resolve(w:World,time:number){w.time=time;w.hash.rebuild(w.entities.values());resolveExpeditionHeroCasts(w);}
for(const id of TERRAN_HERO_IDS)for(let rank=1;rank<=5;rank++)test(`P3-A ${id} ${rank}: final body DPS, active packet and saved rank`,()=>{
 const {w,u}=setup(id,rank),g=terranHeroGrowth(rank),d=HEROES[id],ray=id==='raynor';near(u.maxHp,d.hp*g.health*(ray?1.3:1));near(u.maxShield??0,d.shield*g.health*(ray?1.3:1));near(u.weaponDamage*d.attacks/u.attackPeriod,d.damage*d.attacks/d.period*g.health*(ray?1.3*1.3:1));
 u.hp-=50;u.weaponCooldown=.17;w.refreshStats(u);near(u.maxHp-u.hp,50);near(u.weaponCooldown,.17);
 const target=enemy(w);if(id==='swann'){const tank=w.addUnit('tank','terran',2,0);tank.maxHp=10000;tank.hp=1;assert.ok(w.castHero(id));resolve(w,4);near(tank.hp,1+10000*(.25+(rank-1)*.0625));return;}
 assert.ok(w.castHero(id,id==='tosh'?view:undefined));const cast=w.heroCasts[0];assert.equal(cast.rank,rank);const damage=cast.damage;
 u.rank=5;w.heroes.get(id)!.rank=5;w.refreshStats(u);const saved=w.captureRun(),copy=setup(id).w;copy.restoreRun(saved);assert.equal(copy.paused,true);copy.paused=false;
 resolve(copy,id==='tychus'?3.6:d.delay);near(100000-copy.entities.get(target.id)!.hp,id==='tychus'?damage:damage); // DOT pulses are scheduled after real blast, not backdated.
 if(id==='tychus'){for(const time of [4.6,5.6,6.6])resolve(copy,time);near(100000-copy.entities.get(target.id)!.hp,g.skill*.6);}
 const remaining=copy.entities.get(target.id)!.hp;resolve(copy,10);near(copy.entities.get(target.id)!.hp,remaining);
});
test('Raynor success counter resets with targets; third primary yields one armor piercing packet',()=>{
 const {w,u}=setup('raynor'),a=enemy(w),b=enemy(w,4);for(const t of [a,a,b,b,b])w.fire(u,t);near(100000-a.hp,u.weaponDamage*2);near(100000-b.hp,u.weaponDamage*4);assert.equal(heroState(u).cycles,3);
});
test('Tychus four-second warmup resets after two idle seconds and fifth cycle affects neighbor only once',()=>{
 const {w,u}=setup('tychus'),a=enemy(w),b=enemy(w,3,1);w.fire(u,a);w.time=1;w.fire(u,a);w.time=4;w.fire(u,a);near(heroAttackSpeed(w,u),1); // gap at 4 starts a new burst
 w.time=4.5;w.fire(u,a);w.time=5;w.fire(u,a);near(100000-b.hp,u.weaponDamage*.3);w.time=8;tickTerranHero(w,u,1/60);near(heroAttackSpeed(w,u),1);
 const s=heroState(u);s.warmupStart=8;s.lastFire=11.99;w.time=12;near(heroAttackSpeed(w,u),3);
});
test('Nova one free cloak episode, exact six seconds, firing reveals, one charge and elite multiplier',()=>{
 const {w,u}=setup('nova'),a=enemy(w);w.time=2;tickTerranHero(w,u,1/60);assert.equal(u.cloaked,true);assert.equal(u.maxEnergy,0);assert.equal(heroState(u).charge,1);w.time=8;tickTerranHero(w,u,1/60);assert.equal(u.cloaked,false);w.time=30;tickTerranHero(w,u,1/60);assert.equal(heroState(u).cloakUntil,8);
 a.enemyTier='boss';w.fire(u,a);near(100000-a.hp,u.weaponDamage*6);assert.equal(heroState(u).charge,0);assert.equal(u.cloaked,false);w.fire(u,a);near(100000-a.hp,u.weaponDamage*8);assert.ok(w.castHero('nova'));assert.equal(heroState(u).charge,1);assert.equal(w.castHero('nova'),false);assert.equal(heroState(u).charge,1);
});
test('Swann freezes seven full-health permanent mechanical bodies; blocks DOT/shields and survives caster death',()=>{
 const {w,u}=setup('swann'),allies=[];for(let i=0;i<9;i++)allies.push(w.addUnit('tank','terran',1+i*.3,0));const summon=w.addUnit('tank','terran',1,1);summon.temporary=true;const attacker=enemy(w);
 assert.ok(w.castHero('swann'));assert.equal(w.heroCasts[0].frozenTargets!.length,7);const a=allies[0],hp=a.hp;a.shield=100;a.maxShield=100;w.hit(a,1000,[],1,'zerg',0,1,attacker.id);assert.equal(a.hp,hp);assert.equal(a.shield,100);assert.equal(heroState(summon).protectedUntil,0);
 const saved=w.captureRun(),copy=setup('swann').w;copy.restoreRun(saved);const loaded=copy.entities.get(a.id)!;loaded.hp-=10;copy.entities.get(u.id)!.hp=0;copy.paused=false;resolve(copy,1);assert.equal(loaded.hp,hp-10);copy.hit(loaded,1000,[],1,'zerg',0,1,attacker.id);assert.equal(loaded.hp,hp-10);copy.time=5;copy.hit(loaded,1000,[],1,'zerg',0,1,attacker.id);assert.ok(loaded.hp<hp-10);
});
test('Swann repairs actual missing HP on at most seven recipients; team aura does not accumulate',()=>{
 const {w,u}=setup('swann',5),allies=[];for(let i=0;i<8;i++){const a=w.addUnit('tank','terran',1+i*.2,0);a.hp=a.maxHp=10000;a.hp-=600;allies.push(a);}tickTerranHero(w,u,1);assert.equal(u.healTargets?.length,7);near(allies[0].maxHp-allies[0].hp,120);near(allies[7].maxHp-allies[7].hp,600);const damage=allies[0].weaponDamage;for(let i=0;i<10;i++)w.refreshStats(allies[0]);near(allies[0].weaponDamage,damage);
});
test('Tosh requires valid bounds, rejects hidden/occluded targets and freezes saved recipients through view changes',()=>{
 const {w}=setup('tosh'),a=enemy(w),b=enemy(w,4,3),hidden=enemy(w,2,2),outside=enemy(w,30);hidden.cloaked=true;const bounds=structuredClone(view);bounds.occludedGround=[[{x:3,z:2},{x:5,z:2},{x:5,z:4},{x:3,z:4}]];
 assert.equal(w.castHero('tosh'),false);assert.equal(w.heroes.get('tosh')!.skillReady,0);assert.ok(w.castHero('tosh',bounds));assert.deepEqual(w.heroCasts[0].frozenTargets!.map(t=>t.id),[a.id]);a.x=30;outside.x=3;hidden.cloaked=false;bounds.ground=[];const copy=setup('tosh').w;copy.restoreRun(w.captureRun());copy.paused=false;resolve(copy,.5);near(copy.entities.get(a.id)!.hp,95400);near(copy.entities.get(outside.id)!.hp,100000);near(copy.entities.get(b.id)!.hp,100000);
});
test('Tosh shared action entry supplies view for keyboard/touch/gamepad and compatibility slot adapter',()=>{
 for(const action of ['shared','slot']){const {w}=setup('tosh');enemy(w);bindBattleView(w,()=>view);assert.ok(action==='shared'?activateBattleAction(w,'hero-slot-0'):activateHeroSlot(w,0));assert.equal(w.heroCasts[0].frozenTargets!.length,1);}
});
test('Yamato ground/air native packets stay within one DPS budget, neighbor maximum four, guide cannot damage',()=>{
 const {w,u}=setup('yamato_battlecruiser'),ground=enemy(w),air=enemy(w,3,1,true);w.fire(u,ground);assert.equal(w.weaponFlights.length,2);assert.equal(w.weaponFlights.reduce((n,p)=>n+p.damage*p.hits,0),600);settleWeaponFlights(w);near(100000-ground.hp,300);near(100000-air.hp,300);
 for(let i=0;i<6;i++)enemy(w,3+i*.05,2);heroState(u).cycles=7;w.fire(u,ground);settleWeaponFlights(w);assert.equal(w.visualEvents.filter(e=>e.kind==='weapon-area'&&e.heroId==='yamato_battlecruiser').length,4);
 assert.ok(w.castHero('yamato_battlecruiser'));const hp=ground.hp;resolve(w,w.heroCasts[0].at-.25);near(ground.hp,hp);resolve(w,w.heroCasts[0].at);assert.ok(ground.hp<hp);
});
test('Yamato frontal reduction and Tosh pressure affect real enemy packets without recursion',()=>{
 const {w,u}=setup('yamato_battlecruiser'),front=enemy(w,0,3),back=enemy(w,0,-3);u.attackFacing=0;u.armor=0;let hp=u.hp;w.hit(u,100,[],1,'zerg',0,1,front.id);near(hp-u.hp,75);hp=u.hp;w.hit(u,100,[],1,'zerg',0,1,back.id);near(hp-u.hp,100);
 assert.ok(w.acquireHero('tosh'));const tosh=w.heroEntity('tosh')!;tosh.x=tosh.z=0;w.fire(tosh,front);hp=u.hp;w.hit(u,100,[],1,'zerg',0,1,back.id);near(hp-u.hp,80);
});
