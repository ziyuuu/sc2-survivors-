import assert from 'node:assert/strict';
import {Scene} from 'three';
import {armedSupportModels} from '../src/app/armed-preload-plan';
import {HEROES} from '../src/data/heroes';
import {ARMED_CARD_BY_ID} from '../src/data/terran-armed-support';
import {ArmedFieldViews} from '../src/render/effects/armed-field-views';
import {armedCounterHeroPool} from '../src/simulation/combat/armed-counterattack';
import {reserveArmedDispatch, tickArmedSupport} from '../src/simulation/combat/armed-support';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {observeWorld} from '../src/simulation/observation';
import {createContentPlan, worldContent} from '../src/simulation/progression/run-content';
import {beginSpecialStage, finishSpecialStage, markSpecialReady} from '../src/simulation/special-stages/runtime';
import {World} from '../src/simulation/world';

// Isolated, fixed-seed engineering scenarios. Each result observes the production
// simulation, validator or presentation planner. No player database is opened.
function scenario() {
  const w = new World({race:'terran', difficulty:'hard', seed:529, waves:false,
    sandbox:true, terrain:new FlatTerrain(), obstacles:[], initial:['marine']});
  w.start(undefined, createContentPlan(529, 'terran', 'hard'));
  w.stage = 4;
  w.prepareStage();
  w.pods = [];
  w.missions.enabled = w.encounters.enabled = false;
  for (const group of w.expedition.building!.groups) group.enabled = false;
  return w;
}

function restoreResult(w:World) {
  try {
    scenario().restoreRun(w.captureRun());
    return '通过';
  } catch (error) {
    return (error as Error).message;
  }
}

function shieldRenewal() {
  const w = scenario(), a = w.expedition.support.armed!;
  a.ranks.P04 = 1;
  const marine = w.allies()[0];
  assert.ok(reserveArmedDispatch(w, 'P04'));
  w.advance(.4);
  const first = restoreResult(w);
  const cooldown = ARMED_CARD_BY_ID.P04.params.cd;
  w.advance(cooldown);
  assert.ok(reserveArmedDispatch(w, 'P04'));
  w.advance(.4);
  const records = structuredClone(a.unitStatus[marine.id]?.cardShields);
  const second = restoreResult(w);
  w.endStage();
  return {first, records, second, intermission:restoreResult(w)};
}

function specialEntry() {
  const w = scenario(), parent = w.expedition.support.armed!;
  parent.ranks.W08 = parent.ranks.P04 = 1;
  assert.ok(reserveArmedDispatch(w, 'W08'));
  assert.ok(reserveArmedDispatch(w, 'P04'));
  w.advance(.4);
  const before = {tick:w.tick, field:parent.fields![0].id, beacon:parent.deployments[0].id};
  assert.ok(beginSpecialStage(w, 'resources', 'fixture'));
  assert.ok(markSpecialReady(w));
  const child = w.expedition.support.armed!;
  const scene = new Scene(), views = new ArmedFieldViews(scene);
  views.update(w, () => true, () => 0);
  const target = w.addUnit('roach', 'zerg', parent.fields![0].point.x, parent.fields![0].point.z);
  target.cloaked = true;
  const withFlare = w.visibleTo(target, 'terran');
  // Remove just the copied field for the paired detection control.
  const fields = child.fields;
  child.fields = [];
  const withoutFlare = w.visibleTo(target, 'terran');
  child.fields = fields;
  const result = {before, childFields:child.fields?.map(f=>f.id), childDeployments:child.deployments.map(d=>d.id),
    childHasBeaconBody:w.fortifications.has(before.beacon), childSceneObjects:scene.children.length, withFlare, withoutFlare};
  views.reset();
  assert.ok(finishSpecialStage(w, 'quit'));
  return {...result, returnedOriginal:w.expedition.support.armed === parent, returnedTick:w.tick};
}

function attachedDamage() {
  const w = scenario(), a = w.expedition.support.armed!, p = ARMED_CARD_BY_ID.P03.params;
  a.ranks.P03 = 1;
  const e = w.addUnit('roach', 'zerg', 0, 8);
  e.hp = e.maxHp = 1e6;
  e.armor = 0;
  const hits:{tick:number;amount:number}[] = [];
  observeWorld(w, (source, kind, amount) => {
    if (source === 'armed.P03' && kind === 'damage') hits.push({tick:w.tick, amount});
  });
  assert.ok(reserveArmedDispatch(w, 'P03'));
  w.advance(.4);
  // The oil patch has formed. Keep the attached target alive outside the patch.
  e.x = 25;
  e.z = 25;
  e.moveSpeed = 0;
  w.advance(p.attachLife + 1);
  return {expected:p.attachLife * p.attachDamage, hits, actual:hits.reduce((sum,h)=>sum+h.amount,0)};
}

function heroPreload() {
  const w = scenario();
  w.stage = 10;
  w.expedition.support.armed!.ranks.O01 = 1;
  const allowed = armedCounterHeroPool(w).map(id => HEROES[id].model);
  const prepared = [...armedSupportModels(w.expedition, worldContent(w)).keys()];
  return {stage:w.stage, allowed, prepared, extra:prepared.filter(key => !allowed.includes(key))};
}

function inactiveSupportVisits() {
  const w = scenario();
  for (let i = 0; i < 99; i++) w.addUnit('roach','zerg',20 + i % 10,20 + Math.floor(i / 10));
  const source = w.entities.values.bind(w.entities);
  let visits = 0;
  w.entities.values = function* () {
    for (const unit of source()) {
      visits++;
      yield unit;
    }
  } as typeof w.entities.values;
  const measure = () => {
    visits = 0;
    for (let i = 0; i < 60; i++) tickArmedSupport(w);
    return visits;
  };
  const empty = measure();
  delete w.expedition.support.armed;
  return {entities:w.entities.size, calls:60, newCardlessState:empty, legacyAbsentState:measure()};
}

console.log(JSON.stringify({shield:shieldRenewal(), special:specialEntry(), tar:attachedDamage(),
  heroPreload:heroPreload(), inactiveVisits:inactiveSupportVisits()}, null, 2));
