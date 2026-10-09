import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const out='reports/local/entry-fixes-20261009',app='dist/Entry-Fixes-Coze-Application-20261009';
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''));
async function sha(p){const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');}
const baseline=await read(out+'/baseline.json'),pkg=await read(app+'/delivery.json'),release=await read('dist/web/web-release.json');
const runtimeChanges=['src/app/asset-readiness.ts','src/app/race-preload.ts','src/render/scene/battle-renderer.ts','src/ui/hud.ts','src/ui/hud/m3-menu.ts','src/ui/intermission-skin/refinements.css','src/ui/intermission-skin/skin.css','src/ui/intermission-skin/skin.ts','src/ui/presentation/intermission.ts','src/ui/presentation/world-labels.css'];
const allowed=[...runtimeChanges,'tools/offline-pack.mjs'].sort();
const protectedRows=baseline.files.filter(r=>!r.path.startsWith('deploy/coze/'));
const changed=[],missing=[];let same=0;
for(const r of protectedRows){try{const after=await sha(r.path);if(after===r.sha256)same++;else changed.push({path:r.path,before:r.sha256,after});}catch(e){if(e.code==='ENOENT')missing.push(r.path);else throw e;}}
assert.deepEqual(missing,[]);assert.deepEqual(changed.map(r=>r.path).sort(),allowed);
const gitDelta=(await fs.readFile(out+'/protected-git-diff.txt','utf8')).replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(Boolean);
assert.deepEqual(gitDelta.sort(),runtimeChanges.toSorted());
// This stylesheet was omitted from the raw inventory by an old path typo. Its
// original Git blob, rather than a newly invented baseline hash, is the proof.
const supplemental=await read(out+'/supplemental-git-proof.json');
assert.equal(supplemental.path,'src/render/scene/battle-distress.css');assert.equal(supplemental.before,supplemental.after);assert.equal(supplemental.before,'f3997bcefc65f6ab21285fd1ec685347eaf074f6');
const manifest=await read('dist/web/'+release.manifest),oldManifest=baseline.files.find(r=>r.path==='deploy/coze/public/'+release.manifest);
assert.ok(oldManifest);assert.equal(await sha('dist/web/'+release.manifest),oldManifest.sha256);
const resourceFiles=[...new Map(Object.values(manifest.assets).map(r=>[r.url,r])).values()];
for(const r of resourceFiles){assert.equal((await fs.stat('dist/web/'+r.url)).size,r.bytes);assert.equal(await sha('dist/web/'+r.url),r.sha256);}
const runtimeNames=new Set(['coze-web-server.mjs','apply-update.mjs','start-coze.mjs','fetch-resources.mjs','sc2-backend.conf','.env.example']);
const backendRows=baseline.files.filter(r=>r.path.startsWith('deploy/coze/')).filter(r=>{const p=r.path.slice('deploy/coze/'.length);return p.startsWith('backend/')||p.startsWith('vendor/')||runtimeNames.has(p);});
for(const r of backendRows)assert.equal(await sha(app+'/'+r.path.slice('deploy/coze/'.length)),r.sha256,r.path);
const newSources=['src/ui/presentation/overlay-layout.ts','src/ui/intermission-skin/adaptive-layout.css'];
const preservation={baseline:baseline.commit,rawBaselineFiles:baseline.files.length,compared:protectedRows.length,same,changed,missing,newSources,supplementalGitProof:supplemental,gitDelta,simulationDataInputMapsModelsAndAttackEffectModulesUnchanged:true,oldResourceManifestAndBytesIdentical:true,resources:{records:Object.keys(manifest.assets).length,files:resourceFiles.length,bytes:resourceFiles.reduce((n,r)=>n+r.bytes,0),release:release.release},packagedBackendVendorLauncherConfigUnchanged:backendRows.length};
await fs.writeFile(out+'/preservation-final.json',JSON.stringify(preservation,null,2));
for(const r of pkg.appFiles)assert.equal(await sha(path.join(app,r.path)),r.sha256,r.path);
assert.equal(pkg.appBuildId,release.appBuildId);
if(process.argv.includes('--preservation-only')){console.log(JSON.stringify({compared:preservation.compared,same,changed:changed.length,missing:missing.length,resources:preservation.resources,backend:backendRows.length}));process.exit(0);}

const web=await read(out+'/web-r6/result.json'),surfaces=await read(out+'/surfaces-r6/result.json'),scenarios=await read(out+'/scenarios-r6/result.json'),offline=await read(out+'/offline-r6/result.json');
for(const r of [web,surfaces,scenarios,offline]){assert.ok(!r.failure,r.failure);assert.deepEqual(r.errors,[]);assert.equal(r.build.appBuildId,release.appBuildId);if(r.finalBuild)assert.equal(r.finalBuild.appBuildId,release.appBuildId);}
assert.equal(web.checks.length,9);assert.equal(web.screens.length,48);assert.equal(surfaces.screens.length,224);assert.deepEqual(surfaces.issues,[]);assert.equal(scenarios.checks.length,9);assert.equal(scenarios.screens.length,27);assert.equal(offline.checks.length,3);assert.equal(offline.screens.length,16);
const independent=await read(out+'/independent-r6/summary.json');assert.deepEqual(independent.errors,[]);assert.ok(independent.builds.every(id=>id===release.appBuildId));assert.deepEqual(independent.modalOutside,[]);
const independentOffline=await read(out+'/independent-offline-r6/delivery.json');assert.ok(independentOffline.passed);assert.equal(independentOffline.appBuildId,release.appBuildId);
const startup=await read(out+'/application-r6/startup.json'),update=await read(out+'/application-r6/handoff-update.json');
assert.ok(startup.passed);assert.equal(startup.cases.length,4);assert.equal(startup.packageBuildId,pkg.packageBuildId);assert.ok(update.passed);assert.equal(update.activation.packageBuildId,pkg.packageBuildId);assert.equal(update.activation.retained,638);assert.equal(update.activation.installed,0);
const regression=await fs.readFile(out+'/regressions-r6.log','utf8');assert.match(regression,/pass 1271/);assert.match(regression,/fail 0/);assert.doesNotMatch(await fs.readFile(out+'/typecheck-r6.log','utf8'),/error TS/);assert.match(await fs.readFile(out+'/docs-check-r6.log','utf8'),/matches runtime data/);assert.match(await fs.readFile(out+'/talents-r6.log','utf8'),/165/);
const byteProof=await read(out+'/offline-byte-verification.json');assert.equal(byteProof.assets,656);assert.equal(byteProof.checked.length,656);assert.equal(byteProof.htmlBytes,(await fs.stat(byteProof.file)).size);assert.equal(byteProof.htmlSha256,await sha(byteProof.file));assert.equal(independentOffline.htmlSha256,byteProof.htmlSha256);
const zip=await read(out+'/zip-final.json');assert.equal(await sha(zip.path),zip.sha256);assert.equal((await fs.stat(zip.path)).size,zip.bytes);
if(process.argv.includes('--copy-local')){
 for(const r of pkg.appFiles){const target=path.join('deploy/coze',r.path);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(app,r.path),target);}
 await fs.copyFile(app+'/delivery.json','deploy/coze/delivery.json');
 await fs.copyFile(byteProof.file,'dist/SC2-Survivors-Current-20261006.html');
 console.log(JSON.stringify({copied:pkg.appFiles.length,html:byteProof.file,appBuildId:release.appBuildId}));process.exit(0);
}
assert.equal(await sha('dist/SC2-Survivors-Current-20261006.html'),byteProof.htmlSha256);
for(const r of pkg.appFiles)assert.equal(await sha(path.join('deploy/coze',r.path)),r.sha256);
assert.equal(await sha(app+'/delivery.json'),await sha('deploy/coze/delivery.json'));
const health=await(await fetch('http://127.0.0.1:4196/health')).json();assert.equal(health.appBuildId,release.appBuildId);assert.equal((await(await fetch('http://127.0.0.1:4196/api/config')).json()).enabled,false);
const comparison={baseline:baseline.commit,baselineHtmlBytes:500593248,finalHtmlBytes:byteProof.htmlBytes,savedHtmlBytes:500593248-byteProof.htmlBytes,savedHtmlPercent:100*(500593248-byteProof.htmlBytes)/500593248,baselineLoads:(await read(out+'/baseline/result.json')).loads.map(r=>({race:r.race,mode:r.mode,reload:r.reload,ms:r.samples.at(-1)?.ms})),finalLoads:web.loads.map(r=>({race:r.race,mode:r.mode,reload:r.reload,ms:r.samples.at(-1)?.ms})),method:'Diagnostic headless-browser wall-clock samples on this machine, not controlled benchmark or natural/device acceptance. No old screenshot or timing is relabeled as final.'};
await fs.writeFile(out+'/comparison.json',JSON.stringify(comparison,null,2));
const result={at:new Date().toISOString(),baseline:baseline.commit,appBuildId:release.appBuildId,packageBuildId:pkg.packageBuildId,application:{version:'0.6.14',files:pkg.appFiles.length,...zip},html:{path:byteProof.file,bytes:byteProof.htmlBytes,sha256:byteProof.htmlSha256,alias:'dist/SC2-Survivors-Current-20261006.html'},resources:preservation.resources,schemas:{run:26,profile:6,mapRecipe:3},checks:{regressions:1271,typecheck:true,dataDocs:true,talents:165,webGroups:9,webCaptures:48,surfaceCaptures:224,surfaceIssues:0,scenarioGroups:9,scenarioCaptures:27,offlineGroups:3,offlineCaptures:16,allOfflineAssetsByteVerified:656,independentWeb:independent.screens,independentOffline,pageErrors:0,startupCases:4,updateReused:638,updateAdded:0},preservation,comparison,earlierFailuresRetained:true,localDeployCopyMatches:true,preview:'http://127.0.0.1:4196/?revision=entry-fixes-r6',liveDeployment:false,productionDatabaseOperations:false,oldSaveMatching:false,openGates:'Natural campaigns/performance, physical devices/human acceptance, P6-V01, high-refresh/low-memory, Science Vessel source gaps, production/operator/B4',git:'git-sync.json records commit/remote comparison separately'};
await fs.writeFile(out+'/delivery.json',JSON.stringify(result,null,2));console.log(JSON.stringify({appBuildId:result.appBuildId,packageBuildId:result.packageBuildId,regressions:result.checks.regressions,html:result.html,zip:result.application,resources:result.resources}));
