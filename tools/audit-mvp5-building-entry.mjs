import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const out='reports/local/mvp5-full-map-20261014';
const old='reports/local/mvp1-building-main-20261013';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
await fs.mkdir(out,{recursive:true});
const freeze=await read(old+'/frozen-source-r1/freeze.json');
const building=[];
for(const r of freeze.rows.filter(r=>/building/.test(r.mode))){const bytes=await fs.readFile(r.file);assert.equal(sha(bytes),r.sha256,r.file+' differs from verified building integration');building.push({file:r.file,bytes:bytes.length,sha256:sha(bytes)});}
const web='dist/MVP1-Building-Main-20261013-R4-Frozen',build=await read(web+'/build-inputs.json');
for(const r of build.inputs)assert.equal(sha(await fs.readFile(path.join(build.sourceRoot,r.file))),r.sha256,'Frozen source '+r.file);
for(const r of build.builtFiles)assert.equal(sha(await fs.readFile(web+'/'+r.file)),r.sha256,'Formal web '+r.file);
const evidence=[];
for(const [directory,checks,screens] of [['browser-r9-frozen',33,41],['formal-r5-frozen',7,16]]){
 const file=old+'/'+directory+'/result.json',r=await read(file);assert.equal(r.passed,true);assert.equal(r.checks.length,checks);assert.equal(r.screens.length,screens);
 for(const key of ['errors','consoleErrors','httpErrors'])assert.equal(r[key]?.length??0,0,key);
 evidence.push({file,sha256:sha(await fs.readFile(file)),checks,screens,existingEvidence:true});
}
// A reproducible pre-layout source snapshot; never overwrites the earlier building delivery.
const baseline=[];
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name).replaceAll('\\','/');if(e.isDirectory())await walk(file);else{const bytes=await fs.readFile(file),destination=path.join(out,'baseline/source',file);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,bytes,{flag:'wx'});baseline.push({file,bytes:bytes.length,sha256:sha(bytes)});}}}
await walk('src');
const record={at:new Date().toISOString(),passed:true,building,formal:{web,appBuildId:build.appBuildId,inputs:build.inputs.length,files:build.builtFiles.length},evidence,baseline,limits:'This is source and existing-evidence verification before new layout work. Fresh focused rule checks are recorded separately. New-run building integration only; archive migration and complete natural campaign remain deferred.'};
await fs.writeFile(out+'/building-entry-audit.json',JSON.stringify(record,null,2));
console.log(JSON.stringify({passed:true,building:building.length,formalInputs:build.inputs.length,formalFiles:build.builtFiles.length,sourceSnapshot:baseline.length,evidence}));
