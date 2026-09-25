import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import type {Entity} from '../src/simulation/types';
import {THREE_RACE_RULES} from '../src/data/races';
import {selectWeapon} from '../src/simulation/combat/expedition-combat';
import {tickWeaponAreas} from '../src/simulation/combat/weapon-patterns';
import {SOURCE_WEAPONS,SOURCE_WEAPON_PATTERNS} from '../src/data/expansion-units';
import {SOURCE_RESEARCH_EFFECTS,sourceWeaponUpgradeDelta,SOURCE_WEAPON_UPGRADE_STEPS} from '../src/data/expansion-upgrades';
const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
const world=()=>{const w=new World({rulesVersion:THREE_RACE_RULES,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();return w;};
function target(u:Entity){u.maxHp=u.hp=1000;u.shield=0;u.armor=0;u.unitRadius=.1;return u;}
const damage=(u:Entity)=>1000-u.hp;

test('hellbat cone hits nearby ground once, including hidden splash, without the legacy long line',()=>{
 const w=world(),u=w.addUnit('hellion','terran',0,0);u.nativeMode='hellbat';w.refreshStats(u);
 const primary=target(w.addUnit('roach','zerg',1.5,0)),side=target(w.addUnit('roach','zerg',2,.2)),hidden=target(w.addUnit('lurker','zerg',2,-.2));hidden.cloaked=true;
 const far=target(w.addUnit('roach','zerg',5,0)),back=target(w.addUnit('roach','zerg',-1,0)),wide=target(w.addUnit('roach','zerg',1,1)),air=target(w.addUnit('mutalisk','zerg',2,0)),ally=target(w.addUnit('marine','terran',1.8,0));
 w.fire(u,primary);for(const victim of [primary,side,hidden])close(damage(victim),u.weaponDamage);
 for(const victim of [far,back,wide,air,ally])assert.equal(damage(victim),0);assert.equal(hidden.cloaked,true);
});

test('Thor explosive mode splashes exactly four armor-resolved air hits and leaves ground/ally/outside untouched',()=>{
 const w=world(),u=w.addUnit('thor','terran',0,0),primary=target(w.addUnit('mutalisk','zerg',5,0)),near=target(w.addUnit('mutalisk','zerg',5,.4)),far=target(w.addUnit('mutalisk','zerg',5,1));
 const ground=target(w.addUnit('roach','zerg',5,0)),ally=target(w.addUnit('viking','terran',5,.2));near.armor=2;
 selectWeapon(w,u,primary);assert.equal(u.activeWeapon,'JavelinMissileLaunchers');w.fire(u,primary);
 const p=SOURCE_WEAPONS.JavelinMissileLaunchers,raw=u.weaponDamage+p.bonusDamage[0].amount;close(damage(primary),raw*4);close(damage(near),(raw-2)*4);
 for(const victim of [far,ground,ally])assert.equal(damage(victim),0);
});

test('Thor high impact mode stays single-target and preserves its ground weapon',()=>{
 const w=world(),u=w.addUnit('thor','terran',0,0);u.nativeMode='thor_high_impact';w.refreshStats(u);
 const primary=target(w.addUnit('mutalisk','zerg',5,0)),near=target(w.addUnit('mutalisk','zerg',5,.2)),ground=target(w.addUnit('roach','zerg',5,0));selectWeapon(w,u,primary);assert.equal(u.activeWeapon,'LanceMissileLaunchers');w.fire(u,primary);close(damage(primary),u.weaponDamage);assert.equal(damage(near),0);
 selectWeapon(w,u,ground);assert.equal(u.activeWeapon,'ThorsHammer');w.fire(u,ground);close(damage(ground),u.weaponDamage*2);
});

test('Ultralisk cleave excludes its primary from splash and does not stack overlapping source bands',()=>{
 const w=world(),u=w.addUnit('ultralisk','terran',0,0),primary=target(w.addUnit('roach','zerg',1.5,0)),near=target(w.addUnit('roach','zerg',2.5,.2)),wide=target(w.addUnit('roach','zerg',1.7,1));
 const back=target(w.addUnit('roach','zerg',0,0)),air=target(w.addUnit('mutalisk','zerg',2.5,0));w.fire(u,primary);close(damage(primary),u.weaponDamage);close(damage(near),u.weaponDamage*.33);close(damage(wide),u.weaponDamage*.33);assert.equal(damage(back),0);assert.equal(damage(air),0);
});

test('Colossus two source sweeps keep reverse ordering and each damages a victim once',()=>{
 const w=world(),u=w.addUnit('colossus','terran',0,0),primary=target(w.addUnit('roach','zerg',5,0));w.fire(u,primary);const areas=w.expedition!.weaponAreas;assert.equal(areas.length,2);assert.deepEqual(areas[0].points[0],areas[1].points.at(-1));assert.notDeepEqual(areas[0].points[0],areas[1].points[0]);
 for(let i=0;i<30;i++){w.time+=1/60;tickWeaponAreas(w);}close(damage(primary),u.weaponDamage*2);assert.equal(w.expedition!.weaponAreas.length,0);
});

test('Mutalisk bounce selects visible distinct victims and keeps source 9/3/1 damage proportions',()=>{
 const w=world(),u=w.addUnit('mutalisk','terran',0,0),a=target(w.addUnit('roach','zerg',2,0)),hidden=target(w.addUnit('lurker','zerg',2.1,0)),b=target(w.addUnit('roach','zerg',3.5,0)),c=target(w.addUnit('roach','zerg',5,0));hidden.cloaked=true;
 w.fire(u,a);close(damage(a),u.weaponDamage);close(damage(b),u.weaponDamage/3);close(damage(c),u.weaponDamage/9);assert.equal(damage(hidden),0);
 const effects=w.effects.filter(e=>e.kind==='shot');assert.equal(effects.length,3);close(effects[1].x,a.x);close(effects[2].x,b.x);
});

test('source upgrades retain per-weapon base/bonus increments and mode research groups',()=>{
 assert.deepEqual(sourceWeaponUpgradeDelta('ThorsHammerDamage',1),{damage:3,bonusDamage:{},shieldBonus:0});
 assert.deepEqual(sourceWeaponUpgradeDelta('LanceMissileLaunchersDamage',1),{damage:3,bonusDamage:{Massive:1},shieldBonus:0});
 assert.deepEqual(sourceWeaponUpgradeDelta('PhaseDisruptors',3),{damage:6,bonusDamage:{Armored:9},shieldBonus:0});
 assert.equal(SOURCE_WEAPON_UPGRADE_STEPS.TwinGatlingCannons.upgradeKey,'terran.air_weapon');
 assert.deepEqual(sourceWeaponUpgradeDelta('CrucioShockCannonBlast',1),{damage:4,bonusDamage:{Armored:1},shieldBonus:0});
 assert.equal(SOURCE_RESEARCH_EFFECTS.infernal.hellbatLightBonus,12);assert.equal(SOURCE_RESEARCH_EFFECTS.bane_speed.maxHpAdd,5);
 close(SOURCE_RESEARCH_EFFECTS.lurker_deploy.burrowSecondsSubtract,1.5/1.4);close(SOURCE_RESEARCH_EFFECTS.charge.speedAdd,1.125*1.4);
 assert.equal(SOURCE_WEAPON_PATTERNS.hellbat.arcDegrees,45);assert.equal(SOURCE_WEAPON_PATTERNS.thorExplosive.shots,4);
});
