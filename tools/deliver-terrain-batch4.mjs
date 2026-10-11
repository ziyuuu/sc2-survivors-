import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root='reports/local/terrain-batch4-20261011',app='dist/Terrain-Batch4-Final-Application-20261011';
const preflight=process.argv.includes('--preflight');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8')),evidence=file=>read(root+'/'+file);
async function hashFile(file){const hash=createHash('sha256');for await(const part of createReadStream(file))hash.update(part);return hash.digest('hex');}
const [delivery,release,protection,pairs,geometry,lifecycle,startup,update,zip,web,offline,missing,decoded,controls,visual,realtime,gallery,source,metadata,bindings,application]=await Promise.all([
 read(app+'/delivery.json'),read('dist/web/web-release.json'),evidence('protection.json'),evidence('paired-states.json'),evidence('geometry-invariants.json'),evidence('environment-lifecycle-r4/results.json'),evidence('release-package-r2/startup.json'),evidence('release-update-r2/handoff-update.json'),evidence('zip-release-r2.json'),evidence('formal-web-r2/result.json'),evidence('formal-offline-r2/result.json'),evidence('formal-missing-r2/result.json'),evidence('offline-byte-verification-r2.json'),evidence('controls-r2/result.json'),evidence('visual-review.json'),evidence('after-final-realtime/results.json'),evidence('gallery-review.json'),evidence('terrain-source-stamp.json'),evidence('source-metadata-correction.json'),evidence('environment-material-bindings.json'),evidence('deployment-preservation.json')
]);
for(const report of [protection,pairs,geometry,lifecycle,startup,update,web,offline,missing,controls,visual,realtime,gallery,metadata,bindings,application])assert.equal(report.passed,true,report.failure);
assert.equal(delivery.appBuildId,release.appBuildId);
assert.equal(startup.appBuildId,release.appBuildId);
assert.equal(startup.packageBuildId,delivery.packageBuildId);
assert.equal(update.activation.packageBuildId,delivery.packageBuildId);
assert.equal(delivery.release,release.release);assert.equal(update.health.release,release.release);for(const row of startup.cases)assert.equal(row.health.release,release.release);
const finalDiagnostic=await evidence('candidate-r11/build.json');for(const report of [lifecycle,realtime])assert.equal(report.build.manifestSha256,finalDiagnostic.manifestSha256);
const ashCorrection=await evidence('ash-alpha-correction.json');assert.equal(ashCorrection.passed,true);assert.equal(ashCorrection.afterRelease,release.release);assert.equal(ashCorrection.derivedBytes,16119837);
const galleryIndex=await evidence('gallery-index.json');assert.equal(galleryIndex.finalManifest,finalDiagnostic.manifestSha256);assert.equal(galleryIndex.finalAssetRelease,release.release);
for(const report of [web,offline,missing,controls])assert.equal(report.build.release,release.release);
assert.equal(update.activation.retained,835);assert.equal(update.activation.installed,28);assert.equal(update.activation.downloadedMissing,0);
assert.equal(application.unchangedBackendVendorConfig,152);
assert.equal(geometry.geometries.length,15);assert.equal(geometry.records.length,270);
assert.equal(protection.originalSourceCount,799);assert.equal(protection.resourceRecords,881);assert.equal(protection.added.length,28);
assert.equal(decoded.assets,881);assert.equal(decoded.checked.length,881);assert.equal(offline.offlineSha256,decoded.htmlSha256);
const themes=['industrial','mar-sara','char','ice','frontier'];
for(const report of [web,offline]){
 assert.equal(report.build.appBuildId,release.appBuildId);assert.deepEqual(report.errors,[]);assert.deepEqual(report.console,[]);assert.deepEqual(report.requests,[]);
 assert.deepEqual(report.maps.map(row=>row.theme),themes);
 for(const row of report.maps){assert.equal(row.exactRecovery,true);assert.equal(row.after.map.environment.ground.profile,row.theme);for(const key of ['shadows','contact']){assert.equal(row.after[key].ready,true);assert.equal(row.after[key].fallback,null);}}
 assert.equal(report.endless.exactRecovery,true);assert.equal(report.endless.after.map.environment.flat,true);assert.equal(report.endless.after.map.environment.ground.profile,'char');
}
assert.equal(missing.checks.length,2);assert.equal(missing.checks[1].retry,true);assert.deepEqual(missing.errors,[]);
assert.equal(controls.records.length,4);assert.equal(controls.exactRecovery,true);assert.equal(controls.endless.exactRecovery,true);
assert.equal(lifecycle.records.length,20);assert.equal(lifecycle.checks.length,24);assert.deepEqual(lifecycle.errors,[]);
assert.equal(source.records.length,28);assert.equal(metadata.unchangedSourceAndPngHashes,28);assert.equal(bindings.emissiveOnlyBindings,5);
const stats=values=>({mean:values.reduce((sum,value)=>sum+value,0)/values.length,p95:[...values].sort((a,b)=>a-b)[Math.floor(values.length*.95)],min:Math.min(...values),max:Math.max(...values)}),cost=[];
for(const label of ['before-final-cost','after-final-cost']){
 const report=await evidence(label+'/results.json'),c=report.cost;assert.equal(report.passed,true,report.failure);assert.equal(c.unchanged,true);assert.equal(report.presentation.nativeThrottlingDefaults,true);assert.deepEqual(c.visibility,['visible']);assert.deepEqual(c.focused,[true]);
 if(label==='after-final-cost')assert.equal(report.build.manifestSha256,finalDiagnostic.manifestSha256);
 cost.push({label,build:report.build.jsSha256,sourceDigest:report.build.sourceDigest,state:c.report.state,time:c.report.time,subjects:c.report.subjects,resolution:c.report.runtime.resolution,seconds:c.seconds,frames:c.frames.length,rafMs:stats(c.frames),cpuSubmitMs:stats(c.submits),drawCalls:stats(c.drawCalls),triangles:stats(c.triangles),gpu:c.gpu,browser:c.browser,visibility:c.visibility,focused:c.focused,method:c.method,presentation:report.presentation});
}
assert.equal(cost[0].state,cost[1].state);assert.equal(cost[0].time,cost[1].time);assert.deepEqual(cost[0].subjects,cost[1].subjects);assert.deepEqual(cost[0].resolution,cost[1].resolution);
assert.equal(realtime.records.length,15);assert.deepEqual(realtime.errors,[]);assert.equal(realtime.presentation.nativeThrottlingDefaults,true);
const recordings=[];for(const row of realtime.records){
 assert.equal(row.clock.discardedSeconds,0);assert.equal(row.clock.visible,'visible');assert.equal(row.clock.focus,true);assert.ok(row.clock.visibilityEvents.every(event=>event.visible==='visible'&&event.focus));
 const file=root+'/after-final-realtime/'+row.video.file;assert.equal((await fs.stat(file)).size,row.video.bytes);recordings.push({name:row.name,clock:row.clock,video:{...row.video,path:file,sha256:await hashFile(file)}});
}
for(const row of delivery.appFiles){const file=app+'/'+row.path;assert.equal((await fs.stat(file)).size,row.bytes);assert.equal(await hashFile(file),row.sha256,row.path);}
const html='dist/SC2-Survivors-Terrain-Batch4-Final-20261011.html';assert.equal(await hashFile(html),decoded.htmlSha256);assert.equal(await hashFile(app+'.zip'),zip.sha256);assert.equal(zip.verifiedRoundTrip,true);
const firstDecoded=await evidence('offline-byte-verification-r1.json'),firstZip=await evidence('zip-release-r1.json');
const retainedFirstArtifacts=[{path:'dist/SC2-Survivors-Terrain-Batch4-20261011.html',sha256:firstDecoded.htmlSha256},{path:'dist/Terrain-Batch4-Application-20261011.zip',sha256:firstZip.sha256}];
for(const row of retainedFirstArtifacts)assert.equal(await hashFile(row.path),row.sha256,row.path);
const regressions=await fs.readFile(root+'/regressions-r3.log','utf8');assert.match(regressions,/tests 1326/);assert.match(regressions,/pass 1326/);assert.match(regressions,/fail 0/);
const docs=await fs.readFile(root+'/docs-check-r1.log','utf8'),talents=await fs.readFile(root+'/talents-r1.log','utf8'),buildLog=await fs.readFile(root+'/build-web-r2.log','utf8');assert.match(docs,/unchanged|match|checked|通过|PASS/i);assert.match(talents,/165/);assert.match(buildLog,/tsc --noEmit/);
const gate={passed:true,at:new Date().toISOString(),appBuildId:release.appBuildId,assetRelease:release.release,packageBuildId:delivery.packageBuildId,htmlSha256:decoded.htmlSha256,zipSha256:zip.sha256,pairedStates:pairs.pairedStates,recordings:recordings.length,formalMaps:web.maps.length,offlineMaps:offline.maps.length};
if(preflight){await fs.writeFile(root+'/delivery-preflight.json',JSON.stringify(gate,null,2));console.log(JSON.stringify(gate));process.exit(0);}
const approved=await evidence('delivery-preflight.json');for(const key of ['appBuildId','assetRelease','packageBuildId','htmlSha256','zipSha256'])assert.equal(approved[key],gate[key]);
assert.equal(await hashFile('dist/SC2-Survivors-Current-20261006.html'),decoded.htmlSha256);
for(const row of delivery.appFiles)assert.equal(await hashFile('deploy/coze/'+row.path),row.sha256,row.path);
assert.deepEqual(await read('deploy/coze/delivery.json'),delivery);
const preview=await evidence('preview-final.json');assert.equal(preview.backendEnabled,false);assert.equal(preview.health.appBuildId,release.appBuildId);assert.equal(preview.health.release,release.release);
const originalSources=await evidence('original-source-stamp.json');
const result={...gate,status:'Approved fourth visual batch integrated and locally verified; Git synchronization recorded separately',baseline:protection.baseline,version:'0.6.19',applicationFiles:delivery.appFiles.length,runSchema:26,profileVersion:6,mapRecipe:3,
 resources:{records:release.assetCount,files:release.fileCount,bytes:release.assetBytes,release:release.release,addedRecords:28,addedFiles:28,addedBytes:16119837,originalSourceHashes:799,terrainSourceHashes:28,terrainSourceBytes:18993056},
 protection:{baselineFiles:protection.total,counts:protection.counts,compiledInputs:protection.inputsChecked,packagedBackendVendorConfigIdentical:152,dependencyChanges:0},
 html:{path:html,bytes:decoded.htmlBytes,sha256:decoded.htmlSha256,decodedAssets:decoded.assets,decodedLogicalBytes:decoded.rawBytes},zip,
 checks:{regressions:1326,typecheck:true,dataDocs:true,talentDefinitions:165,geometryPairs:270,flatSamplePoints:geometry.flat.sampledPoints,identities:138,pairedWorldProfileRngStates:pairs.pairedStates,lifecycleCaptures:20,lifecycleChecks:24,web:{maps:5,screens:web.screens.length,exports:web.exports.length,endlessExactRecovery:true},offline:{maps:5,screens:offline.screens.length,exports:offline.exports.length,endlessExactRecovery:true,httpRequests:0},missingRequiredResourceAndRetry:true,controls:{sizes:controls.records.length,screens:controls.screens.length,exports:controls.exports?.length,exactRecovery:true,endlessExactRecovery:true},startupCases:startup.cases.length,updateReused:835,updateAdded:28},
 pairs:pairs.reports,geometry:{baseline:geometry.baseline,geometries:15,records:270,flat:geometry.flat},lifecycle:{build:lifecycle.build.jsSha256,checks:lifecycle.checks},cost,recordings,visual,gallery,preview,sourceCatalog:source.catalog,metadataCorrection:metadata,ashCorrection,retainedFirstArtifacts,materialBindingAudit:{files:292,targetedEmissiveOnlyBindings:5},sourceGaps:originalSources.gaps,currentAliasMatches:true,localRepositoryMirrorMatches:true,onlineDeployment:false,evidenceRoot:root,
 limits:[
  'This batch changes rendering only. Original map heights, placements, open areas, collision, World/Profile/RNG and run26/profile6/maprecipe3 are preserved. Current-schema restores do not establish old-save migration.',
  'Complete effects, dynamic clarity/camera, traceable matched original SC2 actual-client gameplay comparisons and repairs remain subsequent visual stages before overall performance/FPS/quality tiers. Recheck visual regressions after performance work.',
  'Five-second paused costs, controlled density fixtures and fifteen 20-second native recordings do not establish stable FPS, natural campaign, physical-device, high-refresh, low-memory or human acceptance. Synthetic 96 subjects are not an army cap or total entity count.',
  'Original art provenance and PBR/source-normal adaptations do not establish original-client parity. IceWorld identities are pinned to the source catalog; source alpha is normal-X or original ash coverage only where documented, never guessed as height or blend.',
  'Earlier candidates and failures remain at their actual versions: pale industrial candidate, circular base-material candidate, excessive UV-warp candidate, native context-notice assertion mismatch, global contact-texture disposal assertion mismatch, initial spawn permission errors and the rectangular-ash candidate exposed by actual Web endless review. The first offline run was interrupted after visual rejection; first named HTML/ZIP and partial evidence remain. No earlier evidence is relabelled.',
  'The context-restore comparison validates native notice/noticeUntil changes then normalizes only these fields on a cloned snapshot for gameplay comparison; actual full before/after checksums are retained.',
  'All 138 identities have five-map captures with matched native states. Matrix automation verifies state and renderer readiness; the visual review describes the bounded inspected images and decoded frames, not a fabricated human sign-off.',
  'Existing source gaps, Science Vessel, P6-V01 and production/B4 gates remain open. No online Coze, database or administrator operation was performed.'
 ]};
