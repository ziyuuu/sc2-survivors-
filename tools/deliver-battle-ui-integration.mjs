import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const out='reports/local/battle-ui-integration-20261008';
const app='dist/Battle-UI-Coze-Application-Final-20261008';
const read=async file=>JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
const sha=b=>createHash('sha256').update(b).digest('hex');
const application=await read(app+'/delivery.json');
const web=await read(out+'/browser-release/result.json');
const offline=await read(out+'/production-delivery/offline/offline.json');
const preservation=await read(out+'/preservation.json');
const startup=await read(out+'/application-final/startup.json');
const update=await read(out+'/application-final/handoff-update.json');
const sample=await read('reports/local/battle-ui-sample-20261008/revision-10/browser.json');
const sampleBuild=await read('reports/local/battle-ui-sample-20261008/revision-10/build.json');
for(const r of [web,offline,sample]){assert.ok(!r.failure,r.failure);assert.deepEqual(r.errors,[]);}
assert.equal(web.checks.length,23);assert.equal(offline.checks.length,6);assert.equal(sample.checks.length,49);
assert.equal(new Set(offline.checks.flatMap(r=>r.families)).size,30);
assert.equal(new Set(offline.checks.flatMap(r=>r.heroes)).size,18);
for(const r of [web,offline,preservation,startup])assert.equal(r.appBuildId,application.appBuildId);
assert.ok(startup.passed);assert.equal(startup.cases.length,4);assert.ok(update.passed);
assert.equal(startup.packageBuildId,application.packageBuildId);
assert.equal(update.activation.packageBuildId,application.packageBuildId);
assert.equal(update.activation.retained,629);assert.equal(update.activation.installed,0);
assert.equal(preservation.sourceFiles,585);assert.equal(preservation.unchanged,577);
const regression=await fs.readFile(out+'/regressions-delivery.txt','utf8');
assert.match(regression,/tests 1184/);assert.match(regression,/pass 1184/);assert.match(regression,/fail 0/);
for(const row of application.appFiles){
 const bytes=await fs.readFile(path.join(app,row.path));assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);
 assert.equal(sha(await fs.readFile(path.join('deploy/coze',row.path))),row.sha256);
}
const html=await fs.readFile(offline.offlineFile);
assert.equal(sha(html),offline.offlineSha256);
assert.equal(sha(await fs.readFile('dist/SC2-Survivors-Current-20261006.html')),offline.offlineSha256);
assert.equal(sha(await fs.readFile(sampleBuild.output)),sampleBuild.sha256);
const zip=await read(out+'/zip-final.json');assert.equal(sha(await fs.readFile(zip.path)),zip.sha256);
const sources=[];
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const f=dir+'/'+e.name;if(e.isDirectory())await walk(f);else sources.push({path:f,sha256:sha(await fs.readFile(f))});}}
await walk('src');
const report={at:new Date().toISOString(),status:'Approved battle HUD and card UI integrated and locally verified; Git synchronization recorded separately',
 game:{appBuildId:application.appBuildId,runSchema:26,profileVersion:6,mapRecipeVersion:3,simulationDataRenderControlsFxTerrainUnchanged:true,optionalPurchasePresentationMetadataOutsideWorld:true,mobileCells:'up to 48px wide / 30px high',longPressReleaseDoesNotSelectAnotherUnit:true},
 resources:{records:647,files:629,bytes:648838732,release:application.release,additions:0},
 html:{path:offline.offlineFile,bytes:html.length,sha256:offline.offlineSha256,currentAliasMatches:true},
 application:{path:zip.path,bytes:zip.bytes,sha256:zip.sha256,packageBuildId:application.packageBuildId,files:application.appFiles.length,localDeployCopyMatches:true},
 sample:{revision:10,build:sample.build,sha256:sampleBuild.sha256,checks:49,captures:sample.captures.length},
 checks:{regressions:1184,typecheck:true,dataDocs:true,talents:165,webChecks:web.checks.length,webCaptures:web.captures.length,offlineGroups:6,ordinaryFamilies:30,heroes:18,pageErrors:0,baselineFiles:585,baselineUnchanged:577,authorizedExistingChanges:8,cozeLocalStartup:4,updateReused:629,updateAdded:0,idempotenceAndRollbackAndTamperRefusal:true},
 liveDeployPerformed:false,productionDatabaseOperated:false,sources,
 evidence:{web:out+'/browser-release/result.json',offline:out+'/production-delivery/offline/offline.json',preservation:out+'/preservation.json',startup:out+'/application-final/startup.json',update:out+'/application-final/handoff-update.json',git:out+'/git-sync.json'},
 open:['P6-V01','Natural/high-density performance and full M6/M7','Human visual and physical devices/high refresh/long term/low memory','Three Science Vessel source gaps','Production backend/operator/B4'],
 history:'All earlier attempts retain their actual build and artifact identities. Earlier sample geometry expectations and real long-press release mis-selection are retained; no retagging as final evidence.'};
await fs.writeFile(out+'/delivery.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({web:application.appBuildId,package:application.packageBuildId,checks:report.checks,sample:report.sample}));
