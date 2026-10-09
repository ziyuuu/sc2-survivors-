import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const out='reports/local/intermission-integration-20261009';
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''));
const sha=async p=>createHash('sha256').update(await fs.readFile(p)).digest('hex');
const app='dist/Intermission-UI-Coze-Application-Final-20261009',pkg=await read(app+'/delivery.json');
const web=await read(out+'/browser-r3/result.json'),details=await read(out+'/details-r4/result.json'),arrival=await read(out+'/arrival-final/result.json'),offline=await read(out+'/offline/result.json');
for(const r of [web,details,arrival,offline]){assert.ok(!r.failure,r.failure);assert.deepEqual(r.errors,[]);assert.equal(r.build.appBuildId,pkg.appBuildId);}
assert.equal(web.checks.length,6);assert.equal(web.screens.length,44);
assert.equal(details.checks.length,4);assert.equal(arrival.checks.length,2);assert.equal(arrival.geometry.length,24);assert.equal(arrival.screens.length,18);
assert.equal(offline.checks.length,3);assert.equal(offline.screens.length,4);
const startup=await read(out+'/application-final/startup.json'),update=await read(out+'/application-final/handoff-update.json');
assert.ok(startup.passed);assert.equal(startup.cases.length,4);assert.equal(startup.packageBuildId,pkg.packageBuildId);
assert.ok(update.passed);assert.equal(update.activation.packageBuildId,pkg.packageBuildId);assert.equal(update.activation.retained,629);assert.equal(update.activation.installed,9);
const preserve=await read(out+'/preservation.json'),html=await read(out+'/html.json'),zip=await read(out+'/zip.json'),cleanup=await read(out+'/cleanup.json');
assert.equal(preserve.compared,2836);assert.equal(preserve.same,2823);assert.equal(preserve.changed.length,13);assert.deepEqual(preserve.missing,[]);assert.ok(preserve.allOldResourceRecordsAndBytesIdentical);assert.equal(preserve.newAssets.length,9);
assert.match(await fs.readFile(out+'/regression-final.log','utf8'),/pass 1256/);assert.match(await fs.readFile(out+'/regression-final.log','utf8'),/fail 0/);assert.match(await fs.readFile(out+'/presentation-final.log','utf8'),/pass 69/);
for(const r of pkg.appFiles){assert.equal(await sha(path.join(app,r.path)),r.sha256);assert.equal(await sha(path.join('deploy/coze',r.path)),r.sha256);}
assert.equal(await sha(html.file),html.sha256);html.alias='dist/SC2-Survivors-Current-20261006.html';assert.equal(await sha(html.alias),html.sha256);assert.equal(await sha(zip.path),zip.sha256);
const health=await(await fetch('http://127.0.0.1:4196/health')).json();assert.equal(health.appBuildId,pkg.appBuildId);assert.equal((await(await fetch('http://127.0.0.1:4196/api/config')).json()).enabled,false);
const report={at:new Date().toISOString(),baseline:'91ea5c838d37bc0434c55c95ab30410f8e75e09a',scope:[2,3,5,10,'Approved UI-thread supply promotion','Shared shop/arrival card design'],appBuildId:pkg.appBuildId,packageBuildId:pkg.packageBuildId,application:{version:'0.6.12',files:pkg.appFiles.length,...zip},html,resources:{records:656,files:638,bytes:667894443,release:pkg.release,originalRecordsUnchanged:647,addedFiles:9,addedBytes:19055711},schemas:{run:26,profile:6,mapRecipe:3},checks:{regressions:1256,targetedFinal:69,typecheck:true,dataDocs:true,talents:165,webCoreGroups:5,webCoreCaptures:41,cancelRestGroups:2,cancelRestCaptures:2,arrivalGroups:2,arrivalCaptures:18,arrivalGeometry:24,offlineGroups:3,offlineCaptures:4,pageErrors:0,startupCases:4,updateReused:629,updateAdded:9},evidenceLimit:'browser-r3 final three arrival captures missed time windows; details-r4 mobile captures used a frozen resize. Final arrivals are from arrival-final. All earlier evidence remains unchanged.',preservation:preserve,cleanup,localDeployCopyMatches:true,preview:'http://127.0.0.1:4196/?revision=intermission-ui',liveDeployment:false,productionDatabaseOperations:false,oldSaveMatching:false,git:'git-sync.json records commit/remote comparison separately',openGates:'Natural campaigns/performance, physical devices/human acceptance, P6-V01, Science Vessel source gaps, production/operator/B4'};
await fs.writeFile(out+'/delivery.json',JSON.stringify(report,null,2));console.log(JSON.stringify({appBuildId:report.appBuildId,packageBuildId:report.packageBuildId,checks:report.checks,localPreview:report.preview}));
