import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const root='reports/local/lighting-batch3-20261010',sha=b=>createHash('sha256').update(b).digest('hex'),read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const mode=process.argv[2]??'protection';
if(mode==='protection'){
 const baseline=await read(root+'/baseline.json'),source=await read(root+'/original-source-stamp.json');
 const allowed=new Set(['AGENTS.md','docs/project/VISUAL_OPTIMIZATION_PLAN_20261009.md','src/render/effects/nonhero-effects.ts','src/render/loaders/sc2-materials.ts','src/render/materials/unit-material-batch.ts','src/render/scene/battle-renderer.ts','src/render/terrain/campaign-ground.ts','src/render/terrain/campaign-map.ts','src/render/terrain/map-visibility.ts','src/render/terrain/original-map.ts','src/render/units/animated-batch.ts','src/render/units/pod-view.ts','src/render/units/pylon-birth-materials.ts','src/ui/hud/minimap.ts','tools/prepare-current-handoff.mts','tools/qa-native-hud.mts','dist/SC2-Survivors-Current-20261006.html']);
 const rows=[];for(const before of baseline.files){let after;try{const bytes=await fs.readFile(before.file);after={bytes:bytes.length,sha256:sha(bytes)};}catch(e){if(e.code!=='ENOENT')throw e;}
  const same=after?.bytes===before.bytes&&after?.sha256===before.sha256,application=before.file.startsWith('deploy/coze/'),status=same?'same':application?'application':allowed.has(before.file)&&after?'authorized-edit':'UNEXPECTED';rows.push({...before,after,status});
 }
 assert.deepEqual(rows.filter(r=>r.status==='UNEXPECTED'),[]);
 const original=[];for(const entry of source.sources){const bytes=await fs.readFile(entry.file);assert.equal(bytes.length,entry.bytes,entry.file);assert.equal(sha(bytes),entry.sha256,entry.file);original.push(entry);}
 const release=await read('dist/web/web-release.json'),manifest=await read('dist/web/'+release.manifest),prior=await read(root+'/baseline-asset-manifest.json');assert.deepEqual(manifest,prior);
 const resources=[];for(const [id,entry]of Object.entries(manifest.assets)){const bytes=await fs.readFile(path.join('dist/web',entry.url));assert.equal(bytes.length,entry.bytes,id);assert.equal(sha(bytes),entry.sha256,id);resources.push({id,...entry});}
 const finalBuild=await read(root+'/candidate-r4/build.json'),inputs=[];for(const entry of finalBuild.inputs){if(entry.file.startsWith('node_modules/')||entry.file.startsWith('src/')){const bytes=await fs.readFile(entry.file);assert.equal(bytes.length,entry.bytes,entry.file);assert.equal(sha(bytes),entry.sha256,entry.file);inputs.push(entry);}}
 const counts=Object.fromEntries([...new Set(rows.map(r=>r.status))].map(s=>[s,rows.filter(r=>r.status===s).length]));
 const report={at:new Date().toISOString(),baseline:baseline.head,method:'Before-edit file hashes; only named approved source/plan/current-alias edits allowed. Application mirror differences are checked separately against the immutable delivered package.',counts,total:rows.length,originalSourceCount:original.length,resourceRecords:resources.length,resourceFiles:new Set(resources.map(r=>r.url)).size,release:release.release,sourceBuild:finalBuild.jsSha256,inputsChecked:inputs.length,rows,original,resources,inputs};
 await fs.writeFile(root+'/protection.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...counts,total:rows.length,original:original.length,assets:resources.length,inputs:inputs.length}));
}
if(mode==='pairs'){
 const specs=[...['maps','portraits','actions','mobile','forms','actors','enemies','invariants','fleet','core','color','heroes'].map(s=>['before-r5-'+s,'after-r6-'+s]),['before-r5-lighting','after-r6-lighting'],['before-r5-sequence','after-r6-sequence'],['before-r5-settled','after-r6-settled']];
 const reports=[],rows=[];for(const [before,after]of specs){const a=await read(root+'/'+before+'/results.json'),b=await read(root+'/'+after+'/results.json');assert.equal(a.passed,true,before);assert.equal(b.passed,true,after);assert.deepEqual(a.errors,[],before);assert.deepEqual(b.errors,[],after);const byName=new Map(a.records.map(r=>[r.name,r]));assert.equal(byName.size,a.records.length,before+' duplicate names');assert.equal(a.records.length,b.records.length,before+' record count');let count=0,active=0;
  for(const r of b.records){const old=byName.get(r.name);assert.ok(old,after+'/'+r.name);if(r.state!==undefined){assert.equal(r.state,old.state,after+'/'+r.name);count++;}for(const field of ['time','tick','subjects','portraitBounds'])if(r[field]!==undefined)assert.deepEqual(r[field],old[field],after+'/'+r.name+'/'+field);if(r.runtime){assert.deepEqual(r.runtime.resolution,old.runtime.resolution,after+'/'+r.name+'/resolution');for(const key of ['shadows','contact']){assert.equal(r.runtime[key]?.enabled,true,after+'/'+r.name+'/'+key);assert.equal(r.runtime[key]?.ready,true,after+'/'+r.name+'/'+key);assert.equal(r.runtime[key]?.fallback,null,after+'/'+r.name+'/'+key);}assert.equal(r.runtime.shadows.resolution,1024);assert.equal(r.runtime.contact.samples,12);active++;}rows.push({suite:after,name:r.name,state:r.state,before,after,shadows:r.runtime?.shadows,contact:r.runtime?.contact});}
  reports.push({before,after,baselineBuild:a.build.jsSha256,candidateBuild:b.build.jsSha256,records:b.records.length,pairedStates:count,activeLightingRecords:active});
 }
 const report={at:new Date().toISOString(),method:'Same native fixture name, World/Profile/RNG checksum, tick, camera setup and requested viewport. Functional diagnostics only; no frame-rate or original-client claim.',reports,pairedStates:reports.reduce((n,r)=>n+r.pairedStates,0),records:reports.reduce((n,r)=>n+r.records,0),rows};await fs.writeFile(root+'/paired-states.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pairedStates:report.pairedStates,records:report.records,reports:report.reports}));
}
if(mode==='edge'){
 const before='before-r5-edge',after='after-r6-edge',a=await read(root+'/'+before+'/results.json'),b=await read(root+'/'+after+'/results.json');
 for(const r of [a,b]){assert.equal(r.passed,true);assert.deepEqual(r.errors,[]);assert.equal(r.records.length,6);}
 const pairs=[];for(let i=0;i<6;i++){const old=a.records[i],next=b.records[i];for(const field of ['name','state','time','tick','subjects','edge'])assert.deepEqual(next[field],old[field],next.name+'/'+field);assert.deepEqual(next.runtime.resolution,old.runtime.resolution);
  for(const key of ['shadows','contact']){assert.equal(next.runtime[key].enabled,true);assert.equal(next.runtime[key].ready,true);assert.equal(next.runtime[key].fallback,null);}
  pairs.push({name:next.name,state:next.state,edge:next.edge,before:before+'/'+old.name+'.png',after:after+'/'+next.name+'.png'});
 }
 const report={passed:true,baselineBuild:a.build.jsSha256,candidateBuild:b.build.jsSha256,pairedStates:pairs.length,method:'Matched native pose with complete primary body bounds 0.25 world units outside either viewport edge; visual inspection determines whether a sunward shadow remains visible.',pairs};await fs.writeFile(root+'/edge-comparison.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,pairedStates:pairs.length}));
}
if(mode==='files'){
 const protection=await read(root+'/protection.json'),baseline=new Map(protection.rows.map(r=>[r.file,r]));
 const {stdout}=await promisify(execFile)('git',['ls-tree','-r','--name-only',protection.baseline],{encoding:'utf8',maxBuffer:32*1024*1024});
 const trackedBefore=new Set(stdout.trim().split(/\r?\n/));
 const added=[
  'src/render/effects/acid-ground-effects.ts','src/render/materials/posed-depth.ts','src/render/scene/scene-contact.ts','src/render/scene/scene-lighting.ts','src/render/scene/scene-shadows.ts','src/render/units/unit-pose-shader.ts',
  'test/lighting-batch3.test.ts','tools/lighting-batch3-baseline.mjs','tools/qa-lighting-controls.mts','tools/verify-lighting-batch3.mjs','tools/deliver-lighting-batch3.mjs',
  'docs/project/LIGHTING_BATCH3_20261010.md','docs/project/LIGHTING_BATCH3_VALIDATION_20261010.md','reports/qa/lighting-batch3-20261010.json'
 ];
 async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){assert.ok(!entry.isSymbolicLink());const file=dir+'/'+entry.name;if(entry.isDirectory())await walk(file);else added.push(file);}}
 await walk('preview/lighting-batch3-20261010');
 // The baseline collector necessarily exists before it snapshots tools/. It is
 // unchanged since that snapshot, but still a new Git file for this batch.
 const newFiles=[];for(const file of added){assert.ok(!trackedBefore.has(file),file+' already existed in the Git baseline');const b=await fs.readFile(file);newFiles.push({file,bytes:b.length,sha256:sha(b),status:'added',presentAtProtectionSnapshot:baseline.has(file)});}
 const prior=await read('dist/Material-Batch2-Release-Application-20261010/delivery.json'),current=await read('dist/Lighting-Batch3-Final-Application-20261010/delivery.json'),old=new Map(prior.appFiles.map(r=>[r.path,r])),next=new Map(current.appFiles.map(r=>[r.path,r]));
 const application=[];for(const file of new Set([...old.keys(),...next.keys()])){const a=old.get(file),b=next.get(file),status=!a?'added':!b?'removed':a.sha256===b.sha256&&a.bytes===b.bytes?'same':'changed';if(status!=='same')application.push({file,status,before:a??null,after:b??null});}
 const changed=protection.rows.filter(r=>r.status==='authorized-edit').map(r=>({file:r.file,status:r.status,before:{bytes:r.bytes,sha256:r.sha256},after:r.after}));
 const report={at:new Date().toISOString(),baseline:protection.baseline,changed,newFiles,application,unchangedProtected:protection.counts.same,missingProtected:0,otherThreadFiles:'ROADMAP, dev, random-event concepts and the three independent preview directories match their before-edit hashes; excluded from this commit.',method:'Before-edit hashes for existing files; explicit new source/test/doc/preview files checked against the Git baseline tree, including the unchanged collector already present at protection-snapshot creation; immutable prior and current application manifests.'};
 await fs.writeFile(root+'/file-differences.json',JSON.stringify(report,null,2));console.log(JSON.stringify({changed:changed.length,newFiles:newFiles.length,applicationChanges:application.length}));
}
