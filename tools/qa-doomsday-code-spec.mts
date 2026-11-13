// Executable examples for the 2026-11-12 design. Nothing here is imported by the game.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {ARMED_CARD_BY_ID, type ArmedCard} from '../src/data/terran-armed-support';
import {unitData} from '../src/simulation/combat/expedition-combat';
import type {BuildProgress} from '../src/simulation/progression/build-progress';
import {World} from '../src/simulation/world';

const designDir = new URL('../docs/project/', import.meta.url);
const read = (name: string) => readFileSync(new URL(name, designDir), 'utf8');
const spec = read('V1_3_TERRAN_DOOMSDAY_WEAPONS_CODE_SPEC_20261112.md');
const original = read('TERRAN_DOOMSDAY_WEAPONS_45_20261111.md');
const specCards = new Map(Array.from(spec.matchAll(/^\| (M-[WGBPNO]\d{2}) ([^ |]+) \|/gm), m => [m[1], m[2]]));
const multiRank = new Set(['M-G01', 'M-G02', 'M-G03', 'M-B03', 'M-P01']);

type Branch = 'armed' | 'doomsday';
interface Milestone {
  branch: Branch;
  at: number;
  offers: string[];
  claimed: string | null;
  deferredWindow?: number;
}
interface Ledger {
  revision: number;
  main: Branch | null;
  counts: Record<Branch, number>;
  ranks: Record<string, number>;
  purchases: string[];
  milestones: Milestone[];
  orange: string | null;
}
const fresh = (): Ledger => ({
  revision: 0, main: null, counts: {armed: 0, doomsday: 0},
  ranks: {}, purchases: [], milestones: [], orange: null
});
const restore = (s: Ledger): Ledger => JSON.parse(JSON.stringify(s));

function descriptor(card: string) {
  if (specCards.has(card)) {
    const band = card.charAt(2);
    const kind = band === 'W' ? 'white-rank' : multiRank.has(card) ? 'rank'
      : band === 'N' ? 'node' : band === 'O' ? 'orange' : 'once';
    return {branch: 'doomsday' as const, kind};
  }
  const armed = ARMED_CARD_BY_ID[card as ArmedCard['id']];
  assert.ok(armed, card);
  return {branch: 'armed' as const, kind: armed.purchase};
}

// The caller supplies a real, validated sale receipt. The fixture only models
// ordinary ranks/once cards. Prices, reserve-purchases and wallet belong to the shop.
function recordOrdinary(s: Ledger, card: string, receipt: string) {
  if (s.purchases.includes(receipt)) return false;
  const {branch, kind} = descriptor(card);
  if (kind !== 'white-rank' && kind !== 'rank' && kind !== 'once') return false;
  const rank = s.ranks[card] ?? 0;
  if (rank >= (kind === 'once' ? 1 : 3)) return false;
  s.ranks[card] = rank + 1;
  s.purchases.push(receipt);
  if (rank === 0 || kind !== 'white-rank') {
    const at = ++s.counts[branch];
    if (at % 3 === 0 && (s.main === null || s.main === branch)) {
      s.milestones.push({branch, at, offers: [], claimed: null});
    }
  }
  s.revision++;
  return true;
}

function buy(s: Ledger, ...cards: string[]) {
  for (const card of cards) assert.ok(recordOrdinary(s, card, 'offer-' + s.revision), card);
}

// orderedLegal represents the result of the prerequisite checks and seeded draw.
// Reopening an already frozen choice must not consume RNG or replace either offer.
function freeze(s: Ledger, branch: Branch, orderedLegal: string[]) {
  const m = s.milestones.find(entry => entry.branch === branch && !entry.claimed);
  if (!m || m.offers.length) return;
  const legal = [...new Set(orderedLegal)].filter(card => {
    const entry = descriptor(card);
    return entry.branch === branch && entry.kind === 'node';
  });
  if (legal.length >= 2) m.offers = legal.slice(0, 2);
}

function pending(s: Ledger, window: number) {
  return s.milestones.find(m => m.claimed === null && m.deferredWindow !== window &&
    m.offers.length === 2 && !s.milestones.some(prior =>
      prior.branch === m.branch && prior.at < m.at && prior.claimed === null));
}

