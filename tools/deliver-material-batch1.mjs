import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {UNIT_MATERIAL_PROFILES} from '../src/render/materials/unit-material-profiles.ts';
const out='reports/local/material-batch1-20261010',app='dist/Material-Batch1-Final-Application-20261010';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),evidence=p=>read(out+'/'+p);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fileHash(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
const [delivery,release,preservation,comparison,startup,update,zip,web,offline,decoded]=await Promise.all([
 read(app+'/delivery.json'),read('dist/web/web-release.json'),evidence('preservation.json'),evidence('comparison.json'),evidence('final-package/startup.json'),evidence('final-package/handoff-update.json'),evidence('zip-final.json'),evidence('production-web-final/result.json'),evidence('production-offline-final/result.json'),evidence('offline-byte-verification-final.json')]);
for(const r of [preservation,comparison,startup,update])assert.equal(r.passed,true);
assert.equal(startup.appBuildId,release.appBuildId);assert.equal(startup.packageBuildId,delivery.packageBuildId);assert.equal(update.activation.packageBuildId,delivery.packageBuildId);assert.equal(update.activation.retained,675);assert.equal(update.activation.installed,0);
for(const r of [web,offline]){assert.ok(!r.failure,r.failure);assert.deepEqual(r.errors,[]);assert.deepEqual(r.final.errors,[]);assert.equal(r.build.appBuildId,release.appBuildId);}
assert.equal(decoded.assets,693);assert.equal(offline.offlineSha256,decoded.htmlSha256);
for(const row of delivery.appFiles){const b=await fs.readFile(app+'/'+row.path);assert.equal(b.length,row.bytes);assert.equal(sha(b),row.sha256);assert.deepEqual(await fs.readFile('deploy/coze/'+row.path),b);}
assert.deepEqual(await fs.readFile('deploy/coze/delivery.json'),await fs.readFile(app+'/delivery.json'));
const prior=await read('dist/Native-HUD-Release-Application-20261010/delivery.json'),next=new Map(delivery.appFiles.map(r=>[r.path,r]));
const protectedRows=prior.appFiles.filter(r=>/^(backend\/|vendor\/)|^(start-coze|coze-web-server|fetch-resources|apply-update)\.mjs$|^(sc2-backend\.conf|\.env\.example)$/.test(r.path));
for(const row of protectedRows)assert.deepEqual(next.get(row.path),row);
await fs.writeFile(out+'/deployment-preservation.json',JSON.stringify({passed:true,oldPackage:prior.packageBuildId,newPackage:delivery.packageBuildId,unchanged:protectedRows.length,files:protectedRows},null,2));
const html='dist/SC2-Survivors-Material-Batch1-Final-20261010.html';
assert.equal(await fileHash(html),decoded.htmlSha256);assert.equal(await fileHash('dist/SC2-Survivors-Current-20261006.html'),decoded.htmlSha256);assert.equal(await fileHash(app+'.zip'),zip.sha256);
const previousArtifacts=[
 {path:'dist/SC2-Survivors-Native-HUD-20261010.html',bytes:501213711,sha256:'2913fa0936b7b45ac98a1baea6043c5124dedb37a819c29d5d80a7bf71317bd6'},
 {path:'dist/Native-HUD-Release-Application-20261010.zip',bytes:9480535,sha256:'2ccb86287a205e401af9794a0956a460bee3f3ae434504e32cbdecf367f2a7bb'}];
for(const row of previousArtifacts){assert.equal((await fs.stat(row.path)).size,row.bytes);assert.equal(await fileHash(row.path),row.sha256);}
const regressions=await fs.readFile(out+'/regressions-final.txt','utf8');assert.match(regressions,/tests 1293/);assert.match(regressions,/pass 1293/);assert.match(regressions,/fail 0/);
const stat=values=>({mean:values.reduce((n,v)=>n+v,0)/values.length,p95:[...values].sort((a,b)=>a-b)[Math.floor(values.length*.95)],min:Math.min(...values),max:Math.max(...values)});
const cost=[];for(const label of ['before-cost-r2','final-cost-r2']){const r=await evidence(label+'/results.json'),c=r.cost;assert.equal(r.passed,true);assert.equal(c.unchanged,true);assert.deepEqual(c.visibility,['visible']);assert.deepEqual(c.focused,[true]);cost.push({label,build:r.build.jsSha256,sourceDigest:r.build.sourceDigest,seconds:c.seconds,frames:c.frames.length,rafMs:stat(c.frames),cpuSubmitMs:stat(c.submits),drawCalls:stat(c.drawCalls),triangles:stat(c.triangles),gpu:c.gpu,browser:c.browser,visibility:c.visibility,focused:c.focused,method:c.method});}
const sources=await evidence('source-stamp.json'),models=Object.entries(UNIT_MATERIAL_PROFILES).map(([key,p])=>({key,source:p.source,sourceSha256:p.sourceSha256,glbSha256:p.glbSha256,materials:p.materials.length,clips:p.clips.length}));
for(const row of models)assert.equal(await fileHash('public/assets/optimized/model.'+row.key+'.glb'),row.glbSha256);
const result={at:new Date().toISOString(),status:'Approved first material batch integrated and locally verified; Git synchronization recorded separately',passed:true,baseline:preservation.baseline,appBuildId:release.appBuildId,packageBuildId:delivery.packageBuildId,version:'0.6.16',applicationFiles:delivery.appFiles.length,resources:preservation.resources,protection:{baselineFiles:preservation.total,rawUnchanged:preservation.unchanged.length,authorizedExistingEdits:preservation.changed,missing:preservation.missing,packagedBackendVendorConfigIdentical:protectedRows.length},models,originalSources:sources.sources,previousArtifacts,html:{path:html,bytes:decoded.htmlBytes,sha256:decoded.htmlSha256,decodedAssets:decoded.assets},zip,checks:{regressions:1293,typecheck:true,dataDocs:true,talentDefinitions:165,pairedWorldProfileRngStates:comparison.stateChecks,functionalScreens:comparison.functionalScreens,beforeScreens:comparison.pairs.reduce((n,r)=>n+r.screens,0),heroDeaths:comparison.heroDeaths.map(r=>({id:r.group,sourceDuration:r.start.duration,life:r.start.life,reclaimedAt:r.checks.at(-1).tick/60})),web:{checks:web.checks.length,screens:web.screens.length},offline:{checks:offline.checks.length,screens:offline.screens.length},startupCases:startup.cases.length,updateReused:675,updateAdded:0},comparison,cost,currentAliasMatches:true,localRepositoryMirrorMatches:true,onlineDeployment:false,limits:['Five-second paused render records, not GPU timings, stable 60 FPS, natural performance or device acceptance','Heroes Artanis/Alarak/Vorazun have separate native Death clips; no shared Zealot death model was replaced','Earlier smoke-r1 profile-fixture mismatch, final-color-r1 off-map fixture and first update manifest-path failure retained','Other-unit material risks, P6-V01, human, low-memory, high-refresh, Science Vessel, production backend and B4 remain open'],evidenceRoot:out};
result.checks.textureFilteringSamples=comparison.textureFiltering.length;
result.supersededCandidates=[
 {path:'dist/SC2-Survivors-Material-Batch1-20261010.html',bytes:501292795,sha256:'74367aaf844524c42064caa6dbbe4123c903c49cac596383c07398a68048d2f7'},
 {path:'dist/Material-Batch1-Application-20261010.zip',bytes:9497924,sha256:'7ba2f3f2fffeff5feb2311b526f2269fc01d8f2ff4c52fe4c4ec28b826d3bdb1'}];
for(const row of result.supersededCandidates){assert.equal((await fs.stat(row.path)).size,row.bytes);assert.equal(await fileHash(row.path),row.sha256);}
result.limits.push('First packaged candidate missed custom-sampler registration in the existing texture filtering path; R6 restores the original 8/4/1 settings and preloading, with all first-candidate evidence retained');
result.preview=await evidence('preview-final.json');assert.equal(result.preview.health.appBuildId,release.appBuildId);assert.equal(result.preview.backendEnabled,false);
await fs.writeFile(out+'/delivery.json',JSON.stringify(result,null,2));
await fs.writeFile('reports/qa/material-batch1-20261010.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:true,appBuildId:release.appBuildId,packageBuildId:delivery.packageBuildId,htmlBytes:decoded.htmlBytes,zipBytes:zip.bytes,checks:result.checks,protectedBackend:protectedRows.length}));
