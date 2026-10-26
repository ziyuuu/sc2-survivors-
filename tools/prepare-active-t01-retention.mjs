import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='reports/local/t01-20261024',read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,'')),sha=b=>createHash('sha256').update(b).digest('hex');
const current=await read(base+'/offline-r7/build.json'),old=await read('reports/local/v01-20261024/web-game-dense-adopted-r1-build.json'),resources=[];
await fs.mkdir(base+'/web/assets',{recursive:true});
for(const row of old.resources){assert.match(row.url,/^assets\/[a-f0-9]{64}\.[a-z0-9]+$/);const dest=path.resolve(base+'/web/'+row.url);try{await fs.link(row.source,dest);}catch(e){if(e.code!=='EEXIST')throw e;}assert.equal(sha(await fs.readFile(dest)),row.sha256,row.url);resources.push({...row,source:dest.replaceAll('\\','/')});}
const active={purpose:'Only assets required by the ongoing T01 inspection. Completed V01/V02/V03 outputs are not dependencies.',out:base+'/web',manifest:'asset-manifest.json',assetCount:current.sourceBuild.assetCount,resources,offlineDonor:{out:current.artifacts[0].file,htmlSha256:current.artifacts[0].sha256}};
await fs.writeFile(base+'/active-source.json',JSON.stringify(active,null,2));
const b=await read(base+'/build.json');b.resources=resources;b.sourceBuild=base+'/active-source.json';await fs.writeFile(base+'/build.json',JSON.stringify(b,null,2));
const p=await read(base+'/mechanics-20261025/queen-approved/regression-r2/regression-plan.json'),coverage=await read(base+'/mechanics-20261025/effect-coverage.json');
await fs.writeFile('tools/t01/mechanic-test-selection.json',JSON.stringify({purpose:'Current nonvisual mechanic test selection; test bodies remain authoritative.',files:p.files,effectKeys:coverage.effects.map(e=>e.key)},null,2)+'\n');
console.log(JSON.stringify({activeResources:resources.length,effectKeys:coverage.effects.length,tests:p.files.length,donor:active.offlineDonor.out}));
