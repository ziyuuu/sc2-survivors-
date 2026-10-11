import fs from 'node:fs/promises';import {createReadStream} from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/camera-calibration-20261011',read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
async function hash(file){const h=createHash('sha256');for await(const b of createReadStream(file))h.update(b);return h.digest('hex');}
const mode=process.argv[2]??'pairs';
if(mode==='pairs'){
 const rows=[],suites=[],sources=await read(root+'/comparison-sources.json');
 for(const suite of ['matrix','identities','edges']){
  const {before,after}=sources[suite];for(const label of [before,after])assert.match(label,/^[a-z0-9-]+$/);const a=await read(root+'/'+before+'/results.json'),b=await read(root+'/'+after+'/results.json');
  for(const report of [a,b]){assert.equal(report.passed,true,report.failure);assert.deepEqual(report.errors,[]);}
  const old=new Map(a.records.map(r=>[r.name,r]));assert.equal(old.size,a.records.length);
  for(const r of b.records){const key=suite==='matrix'?r.name.replace(/-(70|160)$/,'-100'):suite==='edges'?r.name.replace(/-(70|160)-/,'-100-'):r.name,previous=old.get(key);assert.ok(previous,key);assert.equal(r.state,previous.state,r.name);for(const field of ['time','tick','subjects'])assert.deepEqual(r[field],previous[field],r.name+'/'+field);assert.deepEqual(r.runtime.resolution,previous.runtime.resolution,r.name+'/viewport');
   for(const field of ['shadows','contact']){assert.equal(r.runtime[field].ready,true);assert.equal(r.runtime[field].fallback,null);}
   assert.equal(r.runtime.shadows.resolution,1024);assert.equal(r.runtime.contact.samples,12);assert.equal(r.runtime.contact.strength,.5);
   rows.push({suite,name:r.name,state:r.state,time:r.time,zoom:r.zoom??1,before:(previous.captureSource??before)+'/'+key+'.png',after:(r.captureSource??after)+'/'+r.name+'.png',camera:r.runtime.camera});
  }
  if(suite==='matrix'){assert.equal(a.records.length,288);assert.equal(b.records.length,864);}
  if(suite==='identities'){const ids=[...new Set(b.records.flatMap(r=>r.subjects.map(s=>s.identity)))];assert.equal(ids.length,138);for(const id of ids)for(const theme of ['industrial','mar-sara','char','ice','frontier'])assert.ok(b.records.some(r=>r.theme===theme&&r.name.endsWith('-'+theme+'-default')&&r.subjects.some(s=>s.identity===id)),id+'/'+theme);}
  suites.push({suite,beforeBuild:a.build.jsSha256,afterBuild:b.build.jsSha256,beforeRecords:a.records.length,afterRecords:b.records.length});
 }
 const report={passed:true,at:new Date().toISOString(),method:'Identical full native World/Profile/RNG, tick, time, subjects and viewport. Each new zoom compares with the original default camera at the same state. View-dependent Tosh targets are verified separately, not forced equal across different views.',pairedStates:rows.length,suites,rows};await fs.writeFile(root+'/paired-states.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,pairedStates:rows.length,suites}));
}
if(mode==='protection'){
 const baseline=await read(root+'/baseline.json'),allowed=new Set(['AGENTS.md','docs/project/VISUAL_OPTIMIZATION_PLAN_20261009.md','src/app/bootstrap.ts','src/render/input/battle-picking.ts','src/render/scene/battle-renderer.ts','src/render/scene/scene-contact.ts','src/render/scene/scene-shadows.ts','src/ui/hud.ts','src/ui/hud/packed-console.ts','src/ui/mobile/input.ts','src/ui/native-hud/pick-friendly.ts','src/ui/presentation/settings-screen.ts','test/lighting-batch3.test.ts','tools/prepare-current-handoff.mts','dist/SC2-Survivors-Current-20261006.html']);
 const rows=[];for(const before of baseline.files){let after;try{after={bytes:(await fs.stat(before.file)).size,sha256:await hash(before.file)};}catch(e){if(e.code!=='ENOENT')throw e;}
  const same=after?.bytes===before.bytes&&after?.sha256===before.sha256,status=same?'same':before.file.startsWith('deploy/coze/public/')?'application':allowed.has(before.file)&&after?'authorized-edit':'UNEXPECTED';rows.push({...before,after,status});}
 const source=await read(root+'/original-source-stamp.json');for(const row of source.sources){assert.equal((await fs.stat(row.file)).size,row.bytes);assert.equal(await hash(row.file),row.sha256,row.file);}
 const release=await read('dist/web/web-release.json'),manifest=await read('dist/web/'+release.manifest),prior=await read(root+'/baseline-asset-manifest.json');assert.deepEqual(manifest.assets,prior.assets);assert.equal(release.release,baseline.release.release);
 for(const row of Object.values(manifest.assets)){const file=path.join('dist/web',row.url);assert.equal((await fs.stat(file)).size,row.bytes);assert.equal(await hash(file),row.sha256,file);}
 const diagnostic=await read(root+'/'+(process.argv[3]??'perspective-r2')+'/build.json'),inputs=[];for(const row of diagnostic.inputs.filter(r=>r.file.startsWith('src/')||r.file.startsWith('node_modules/'))){assert.equal((await fs.stat(row.file)).size,row.bytes);assert.equal(await hash(row.file),row.sha256,row.file);inputs.push(row);}
 const unexpected=rows.filter(r=>r.status==='UNEXPECTED'),report={passed:unexpected.length===0,at:new Date().toISOString(),baseline:baseline.head,total:rows.length,counts:Object.fromEntries([...new Set(rows.map(r=>r.status))].map(status=>[status,rows.filter(r=>r.status===status).length])),originalSourceCount:source.sources.length,resourceRecords:release.assetCount,resourceFiles:release.fileCount,resourceBytes:release.assetBytes,release:release.release,addedResources:0,inputsChecked:inputs.length,rows,inputs};await fs.writeFile(root+'/protection.json',JSON.stringify(report,null,2));assert.deepEqual(unexpected,[]);console.log(JSON.stringify({passed:true,...report.counts,total:rows.length,sources:source.sources.length,inputs:inputs.length}));
}
if(mode==='application'){
 const app='dist/Camera-Calibrated-Final-Application-20261011',priorDir='dist/Terrain-Batch4-Final-Application-20261011',current=await read(app+'/delivery.json'),prior=await read(priorDir+'/delivery.json'),next=new Map(current.appFiles.map(r=>[r.path,r]));
 for(const row of current.appFiles){assert.equal((await fs.stat(app+'/'+row.path)).size,row.bytes);assert.equal(await hash(app+'/'+row.path),row.sha256,row.path);}
 const preserved=prior.appFiles.filter(r=>/^(backend\/|vendor\/)|^(start-coze|coze-web-server|fetch-resources|apply-update)\.mjs$|^(sc2-backend\.conf|\.env\.example)$/.test(r.path));for(const row of preserved)assert.deepEqual(next.get(row.path),row,row.path);
 for(const name of ['package.json','package-lock.json']){const a=await read(priorDir+'/'+name),b=await read(app+'/'+name);assert.equal(b.version,'0.6.20');delete a.version;delete b.version;if(a.packages?.[''])delete a.packages[''].version;if(b.packages?.[''])delete b.packages[''].version;assert.deepEqual(a,b);}
 const report={passed:true,at:new Date().toISOString(),packageBuildId:current.packageBuildId,files:current.appFiles.length,unchangedBackendVendorConfig:preserved.length,dependencyChanges:0,preserved,changes:current.appFiles.filter(r=>!prior.appFiles.some(o=>o.path===r.path&&o.sha256===r.sha256))};await fs.writeFile(root+'/deployment-preservation.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,unchanged:preserved.length,changes:report.changes.length}));
}
