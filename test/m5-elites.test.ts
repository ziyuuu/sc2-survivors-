import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {SC2_UNITS,HEAL} from '../src/data/sc2-units';
import {SOURCE_ABILITIES,SOURCE_INTERCEPTOR,SOURCE_UNIT_DETAILS} from '../src/data/expansion-units';
import {ELITES} from '../src/data/elites';
import {eliteDamageMultiplier} from '../src/simulation/combat/expedition-elites';
import {healExpedition,tickAutoAbilities,tickExpeditionRecovery,unitData} from '../src/simulation/combat/expedition-combat';
import {initializeCarrierSubsystem,ownedInterceptors,refreshInterceptorStats} from '../src/simulation/combat/carriers';
import type {Race} from '../src/data/races';
import type {UnitType} from '../src/data/sc2-units';

const make=(race:Race)=>{const w=new World({race,seed:20260925,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();return w;};
const elite=(w:World,type:UnitType,id:keyof typeof ELITES)=>{const u=w.addUnit(type,'terran',0,0,1);u.eliteId=id;u.modelKey=ELITES[id].model;w.refreshStats(u,true);return u;};

test('new elite damage conditions never leak between light, armored, air and ground targets',()=>{
 const w=make('terran'),reaper=elite(w,'reaper','reaper.2'),thor=elite(w,'thor','thor.2');
 const victim=w.addUnit('zergling','zerg',2,0);victim.attributes=['Light','Biological'];
 assert.equal(eliteDamageMultiplier(reaper,victim),1.25);victim.attributes=['Armored','Biological'];assert.equal(eliteDamageMultiplier(reaper,victim),1);
 assert.equal(eliteDamageMultiplier(thor,victim),1.2);victim.flying=true;assert.equal(eliteDamageMultiplier(thor,victim),1);
 const z=make('zerg'),roach=elite(z,'roach','roach.2');victim.flying=false;assert.equal(eliteDamageMultiplier(roach,victim),1.2);victim.flying=true;assert.equal(eliteDamageMultiplier(roach,victim),1);
});

test('new elite max HP, native shield, energy and movement rebuild from base without free recovery',()=>{
 const z=make('zerg'),roach=elite(z,'roach','roach.3');
 assert.equal(roach.maxHp,SC2_UNITS.roach.maxHp*z.growth(roach).health*1.25);
 roach.hp=roach.maxHp-47;const hp=roach.maxHp;z.refreshStats(roach);assert.equal(roach.maxHp,hp);assert.equal(roach.hp,roach.maxHp-47);
 const ling=elite(z,'zergling','zergling.2');assert.ok(ling.moveSpeed>SC2_UNITS.zergling.movementSpeed*z.growth(ling).movement);
 const queen=elite(z,'queen','queen.3');queen.energy=13;const max=queen.maxEnergy;z.refreshStats(queen);assert.equal(queen.maxEnergy,max);assert.equal(queen.energy,13);
 const p=make('protoss'),stalker=elite(p,'stalker','stalker.2');assert.equal(stalker.maxShield,SOURCE_UNIT_DETAILS.stalker.shields*p.growth(stalker).health*1.25);
 stalker.shield=stalker.maxShield-31;const shields=stalker.maxShield;p.refreshStats(stalker);assert.equal(stalker.maxShield,shields);assert.equal(stalker.shield,shields-31);
});

test('Queen healing, Sentry shield radius and science-vessel range affect actual support actions',()=>{
 const z=make('zerg'),queen=elite(z,'queen','queen.2'),patient=z.addUnit('ultralisk','terran',2,0);patient.hp=patient.maxHp-300;queen.energy=queen.maxEnergy;
 tickAutoAbilities(z,queen);const spell=z.expedition.spells.find(s=>s.kind==='transfusion');assert.ok(spell);assert.equal(patient.maxHp-patient.hp,300-Math.min(300,SOURCE_ABILITIES.transfusion.instantHealing*queen.healRate/HEAL.hpPerSecond*1.25));assert.equal(spell.amount,SOURCE_ABILITIES.transfusion.tickHealing*queen.healRate/HEAL.hpPerSecond*1.25);
 const p=make('protoss'),sentry=elite(p,'sentry','sentry.3');sentry.energy=sentry.maxEnergy;const threat=p.addUnit('hydralisk','zerg',4,0);threat.hp=threat.maxHp;
 tickAutoAbilities(p,sentry);assert.equal(p.expedition.spells.find(s=>s.kind==='guardian')?.radius,SOURCE_ABILITIES.guardianShield.radius*1.2);
 const t=make('terran'),vessel=elite(t,'science_vessel','science_vessel.3'),mechanical=t.addUnit('thor','terran',0,0);mechanical.x=mechanical.prev.x=HEAL.range+vessel.unitRadius+mechanical.unitRadius+.5;mechanical.hp=mechanical.maxHp-100;vessel.energy=vessel.maxEnergy;
 healExpedition(t,vessel,1);assert.ok(mechanical.hp>mechanical.maxHp-100);
});

test('Banshee stealth only changes ongoing drain and an elite Carrier buffs its children once',()=>{
 const t=make('terran'),banshee=elite(t,'banshee','banshee.2');banshee.cloaked=true;banshee.energy=100;banshee.energyRegen=0;
 tickExpeditionRecovery(t,banshee,1);assert.equal(banshee.energy,100-SOURCE_ABILITIES.bansheeCloak.energyDrainPerSecond*.8);
 const p=make('protoss'),carrier=elite(p,'carrier','carrier.2');initializeCarrierSubsystem(p);const children=ownedInterceptors(p,carrier.id);assert.equal(children.length,4);
 const child=children[0],expected=SOURCE_INTERCEPTOR.weapon.attackDamage*p.growth(carrier).damage*1.2;assert.equal(child.weaponDamage,expected);
 refreshInterceptorStats(p,child);assert.equal(child.weaponDamage,expected);
});

test('fast Lurker variant changes only the buried attack cycle and keeps one identity',()=>{
 const w=make('zerg'),lurker=elite(w,'lurker','lurker.3');
 const mobile=lurker.attackPeriod;assert.equal(mobile,unitData(lurker).attackPeriod/w.growth(lurker).attackSpeed);
 lurker.nativeMode='lurker_burrowed';w.refreshStats(lurker);assert.ok(Math.abs(lurker.attackPeriod-unitData(lurker).attackPeriod/w.growth(lurker).attackSpeed*.85)<1e-8);
 const buried=lurker.attackPeriod;w.refreshStats(lurker);assert.equal(lurker.attackPeriod,buried);
 lurker.nativeMode='lurker';w.refreshStats(lurker);assert.equal(lurker.attackPeriod,mobile);
});