function claim(s: Ledger, branch: Branch, at: number, card: string, revision: number, window: number) {
  const m = pending(s, window);
  if (!m || revision !== s.revision || branch !== m.branch || at !== m.at ||
      !m.offers.includes(card) || (s.main !== null && s.main !== branch)) return false;
  s.main = branch;
  m.claimed = card;
  s.milestones = s.milestones.filter(entry => entry.branch === branch);
  s.revision++;
  return true;
}

function takeOrange(s: Ledger, card: string) {
  const {branch, kind} = descriptor(card);
  if (kind !== 'orange' || s.main !== branch || s.orange !== null || s.counts[branch] < 9 ||
      s.milestones.filter(m => m.branch === branch && m.claimed !== null).length < 3) return false;
  s.orange = card;
  s.revision++;
  return true;
}

function bodyLimit(main: Branch | null, originalCap: number) {
  return main === 'doomsday' ? Math.max(1, originalCap - 1) : originalCap;
}

function openBoth() {
  const s = fresh();
  buy(s, 'W01', 'W01', 'W04', 'G01');
  assert.equal(s.counts.armed, 3);
  freeze(s, 'armed', ['N01', 'N02']);
  buy(s, 'M-W01', 'M-G01', 'M-W05');
  freeze(s, 'doomsday', ['M-N04', 'M-N05']);
  assert.deepEqual(s.counts, {armed: 3, doomsday: 3});
  assert.equal(s.main, null);
  return s;
}

test('45 rows match the reviewed IDs and names, and every local spec link resolves', () => {
  const oldRows = Array.from(original.matchAll(/^\| (M-[WGBPNO]\d{2}) \| ([^|]+?) \|/gm), m => [m[1], m[2]]);
  const bands = ['W', 'G', 'B', 'P', 'N', 'O'];
  assert.equal((spec.match(/^\| M-[WGBPNO]\d{2} /gm) ?? []).length, 45);
  assert.deepEqual([...specCards], oldRows);
  assert.deepEqual(bands.map(band => [...specCards.keys()].filter(id => id[2] === band).length), [9, 9, 9, 6, 9, 3]);
  for (const [, path] of spec.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
    if (!path.includes('://')) readFileSync(new URL(path, designDir));
  }
});

test('ordinary purple, repeated white and a failed duplicate receipt never choose a branch', () => {
  const s = fresh();
  buy(s, 'M-P06', 'M-W01', 'M-W01');
  assert.equal(s.counts.doomsday, 2);
  assert.equal(recordOrdinary(s, 'M-P06', 'offer-0'), false);
  buy(s, 'M-G01');
  freeze(s, 'doomsday', ['M-N05']);
  assert.equal(pending(s, 1), undefined);
  assert.equal(s.milestones.length, 1);
  assert.equal(s.main, null);
  assert.equal(bodyLimit(s.main, 5), 5);
  buy(s, 'M-W05');
  freeze(s, 'doomsday', ['M-N04', 'M-N05']);
  assert.deepEqual(pending(s, 2)?.offers, ['M-N04', 'M-N05']);
});

test('armed first claim closes all other node rights and preserves a mixed blueprint', () => {
  const s = restore(openBoth());
  const revision = s.revision;
  assert.equal(claim(s, 'armed', 3, 'M-N04', revision, 1), false);
  assert.ok(claim(s, 'armed', 3, 'N01', revision, 1));
  assert.equal(claim(s, 'doomsday', 3, 'M-N04', revision, 1), false);
  buy(s, 'M-G06', 'M-P06', 'M-B07');
  assert.equal(s.ranks['M-G06'], 1);
  assert.equal(s.counts.doomsday, 6);
  assert.equal(bodyLimit(s.main, 5), 5);
  assert.ok(s.milestones.every(m => m.branch === 'armed'));
  assert.equal(claim(s, 'doomsday', 6, 'M-N07', s.revision, 2), false);
  buy(s, 'W02', 'W05', 'W06', 'W07', 'W08', 'W09');
  assert.equal(takeOrange(s, 'O01'), false);
  freeze(s, 'armed', ['N02', 'N03']);
  assert.ok(claim(s, 'armed', 6, 'N02', s.revision, 2));
  freeze(s, 'armed', ['N03', 'N04']);
  assert.ok(claim(s, 'armed', 9, 'N03', s.revision, 3));
  assert.equal(takeOrange(s, 'M-O01'), false);
  assert.ok(takeOrange(s, 'O01'));
  assert.equal(takeOrange(restore(s), 'O02'), false);
});

