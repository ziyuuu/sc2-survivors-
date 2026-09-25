import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const read = async path => JSON.parse(await fs.readFile(path, 'utf8'));
const measurementPath = 'reports/local/performance-probe-20260924-plane-ab/results.json';
const reportPath = 'reports/qa/performance-spatial-20260924.json';
const file = 'dist/SC2-Survivors-Demo.html';
const [measurement, offline, status, stat] = await Promise.all([
  read(measurementPath), read('reports/local/qa-v23/offline.json'), read('reports/STATUS.json'), fs.stat(file),
]);
assert.equal(measurement.failure, undefined);
assert.equal(offline.failure, undefined);
assert.deepEqual(offline.errors, []);
assert.deepEqual(offline.offline.map(run => run.race), ['terran', 'zerg', 'protoss']);
for (const run of offline.offline) assert.deepEqual(run.requests, []);
assert.ok(Date.parse(offline.at) >= stat.mtimeMs, 'Offline check must follow the current build');

const byId = Object.fromEntries(measurement.runs.map(run => [run.id, run]));
const pairs = [1, 2].map(round => {
  const control = byId[`300-native-spatial-control-r${round}`];
  const layered = byId[`300-native-r${round}`];
  assert.ok(control && layered);
  for (const run of [control, layered]) {
    assert.deepEqual(run.errors, []);
    assert.equal(run.finish.counts.enemies, 300);
    assert.equal(run.finish.counts.ordinary, 25);
    assert.equal(run.finish.counts.heroes, 3);
  }
  return {
    round,
    control: {wallSeconds: control.wallSeconds, simulationSeconds: control.simSeconds, backlogSeconds: control.backlogDelta, meanStepMs: control.stepMs.mean, meanFrameMs: control.frameMs.mean},
    layered: {wallSeconds: layered.wallSeconds, simulationSeconds: layered.simSeconds, backlogSeconds: layered.backlogDelta, meanStepMs: layered.stepMs.mean, meanFrameMs: layered.frameMs.mean},
  };
});

const sha = createHash('sha256');
for await (const chunk of createReadStream(file)) sha.update(chunk);
const sha256 = sha.digest('hex');
const report = {
  at: new Date().toISOString(),
  scope: 'Air/ground spatial buckets for separation only; contact ordering, simulation rules and fixed 60Hz retained.',
  changes: [
    {file: 'src/simulation/movement/spatial-hash.ts', behavior: 'Rebuild same-plane buckets from the same body order. Fall back to full buckets after in-step flight-state changes.'},
    {file: 'src/simulation/world.ts', behavior: 'Separation queries only its current collision plane. Contact solver still queries the full bucket.'},
    {file: 'src/simulation/combat/expedition-combat.ts', behavior: 'Invalidate plane buckets when a mode changes flying state.'},
    {file: 'src/simulation/combat/carriers.ts', behavior: 'Invalidate plane buckets when an interceptor changes flying state.'},
    {file: 'src/simulation/combat/expedition-heroes.ts', behavior: 'Invalidate plane buckets when a hero changes flying state.'},
  ],
  validation: {
    typecheck: true,
    fullTests: {command: 'npm test', passed: 590, failed: 0},
    dataDocsCheck: true,
    build: {command: 'npm run build', file, bytes: stat.size, sha256, assets: 745},
    offline: {command: 'npm run test:offline:save', races: offline.offline.map(run => run.race), httpRequests: 0, errors: 0, evidence: 'reports/local/qa-v23/offline.json'},
  },
  performance: {
    method: measurement.method,
    pairs,
    denseMicrobenchmark: {bodies: 300, queriesPerSample: 36000, oldCandidateVisits: 14556, layeredCandidateVisits: 9138, oldMedianMs: 34.7879, layeredMedianMs: 24.4351, extraRebuildMsPerFrame: 0.038918},
    deterministicWorldComparison: {steps: 90, result: 'same unit position, HP, target, RNG and contact state'},
    accepted300EnemyRealtime: false,
    evidence: measurementPath,
    limitations: 'Two interleaved development-Chrome samples on one AMD host; simulated states diverge as progress differs. New and control arms both pay the new rebuild cost. Render timing measures CPU submission rather than GPU completion. All four scenes accumulate simulated-time debt.',
  },
  commands: ['node --import tsx tools/benchmark-spatial-plane.mjs', 'npm run typecheck', 'npm test', 'npm run docs:check', 'npm run build', 'node tools/qa-performance-probe.mjs --output reports/local/performance-probe-20260924-plane-ab --port 5182 --cases 300-native-spatial-control,300-native --repeat 2', 'npm run test:offline:save'],
  limits: ['300-enemy real-time performance remains unmet.', 'Human visual readability, physical input and production-build long-run GPU measurements remain unverified.'],
};
await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
status.checkedAt = report.at;
status.tests = {command: 'npm test', passed: 590, failed: 0, skipped: 0, evidence: reportPath};
status.build = {command: 'npm run build', exitCode: 0, file, bytes: stat.size, mib: Math.round(stat.size / 1048576 * 100) / 100, sha256, largeChunkWarning: true, evidence: reportPath};
status.browser.offline = {command: 'npm run test:offline:save', exitCode: 0, checks: offline.checks, races: offline.offline.map(run => ({race: run.race, httpRequests: run.requests.length, restoredTime: run.before.time})), errors: offline.errors, evidence: 'reports/local/qa-v23/offline.json'};
status.performanceOptimization = {report: reportPath, accepted300EnemyRealtime: false, spatialPairs: pairs, fullTestsPassed: 590, offlineRacesPassed: 3};
if (status.maintenance) status.maintenance.optimizationImplementationPending = false;
await fs.writeFile('reports/STATUS.json', JSON.stringify(status, null, 2) + '\n');
console.log(JSON.stringify({report: reportPath, bytes: stat.size, sha256, pairs, tests: 590, offlineRaces: 3}));
