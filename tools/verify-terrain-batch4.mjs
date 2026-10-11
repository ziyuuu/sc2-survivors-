import fs from 'node:fs/promises';import {createReadStream} from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/terrain-batch4-20261011',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
async function fileHash(file){const hash=createHash('sha256');for await(const b of createReadStream(file))hash.update(b);return hash.digest('hex');}
const mode=process.argv[2]??'pairs';
if(mode==='pairs'){
 const delta=await read(root+'/ash-alpha-correction.json');assert.equal(delta.passed,true);assert.deepEqual(delta.changedIds,['terrain.visual.ash']);
 const suites=['stage','maps','edge','sequence','dense'],reports=[],rows=[];
 for(const suite of suites){
  const before='before-final-'+suite,after='after-final-'+suite,a=await read(root+'/'+before+'/results.json'),b=await read(root+'/'+after+'/results.json');
  const correctedLabel=['stage','maps','dense'].includes(suite)?'after-fixed-char-'+suite:null,corrected=correctedLabel?await read(root+'/'+correctedLabel+'/results.json'):null,overrides=new Map(corrected?.records.map(r=>[r.name,r])??[]);if(corrected){assert.equal(corrected.passed,true);assert.deepEqual(corrected.errors,[]);assert.ok(corrected.records.every(r=>r.theme==='char'));assert.equal(corrected.build.jsSha256,b.build.jsSha256);}
  for(const r of [a,b]){assert.equal(r.passed,true,r.failure);assert.deepEqual(r.errors,[]);}
  assert.equal(a.records.length,b.records.length);const old=new Map(a.records.map(r=>[r.name,r]));assert.equal(old.size,a.records.length);
  for(const original of b.records){const r=overrides.get(original.name)??original;assert.equal(overrides.has(r.name),!!corrected&&r.theme==='char',r.name+' final ash coverage');const prev=old.get(r.name);assert.ok(prev,r.name);assert.ok(r.state,r.name+' lacks full state checksum');assert.equal(r.state,prev.state,r.name);
   for(const key of ['time','tick','subjects','edge'])if(r[key]!==undefined)assert.deepEqual(r[key],prev[key],r.name+'/'+key);
   assert.deepEqual(r.runtime.resolution,prev.runtime.resolution,r.name+'/viewport');
   for(const key of ['shadows','contact']){assert.equal(r.runtime[key].enabled,true);assert.equal(r.runtime[key].ready,true);assert.equal(r.runtime[key].fallback,null);}
   assert.equal(r.runtime.shadows.resolution,1024);assert.equal(r.runtime.contact.samples,12);assert.equal(r.runtime.contact.strength,.5);
   rows.push({suite,name:r.name,state:r.state,time:r.time,before:before+'/'+r.name+'.png',after:(overrides.has(r.name)?correctedLabel:after)+'/'+r.name+'.png',afterBuild:overrides.has(r.name)?corrected.build.label:b.build.label,assetCorrection:overrides.has(r.name)?'Final original-alpha ash; recaptured':'Unaffected source assets; retained actual capture under byte-identical JS/CSS'});
  }
  const identities=suite==='maps'?[...new Set(b.records.flatMap(r=>r.subjects.map(s=>s.identity)))]:undefined;
  if(identities){assert.equal(identities.length,138);for(const id of identities)assert.equal(b.records.filter(r=>r.subjects.some(s=>s.identity===id)).length,5,id);}
  if(suite==='stage')assert.equal(b.records.length,240);if(suite==='edge')assert.equal(b.records.length,6);
  reports.push({suite,beforeBuild:a.build.jsSha256,afterBuild:b.build.jsSha256,records:b.records.length,correctedCharRecords:overrides.size,identities});
 }
 const report={passed:true,at:new Date().toISOString(),method:'Equal named fixtures, World/Profile/RNG checksums, native tick/time/subjects and viewport. Final Char views replace 99 affected captures after original-alpha repair; unaffected captures retain actual versions with byte-identical production and diagnostic JavaScript and identical selected assets. This is functional/visual evidence, not performance or original-client parity.',assetDelta:'ash-alpha-correction.json',pairedStates:rows.length,reports,rows};await fs.writeFile(root+'/paired-states.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,pairedStates:rows.length,suites:reports.map(({identities,...r})=>r)}));
}
if(mode==='protection'){
 const baseline=await read(root+'/baseline.json'),allowed=new Set(['AGENTS.md','docs/project/VISUAL_OPTIMIZATION_PLAN_20261009.md','src/app/asset-readiness.ts','src/assets/manifest.ts','src/render/scene/battle-renderer.ts','src/render/terrain/campaign-ground.ts','src/render/terrain/campaign-map.ts','src/render/terrain/flat-map.ts','src/render/terrain/original-map.ts','tools/load-build-assets.mjs','tools/m6-release-assets.mjs','tools/restore-git-runtime.mjs','tools/prepare-current-handoff.mts','dist/SC2-Survivors-Current-20261006.html']);
 const rows=[];for(const before of baseline.files){let after;try{after={bytes:(await fs.stat(before.file)).size,sha256:await fileHash(before.file)};}catch(e){if(e.code!=='ENOENT')throw e;}
  const same=after?.bytes===before.bytes&&after?.sha256===before.sha256,status=same?'same':before.file.startsWith('deploy/coze/public/')?'application':allowed.has(before.file)&&after?'authorized-edit':'UNEXPECTED';rows.push({...before,after,status});
 }
 assert.deepEqual(rows.filter(r=>r.status==='UNEXPECTED'),[]);
 const source=await read(root+'/original-source-stamp.json');for(const r of source.sources){assert.equal((await fs.stat(r.file)).size,r.bytes);assert.equal(await fileHash(r.file),r.sha256,r.file);}
 const release=await read('dist/web/web-release.json'),manifest=await read('dist/web/'+release.manifest),prior=await read(root+'/baseline-asset-manifest.json'),added=[];
 for(const [id,row]of Object.entries(prior.assets))assert.deepEqual(manifest.assets[id],row,id+' changed');
 const environment=await read('deploy/runtime/environment-textures.json'),environmentById=new Map(environment.records.map(r=>[r.id,r]));
 for(const [id,row]of Object.entries(manifest.assets)){
  const file=path.join('dist/web',row.url);assert.equal((await fs.stat(file)).size,row.bytes);assert.equal(await fileHash(file),row.sha256,id);
  if(!prior.assets[id]){const source=environmentById.get(id);assert.ok(source,id+' has no source');assert.equal(row.sha256,source.packedSha256);assert.equal(await fileHash(source.sourceFile),source.sourceSha256);assert.equal(await fileHash(source.gitPath),source.packedSha256);added.push({id,...row});}
 }
 assert.equal(added.length,28);assert.equal(added.reduce((n,r)=>n+r.bytes,0),16119837);
 const build=await read(root+'/candidate-r11/build.json'),inputs=[];for(const row of build.inputs.filter(r=>r.file.startsWith('src/')||r.file.startsWith('node_modules/'))){assert.equal((await fs.stat(row.file)).size,row.bytes);assert.equal(await fileHash(row.file),row.sha256,row.file);inputs.push(row);}
 const counts=Object.fromEntries([...new Set(rows.map(r=>r.status))].map(s=>[s,rows.filter(r=>r.status===s).length])),report={passed:true,at:new Date().toISOString(),baseline:baseline.head,total:rows.length,counts,originalSourceCount:source.sources.length,resourceRecords:release.assetCount,resourceFiles:release.fileCount,resourceBytes:release.assetBytes,release:release.release,added,sourceBuild:build.jsSha256,inputsChecked:inputs.length,rows,inputs};
 await fs.writeFile(root+'/protection.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...counts,total:rows.length,source:source.sources.length,added:added.length,inputs:inputs.length}));
}
if(mode==='application'){
 const app='dist/Terrain-Batch4-Final-Application-20261011',priorDir='dist/Lighting-Batch3-Final-Application-20261010',current=await read(app+'/delivery.json'),prior=await read(priorDir+'/delivery.json'),next=new Map(current.appFiles.map(r=>[r.path,r]));
 for(const row of current.appFiles){const file=app+'/'+row.path;assert.equal((await fs.stat(file)).size,row.bytes);assert.equal(await fileHash(file),row.sha256,row.path);}
 const preserved=prior.appFiles.filter(r=>/^(backend\/|vendor\/)|^(start-coze|coze-web-server|fetch-resources|apply-update)\.mjs$|^(sc2-backend\.conf|\.env\.example)$/.test(r.path));for(const row of preserved)assert.deepEqual(next.get(row.path),row,row.path);
 for(const name of ['package.json','package-lock.json']){const a=await read(priorDir+'/'+name),b=await read(app+'/'+name);assert.equal(b.version,'0.6.19');delete a.version;delete b.version;if(a.packages?.[''])delete a.packages[''].version;if(b.packages?.[''])delete b.packages[''].version;assert.deepEqual(a,b);}
 const report={passed:true,at:new Date().toISOString(),priorPackage:prior.packageBuildId,packageBuildId:current.packageBuildId,files:current.appFiles.length,unchangedBackendVendorConfig:preserved.length,dependencyChanges:0,preserved,changes:current.appFiles.filter(r=>!prior.appFiles.some(o=>o.path===r.path&&o.sha256===r.sha256))};await fs.writeFile(root+'/deployment-preservation.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,unchanged:preserved.length,changes:report.changes.length}));
}
