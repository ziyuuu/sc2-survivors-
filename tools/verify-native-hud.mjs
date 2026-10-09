import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='reports/local/native-hud-integration-20261010';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=await read(out+'/baseline.json');
const authorized=new Set(['src/app/bootstrap.ts','src/app/run-session.ts','src/assets/manifest.ts','src/render/input/battle-view.ts','src/simulation/progression/permanent-profile.ts','src/simulation/world.ts','src/ui/gamepad/controller.ts','src/ui/hud.ts','src/ui/hud/layout.ts','src/ui/hud/packed-console.ts','src/ui/presentation/settings-screen.ts','src/ui/presentation/unit-inspector.ts','src/ui/presentation/live-inspector.ts','tools/load-build-assets.mjs','tools/prepare-current-handoff.mts','tools/restore-git-runtime.mjs']);
const report={baseline:baseline.head,unchanged:[],changed:[],missing:[],unexpected:[],deployment:[],newAssets:[]};
for(const row of baseline.files){
 if(row.file.startsWith('deploy/coze/')){report.deployment.push(row.file);continue;}
 let bytes;try{bytes=await fs.readFile(row.file);}catch{report.missing.push(row.file);continue;}
 if(bytes.length===row.bytes&&sha(bytes)===row.sha256)report.unchanged.push(row.file);
 else{report.changed.push(row.file);if(!authorized.has(row.file))report.unexpected.push(row.file);}
}
const registry=await read('deploy/runtime/native-hud-assets.json');
for(const row of registry.records){
 const file=path.basename(row.url),original='preview/sc2-native-hud-20261009/assets/'+file;
 const source=await fs.readFile(original),packed=await fs.readFile(row.packedFile),git=await fs.readFile(row.gitPath);
 assert.equal(sha(source),row.sourceSha256);assert.deepEqual(source,packed);assert.deepEqual(source,git);
 report.newAssets.push({id:row.id,original,bytes:source.length,sha256:sha(source)});
}
const release=await read('dist/web/web-release.json'),manifest=await read('dist/web/'+release.manifest);
// Use the preserved prior delivery to prove every previously released record survives.
const previous=await read('reports/local/native-hud-integration-20261010/prior-manifest.json');
for(const [id,row] of Object.entries(previous.assets))assert.deepEqual(manifest.assets[id],row,'Prior asset changed: '+id);
for(const row of new Map(Object.values(manifest.assets).map(r=>[r.url,r])).values()){const b=await fs.readFile('dist/web/'+row.url);assert.equal(b.length,row.bytes);assert.equal(sha(b),row.sha256);}
report.resources={previousRecords:Object.keys(previous.assets).length,currentRecords:Object.keys(manifest.assets).length,files:release.fileCount,bytes:release.assetBytes,release:release.release};report.appBuildId=release.appBuildId;
report.passed=!report.missing.length&&!report.unexpected.length;
await fs.writeFile(out+'/preservation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,unchanged:report.unchanged.length,changed:report.changed,missing:report.missing,unexpected:report.unexpected,newAssets:report.newAssets.length,resources:report.resources}));
assert.ok(report.passed);
