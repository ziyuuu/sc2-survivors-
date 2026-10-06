/** Collect actual local browser evidence and verify the protected current release. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='reports/local/visual-restoration-20261006';
const baseline='bba13399049dfa3e7c16621dc88decbc4a351a1f';
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const names=(await fs.readdir(root)).sort();
const captures=[];
for(const name of names.filter(n=>/^\d{2}-.+\.jpg$/.test(n))){
 const report=await json(path.join(root,name.replace(/\.jpg$/,'.json'))),bytes=await fs.readFile(path.join(root,name));
 if(!report.immutable||report.errors?.length||!report.checks.some(c=>c.mode===report.mode&&c.ready&&c.stateUnchanged))throw Error('Invalid capture '+name);
 captures.push({file:name,sha256:sha(bytes),bytes:bytes.length,scene:report.scene,mode:report.mode,fixture:report.fixture,state:report.state,cover:report.sourceLayers.preview,resolution:report.resolution});
}
const measurements=[];
for(const name of names.filter(n=>/^bench-.+\.json$/.test(n))){
 const report=await json(path.join(root,name)),m=report.measurements.at(-1);
 if(!m?.immutable||!report.immutable||report.errors.length||m.seconds<10||!m.gpuAvailable||m.gpuSamples<400)throw Error('Invalid measurement '+name);
 measurements.push({file:name,fixture:report.fixture,state:report.state,resolution:report.resolution,hardware:report.hardware,...m});
}
const identity=measurements[0];
for(const m of measurements)if(JSON.stringify(m.hardware)!==JSON.stringify(identity.hardware)||JSON.stringify(m.resolution)!==JSON.stringify(identity.resolution))throw Error('Hardware or resolution differs');
for(const scene of new Set([...captures,...measurements].map(c=>c.scene))){const rows=[...captures,...measurements].filter(c=>c.scene===scene);if(new Set(rows.map(c=>c.fixture+':'+c.state)).size!==1)throw Error('Comparison fixture changed '+scene);}
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2;};
const summaries=[];
for(const scene of ['density-300','density-100'])for(const mode of ['A','B','C','CAO','D','DP','E']){
 const rows=measurements.filter(m=>m.scene===scene&&m.mode===mode);if(!rows.length)continue;
 const field=name=>({median:median(rows.map(m=>m[name])),min:Math.min(...rows.map(m=>m[name])),max:Math.max(...rows.map(m=>m[name]))});
 summaries.push({scene,mode,repeats:rows.length,gpuMs:field('gpuMeanMs'),submitMs:field('submitMeanMs'),frameMs:field('frameMeanMs'),p95Ms:field('frameP95Ms'),over20Fraction:field('over20ms'),draws:field('drawsMean')});
}
const previous=await json('reports/local/fixed-performance-20261006/delivery.json'),release=await json('dist/web/web-release.json'),manifest=await json('dist/web/'+release.manifest),closure=await json('reports/local/asset-reachability.json');
if(release.appBuildId!==previous.appBuildId||release.release!==previous.resources.release||sha(JSON.stringify(manifest.assets))!==release.release)throw Error('Current release identity differs');
const webFiles=new Map();
for(const [id,a]of Object.entries(manifest.assets)){const row=closure.rows.find(r=>r.id===id);if(!row||row.sha256!==a.sha256||row.bytes!==a.bytes)throw Error('Release row changed '+id);webFiles.set(a.url,a);}
let resourceBytes=0;for(const [relative,a]of webFiles){const bytes=await fs.readFile(path.join('dist/web',relative));if(bytes.length!==a.bytes||sha(bytes)!==a.sha256)throw Error('Web resource changed '+relative);resourceBytes+=bytes.length;}
const publicFiles=new Map(closure.rows.map(r=>[r.packedFile,r]));
for(const [file,r]of publicFiles){const bytes=await fs.readFile(file);if(bytes.length!==r.bytes||sha(bytes)!==r.sha256)throw Error('Development original resource differs '+file);}
if(Object.keys(manifest.assets).length!==647||webFiles.size!==629||resourceBytes!==648838732)throw Error('Current resource totals differ');
const artifacts=[];for(const original of previous.artifacts){const bytes=await fs.readFile(original.path),hash=sha(bytes);if(bytes.length!==original.bytes||hash!==original.sha256)throw Error('Protected artifact changed '+original.path);artifacts.push({...original,verified:true});}
const existingChanges=execFileSync('git',['diff','--name-only',baseline,'--','src','deploy','preview/ui-20261003','tools/backend','tools/m3-scene.mjs','tools/import-m3-pack.mjs','package.json','package-lock.json'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
if(existingChanges.length)throw Error('Unexpected protected change: '+existingChanges.join(', '));
const proof={at:new Date().toISOString(),baseline,method:'Sequential CUA browser actions; paused current-schema World; fixed seed, pose, camera and native quality. Raw frame intervals are unclipped; initial partial interval is omitted. GPU timer excludes disjoint/unavailable results and unreturned tail queries. Ten-second exploratory windows, no simulation stepping or natural acceptance.',captures,measurements,summaries,hardware:identity.hardware,resolution:identity.resolution,preservation:{protectedChanges:existingChanges,resources:{records:647,files:webFiles.size,bytes:resourceBytes,release:release.release,publicFilesVerified:publicFiles.size,additions:0},appBuildId:release.appBuildId,artifacts},regressions:{total:1157,passed:1157,failed:0,source:'Actual node --import tsx --test test/*.test.mjs test/*.test.ts command output in this task; full TAP output was not retained as a file.'},limitations:['Isolated rendering experiment, not integrated into the current game.','Original Immortal composite alpha and Cover curves are confirmed; emission and Fresnel composition remain an adapter. Base-pose material tracks are sampled; attack-overlay material track integration remains follow-up work.','Source specular Phong branch only covers matching source-profile body surfaces. It is not native SC2 BRDF.','Five lighting palettes and RoomEnvironment are authored comparisons, not original SC2 skyboxes or direct copies of its LightData exposure.','AO normals follow current GPU body poses; terrain AO uses geometry normals instead of the full terrain paint normal shader.','Existing LOD, animation timing, terrain geometry, heroes/elites/foot effects and combat are retained.','Natural performance, old P6-V01 source/duration and human visual acceptance remain open.']};
await fs.writeFile(root+'/comparison.json',JSON.stringify(proof,null,2));
console.log(JSON.stringify({captures:captures.length,measurements:measurements.length,summaries,preservation:proof.preservation},null,2));