test('the second branch to reach three can still be the only branch selected', () => {
  let s = openBoth();
  const first = pending(s, 5)!;
  assert.equal(first.branch, 'armed');
  first.deferredWindow = 5;
  s.revision++;
  const frozen = JSON.stringify(s.milestones);
  s = restore(s);
  freeze(s, 'doomsday', ['M-N05', 'M-N04']);
  assert.equal(JSON.stringify(s.milestones), frozen);
  const revision = s.revision;
  assert.ok(claim(s, 'doomsday', 3, 'M-N05', revision, 5));
  assert.equal(claim(s, 'doomsday', 3, 'M-N05', revision, 5), false);
  assert.equal(claim(s, 'armed', 3, 'N01', s.revision, 6), false);
  assert.equal(bodyLimit(s.main, 5), 4);
  buy(s, 'M-G06', 'M-W02', 'M-B02');
  freeze(s, 'doomsday', ['M-N04', 'M-N07']);
  assert.ok(claim(s, 'doomsday', 6, 'M-N07', s.revision, 6));
  buy(s, 'M-B07', 'M-P06', 'M-G07');
  freeze(s, 'doomsday', ['M-N08', 'M-N09']);
  assert.ok(claim(s, 'doomsday', 9, 'M-N08', s.revision, 7));
  assert.equal(takeOrange(s, 'O02'), false);
  assert.ok(takeOrange(s, 'M-O02'));
});

test('a supported legacy checkpoint keeps its frozen offer and only retains an actually chosen branch', () => {
  // Input here has already passed the legacy loader. The only field replaced
  // in this example is the old purchase-time lock.
  function migrateLock(previous: BuildProgress) {
    const next = structuredClone(previous);
    if (next.orange === null && next.milestones.every(m => m.claimed === null)) next.main = null;
    return next;
  }
  const old: BuildProgress = {
    counts: {armed: 3}, main: 'armed', orange: null,
    milestones: [{id: 'armed:3', branch: 'armed', at: 3, offers: ['N01', 'N02'], claimed: null, deferredWindow: 4}]
  };
  const unlocked = migrateLock(old);
  assert.deepEqual(unlocked, {...old, main: null});
  assert.equal(old.main, 'armed');
  assert.deepEqual(migrateLock(unlocked), unlocked);
  old.milestones[0].claimed = 'N02';
  assert.deepEqual(migrateLock(old), old);
});

test('new seats include committed bodies; training and an existing fifth body keep their times', () => {
  assert.deepEqual([1, 5, 7].map(cap => bodyLimit('doomsday', cap)), [1, 4, 6]);
  const free = (seated: number, ordered: number, inSupport: number) =>
    Math.max(0, bodyLimit('doomsday', 5) - seated - ordered - inSupport);
  assert.deepEqual([free(4, 1, 0), free(5, 0, 0), free(4, 0, 0), free(3, 0, 0), free(3, 0, 1)], [0, 0, 0, 1, 0]);
  const newOrderSeconds = (main: Branch | null, base: number, kind: 'body' | 'heavy' | 'training') => {
    if (main !== 'doomsday' || kind === 'training') return base;
    return base * (kind === 'heavy' ? 1.50 : 1.25);
  };
  const previousOrder = newOrderSeconds(null, 8.8, 'body');
  assert.equal(previousOrder, 8.8);
  assert.equal(newOrderSeconds('doomsday', 8.8, 'body'), 11);
  assert.ok(Math.abs(newOrderSeconds('doomsday', 8.8, 'heavy') - 13.2) < 1e-12);
  assert.equal(newOrderSeconds('doomsday', 8.8, 'training'), 8.8);
  assert.equal(newOrderSeconds('armed', 8.8, 'body'), previousOrder);
});

function referenceBody(family: 'thor' | 'tank') {
  const w = new World({race: 'terran', seed: 111212, sandbox: true, terrain: false, waves: false, obstacles: []});
  assert.ok(w.start());
  w.entities.clear();
  w.heroes.clear();
  w.starship.enabled = w.encounters.enabled = w.missions.enabled = false;
  const u = w.addUnit(family, 'terran', 0, 0, 5);
  u.eliteId = family === 'thor' ? 'thor.3' : 'tank.2';
  if (family === 'tank') u.mode = u.desiredMode = 'siege';
  w.refreshStats(u, true);
  return {cycle: u.weaponDamage * unitData(u).attacks, period: u.attackPeriod, hp: u.maxHp};
}

