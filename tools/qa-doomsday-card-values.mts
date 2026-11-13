// Design comparison. Native fire, flight and damage are real. The extra weapons and
// the prospective seat limit below model the proposal outside the shipping game.
import assert from 'node:assert/strict';
import {TUNING} from '../src/data/game';
import {World} from '../src/simulation/world';
import type {Entity} from '../src/simulation/types';
import {expeditionWeaponBonuses, unitData} from '../src/simulation/combat/expedition-combat';
import {launchWeaponFlight, tickWeaponFlights, type WeaponFlight} from '../src/simulation/combat/weapon-flight';
import {releasePaidPassenger, waitingBodySeats} from '../src/simulation/expedition-production';
import {armedFormalReservations} from '../src/simulation/combat/armed-support';

const duration = 12;
const targetHealth = 10_000;
const dt = TUNING.step;
const distance = (a: {x:number; z:number}, b: {x:number; z:number}) => Math.hypot(a.x - b.x, a.z - b.z);

function setup() {
  const w = new World({race:'terran', seed:111201, sandbox:true, waves:false, terrain:false, obstacles:[]});
  w.start();
  w.entities.clear();
  w.heroes.clear();
  w.missions.enabled = w.starship.enabled = w.encounters.enabled = false;
  w.visualEvents = [];
  return w;
}

// Fire the second channel from the same hull with the other native weapon profile.
function vikingSupportShot(w:World, hull:Entity, target:Entity, sequence:number) {
  const gun = structuredClone(hull);
  gun.nativeMode = target.flying ? 'viking' : 'viking_assault';
  gun.activeWeapon = undefined;
  w.refreshStats(gun);
  gun.flying = hull.flying;
  gun.shotSequence = sequence;
  assert.ok(w.canFireAt(gun, target));
  const payload = expeditionWeaponBonuses(w, gun);
  const bonuses = payload.bonuses.map(b => ({...b, amount:b.amount * .55}));
  gun.weaponDamage *= .55;
  if (!launchWeaponFlight(w, gun, target, bonuses, payload.shieldBonus * .55, 1, undefined, false)) {
    w.attackHit(gun, target, gun.weaponDamage, bonuses, unitData(gun).attacks, payload.shieldBonus * .55, false);
  }
  return gun.attackPeriod;
}

type Split = 'none' | 'old' | 'proposed';
function splitAfterImpact(w:World, p:WeaponFlight, primary:Entity, enemies:Entity[], split:Split) {
  const others = enemies.filter(e => e !== primary && !e.flying && e.hp > 0 &&
    distance(p.point, e) <= 4 && w.visibleTo(e, p.source.owner) && w.hasAttackLine(primary, e));
  others.sort((a,b) => distance(p.point,a) - distance(p.point,b) || a.id - b.id);
  const targets = others.slice(0, 3);
  if (split === 'old') {
    if (!targets.length && primary.hp > 0) targets.push(primary);
  } else if (primary.hp > 0) {
    const returns = Math.min(2, 3 - targets.length);
    for (let i = 0; i < returns; i++) targets.push(primary);
  }
  for (const target of targets) {
    const id = w.nextId++;
    w.weaponFlights.push({...structuredClone(p), id, primary:false, attackId:p.attackId + ':child:' + id,
      target:target.id, from:{...p.point}, point:{...p.point}, lastSeen:{x:target.x, z:target.z},
      start:w.time, expires:w.time + 2, speed:12, damage:p.damage * p.hits * (split === 'old' ? .2 : .4),
      hits:1, hop:1, seen:[primary.id], crit:1, apm:false});
  }
  return targets.length;
}

