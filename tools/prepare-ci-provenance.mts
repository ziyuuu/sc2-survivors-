import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {UNIT_MATERIAL_CATALOG} from '../src/render/materials/unit-material-catalog';

// Restore only the originals read by existing exact-byte provenance tests.
// Missing local-only originals come from the pinned public CASC build; they
// are not added to Git, uploaded as artifacts, or replaced by weaker checks.
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const read=async(file:string)=>JSON.parse(await fs.readFile(file,'utf8'));
const required=new Map<string,string>();
function requireSource(file:string,digest:string){
 assert.match(file,/^assets\/private\/(m3|dds)\/[a-z0-9_.-]+\.(m3|m3a|dds)$/i);assert.match(digest,/^[a-f0-9]{64}$/);
 const prior=required.get(file);assert.ok(!prior||prior===digest,'Conflicting original source: '+file);required.set(file,digest);
}
const effects=await read('src/render/effects/source/catalog.json');
for(const r of Object.values(effects) as {source:string;sourceSha256:string}[])requireSource(r.source,r.sourceSha256);
for(const profile of Object.values(UNIT_MATERIAL_CATALOG))for(const r of profile.animationSources??[])requireSource('assets/private/m3/'+r.source,r.sha256);
for(const r of (await read('deploy/runtime/material-textures.json')).records)requireSource(r.sourceFile,r.sourceSha256);
const manifests=(await fs.readdir('tools')).filter(f=>f.endsWith('dependencies.json')).sort();manifests.push('sc2-casc-targets.json');
const refs:{manifest:string;row:any}[]=[];
for(const file of manifests){const rows=await read('tools/'+file);if(Array.isArray(rows))for(const row of rows)refs.push({manifest:'tools/'+file,row});}
const lock=await read('tools/sc2-casc-lock.json'),targets:any[]=[],verified:string[]=[];
// This read-only audit mode exposes dependencies hidden by a populated local
// source cache, while leaving every original file in place.
const tracked=process.argv.includes('--git-only')?new Set(execFileSync('git',['ls-files','-z','assets/private'],{encoding:'utf8'}).split('\0')):null;
for(const [file,digest] of required){
 const existing=tracked&&!tracked.has(file)?null:await fs.readFile(file).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
 if(existing&&sha(existing)===digest){verified.push(file);continue;}
 const pointer=existing&&existing.length<256?existing.toString('utf8').match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize (\d+)\r?\n?$/):null;
 assert.ok(!existing||(pointer&&pointer[1]===digest),'Preserving changed original source: '+file);
 const ref=refs.find(({row:r})=>r.sha256===digest&&(r.installFile===file||r.requestedFile===file)&&r.sourcePath);
 assert.ok(ref,'No pinned public source for missing original: '+file);
 const r=ref.row;assert.ok(!r.version||r.version===lock.version,'Unexpected original source version: '+file);
 assert.ok(Number.isSafeInteger(r.bytes)&&r.bytes>0&&r.bytes<=20*1024*1024,'Unexpected source size: '+file);
 assert.match(r.sourcePath,/^mods\/[a-z0-9_./ -]+$/i);assert.ok(!r.sourcePath.split('/').includes('..'));
 if(pointer)assert.equal(Number(pointer[2]),r.bytes,file);
 targets.push({id:'ci-original.'+path.basename(file),sourcePath:r.sourcePath,installFile:file,cachedFile:'.cache/ci-provenance/'+digest+path.extname(file),bytes:r.bytes,sha256:digest,provenanceManifest:ref.manifest,version:lock.version});
}
await fs.mkdir('.cache',{recursive:true});await fs.mkdir('reports/local',{recursive:true});
await fs.writeFile('.cache/ci-provenance-targets.json',JSON.stringify(targets,null,2)+'\n');
const report={mode:tracked?'git-checkout-only audit':'actual filesystem',required:required.size,verifiedExisting:verified.length,toRestore:targets.length,restoreBytes:targets.reduce((n,r)=>n+r.bytes,0),build:lock.buildName,version:lock.version,verified,targets};
await fs.writeFile('reports/local/ci-source-preparation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({required:report.required,verifiedExisting:verified.length,toRestore:targets.length,restoreBytes:report.restoreBytes,build:lock.buildName}));
