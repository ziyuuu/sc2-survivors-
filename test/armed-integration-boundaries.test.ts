import assert from 'node:assert/strict';
import test from 'node:test';
import {armedSupportModels} from '../src/app/armed-preload-plan';
import {HEROES} from '../src/data/heroes';
import {ARMED_CARD_BY_ID as cards} from '../src/data/terran-armed-support';
import {armedCounterHeroPool} from '../src/simulation/combat/armed-counterattack';
import {grantArmedShield} from '../src/simulation/combat/armed-fields';
import {tickArmedFortAuras} from '../src/simulation/combat/armed-fortifications';
import {commitArmedNuke} from '../src/simulation/combat/armed-nukes';
import {armedStageKey, reserveArmedDispatch, tickArmedSupport} from '../src/simulation/combat/armed-support';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {observeWorld} from '../src/simulation/observation';
import {createContentPlan, worldContent} from '../src/simulation/progression/run-content';
import {beginSpecialStage, finishSpecialStage, markSpecialReady} from '../src/simulation/special-stages/runtime';
import {World} from '../src/simulation/world';

function battle() {
  const w = new World({race:'terran', difficulty:'hard', seed:529, waves:false, sandbox:true,
    terrain:new FlatTerrain(), obstacles:[], initial:['marine']});
  assert.ok(w.start(undefined, createContentPlan(529, 'terran', 'hard')));
  w.stage = 4;
  w.prepareStage();
  w.pods = [];
  w.missions.enabled = w.encounters.enabled = false;
  for (const group of w.expedition.building!.groups) group.enabled = false;
  return w;
}

function target(w:World, x=0, z=8) {
  const u = w.addUnit('roach', 'zerg', x, z);
  u.hp = u.maxHp = 1e6;
  u.armor = u.weaponDamage = u.moveSpeed = 0;
  return u;
}

function tarHits(w:World) {
  const hits:number[] = [];
  observeWorld(w, (source, kind, amount) => {
    if (source === 'armed.P03' && kind === 'damage') hits.push(amount);
  });
  return hits;
}

test('P03 settles the sixth attached tick once across a snapshot taken one step before expiry', () => {
  const w = battle(), u = target(w), hits = tarHits(w);
  w.expedition.support.armed!.ranks.P03 = 1;
  assert.ok(reserveArmedDispatch(w, 'P03'));
  w.advance(.4);
  u.x = u.z = 25;
  const field = w.expedition.support.armed!.fields![0];
  w.advance((field.attachEndTick! - w.tick - 1) / 60);
  assert.deepEqual(hits, [24,24,24,24,24]);
  const copy = battle();
  copy.restoreRun(w.captureRun());
  copy.paused = false;
  const afterRestore = tarHits(copy);
  for (const world of [w, copy]) {
    world.step();
    tickArmedSupport(world);
    world.advance(1);
  }
  assert.deepEqual(hits, [24,24,24,24,24,24]);
  assert.deepEqual(afterRestore, [24]);
  assert.deepEqual(copy.expedition.support.armed!.fields, w.expedition.support.armed!.fields);
});

test('P03 overlapping oil settles independently of the attachment and never attaches to a replacement generation', () => {
  const w = battle(), first = target(w), second = target(w, .1), hits = tarHits(w);
  w.expedition.support.armed!.ranks.P03 = 1;
  assert.ok(reserveArmedDispatch(w, 'P03'));
  w.advance(.4);
  const [field, other] = w.expedition.support.armed!.fields!;
  assert.ok(other.captured && field.captured);
  first.x = 20;
  second.x = -20;
  second.bornAt += .1;
  target(w, field.point.x, field.point.z);
  w.advance((field.endTick - w.tick) / 60);
  assert.deepEqual(hits.filter(n => n === 24), Array(6).fill(24));
  assert.deepEqual(hits.filter(n => n === 20), Array(12).fill(20));
  assert.equal(hits.length, 18);
});

test('P04 renewals restore in battle and at intermission, accepting only expired legacy duplicates', () => {
  const w = battle(), marine = w.allies()[0], a = w.expedition.support.armed!;
  a.ranks.P04 = 1;
  assert.ok(reserveArmedDispatch(w, 'P04'));
  w.advance(.4);
  const expired = {...a.unitStatus[marine.id].cardShields![0]};
  w.advance(cards.P04.params.cd);
  assert.ok(reserveArmedDispatch(w, 'P04'));
  w.advance(.4);
  const current = {...a.unitStatus[marine.id].cardShields![0]};
  assert.equal(a.unitStatus[marine.id].cardShields!.length, 1);
  assert.ok(expired.untilTick <= w.tick && current.untilTick > w.tick);
  grantArmedShield(w, marine, 'P04', current.amount - 1, current.untilTick - 1);
  grantArmedShield(w, marine, 'O01', 100, current.untilTick);
  const live = [current, {source:'O01', amount:100, untilTick:current.untilTick}];
  assert.deepEqual(a.unitStatus[marine.id].cardShields, live);
  const snapshot = w.captureRun(), copy = battle();
  copy.restoreRun(snapshot);
  const stored = snapshot.state.expedition.support.armed!.unitStatus[marine.id].cardShields!;
  stored.unshift(expired);
  copy.restoreRun(snapshot);
  assert.deepEqual(copy.expedition.support.armed!.unitStatus[marine.id].cardShields, live);
  assert.equal(stored.length, 3);
  stored[0] = {...current};
  assert.throws(() => copy.restoreRun(snapshot), /武装持续状态无效/);
  assert.deepEqual(copy.expedition.support.armed!.unitStatus[marine.id].cardShields, live);
  w.endStage();
  copy.restoreRun(w.captureRun());
  assert.equal(copy.phase, w.phase);
});

