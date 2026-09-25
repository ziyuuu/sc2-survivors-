import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import type {Entity} from '../src/simulation/types';
import {THREE_RACE_RULES} from '../src/data/races';
import {selectWeapon,tickNativeMode,expeditionWeaponBonuses} from '../src/simulation/combat/expedition-combat';
import {SOURCE_ABILITIES,SOURCE_WEAPONS} from '../src/data/expansion-units';
import {SIEGE,SC2_UNITS} from '../src/data/sc2-units';
import {SOURCE_RESEARCH_EFFECTS} from '../src/data/expansion-upgrades';
const world=()=>{const w=new World({rulesVersion:THREE_RACE_RULES,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();return w;};
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const target=(u:Entity)=>{u.hp=u.maxHp=1000;u.armor=0;u.shield=0;u.shieldArmor=0;return u;};

test('Thor switches upgraded weapons without ratio drift, healing, or resetting cooldowns',()=>{
 const w=world(),u=w.addUnit('thor','terran',0,0),ground=target(w.addUnit('roach','zerg',4,0)),air=target(w.addUnit('mutalisk','zerg',4,0));w.expedition!.tech['terran.vehicle']=1;w.refreshStats(u);u.hp-=37;u.nextShotAt=19;u.weaponCooldown=8;u.energy=0;
 for(let i=0;i<20;i++){selectWeapon(w,u,air);close(u.weaponDamage,7);selectWeapon(w,u,ground);close(u.weaponDamage,33);}assert.equal(u.nextShotAt,19);assert.equal(u.weaponCooldown,8);close(u.maxHp-u.hp,37);
 selectWeapon(w,u,air);w.fire(u,air);close(1000-air.hp,56);selectWeapon(w,u,ground);w.fire(u,ground);close(1000-ground.hp,66);
});

test('Viking assault keeps aircraft weapon and armor research rather than borrowing vehicle levels',()=>{
 const w=world(),u=w.addUnit('viking','terran',0,0);w.expedition!.tech['terran.air_weapon']=1;w.expedition!.tech['terran.air_armor']=1;w.expedition!.tech['terran.vehicle']=3;w.expedition!.tech['terran.vehicle_armor']=3;
 u.nativeMode='viking_assault';u.activeWeapon=undefined;w.refreshStats(u);close(u.weaponDamage,13);close(u.armor,1);const p=target(w.addUnit('stalker','zerg',4,0));selectWeapon(w,u,p);w.fire(u,p);close(1000-p.hp,22);
});

test('Immortal and siege tank add their own source armored bonuses once',()=>{
 const w=world(),i=w.addUnit('immortal','terran',0,0),t=w.addUnit('tank','terran',0,2);w.expedition!.tech['protoss.ground_weapon']=1;w.expedition!.tech['terran.vehicle']=1;t.mode='siege';w.refreshStats(i);w.refreshStats(t);
 const a=target(w.addUnit('roach','zerg',6,0)),b=target(w.addUnit('roach','zerg',6,2));w.fire(i,a);close(1000-a.hp,55);w.hash.rebuild([...w.entities.values()]);w.fire(t,b);close(1000-b.hp,75);close(t.weaponDamage,44);
});

test('Infernal research applies distinct source light bonuses to Hellion and Hellbat',()=>{
 const w=world(),u=w.addUnit('hellion','terran',0,0);w.expedition!.tech.infernal=1;w.expedition!.tech['terran.vehicle']=1;w.refreshStats(u);const p=target(w.addUnit('zergling','zerg',1.5,0));w.hash.rebuild([...w.entities.values()]);w.fire(u,p);close(1000-p.hp,21);
 p.hp=1000;u.nativeMode='hellbat';u.activeWeapon=undefined;w.refreshStats(u);w.fire(u,p);close(1000-p.hp,32);
});

test('research changes source speed and maximum HP while preserving absolute damage',()=>{
 const w=world(),b=w.addUnit('baneling','terran',0,0),z=w.addUnit('zealot','terran',0,2);b.hp-=7;w.expedition!.tech.bane_speed=1;w.expedition!.tech.charge=1;w.refreshStats(b);w.refreshStats(z);
 close(b.maxHp,35);close(b.hp,28);close(b.moveSpeed,(3.5+SOURCE_RESEARCH_EFFECTS.bane_speed.speedAdd)*1.3);close(z.moveSpeed,3.15+SOURCE_RESEARCH_EFFECTS.charge.speedAdd);
});

test('Lurker deployment research shortens only burrow and leaves unburrow duration unchanged',()=>{
 const w=world(),u=w.addUnit('lurker','terran',0,0);w.expedition!.tech.lurker_deploy=1;u.desiredNativeMode='lurker_burrowed';tickNativeMode(w,u);close(u.nativeModeUntil!,Math.max(.25,SOURCE_ABILITIES.transformations.lurkerBurrow.seconds-SOURCE_RESEARCH_EFFECTS.lurker_deploy.burrowSecondsSubtract));
 w.time=10;tickNativeMode(w,u);u.desiredNativeMode='lurker';tickNativeMode(w,u);close(u.nativeModeUntil!-w.time,Math.max(.25,SOURCE_ABILITIES.transformations.lurkerUnburrow.seconds));
});

test('Sentry shield bonus depletes shields but never turns excess shield damage into life damage',()=>{
 const w=world(),u=w.addUnit('sentry','terran',0,0),p=target(w.addUnit('stalker','zerg',3,0));const bonus=SOURCE_WEAPONS.DisruptionBeam.shieldBonus;assert.equal(bonus,4);
 p.shield=20;w.fire(u,p);close(p.shield,10);close(p.hp,1000);
 p.shield=8;w.fire(u,p);close(p.shield,0);close(p.hp,1000);
 p.shield=3;w.fire(u,p);close(p.shield,0);close(p.hp,997);
 p.hp=1000;p.shield=0;w.fire(u,p);close(p.hp,994);
 p.hp=1000;p.shield=8;w.hit(p,6,[],2,'terran',0,0,u.id,false,false,4);close(p.hp,994);close(p.shield,0);
});

test('shield-only damage scales once with rank and weapon cards and retains separate shield armor',()=>{
 const w=world(),u=w.addUnit('sentry','terran',0,0,3),p=target(w.addUnit('stalker','zerg',3,0));w.expedition!.cardTotals['weapon.sentry']=.2;w.refreshStats(u);const scale=w.growth(u).damage*1.2;close(expeditionWeaponBonuses(w,u).shieldBonus,4*scale);p.shield=100;p.shieldArmor=2;w.fire(u,p);close(p.shield,100-(10*scale-2));close(p.hp,1000);
});


test('heavy siege elite adds its timed range to derived talent range once and resets on undeploy',()=>{
 const w=world(),u=w.addUnit('tank','terran',0,0,3);u.eliteId='tank.1';u.mode=u.desiredMode='siege';w.runConfig!.frozenTalents.levels={'T-M02':3};w.refreshStats(u);u.hp-=27;u.nextShotAt=30;
 const base=SIEGE.range*1.12;w.time=1;w.tick=1;w.updateUnit(u,1/60);close(u.attackRange,base);
 for(const [time,extra] of [[4,1],[7,2],[10,3],[40,3]]){w.time=time;for(let i=0;i<10;i++){w.tick++;w.updateUnit(u,1/60);close(u.attackRange,base+extra);}}
 close(u.maxHp-u.hp,27);assert.equal(u.nextShotAt,30);
 u.modeTimer=1;u.action='unsieging';u.desiredMode='tank';w.updateUnit(u,1/60);close(u.attackRange,base);assert.equal(u.siegeSince,undefined);
 u.mode=u.desiredMode='tank';u.modeTimer=0;w.updateUnit(u,1/60);close(u.attackRange,SC2_UNITS.tank.attackRange*1.12);
 u.mode=u.desiredMode='siege';w.time=50;w.updateUnit(u,1/60);close(u.attackRange,base);assert.equal(u.siegeSince,50);
});

test('legacy heavy siege elite preserves its historical range rule',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();const u=w.addUnit('tank','terran',0,0);u.eliteId='tank.1';u.mode=u.desiredMode='siege';
 w.time=1;w.updateUnit(u,1/60);close(u.attackRange,SIEGE.range);w.time=10;w.updateUnit(u,1/60);close(u.attackRange,SIEGE.range+3);u.mode=u.desiredMode='tank';w.updateUnit(u,1/60);close(u.attackRange,SC2_UNITS.tank.attackRange);
});