interface Targets {name:string; ground:number; air:boolean; armor:number}
function compareLoadout(s:Targets, rank:number, unit:'viking'|'banshee', airFirst:boolean, dual:boolean, split:Split) {
  const w = setup();
  const hull = w.addUnit(unit,'terran',0,0,rank);
  if (unit === 'viking') {
    hull.nativeMode = hull.desiredNativeMode = airFirst ? 'viking' : 'viking_assault';
    w.refreshStats(hull);
  }
  const ground = [[0,4],[-2,4],[2,4],[0,6]].slice(0,s.ground).map(([x,z]) => w.addUnit('roach','zerg',x,z));
  const air = s.air ? w.addUnit('mutalisk','zerg',2,3) : undefined;
  const enemies = air ? [...ground, air] : ground;
  for (const e of enemies) {
    e.hp = e.maxHp = targetHealth;
    e.shield = 0;
    e.armor = s.armor;
  }
  w.hash.rebuild(w.entities.values());
  const main = airFirst ? air : ground[0];
  const secondary = dual ? (airFirst ? ground[0] : air) : undefined;
  let nextMain = 0, nextSecondary = 0, secondarySequence = 10_000, splits = 0, children = 0;
  const clockSteps = Math.round(duration / dt);
  for (let tick = 0; tick < clockSteps || w.weaponFlights.length; tick++) {
    assert.ok(tick < clockSteps + 120, 'flight never settled');
    w.time = tick * dt;
    w.tick = tick;
    if (tick < clockSteps && main && tick >= nextMain) {
      assert.ok(w.canFireAt(hull,main));
      w.fire(hull,main);
      nextMain = tick + Math.ceil(hull.attackPeriod / dt - 1e-9);
    }
    if (tick < clockSteps && secondary && tick >= nextSecondary) {
      const period = vikingSupportShot(w,hull,secondary,secondarySequence++);
      nextSecondary = tick + Math.ceil(period / dt - 1e-9);
    }
    const mothers = split === 'none' ? [] : w.weaponFlights.filter(p => p.primary && p.source.id === hull.id);
    const hpBefore = main?.hp;
    tickWeaponFlights(w,dt);
    if (main && hpBefore !== undefined && main.hp < hpBefore) {
      for (const mother of mothers) {
        if (w.weaponFlights.includes(mother)) continue;
        assert.ok(w.visualEvents.some(e => e.kind === 'projectile-impact' && e.castId === mother.id));
        splits++;
        children += splitAfterImpact(w,mother,main,enemies,split);
      }
    }
  }
  if (split !== 'none' && main) {
    assert.equal(splits, hull.shotSequence);
    const nearby = Math.min(3, s.ground - 1);
    const perRound = split === 'old' ? Math.max(1, nearby) : Math.min(3, nearby + 2);
    assert.equal(children, splits * perRound);
  }
  assert.ok(enemies.every(e => e.hp > 0));
  return enemies.reduce((lost,e) => lost + targetHealth - e.hp,0);
}

const fixtures:Targets[] = [
  {name:'地面单体', ground:1, air:false, armor:0},
  {name:'地面单体4甲', ground:1, air:false, armor:4},
  {name:'地面密群', ground:4, air:false, armor:0},
  {name:'两名地敌', ground:2, air:false, armor:0},
  {name:'一空一地', ground:1, air:true, armor:0},
  {name:'一空四地', ground:4, air:true, armor:0},
  {name:'纯空军', ground:0, air:true, armor:0}
];
const round = (n:number) => Number(n.toFixed(2));
for (const rank of [1,5]) {
  const rows = fixtures.map(s => {
    // Preselect the best native posture for each static fixture. The card earns
    // no artificial damage credit for a baseline Viking choosing the wrong gun.
    const modes = s.air && s.ground ? [true,false] : [s.air];
    const viking = (dual:boolean) => Math.max(...modes.map(air => compareLoadout(s,rank,'viking',air,dual,'none')));
    const banshee = (split:Split) => compareLoadout(s,rank,'banshee',false,false,split);
    const v = viking(false), b = banshee('none');
    const blue = viking(true) - v, old = banshee('old') - b, revised = banshee('proposed') - b;
    if (!s.air || !s.ground) assert.equal(blue,0);
    if (!s.ground) assert.equal(revised,0);
    if (s.ground) assert.ok(revised > old && old > 0);
    if (s.air && s.ground) assert.ok(blue > 0);
    return {场景:s.name, 裸维京:round(v), 蓝维京增量:round(blue), 裸女妖:round(b), 原紫增量:round(old), 建议紫增量:round(revised)};
  });
  console.log('军衔',rank,'·',duration,'秒之内发出的攻击，结清在途弹');
  console.table(rows);
}

