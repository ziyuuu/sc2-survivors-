import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const root='reports/local/mvp5-lifecycle-20261014',baseline=root+'/baseline';
await fs.mkdir(baseline,{recursive:true});
await fs.access(baseline+'/baseline.json').then(()=>{throw Error('Baseline already exists');},e=>{if(e.code!=='ENOENT')throw e;});
const sha=b=>createHash('sha256').update(b).digest('hex'),read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const web='dist/MVP5-Full-Map-Main-20261014-R3',build=await read(web+'/build-inputs.json'),release=await read(web+'/web-release.json'),manifest=await read(web+'/'+release.manifest);
for(const r of build.inputs)assert.equal(sha(await fs.readFile(r.file)),r.sha256,r.file);
for(const r of build.builtFiles)assert.equal(sha(await fs.readFile(web+'/'+r.file)),r.sha256,r.file);
const resources=[];for(const r of new Map(Object.values(manifest.assets).map(r=>[r.url,r])).values()){const file='deploy/runtime/'+r.url,b=await fs.readFile(file);assert.equal(sha(b),r.sha256,file);assert.equal(b.length,r.bytes,file);resources.push({file,bytes:b.length,sha256:r.sha256});}
const names=execFileSync('git',['-c','core.quotepath=false','ls-files','-m','-o','--exclude-standard','-z']).toString().split('\0').filter(Boolean),unrelated=[];
for(const file of names){const b=await fs.readFile(file).catch(e=>e.code==='ENOENT'?null:Promise.reject(e));unrelated.push({file,bytes:b?.length??null,sha256:b?sha(b):null});}
await fs.cp('src',baseline+'/source',{recursive:true,errorOnExist:true,force:false});
for(const name of ['asset-reachability.json'])await fs.copyFile('reports/local/'+name,baseline+'/'+name);
await fs.copyFile(web+'/build-inputs.json',baseline+'/formal-build.json');
await fs.copyFile('deploy/coze/delivery.json',baseline+'/prior-application.json');
const result={at:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD']).toString().trim(),web,build,release,assets:manifest.assets,resources,unrelated,scope:'Steps 3 and 4 only: resource lifecycle and bounded native game traversal/combat; no Current/mirror synchronization, production operation or whole-MVP acceptance.'};
await fs.writeFile(baseline+'/baseline.json',JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,commit:result.commit,inputs:build.inputs.length,resources:resources.length,unrelated:unrelated.length}));
