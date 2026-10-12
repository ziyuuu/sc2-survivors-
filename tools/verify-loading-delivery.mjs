import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/loading-20261012',app='dist/Loading-Optimized-Final-Application-20261012',mode=process.argv[2]??'protection';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const hash=async p=>{const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');};
if(mode==='combine-baseline'){
 const prefix=await read(root+'/visual-baseline-r2/result.json'),boundary=await read(root+'/visual-baseline-r2/bounded-completion.json'),heroes=await read(root+'/visual-baseline-heroes-r1/result.json');
 assert.equal(boundary.completePrefix,120);assert.equal(heroes.passed,true);assert.equal(heroes.records.length,18);assert.deepEqual(prefix.errors,[]);assert.deepEqual(heroes.errors,[]);assert.equal(prefix.build.jsSha256,heroes.build.jsSha256);
 const records=[];for(const [label,rows] of [['visual-baseline-r2',prefix.records.slice(0,120)],['visual-baseline-heroes-r1',heroes.records]])for(const row of rows){assert.equal(row.runtime.assetsPending,0);assert.deepEqual(row.runtime.errors,[]);const image=label+'/'+row.name+'.png';assert.ok((await fs.stat(root+'/'+image)).size>1000);records.push({...row,image,imageSha256:await hash(root+'/'+image)});}
 assert.equal(new Set(records.map(r=>r.name)).size,138);
 const report={passed:true,at:new Date().toISOString(),build:prefix.build,suite:'identities',errors:[],records,method:'Composite capture validation: 120 completed ordinary/elite records from the explicitly bounded original run, plus 18 heroes completed in a fresh browser. Every image keeps its actual original path and hash. The interrupted whole-suite runner is not relabelled as passed.',sourceRuns:[{label:'visual-baseline-r2',records:120,wholeRunnerCompleted:false,boundedCapturePrefixValidated:true},{label:'visual-baseline-heroes-r1',records:18,wholeRunnerCompleted:true}]};await fs.mkdir(root+'/visual-baseline-final',{recursive:true});await fs.writeFile(root+'/visual-baseline-final/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,records:records.length,sourceRuns:report.sourceRuns}));
}
if(mode==='protection'){
 const before=await read('reports/local/camera-followup-20261012/cleanup-plan.json');
 const allowed=new Set(['AGENTS.md','docs/DESIGN.md','docs/ARCHITECTURE.md','src/app/bootstrap.ts','src/render/materials/unit-material-batch.ts','src/render/materials/unit-material-loader.ts','src/render/scene/battle-renderer.ts','src/render/units/animated-batch.ts','src/ui/model-viewer.mjs','dist/SC2-Survivors-Current-20261006.html']);
 const oldWeb=await read(root+'/baseline-web/web-release.json'),oldHtml=await fs.readFile(root+'/baseline-web/index.html','utf8');
 const oldCompiled=[...oldHtml.matchAll(/(?:src|href)="\.\/([^"?#]+\.(?:js|css))"/g)].map(m=>'dist/web/'+m[1]);
 for(const file of ['dist/web/index.html','dist/web/web-release.json',...oldCompiled])allowed.add(file);
 const rows=[];for(const row of before.protected){const file=path.relative(process.cwd(),row.path).replaceAll('\\','/');let actual=null;try{actual={bytes:(await fs.stat(row.path)).size,sha256:await hash(row.path)};}catch(e){if(e.code!=='ENOENT')throw e;}
 const status=actual?.bytes===row.bytes&&actual?.sha256===row.sha256?'same':file.startsWith('deploy/coze/')?'local-application':allowed.has(file)?'authorized-edit':'UNEXPECTED';rows.push({file,before:row,actual,status});}
 const stamp=await read('reports/local/camera-control-20261011/original-source-stamp.json');for(const row of stamp.sources)assert.equal(await hash(row.file),row.sha256,row.file);
 const web=await read('dist/web/web-release.json'),manifest=await read('dist/web/'+web.manifest),prior=await read(root+'/baseline-web/'+oldWeb.manifest);assert.deepEqual(manifest.assets,prior.assets);assert.equal(web.release,oldWeb.release);
 for(const row of Object.values(manifest.assets))assert.equal(await hash('dist/web/'+row.url),row.sha256,row.url);
 const counts=Object.fromEntries([...new Set(rows.map(r=>r.status))].map(s=>[s,rows.filter(r=>r.status===s).length]));
 const report={passed:!counts.UNEXPECTED,at:new Date().toISOString(),counts,total:rows.length,originalSources:stamp.sources.length,resources:web.assetCount,resourceFiles:web.fileCount,addedResources:0,rows};await fs.writeFile(root+'/protection.json',JSON.stringify(report,null,2));assert.ok(report.passed,JSON.stringify(rows.filter(r=>r.status==='UNEXPECTED')));console.log(JSON.stringify({passed:true,counts,total:rows.length,sources:stamp.sources.length}));
}
if(mode==='application'){
 const priorDir='dist/Camera-Control-Final-Application-20261011',current=await read(app+'/delivery.json'),prior=await read(priorDir+'/delivery.json'),next=new Map(current.appFiles.map(r=>[r.path,r]));
 for(const row of current.appFiles)assert.equal(await hash(app+'/'+row.path),row.sha256,row.path);
 const preserved=prior.appFiles.filter(r=>/^(backend\/|vendor\/)|^(start-coze|coze-web-server|fetch-resources|apply-update)\.mjs$|^(sc2-backend\.conf|\.env\.example)$/.test(r.path));for(const row of preserved)assert.deepEqual(next.get(row.path),row,row.path);
 for(const name of ['package.json','package-lock.json']){const a=await read(priorDir+'/'+name),b=await read(app+'/'+name);assert.equal(b.version,'0.6.22');delete a.version;delete b.version;if(a.packages?.[''])delete a.packages[''].version;if(b.packages?.[''])delete b.packages[''].version;assert.deepEqual(a,b);}
 const result={passed:true,at:new Date().toISOString(),packageBuildId:current.packageBuildId,files:current.appFiles.length,unchangedBackendVendorConfig:preserved.length,dependencyChanges:0,preserved};await fs.writeFile(root+'/deployment-preservation.json',JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,files:result.files,preserved:preserved.length}));
}
if(mode==='pairs'){
 const rows=[],suites=[],identityOnly=process.argv.includes('--identities-only');
 for(const [suite,before,after] of [['identities','visual-baseline-final','visual-candidate-r1'],...identityOnly?[]:[['sequence','sequence-baseline-r2','sequence-candidate-r2']]]){
  const a=await read(root+'/'+before+'/result.json'),b=await read(root+'/'+after+'/result.json');for(const r of [a,b]){assert.equal(r.passed,true,r.failure);assert.deepEqual(r.errors,[]);}
  const byName=new Map(a.records.map(r=>[r.name,r]));assert.equal(a.records.length,b.records.length);
  for(const r of b.records){const p=byName.get(r.name);assert.ok(p,r.name);for(const field of ['state','time','tick','subjects'])assert.deepEqual(r[field],p[field],r.name+'/'+field);assert.deepEqual(Object.fromEntries(r.surfaces.filter(s=>s.count>0).map(s=>[s.key,s])),Object.fromEntries(p.surfaces.filter(s=>s.count>0).map(s=>[s.key,s])),r.name+'/active-surfaces-by-key');assert.deepEqual(r.runtime.resolution,p.runtime.resolution);rows.push({suite,name:r.name,state:r.state,time:r.time,tick:r.tick,before:p.image??before+'/'+r.name+'.png',after:r.image??after+'/'+r.name+'.png'});}
  suites.push({suite,before:a.build.jsSha256,after:b.build.jsSha256,records:b.records.length});
 }
 assert.equal(suites[0].records,138);if(!identityOnly)assert.equal(suites[1].records,40);const result={passed:true,at:new Date().toISOString(),pairedStates:rows.length,suites,rows};await fs.writeFile(root+'/'+(identityOnly?'identity-paired-states.json':'paired-states.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,pairedStates:rows.length,suites}));
}