// Continuous firing on one legal stationary target. The game executor will
// also have to revalidate the shooter and target before committing each launch.
function gundamSchedule(dps: number) {
  const events: {kind: 'missile' | 'cannon' | 'nuke'; launch: number; damage: number}[] = [];
  const budget = 2.2 * dps * 9;
  for (let round = 1; round <= 9; round++) {
    const start = (round - 1) * 60;
    for (const delta of [0, 3, 6, 9]) events.push({kind: 'missile', launch: start + delta, damage: budget * .5 / 36});
    if (round % 3 === 0) events.push({kind: 'cannon', launch: start + 12, damage: budget * .3 / 3});
    if (round === 9) events.push({kind: 'nuke', launch: start + 18, damage: budget * .2});
  }
  return events;
}

test('nine continuous volleys schedule three cannons and one nuke; a saved cursor resumes once', () => {
  const events = gundamSchedule(100);
  const cannonTicks = events.filter(e => e.kind === 'cannon').map(e => e.launch);
  assert.deepEqual(cannonTicks, [132, 312, 492]);
  assert.equal(events.filter(e => e.kind === 'missile').length, 36);
  const nukes = events.filter(e => e.kind === 'nuke');
  assert.equal(nukes.length, 1);
  assert.equal(nukes[0].launch + 24, 522);
  const cursor = events.findIndex(e => e.launch > cannonTicks[1]);
  const saved = JSON.parse(JSON.stringify({cursor, events})) as {cursor: number; events: typeof events};
  const issued = events.slice(0, cursor);
  const remaining = saved.events.slice(saved.cursor);
  assert.deepEqual(remaining.filter(e => e.kind === 'cannon').map(e => e.launch), [492]);
  assert.deepEqual([...issued, ...remaining], events);
  assert.ok(Math.abs(events.reduce((total, e) => total + e.damage, 0) - 1980) < 1e-8);
});

test('orange payloads share the measured V reference budget', t => {
  const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, a + ' != ' + b);
  const example = gundamSchedule(100);
  close(example[0].damage, 27.5);
  close(example.find(e => e.kind === 'cannon')!.damage, 198);
  close(example.at(-1)!.damage, 396);
  const thor = referenceBody('thor');
  const tank = referenceBody('tank');
  const actual = gundamSchedule(thor.cycle / thor.period);
  close(actual.reduce((total, e) => total + e.damage, 0), 2.2 * thor.cycle / thor.period * 9);
  const tankBudget = 2.2 * tank.cycle;
  const rowDamage = tankBudget / 3;
  const bodies = [
    {id: 'boss', x: 0, z: 5, radius: 4},
    {id: 'near', x: .9, z: 3.2, radius: .5},
    {id: 'behind', x: 0, z: -2, radius: 1}
  ];
  function barrage(forward: {x: number; z: number}) {
    const hits = new Map<string, number>();
    for (let row = 0; row < 3; row++) {
      const targets = new Set<string>();
      for (let col = 0; col < 5; col++) {
        const depth = 5 + (row - 1) * 1.8, side = (col - 2) * 1.8;
        const x = forward.x * depth + forward.z * side;
        const z = forward.z * depth - forward.x * side;
        for (const b of bodies) {
          if (b.x * forward.x + b.z * forward.z > 0 && Math.hypot(b.x - x, b.z - z) <= b.radius + .6) {
            targets.add(b.id);
          }
        }
      }
      for (const target of targets) hits.set(target, (hits.get(target) ?? 0) + rowDamage);
    }
    return hits;
  }
  const hits = barrage({x: 0, z: 1});
  close(hits.get('boss')!, tankBudget);
  close(hits.get('near')!, rowDamage);
  assert.equal(hits.has('behind'), false);
  assert.equal(barrage({x: 1, z: 0}).has('near'), false);
  for (const [id, base] of [['thor.3', thor], ['tank.2', tank]] as const) {
    assert.ok(base.cycle > 0 && base.period > 0 && base.hp > 0);
    t.diagnostic(id + ' V · 原轮 ' + base.cycle.toFixed(3) + ' / ' + base.period.toFixed(4) +
      ' 秒 · XX 裸装持续预算 ' + (2.2 * base.cycle / base.period).toFixed(3) + '/秒 · HP ' + (2.5 * base.hp).toFixed(2));
  }
});
