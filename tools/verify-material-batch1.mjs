/** Verify the approved first material batch against its frozen production baseline. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const out='reports/local/material-batch1-20261010';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const evidence=file=>read(out+'/'+file),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const baseline=await evidence('protected-baseline.json');
const authorized=new Set(['src/render/scene/battle-renderer.ts','src/render/units/animated-batch.ts','tools/prepare-current-handoff.mts']);
const preservation={baseline:baseline.head,total:baseline.files.length,unchanged:[],changed:[],deployment:[],missing:[],unexpected:[]};
for(const row of baseline.files){
 if(row.file.startsWith('deploy/coze/')){preservation.deployment.push(row.file);continue;}
 let bytes;try{bytes=await fs.readFile(row.file);}catch(e){if(e.code!=='ENOENT')throw e;preservation.missing.push(row.file);continue;}
 if(bytes.length===row.bytes&&sha(bytes)===row.sha256)preservation.unchanged.push(row.file);
 else {preservation.changed.push(row.file);if(!authorized.has(row.file))preservation.unexpected.push(row.file);}
}
assert.deepEqual(preservation.missing,[]);assert.deepEqual(preservation.unexpected,[]);
const sources=await evidence('source-stamp.json');
for(const row of sources.sources){const b=await fs.readFile(row.file);assert.equal(b.length,row.bytes);assert.equal(sha(b),row.sha256);}
assert.equal(sha(await fs.readFile('src/render/materials/unit-material-profiles.ts')),sources.generatedSha256);
const release=await read('dist/web/web-release.json'),prior=await evidence('baseline-web/web-release.json');
const manifest=await read('dist/web/'+release.manifest),oldManifest=await evidence('baseline-web/'+prior.manifest);
assert.deepEqual(manifest,oldManifest);assert.equal(release.release,prior.release);
for(const row of new Map(Object.values(manifest.assets).map(r=>[r.url,r])).values()){const b=await fs.readFile('dist/web/'+row.url);assert.equal(b.length,row.bytes);assert.equal(sha(b),row.sha256);}
preservation.resources={records:Object.keys(manifest.assets).length,files:release.fileCount,bytes:release.assetBytes,release:release.release,additions:0};
preservation.originalMaterialSources=sources.sources.length;preservation.passed=true;
await fs.writeFile(out+'/preservation.json',JSON.stringify(preservation,null,2));

const pairs=[['final-core-r2','before-core-r1'],['final-maps-r2','before-maps-r1'],['final-mobile-r2','before-mobile-r1'],['final-color-r3','before-color-r1']];
const comparison={pairs:[],renderInputs:[],stateChecks:0,errors:0};
const candidates=[];
for(const [after,before] of pairs){
 const a=await evidence(after+'/results.json'),b=await evidence(before+'/results.json');
 for(const r of [a,b]){assert.equal(r.passed,true,r.failure);assert.deepEqual(r.errors,[]);for(const s of r.records){assert.deepEqual(s.errors,[]);assert.equal(s.runtime.assetsPending,0);}}
 assert.deepEqual(a.records.map(r=>r.name),b.records.map(r=>r.name));
 for(let i=0;i<a.records.length;i++){const x=a.records[i],y=b.records[i];assert.equal(x.state,y.state,after+'/'+x.name+' World/Profile/RNG');assert.deepEqual(x.subjects,y.subjects);comparison.stateChecks++;}
 comparison.pairs.push({after,before,screens:a.records.length,beforeBuild:b.build.jsSha256,afterBuild:a.build.jsSha256});candidates.push(a);
}
const heroes=await evidence('final-heroes-r3/results.json');assert.equal(heroes.passed,true,heroes.failure);assert.deepEqual(heroes.errors,[]);assert.equal(heroes.heroDeaths.length,3);
for(const row of heroes.heroDeaths){assert.equal(row.start.retained,true);assert.equal(row.checks.at(-1).retained,false);assert.equal(row.checks.at(-1).count,0);}
candidates.push(heroes);
for(const build of new Map(candidates.map(r=>[r.build.jsSha256,r.build])).values()){
 const files=build.inputs.filter(r=>r.file.startsWith('src/'));
 for(const row of files){const b=await fs.readFile(row.file);assert.equal(sha(b),row.sha256,'Browser build source changed: '+row.file);}
 comparison.renderInputs.push({build:build.jsSha256,sourceDigest:build.sourceDigest,checked:files.length});
}
const core=candidates[0],record=name=>{const r=core.records.find(r=>r.name===name);assert.ok(r);return r;};
assert.equal(new Set(core.filtering.map(r=>r.key)).size,4);assert.equal(new Set(core.filtering.map(r=>r.quality)).size,3);for(const r of core.filtering)assert.equal(r.actual,r.expected);
const alpha=name=>record(name).surfaces.filter(s=>s.key==='immortal'||s.key==='elite.immortal.1').flatMap(s=>s.materials.filter(m=>m.name==='Mat_Immortal_Shield_Scroll').flatMap(m=>m.slots.map(s=>s.alpha)));
const close=(actual,expected)=>{assert.equal(actual.length,expected.length);actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-6,`${v} != ${expected[i]}`));};
close(alpha('immortal-idle-near'),[0,0,0,0]);close(alpha('immortal-start-010'),[.1/.166,0,0,0]);
close(alpha('immortal-stagger-1'),[1,.1/.166,0,0]);close(alpha('immortal-stagger-2'),[1,1,.1/.166,0]);close(alpha('immortal-stagger-3'),[1,1,1,.1/.166]);
close(alpha('immortal-reordered-stagger'),[1,.1/.166,1,1]);close(alpha('immortal-reloaded-stagger'),alpha('immortal-reordered-stagger'));
close(alpha('immortal-hold'),[1,1,1,1]);close(alpha('immortal-exhausted-010'),[1-.1/.166,1,1,1]);close(alpha('immortal-exhausted-022'),[0,1,1,1]);
assert.ok(record('immortal-moving').subjects.every(s=>s.action==='move'));assert.ok(record('immortal-attacking').subjects.every(s=>s.shots>0));
assert.equal(record('zealot-death-030').state,record('zealot-death-reload-030').state);
assert.ok(record('zealot-death-267').surfaces.filter(s=>s.key.endsWith('zealot.1.death')||s.key==='zealot.death').every(s=>s.count===0));
const color=candidates[3];for(const row of color.color){
 for(const sample of [row.before,row.alive,row.dead]){assert.ok(sample.rgb.some((v,i)=>i%4!==3&&v>0));assert.equal(sample.checksum,row.before.checksum);const p=sample.pipeline;assert.equal(p.toneMapping,4);assert.equal(p.exposure,1);assert.equal(p.output,'srgb');assert.equal(p.targetType,1016);assert.equal(p.passes.length,3);assert.deepEqual([p.passes[1].strength,p.passes[1].radius,p.passes[1].threshold],[.32,.5,.8]);assert.ok('ACES_FILMIC_TONE_MAPPING' in p.passes[2].defines);assert.ok('SRGB_TRANSFER' in p.passes[2].defines);}
}
comparison.heroDeaths=heroes.heroDeaths;comparison.functionalScreens=candidates.reduce((n,r)=>n+r.records.length,0);comparison.shieldChecks=10;comparison.colorChecks=6;comparison.textureFiltering=core.filtering;comparison.passed=true;
await fs.writeFile(out+'/comparison.json',JSON.stringify(comparison,null,2));
console.log(JSON.stringify({passed:true,unchanged:preservation.unchanged.length,changed:preservation.changed,deployment:preservation.deployment.length,resources:preservation.resources,sourceHashes:sources.sources.length,pairedStates:comparison.stateChecks,screens:comparison.functionalScreens}));