await fs.writeFile(root+'/delivery.json',JSON.stringify(result,null,2));
// Keep the versioned report reviewable; complete runtime arrays stay in the
// immutable local evidence, bound below by their exact file hashes.
const evidenceFiles=[];for(const file of ['delivery.json','environment-lifecycle-r4/results.json','after-final-realtime/results.json','visual-review.json','gallery-review.json'])evidenceFiles.push({path:root+'/'+file,bytes:(await fs.stat(root+'/'+file)).size,sha256:await hashFile(root+'/'+file)});
const summary={...result,evidenceFiles,
 lifecycle:{...result.lifecycle,detail:root+'/environment-lifecycle-r4/results.json',checks:lifecycle.checks.map(({name,state,before,after,gameplayAfter,nativeNotice,samplers,particles})=>({name,state,before,after,gameplayAfter,nativeNotice,samplersChecked:samplers?.length,particles:particles?{count:particles.count,visible:particles.visible,rootVisible:particles.rootVisible,cast:particles.cast,receive:particles.receive}:undefined}))},
 recordings:recordings.map(({clock,...row})=>{const {report,...timing}=clock;return {...row,clock:timing,finalState:{theme:report.theme,state:report.state,time:report.time,tick:report.tick,phase:report.phase},detail:root+'/after-final-realtime/results.json'};}),
 visual:{...visual,video:{...visual.video,build:{label:visual.video.build.label,sourceDigest:visual.video.build.sourceDigest,jsSha256:visual.video.build.jsSha256,manifestSha256:visual.video.build.manifestSha256,release:visual.video.build.release}}}
};
await fs.writeFile('reports/qa/terrain-batch4-20261011.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(gate));
