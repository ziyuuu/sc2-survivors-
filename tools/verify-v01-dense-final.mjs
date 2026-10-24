import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='reports/local/v01-20261024',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=await read(base+'/dense-current-baseline.json'),adoption=await read(base+'/dense-r3-adoption-plan.json'),allowed=new Map(adoption.files.map(f=>[f.file,f.sha256])),changed=[],files=[];
for(const f of baseline.files){const hash=sha(await fs.readFile(f.file));if(hash!==f.sha256){assert.equal(hash,allowed.get(f.file),f.file);changed.push({file:f.file,before:f.sha256,after:hash});}}
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const file=dir+'/'+e.name;if(e.isDirectory())await walk(file);else files.push(file);}}
await walk('src');await walk('test');const originals=new Set(baseline.files.map(f=>f.file)),added=files.filter(f=>!originals.has(f));assert.deepEqual(added,['test/source-particle-lifetime.test.ts']);assert.equal(sha(await fs.readFile(added[0])),allowed.get(added[0]));assert.equal(changed.length,2);
const currentPath='dist/SC2-Survivors-Current-20261006.html',currentHash=createHash('sha256');for await(const b of createReadStream(currentPath))currentHash.update(b);assert.equal(currentHash.digest('hex'),baseline.current);
const builds=[];
for(const [name,inputKey] of [['web-game-dense-adopted-r1','path'],['web-game-dense-final-r1','path'],['offline-game-dense-final-r1','file']]){const b=await read(base+'/'+name+'-build.json');for(const f of b.inputs)assert.equal(sha(await fs.readFile(f[inputKey])),f.sha256,f[inputKey]);builds.push({name,inputs:b.inputs.length,assets:b.assetCount,chunks:b.chunks,js:b.jsSha256??b.artifacts.filter(f=>f.file.endsWith('.js')),css:b.cssSha256??b.artifacts.filter(f=>f.file.endsWith('.css'))});}
const candidate=await read(base+'/web-game-dense-particle-b3-build.json'),formal=await read(base+'/web-game-dense-adopted-r1-build.json');for(const kind of ['.js','.css'])assert.deepEqual(formal.artifacts.filter(f=>f.file.endsWith(kind)),candidate.artifacts.filter(f=>f.file.endsWith(kind)));
const oldWeb=await read(base+'/web-game-stage-window-final-r1-build.json'),newWeb=await read(base+'/web-game-dense-final-r1-build.json'),oldOffline=await read(base+'/offline-game-stage-window-final-r1-build.json'),newOffline=await read(base+'/offline-game-dense-final-r1-build.json');
assert.deepEqual(newWeb.artifacts.filter(f=>f.file.endsWith('.css')),oldWeb.artifacts.filter(f=>f.file.endsWith('.css')));assert.equal(newOffline.cssSha256,oldOffline.cssSha256);assert.equal(newWeb.manifestSha256,oldWeb.manifestSha256);assert.equal(newOffline.copiedAssetSectionBytes,oldOffline.copiedAssetSectionBytes);
const offline=await read(base+'/offline-game-verification-dense-final-r1.json');assert.ok(offline.pass);assert.equal(offline.assets,1909);assert.equal(offline.chunks,2975);
const report={date:new Date().toISOString(),pass:true,originalSourceTest:baseline.files.length,unchanged:baseline.files.length-changed.length,changed,added,totalSourceTest:files.length,currentUnchanged:true,builds,measuredCandidateJsExact:true,cssUnchanged:true,assetsUnchanged:true,offline:{assets:offline.assets,chunks:offline.chunks,verified:true},limits:'Build/code/asset verification only; separate browser checks and performance evidence remain required.'};
await fs.writeFile(base+'/dense-final-integrity.json',JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report,null,2));
