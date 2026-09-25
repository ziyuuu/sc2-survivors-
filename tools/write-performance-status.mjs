import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const read=async path=>JSON.parse(await fs.readFile(path,'utf8'));
const old=await read('reports/local/performance-probe-20260924/results.json');
const first=await read('reports/local/performance-probe-20260924-after/results.json');
const repeated=await read('reports/local/performance-probe-20260924-repeat/results.json');
const offline=await read('reports/local/qa-v23/offline.json');
const previous=await read('reports/STATUS.json');
assert.equal(first.failure,undefined);assert.equal(repeated.failure,undefined);
assert.equal(offline.failure,undefined);assert.deepEqual(offline.errors,[]);
assert.deepEqual(offline.offline.map(r=>r.race),['terran','zerg','protoss']);
for(const race of offline.offline)assert.deepEqual(race.requests,[]);
const file='dist/SC2-Survivors-Demo.html',stat=await fs.stat(file);
assert.ok(Date.parse(offline.at)>=stat.mtimeMs,'Offline validation must follow this build');
const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);
const sha256=hash.digest('hex');assert.equal(sha256,'9be1439f3eb082bea6ade9015d42bb9882a7de4f2bb9e65d009470336dcbff4e');
const samples=kind=>[...first.runs,...repeated.runs].filter(r=>r.id===kind||r.id.startsWith(kind+'-r'));
const summary=kind=>{const runs=samples(kind);assert.equal(runs.length,3);for(const run of runs){assert.equal(run.finish.counts.enemies,300);assert.deepEqual(run.errors,[]);}const simulations=runs.map(r=>r.simSeconds).sort((a,b)=>a-b);return {count:runs.length,simulationSeconds:simulations,medianSimulationSeconds:simulations[1],backlogSeconds:runs.map(r=>r.backlogDelta),meanTriangles:runs.map(r=>r.triangles.mean),meanDrawCalls:runs.map(r=>r.drawCalls.mean)};};
const native=summary('300-native'),reduced=summary('300-performance');
const oldNative=old.runs.find(r=>r.id==='300-native'),oldReduced=old.runs.find(r=>r.id==='300-performance');
assert.ok(oldNative&&oldReduced);
const report={at:new Date().toISOString(),scope:'A* workspace reuse and ordinary-family original-geometry LOD coverage; fixed 60Hz, combat rules and enemy counts unchanged.',
 changes:[{file:'src/simulation/movement/map-terrain.ts',behavior:'Reusable per-map Float64 costs, predecessors and generation-stamped visited/closed arrays; no full-map allocation or fill per search.'},{file:'src/render/scene/battle-renderer.ts',behavior:'Original-geometry LOD eligibility covers all 30 ordinary families, death and existing mode models; hero/elite keys stay full detail.'}],
 validation:{typecheck:true,fullTests:{passed:587,failed:0,command:'npm test'},dataDocsCheck:true,build:{file,bytes:stat.size,sha256,assets:745,command:'npm run build'},offline:{races:offline.offline.map(r=>r.race),httpRequests:0,errors:0,evidence:'reports/local/qa-v23/offline.json'}},
 performance:{baseline:{samplesPerCase:1,native:{simulationSeconds:oldNative.simSeconds,backlogSeconds:oldNative.backlogDelta,meanTriangles:oldNative.triangles.mean},reduced:{simulationSeconds:oldReduced.simSeconds,backlogSeconds:oldReduced.backlogDelta,meanTriangles:oldReduced.triangles.mean}},after:{samplesPerCase:3,native,reduced},accepted300EnemyRealtime:false,evidence:['reports/local/performance-probe-20260924/results.json','reports/local/performance-probe-20260924-after/results.json','reports/local/performance-probe-20260924-repeat/results.json'],limitations:'Development Chrome on one AMD host. Previous baseline has one sample; new scenarios advance to different states. Render timing is CPU submission, not GPU completion. The lower triangle count does not prove a proportional frame-time improvement; 300 enemies still accumulate simulation debt.'},
 commands:['npm run typecheck','node --import tsx --test test/original-map.test.ts test/map-walkline.test.ts test/presentation.test.ts test/render-performance-v14.test.ts','npm test','npm run docs:check','npm run build','node tools/qa-performance-probe.mjs --output reports/local/performance-probe-20260924-after --port 5180','node tools/qa-performance-probe.mjs --output reports/local/performance-probe-20260924-repeat --port 5181 --cases 300-native,300-performance --repeat 2','npm run test:offline:save'],
 limits:['300-enemy real-time performance remains unmet.','Human visual readability, physical input and production-build long-run GPU measurements remain unverified.']};
const reportPath='reports/qa/performance-20260924.json';await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
previous.checkedAt=report.at;
previous.tests={command:'npm test',passed:587,failed:0,skipped:0,evidence:reportPath};
previous.build={command:'npm run build',exitCode:0,file,bytes:stat.size,mib:Math.round(stat.size/1048576*100)/100,sha256,largeChunkWarning:true,evidence:reportPath};
previous.browser.offline={command:'npm run test:offline:save',exitCode:0,checks:offline.checks,races:offline.offline.map(r=>({race:r.race,httpRequests:r.requests.length,restoredTime:r.before.time})),errors:offline.errors,evidence:'reports/local/qa-v23/offline.json'};
previous.performanceOptimization={report:reportPath,accepted300EnemyRealtime:false,nativeMedianSimulationSeconds:native.medianSimulationSeconds,reducedMedianSimulationSeconds:reduced.medianSimulationSeconds,fullTestsPassed:587,offlineRacesPassed:3};
await fs.writeFile('reports/STATUS.json',JSON.stringify(previous,null,2)+'\n');
console.log(JSON.stringify({report:reportPath,buildBytes:stat.size,sha256,nativeMedianSimulationSeconds:native.medianSimulationSeconds,reducedMedianSimulationSeconds:reduced.medianSimulationSeconds,tests:587,offlineRaces:3}));