test('resource challenge parks the original flare, beacon and paid manual volley, restoring their exact clocks and charges', () => {
  const w = battle(), parent = w.expedition.support.armed!;
  parent.ranks.W08 = parent.ranks.P04 = parent.ranks.P01 = 1;
  assert.ok(reserveArmedDispatch(w, 'W08'));
  assert.ok(reserveArmedDispatch(w, 'P04'));
  w.advance(.4);
  w.expedition.support.ammo = 2;
  assert.ok(commitArmedNuke(w, 'manual', {x:0,z:8}));
  const field = parent.fields![0], beacon = parent.deployments[0], volley = parent.volleys[0];
  const frozen = structuredClone(parent), tick = w.tick;
  assert.ok(beginSpecialStage(w, 'resources', 'fixture'));
  assert.ok(markSpecialReady(w));
  const child = w.expedition.support.armed!;
  assert.deepEqual(child.ranks, parent.ranks);
  assert.deepEqual(child.fields ?? [], []);
  assert.deepEqual(child.deployments, []);
  assert.deepEqual(child.volleys, []);
  assert.equal(w.fortifications.has(beacon.id), false);
  const concealed = target(w, field.point.x, field.point.z);
  concealed.cloaked = true;
  assert.equal(w.visibleTo(concealed, 'terran'), false);
  w.advance(1);
  assert.ok(finishSpecialStage(w, 'quit'));
  assert.equal(w.tick, tick);
  assert.equal(w.expedition.support.armed, parent);
  assert.equal(parent.fields![0], field);
  assert.equal(parent.deployments[0], beacon);
  assert.equal(parent.volleys[0], volley);
  assert.deepEqual(parent, frozen);
  assert.equal(w.expedition.support.ammo, 1);
  w.advance((volley.shots[0].tick - w.tick) / 60);
  assert.equal(volley.nextIndex, 1);
  assert.equal(w.expedition.support.ammo, 1);
});

test('O01 prepares the stage draw and a previously committed hero, with the original fallback for unseeded saves', () => {
  const w = battle(), a = w.expedition.support.armed!;
  w.stage = 10;
  a.ranks.O01 = 1;
  const offered = worldContent(w)!;
  const planned = () => [...armedSupportModels(w.expedition, offered).keys()].sort();
  const models = armedCounterHeroPool(w).map(id => HEROES[id].model).sort();
  assert.deepEqual(models, ['hero.raynor','hero.swann','hero.yamato_battlecruiser']);
  assert.deepEqual(planned(), models);
  a.counter = {losses:[], invulnerableUntil:0, activation:{id:a.nextCast++, stageKey:armedStageKey(w),
    startedTick:w.tick, finished:true, targets:[], losses:[], hero:'nova', heroPending:true}};
  assert.deepEqual(planned(), [...models, HEROES.nova.model].sort());
  a.counter.activation!.heroPending = false;
  assert.deepEqual(planned(), models);
  delete w.runConfig!.contentPlan;
  assert.deepEqual([...armedSupportModels(w.expedition).keys()].sort(), armedCounterHeroPool(w).map(id => HEROES[id].model).sort());
});

test('inactive P05 skips all entity iteration while still removing a lingering aura at its deadline', () => {
  const w = battle(), a = w.expedition.support.armed!, marine = w.allies()[0];
  const baseArmor = marine.armor;
  for (let i = 0; i < 99; i++) target(w, 20 + i % 10, 20 + Math.floor(i / 10));
  const values = w.entities.values.bind(w.entities);
  let visits = 0;
  w.entities.values = function* () { for (const u of values()) { visits++; yield u; } } as typeof w.entities.values;
  for (let i = 0; i < 60; i++) tickArmedSupport(w);
  assert.equal(visits, 0);
  w.entities.values = values;
  a.unitStatus[marine.id] = {fortAuraUntil:w.tick + 1};
  w.refreshStats(marine);
  assert.equal(marine.armor, baseArmor + cards.P05.params.auraArmor);
  w.step();
  tickArmedFortAuras(w);
  assert.equal(marine.armor, baseArmor);
  assert.equal(a.unitStatus[marine.id]?.fortAuraUntil, undefined);
});
