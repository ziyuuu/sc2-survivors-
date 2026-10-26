import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {loadBuildAssets} from './load-build-assets.mjs';
import {mapAnimations} from '../src/render/loaders/animations.ts';
import {AnimationClip} from 'three';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report=read('reports/qa/t01-all-motion-source-search-20261026.json'),pins=read('tools/t01-audio-dependencies.json'),requests=read('.cache/t01-audio/requests.json'),added=[];
for(const request of requests){
 if(pins.some(p=>p.sourcePath.toLowerCase().endsWith('/'+request.path.toLowerCase())))continue;
 const original=report.originalAudio.find(p=>p.source.toLowerCase().endsWith('/'+request.path.toLowerCase()));assert.ok(original,request.path);
 assert.equal(sha(fs.readFileSync(original.file)),original.sha256);
 const pin={sourcePath:original.source,installFile:path.relative(process.cwd(),original.file).replaceAll('\\','/'),sha256:original.sha256,bytes:original.bytes};pins.push(pin);added.push(pin);
}
// Validate the actual converted model, including source clip order used by the renderer.
const records=await loadBuildAssets(),model=records.find(r=>r.id==='model.hero.dehaka');assert.ok(model);
const glb=fs.readFileSync(model.packedFile),gltf=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
const clip=mapAnimations(gltf.animations.map(a=>new AnimationClip(a.name,1,[])),'hero.dehaka').move;assert.equal(clip.name,'Slow Walk');
const previous=read('.cache/t01-closeout/previous-audio.json'),plan=read('.cache/t01-audio/source-plan.json');
for(const weapon of Object.values(plan.weapons))delete weapon.source;
for(const field of ['weapons','deaths','skills','special','motion','motionStart','dialogue','transforms','transformTiming'])assert.deepEqual(plan[field],previous[field],field);
fs.writeFileSync('tools/t01-audio-dependencies.json',JSON.stringify(pins,null,2)+'\n');
const result={addedOriginals:added,renderedDehakaClip:clip.name,preservedRoutes:true};fs.writeFileSync('.cache/t01-closeout/audio-preparation.json',JSON.stringify(result,null,2));console.log(JSON.stringify({added:added.length,renderedDehakaClip:clip.name,preservedRoutes:true}));
