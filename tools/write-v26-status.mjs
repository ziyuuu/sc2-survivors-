import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

// Summarize actual local evidence; do not convert rule/fixture checks into a
// claim that balance, human visual review or high-load performance passed.
const read=async path=>JSON.parse(await fs.readFile(path,'utf8'));
const prior=await read('reports/STATUS.json');
const development=await read('reports/local/qa-v23/development.json');
const offline=await read('reports/local/qa-v23/offline.json');
const interaction=await read('reports/local/qa-three-race/results.json');
const models=await read('reports/local/qa-three-race-models.json');
const content=await read('reports/local/three-race-content-readiness.json');
const mainHive=await read('reports/local/qa-main-hive/results.json');
const performance=await read('reports/local/qa-three-race-performance-optimized/results.json');
const tests=await fs.readFile('reports/local/v26-tests-final.log','utf8');
const buildLog=await fs.readFile('reports/local/v26-build.log','utf8');
const file='dist/SC2-Survivors-Demo.html',binary=await fs.readFile(file);
const stat=await fs.stat(file);
assert.match(tests,/tests 586/);assert.match(tests,/pass 586/);assert.match(tests,/fail 0/);
assert.match(buildLog,/Prepared 745\/745 assets; 0 required missing/);
assert.equal(development.failure,undefined);assert.deepEqual(development.errors,[]);
assert.equal(offline.failure,undefined);assert.deepEqual(offline.errors,[]);
assert.equal(offline.offline.length,3);
assert.deepEqual(offline.offline.map(r=>r.race),['terran','zerg','protoss']);
assert.ok(Date.parse(offline.at)>=stat.mtimeMs,'offline check must use this built artifact');
for(const run of offline.offline){assert.deepEqual(run.requests,[]);assert.equal(run.before.expedition.race,run.race);}
assert.deepEqual(interaction.errors,[]);assert.deepEqual(models.errors,[]);assert.deepEqual(content.structuralFailures,[]);
const report={
 ...(prior.maintenance?{maintenance:prior.maintenance}:{}),
 checkedAt:new Date().toISOString(),repository:prior.repository,projectDirectory:'D:\\星际',branch:prior.branch,baseCommit:prior.baseCommit,
 release:'V26',deliveryState:'Local playable validation build; working-tree changes include preserved V23–V25 work. No commit or push. Formal completion criteria remain unmet.',formalAcceptance:false,
 scope:'Three races, 30 ordinary families, 15 hero candidates, 40 elites, continuous paid production, transactional receipt-time replacement, development and reinforcement choices, 117-node talent trees with 50 allocation points at 3 resources each, 18-stage campaign and endless continuation.',
 tests:{command:'npm test',passed:586,failed:0,skipped:0,log:'reports/local/v26-tests-final.log'},
 typecheck:{command:'npm run typecheck',exitCode:0},
 dataDocumentation:{commands:['npm run docs:data','npm run docs:check'],exitCode:0},
 build:{command:'npm run build',exitCode:0,file,bytes:binary.length,mib:Math.round(binary.length/1048576*100)/100,sha256:crypto.createHash('sha256').update(binary).digest('hex'),largeChunkWarning:true,log:'reports/local/v26-build.log'},
 assets:{available:745,manifestTotal:745,requiredMissing:[],contentRecords:Object.keys(content.models).length,newRuntimeModelChecks:models.checks.length,sourceProfiles:content.sourceProfiles,structuralFailures:content.structuralFailures,humanVisualApproved:false,evidence:['reports/local/three-race-content-readiness.json','reports/local/qa-three-race-models.json']},
 roster:{races:3,ordinaryFamilies:30,ordinaryFamiliesPerRace:10,activeFamilies:5,bodiesPerFamily:5,heroes:15,heroesPerRace:5,activeHeroIdentities:3,elites:40},
 talents:{nodes:117,presets:9,maximumAllocated:50,allocationCostPerRank:1,resourceCostPerRank:3,fullAllocationPrice:150,freeRespec:true,runPresetFrozen:true,legacyPricesFrozen:true},
 save:{archiveVersion:1,runSchema:1,containerRules:'survivors-v26',newRunRules:'three-race-18-v1',legacyCampaignStages:12,legacyCapacity:35,storage:'IndexedDB atomic legacy profile + three-race profile + run transaction',backupCount:2,resumePaused:true,offlineTimeAdvances:false,portableImportExport:true},
 browser:{headless:true,physicalDeviceTested:false,interaction:{evidence:'reports/local/qa-three-race/results.json',runs:interaction.runs.map(r=>({width:r.width,height:r.height,races:r.races.map(x=>x.race),checks:r.checks,errors:r.errors}))},development:{command:'npm run test:browser:save',exitCode:0,checks:development.checks,errors:development.errors,evidence:'reports/local/qa-v23/development.json'},offline:{command:'npm run test:offline:save',exitCode:0,checks:offline.checks,races:offline.offline.map(r=>({race:r.race,httpRequests:r.requests.length,restoredTime:r.before.time})),errors:offline.errors,evidence:'reports/local/qa-v23/offline.json'},mainHive:{evidence:'reports/local/qa-main-hive/results.json',errors:mainHive.errors??[],humanVisualApproved:false}},
 economy:{routes:9,seedsPerRoute:3,successfulTransactionSimulations:27,assumptions:'Zero talents; no combat losses; successful rescue; actual payments and public transactions. Does not establish battle completion or win rate.',formationStages:[7,8,12,7,9,11,9,10,11],evidence:'reports/local/expedition-builds-formation-first.json'},
 combatSampling:{zeroTalentFirstSixVerified:false,seed:89241,controller:'rescue-stutter-v2',maps:['flat','original'],results:'Input-only controller failed in stages 1–4. No crash or NaN reported. Limited tactics do not establish human impossibility.',evidence:['reports/local/expedition-survival-flat-v2.json','reports/local/expedition-survival-original-v2.json']},
 performance:{accepted:false,host:performance.host,browser:performance.browserVersion,method:performance.method,runs:performance.runs.map(r=>({race:r.race,width:r.width,height:r.height,wallSeconds:r.wallSeconds,simSeconds:r.simSeconds,backlogDelta:r.backlogDelta,stepMs:r.stepMs,frameMs:r.frameMs,counts:r.finish.counts,errors:r.errors})),evidence:'reports/local/three-race-performance.md',subsequentOptimization:{change:'MapTerrain.walkLine reuses the previous sample height with identical predicates.',equivalentRandomPaths:43200,equivalentOriginalMapPaths:8192,heightCallReductionPercent:45.54,queryMedianReductionPercent:4.5,wholeBrowserRemeasured:false,evidence:'reports/local/qa-map-walkline.json'}},
 documents:{index:'docs/README.md',design:'docs/DESIGN.md',contract:'docs/BUILD_RESEARCH.md',architecture:'docs/ARCHITECTURE.md',save:'docs/SAVE_SYSTEM.md',generatedData:'docs/GAME_DATA_REFERENCE.md',roadmap:'docs/ROADMAP.md',qa:'docs/QA.md'},
 commands:['npm run typecheck','npm test','npm run docs:data','npm run docs:check','npm run build','npm run test:browser:save','npm run test:offline:save','node tools/qa-three-race.mjs','node tools/qa-three-race-models.mjs','node tools/qa-main-hive.mjs','node tools/qa-three-race-performance.mjs','node --import tsx tools/qa-expedition-builds.mts','node --import tsx tools/qa-expedition-survival.mts','node --import tsx tools/qa-expedition-survival.mts --original','node --import tsx tools/qa-map-walkline.mts'],
 evidence:'reports/qa/v26-runtime.json',
 limits:['High-load 300-enemy realtime performance has not passed; simulated time debt remains.','Full 18-stage human playthrough, all nine builds in combat, zero/mid/50 talent and other-difficulty balance are not verified.','Headless original-model loading, DOM and effect presence do not establish human visual readability or fidelity.','Physical phone and controller, long-duration memory and production-build stress performance remain unverified.','Thor missile weapons retain existing immediate-hit engine timing; source launch timing is documented, not fully reproduced.','Existing Acropolis decorative placements and cliff models remain incomplete as documented in V22.','file:// storage is browser/origin dependent; use the existing export feature before moving the HTML.']
};
const json=JSON.stringify(report,null,2)+'\n';await fs.mkdir('reports/qa',{recursive:true});await fs.writeFile('reports/qa/v26-runtime.json',json);await fs.writeFile('reports/STATUS.json',json);
console.log(JSON.stringify({release:report.release,tests:report.tests,build:report.build,offlineRaces:report.browser.offline.races,formalAcceptance:report.formalAcceptance}));