// Apply the proposed rule ONLY when asking whether a new body can be reserved.
// Deliver an already committed fifth passenger through the existing game code.
const w = setup();
const family = 'viking';
w.expedition.familySlots = [family];
const members = Array.from({length:4}, (_,i) => w.addFamilyMember(family,{x:0,z:i * 2},i + 1));
members[0].hp -= 12;
const original = members.map(u => [u.id, u.bornAt, u.rank, u.hp]);
const jobId = w.nextJob++;
const pod = w.spawnPod(family,{x:12,z:6},jobId,1);
pod.status = 'opening';
pod.guardianIds.clear();
w.expedition.ledger.push({id:jobId, family, line:'starport', facilityIds:[], remaining:0, state:'risk', podId:pod.id,
  passengers:[{paid:{minerals:150,gas:75}, status:'waiting', entityId:null, purpose:'body'}]});
const reinforcedCap = (base:number) => Math.max(1,base - 1);
const newRoom = () => Math.max(0,reinforcedCap(w.familyMemberCap(family)) - w.familySeatCount(family) -
  waitingBodySeats(w,family,1) - armedFormalReservations(w,family));
assert.deepEqual([1,5,7].map(reinforcedCap),[1,4,6]);
assert.equal(w.familyMemberCap(family),5);
assert.equal(waitingBodySeats(w,family,1),1);
assert.equal(newRoom(),0);
const delivered = releasePaidPassenger(w,pod,0,{x:12,z:6});
assert.ok(delivered && members.every(u => u.id !== delivered.id));
assert.deepEqual(members.map(u => [u.id, u.bornAt, u.rank, u.hp]),original);
assert.equal(w.familySeatCount(family),5);
assert.equal(releasePaidPassenger(w,pod,0,{x:12,z:6}),null);
assert.equal(newRoom(),0);
delivered.hp = 0; // Simulate a loss for this capacity query.
assert.equal(w.familySeatCount(family),4);
assert.equal(newRoom(),0);
members[0].hp = 0;
assert.equal(w.familySeatCount(family),3);
assert.equal(newRoom(),1);
console.log('旧单到队一次，4 在队 + 1 在途 → 5 → 4 → 3 台，新单空位依次 0／0／0／1。');

// Check the proposed interception whitelist on real travelling packets. Each pair
// differs only in removing the selected packet before arrival.
for (const type of ['roach','ravager','hydralisk'] as const) {
  function impact(intercept:boolean) {
    const arena = setup();
    const attacker = arena.addUnit(type,'zerg',3.5,0);
    const ally = arena.addUnit('tank','terran',0,0);
    const before = ally.hp;
    assert.ok(arena.canFireAt(attacker,ally));
    arena.fire(attacker,ally);
    const [flight] = arena.weaponFlights;
    assert.ok(flight && flight.primary && flight.hits === 1 && flight.target === ally.id);
    arena.time += dt;
    tickWeaponFlights(arena,dt);
    assert.ok(arena.weaponFlights.includes(flight) && ally.hp === before);
    if (intercept) arena.weaponFlights = arena.weaponFlights.filter(p => p.id !== flight.id);
    for (let i = 0; i < 60 && arena.weaponFlights.length; i++) {
      arena.time += dt;
      tickWeaponFlights(arena,dt);
    }
    assert.equal(arena.weaponFlights.length,0);
    return before - ally.hp;
  }
  const normal = impact(false);
  assert.ok(normal > 0);
  assert.equal(impact(true),0);
  console.log('拦截',type,'· 单发有效，原实损',round(normal),'→ 0');
}
