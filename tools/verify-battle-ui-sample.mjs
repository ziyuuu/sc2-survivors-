import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const out='reports/local/battle-ui-sample-20261008/revision-2',build=JSON.parse(await fs.readFile(out+'/build.json','utf8'));
async function hash(file){const h=createHash('sha256');for await(const bytes of createReadStream(file))h.update(bytes);return h.digest('hex');}
assert.equal(build.baseline,'ed215df3e0b50ccf7c5bc04d06b99114514db43a');
assert.equal(await hash(build.output),build.sha256);
const first=JSON.parse(await fs.readFile('reports/local/battle-ui-sample-20261008/build.json','utf8'));
assert.equal(build.protectedFiles.length,first.protectedFiles.length);
for(const r of first.protectedFiles)assert.equal(await hash(r.file),r.sha256,'Protected file changed since sample R1: '+r.file);
for(const r of build.protectedFiles)assert.equal(await hash(r.file),r.sha256,'Protected file changed: '+r.file);
const changed=execFileSync('git',['diff','--name-only',build.baseline,'--','src','deploy','backend','vendor','start-coze.mjs','sc2-backend.conf','index.html','vite.config.ts','package.json','package-lock.json'],{encoding:'utf8'}).trim();assert.equal(changed,'');
const previous=JSON.parse(await fs.readFile('reports/local/opening-cover-flame-20261007/delivery.json','utf8'));
const preserved=[];
for(const a of [previous.artifacts.game,previous.artifacts.application]){const sha256=await hash(a.path);assert.equal(sha256,a.sha256,'Production artifact changed: '+a.path);preserved.push({path:a.path,bytes:(await fs.stat(a.path)).size,sha256});}
const firstSample={path:'dist/Battle-UI-Feedback-Sample-R1-20261008.html',bytes:first.bytes,sha256:first.sha256};
assert.equal(await hash(firstSample.path),firstSample.sha256);assert.equal((await fs.stat(firstSample.path)).size,firstSample.bytes);preserved.push(firstSample);
assert.equal(JSON.parse(await fs.readFile('dist/web/web-release.json','utf8')).appBuildId,previous.appBuildId);
const qa=JSON.parse(await fs.readFile(out+'/browser.json','utf8'));assert.ok(!qa.failure);assert.deepEqual(qa.errors,[]);assert.equal(qa.artifactSha256,build.sha256);assert.equal(qa.build,build.sampleBuildId);
for(const file of qa.captures)assert.ok((await fs.stat(file)).size>0);
const report={at:new Date().toISOString(),baseline:build.baseline,branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),sample:{path:build.output,bytes:build.bytes,sha256:build.sha256,codeBuild:build.sampleBuildId},revision:2,checks:{typecheck:true,projectionTests:5,browser:qa.checks.length,captures:qa.captures.length,browserErrors:0,offline:true},protectedFiles:build.protectedFiles.length,protectedGitDifferences:0,preserved,productionWeb:previous.appBuildId,productionPackage:previous.packageBuildId,assets:{count:build.assets,originalBytes:true,newArtwork:0},scope:'Independent real-engine sample only. No complete-game UI/rules/save/backend edits, main integration or Coze deployment.',limitations:['Diagnostic roster, unlocked technologies, test resources and stationary targets; not natural campaign balance/performance acceptance.','Browser touch checks are not physical device or human acceptance.']};
await fs.writeFile(out+'/delivery.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
