import fs from 'node:fs/promises';import {createReadStream} from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const root='reports/local/protoss-elites-auras-20261005',baseline=JSON.parse(await fs.readFile(root+'/baseline.json','utf8'));
async function record(path){const digest=crypto.createHash('sha256');for await(const chunk of createReadStream(path))digest.update(chunk);return {path,bytes:(await fs.stat(path)).size,sha256:digest.digest('hex')};}
const source=[];for(const before of baseline.source){const after=await record(before.path);source.push({...after,before:before.sha256,unchanged:after.sha256===before.sha256});}
const protectedSource=source.filter(s=>/^src\/data\/(heroes|terran-heroes|zerg-heroes|protoss-heroes|terran-elites|zerg-elites)\.ts$/.test(s.path)||/^src\/render\/effects\/.*(hero|terran-elite|p4-)/.test(s.path));
assert.ok(protectedSource.length>=20);for(const row of protectedSource)assert.ok(row.unchanged,'Protected source changed: '+row.path);
const artifacts=[];for(const before of baseline.artifacts){const after=await record(before.path);assert.equal(after.sha256,before.sha256,'Historical HTML '+before.path);artifacts.push(after);}
const proposals=[];for(const before of baseline.proposals){const after=await record(before.path);assert.equal(after.sha256,before.sha256,'Approved values '+before.path);proposals.push(after);}
const web=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));for(const k of ['assetCount','fileCount','assetBytes','logicalBytes','sharedBytes','manifest','release'])assert.equal(web[k],baseline.web[k],k);
const manifest=JSON.parse(await fs.readFile('dist/web/'+web.manifest,'utf8')),assets=Object.values(manifest.assets),unique=[...new Map(assets.map(a=>[a.url,a])).values()];
let verifiedBytes=0;for(const asset of unique){const r=await record('dist/web/'+asset.url);assert.equal(r.sha256,asset.sha256);assert.equal(r.bytes,asset.bytes);verifiedBytes+=r.bytes;}
assert.equal(verifiedBytes,web.assetBytes);assert.equal(assets.length,web.assetCount);assert.equal(unique.length,web.fileCount);
const outputs=[];for(const path of ['dist/Thirty-Protoss-Elites-Integrated-Game-Demo.html','dist/SC2-Survivors-Protoss-Elites-And-Auras-20261005.html'])outputs.push(await record(path));
const report={baseline:root+'/baseline.json',source,protectedSource:protectedSource.map(s=>s.path),artifacts,proposals,outputs,web,resources:{records:assets.length,files:unique.length,verifiedBytes,newBytes:0,release:web.release}};
await fs.writeFile(root+'/preservation.json',JSON.stringify(report,null,2));console.log(JSON.stringify({source:source.length,unchanged:source.filter(s=>s.unchanged).length,changed:source.filter(s=>!s.unchanged).map(s=>s.path),protected:protectedSource.length,previousHTMLs:artifacts.length,outputs,resources:report.resources}));
