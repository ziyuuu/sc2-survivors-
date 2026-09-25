import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {HEROES,HERO_IDS,HERO_IDS_BY_RACE,ALL_HERO_IDS,type HeroId} from '../src/data/heroes';
import type {Race} from '../src/data/races';
import {acquireExpeditionHero,canAcquireExpeditionHero,canCastExpeditionHero,castExpeditionHero,resolveExpeditionHeroCasts,heroAtSlot} from '../src/simulation/combat/expedition-heroes';
import {EXPEDITION_SKILLS,skillsFor,heroForSlot,stickSkill} from '../src/ui/controls/skills';
import {readArchive,writeArchive} from '../src/persistence/archive';
function setup(race:Race){const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],rulesVersion:'three-race-18-v1',race});w.start();w.entities.clear();w.heroes.clear();return w;}
function hero(w:World,id:HeroId){assert.ok(acquireExpeditionHero(w,id,()=>true));const u=w.heroEntity(id)!;u.x=u.z=0;return u;}
function target(w:World,x=4,z=0){const u=w.addUnit('roach','zerg',x,z);u.hp=u.maxHp=10000;u.armor=0;w.hash.rebuild(w.entities.values());return u;}
function resolve(w:World,time:number){w.time=time;w.hash.rebuild(w.entities.values());resolveExpeditionHeroCasts(w);}
const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} ~= ${expected}`);

test('three aligned six-hero rosters preserve legacy IDs and exact approved base profiles',()=>{
 assert.deepEqual(HERO_IDS,['raynor','tychus','nova']);assert.equal(ALL_HERO_IDS.length,18);for(const roster of Object.values(HERO_IDS_BY_RACE))assert.equal(roster.length,6);
 assert.equal(HEROES.artanis.attacks,2);assert.equal(HEROES.fenix.damage,72);assert.equal(HEROES.niadra.hp,690);assert.equal(HEROES.swann.cooldown,15);
 for(const race of ['terran','zerg','protoss'] as const)for(const id of HERO_IDS_BY_RACE[race]){
  const w=setup(race),u=hero(w,id),data=HEROES[id];assert.equal(u.race,race);assert.equal(u.maxHp,data.hp);assert.equal(u.maxShield,data.shield);assert.equal(u.weaponDamage,data.damage);assert.equal(u.attackRange,data.range);assert.equal(u.modelKey,data.model);assert.equal(u.maxEnergy,0);
  const mechanical=['fenix','yamato_battlecruiser','purifier_flagship'].includes(id);
  assert.equal(u.attributes.includes('Mechanical'),mechanical);assert.equal(u.attributes.includes('Biological'),!mechanical);assert.equal(u.flying,!!data.flying);assert.equal(u.cloaked,data.innateCloak);
 }
});

test('three recruited identities include dead heroes, preserve slot order, and reject other races or missing models',()=>{
 const w=setup('terran');assert.equal(canAcquireExpeditionHero(w,'swann',()=>false),false);assert.equal(canAcquireExpeditionHero(w,'kerrigan',()=>true),false);
 const tosh=hero(w,'tosh');hero(w,'nova');hero(w,'swann');assert.deepEqual([heroAtSlot(w,0),heroAtSlot(w,1),heroAtSlot(w,2)],['tosh','nova','swann']);
 tosh.hp=0;w.heroes.get('tosh')!.skillReady=99;assert.equal(canAcquireExpeditionHero(w,'raynor',()=>true),false);assert.ok(acquireExpeditionHero(w,'tosh',()=>true));assert.equal(tosh.hp,0);assert.equal(w.heroes.get('tosh')!.rank,2);assert.equal(w.heroes.get('tosh')!.skillReady,99);assert.equal(heroAtSlot(w,0),'tosh');
});

test('hero upgrade preserves lost HP, lost shields, attack cooldown, and player command',()=>{
 const w=setup('protoss'),u=hero(w,'fenix');u.hp-=100;u.shield!-=50;u.weaponCooldown=.7;w.issueMove({x:20,z:4});const order=w.order;
 assert.ok(acquireExpeditionHero(w,'fenix',()=>true));assert.equal(u.maxHp,678);assert.equal(u.hp,578);assert.equal(u.maxShield,528);assert.equal(u.shield,478);assert.equal(u.weaponCooldown,.7);assert.equal(w.order,order);
});

test('Swann requires real mechanical damage, heals four paid-cooldown pulses, and cancels on range loss',()=>{
 const w=setup('terran'),u=hero(w,'swann');assert.equal(canCastExpeditionHero(w,'swann'),false);assert.equal(w.heroes.get('swann')!.skillReady,0);
 const ally=w.addUnit('tank','terran',2,0);ally.hp=1;ally.maxHp=1000;assert.ok(castExpeditionHero(w,'swann'));assert.equal(w.heroes.get('swann')!.skillReady,15);assert.equal(ally.hp,1);
 resolve(w,1);assert.equal(ally.hp,76);resolve(w,2);assert.equal(ally.hp,151);ally.x=30;resolve(w,3);assert.equal(ally.hp,151);assert.equal(w.heroCasts.length,0);assert.equal(u.energy,0);
});

test('Niadra heals five most injured biological allies, not herself or mechanical targets',()=>{
 const w=setup('zerg'),u=hero(w,'niadra');u.hp=50;const allies=[];for(let i=0;i<6;i++){const ally=w.addUnit('zergling','terran',1+i*.2,1);ally.maxHp=1000;ally.hp=100+i*100;allies.push(ally);}const mechanical=w.addUnit('tank','terran',2,-1);mechanical.hp=1;
 assert.ok(castExpeditionHero(w,'niadra'));for(let i=0;i<6;i++)assert.equal(allies[i].hp,220+i*100);assert.equal(u.hp,50);assert.equal(mechanical.hp,1);
});

test('Artanis restores shields including himself without healing HP or changing cooldowns',()=>{
 const w=setup('protoss'),u=hero(w,'artanis');u.shield=0;u.hp=100;u.weaponCooldown=.9;const ally=w.addUnit('zealot','terran',2,0);ally.shield=0;ally.hp=20;
 assert.ok(castExpeditionHero(w,'artanis'));assert.equal(u.shield,150);assert.equal(u.hp,100);assert.equal(u.weaponCooldown,.9);assert.equal(ally.shield,Math.min(150,ally.maxShield!));assert.equal(ally.hp,20);
});

test('Kerrigan line skill hits each aligned ground/air target once and leaves off-axis targets and orders intact',()=>{
 const w=setup('zerg');hero(w,'kerrigan');const a=target(w,3),b=target(w,6),c=target(w,4,3);b.flying=true;w.hash.rebuild(w.entities.values());w.issueMove({x:20,z:2});const order=w.order;assert.ok(castExpeditionHero(w,'kerrigan'));resolve(w,.29);assert.equal(a.hp,10000);resolve(w,.5);
 assert.equal(a.hp,9700);assert.equal(b.hp,9700);assert.equal(c.hp,10000);assert.equal(w.order,order);assert.equal(w.heroCasts.length,0);
});

test('Zagara launches three distinct delayed explosive impacts',()=>{
 const w=setup('zerg');hero(w,'zagara');const enemy=target(w,4);assert.ok(castExpeditionHero(w,'zagara'));assert.equal(w.heroCasts.length,3);assert.deepEqual(w.heroCasts.map(c=>Number(c.at.toFixed(2))),[.7,.82,.94]);
 resolve(w,.7);assert.equal(enemy.hp,9900);resolve(w,.82);assert.equal(enemy.hp,9800);resolve(w,.94);assert.equal(enemy.hp,9700);
});

test('Dehaka heals from actual damage, respects ground unit targets, and cannot execute structures',()=>{
 const w=setup('zerg'),u=hero(w,'dehaka');u.hp=100;const enemy=target(w,2);enemy.hp=100;assert.ok(castExpeditionHero(w,'dehaka'));resolve(w,.35);assert.equal(enemy.hp,0);assert.equal(u.hp,135);
 w.heroes.get('dehaka')!.skillReady=0;const structure=target(w,1);structure.attributes=['Structure'];assert.equal(castExpeditionHero(w,'dehaka'),false);assert.equal(w.heroes.get('dehaka')!.skillReady,0);
});

test('Tosh and Alarak apply the configured ordinary/Boss slow values',()=>{
 const w=setup('terran');hero(w,'tosh');const normal=target(w,4),boss=target(w,4,1);boss.enemyTier='boss';assert.ok(castExpeditionHero(w,'tosh'));resolve(w,.49);assert.equal(normal.hp,10000);resolve(w,.5);assert.equal(normal.hp,9780);assert.equal(normal.moveSlowFactor,.35);assert.equal(boss.moveSlowFactor,.175);
 const p=setup('protoss');hero(p,'alarak');const unit=target(p,4),leader=target(p,6);leader.enemyTier='boss';assert.ok(castExpeditionHero(p,'alarak'));resolve(p,.55);assert.equal(unit.hp,9700);assert.equal(unit.moveSlowFactor,.4);assert.equal(leader.moveSlowFactor,.2);
});

test('Stukov damage over time survives save/load and source death without stacking one source',()=>{
 const w=setup('zerg'),u=hero(w,'stukov'),enemy=target(w);assert.ok(castExpeditionHero(w,'stukov'));assert.equal(enemy.hp,10000);resolve(w,.25);assert.equal(enemy.hp,9920);assert.equal(w.heroCasts.length,4);
 const saved=readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()})).bundle.run!;
 const copy=setup('zerg');copy.restoreRun(saved);copy.paused=false;copy.entities.delete(u.id);for(let time=1.25;time<=4.25;time++)resolve(copy,time);assert.equal(copy.entities.get(enemy.id)!.hp,9780);assert.equal(copy.heroCasts.length,0);
});

test('Zeratul and Vorazun retain innate cloak; invisible targets require active detection',()=>{
 const w=setup('protoss'),u=hero(w,'zeratul'),enemy=target(w,2);enemy.cloaked=true;assert.equal(u.cloaked,true);assert.equal(castExpeditionHero(w,'zeratul'),false);assert.equal(w.heroes.get('zeratul')!.skillReady,0);
 assert.ok(w.castDetection());assert.ok(castExpeditionHero(w,'zeratul'));resolve(w,.25);assert.equal(enemy.hp,9480);
});

test('Fenix solar cannon has fixed area delay; Vorazun freezes ordinary units and only slows Bosses',()=>{
 const w=setup('protoss');hero(w,'fenix');const enemy=target(w,6),other=target(w,6,1);assert.ok(castExpeditionHero(w,'fenix'));resolve(w,.59);assert.equal(enemy.hp,10000);resolve(w,.6);assert.equal(enemy.hp,9640);assert.equal(other.hp,9640);
 const p=setup('protoss');hero(p,'vorazun');const normal=target(p,4),boss=target(p,4,1);boss.enemyTier='boss';assert.ok(castExpeditionHero(p,'vorazun'));resolve(p,.25);assert.equal(normal.stoppedUntil,3.25);assert.equal(boss.stoppedUntil,undefined);assert.equal(boss.moveSlowFactor,.3);assert.equal(boss.attackSlowFactor,.3);assert.equal(boss.attackSlowUntil,3.25);assert.equal(normal.hp,10000);
});

test('controls map the three hero slots by recruitment order in every new run',()=>{
 const w=setup('terran');hero(w,'tosh');hero(w,'swann');assert.equal(heroForSlot(w,0),'tosh');assert.equal(heroForSlot(w,1),'swann');assert.match(skillsFor(w)[3].name,/托什/);
 assert.equal(stickSkill(1,1,null,EXPEDITION_SKILLS),'detection');assert.equal(EXPEDITION_SKILLS.length,6);
 const fresh=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});assert.equal(heroForSlot(fresh,0),undefined);assert.deepEqual(skillsFor(fresh),EXPEDITION_SKILLS);
});
