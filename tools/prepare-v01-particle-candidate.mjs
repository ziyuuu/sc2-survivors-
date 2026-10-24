import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const base='reports/local/v01-20261024',file='src/render/effects/source/particles.ts';
const before=await fs.readFile(file,'utf8');let code=before;
function replace(a,b){assert.equal(code.split(a).length,2,a);code=code.replace(a,b);}
replace("let emitted=0,parentLocal:THREE.Matrix4|undefined,localScale:number|undefined;", "let emitted=0,parentLocal:THREE.Matrix4|undefined,localScale:number|undefined,worldParents:Map<number,THREE.Matrix4>|undefined;");
replace("const parent=worldSpace?sourcePlacement(def,request.placement,birth.born).multiply(boneMatrices(def,phase)[p.bone]??new THREE.Matrix4()):parentLocal??(parentLocal=nowPlacement.clone().multiply((nowBones??=boneMatrices(def,phaseNow))[p.bone]??new THREE.Matrix4()));", `// Reuse only within this emitter and invocation: simultaneous births have
   // identical placement and authored pose. No time quantization or retention.
   let parent:THREE.Matrix4;
   if(worldSpace){worldParents??=new Map();const hit=worldParents.get(birth.born);if(hit)parent=hit;else{parent=sourcePlacement(def,request.placement,birth.born).multiply(boneMatrices(def,phase)[p.bone]??new THREE.Matrix4());worldParents.set(birth.born,parent);}}
   else parent=parentLocal??(parentLocal=nowPlacement.clone().multiply((nowBones??=boneMatrices(def,phaseNow))[p.bone]??new THREE.Matrix4()));`);
// A cycle boundary can have two clips at one absolute birth time; include exact
// phase identity by resetting the small per-emitter cache between clip phases.
replace('worldParents:Map<number,THREE.Matrix4>|undefined;',"worldParents:Map<number,THREE.Matrix4>|undefined,parentClip:SourcePhase['clip']|undefined,parentSeconds:number|undefined;");
replace('if(worldSpace){worldParents??=new Map();', 'if(worldSpace){if(parentClip!==phase.clip||parentSeconds!==phase.seconds){worldParents=undefined;parentClip=phase.clip;parentSeconds=phase.seconds;}worldParents??=new Map();');
const meta={file,beforeSha256:createHash('sha256').update(before).digest('hex'),candidateSha256:createHash('sha256').update(code).digest('hex'),scope:'Isolated diagnostic transform only. Reuse identical world-space burst parents within one emitter/call. No persistent cache, particle count, timing, placement or quality changes.'};
await fs.writeFile(base+'/particle-candidate.ts',code);await fs.writeFile(base+'/particle-candidate-patch.json',JSON.stringify(meta,null,2));
for(const variant of ['baseline','candidate'])await build({stdin:{contents:"export {sourceParticleQuads,SourceParticleCache} from './src/render/effects/source/particles';export {SOURCE_EFFECTS} from './src/render/effects/source/player';",resolveDir:process.cwd(),loader:'ts'},outfile:base+'/particle-'+variant+'.mjs',bundle:true,platform:'node',format:'esm',packages:'external',plugins:variant==='candidate'?[{name:'exact-particle-candidate',setup(b){b.onLoad({filter:/source[\\/]particles\.ts$/},()=>({contents:code,loader:'ts',resolveDir:path.resolve('src/render/effects/source')}));}}]:[]});
console.log(JSON.stringify(meta));
