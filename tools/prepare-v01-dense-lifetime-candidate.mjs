import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {build} from 'esbuild';
const dir='reports/local/v01-20261024/dense-lifetime-candidate',sha=b=>createHash('sha256').update(b).digest('hex');await fs.mkdir(dir,{recursive:false});
const files=['src/render/effects/source/particles.ts','src/render/effects/source/timeline.ts'],changes=new Map(),manifest=[];
for(const file of files){const before=await fs.readFile(file,'utf8');let code=before;const replace=(a,b)=>{assert.equal(code.split(a).length,2,a);code=code.replace(a,b);};
 if(file.endsWith('particles.ts')){
  replace('sourcePhase,sourceSample','sourcePhase,sourceSample,particleLifetimeBound');
  replace('const phaseNow=sourcePhase(def,request.age,request.loop,request.seed,request.clip),nowPlacement=sourcePlacement(def,request.placement,request.age);let nowBones:THREE.Matrix4[]|undefined;', 'const phaseNow=sourcePhase(def,request.age,request.loop,request.seed,request.clip);let nowPlacement:THREE.Matrix4|undefined,nowBones:THREE.Matrix4[]|undefined;');
  replace('activeBirths(def,emitter,request.age,!!request.loop,request.seed,request.clip)', "activeBirths(def,emitter,request.age,!!request.loop,request.seed,request.clip,decorationFraction>=1||decorationEmitters&&!decorationEmitters.has(index%1000)?particleLifetimeBound(def,emitter):Infinity)");
  replace('parentLocal=nowPlacement.clone().multiply','parentLocal=(nowPlacement??=sourcePlacement(def,request.placement,request.age)).clone().multiply');
 }else{
  const marker='export function activeBirths(';
  const helper=`// This upper bound only removes births already dead under every authored
// numeric lifespan. Unknown values retain the original wider search window.
const particleLifeBounds=new WeakMap<SourceEffectDefinition,WeakMap<SourceEmitter,number>>();
export function particleLifetimeBound(def:SourceEffectDefinition,p:SourceEmitter){
 let emitters=particleLifeBounds.get(def);if(!emitters){emitters=new WeakMap();particleLifeBounds.set(def,emitters);}const hit=emitters.get(p);if(hit!==undefined)return hit;
 let bound=0,known=true;
 for(const key of ['lifespan','lifespan_random']){
  const value=p[key];if(value===undefined||value===null)continue;
  if(typeof value==='number'){if(!Number.isFinite(value))known=false;else bound=Math.max(bound,Math.abs(value));continue;}
  if(typeof value!=='object'||Array.isArray(value)||!('id'in value)||!('default'in value)){known=false;continue;}
  const ref=value as unknown as MaterialRef;if(ref.interpolation!==0&&ref.interpolation!==1){known=false;continue;}
  const values=[ref.default,...def.materialProfile.clips.flatMap(c=>c.tracks.filter(t=>t.id===ref.id).flatMap(t=>t.values))];
  for(const v of values){if(typeof v!=='number'||!Number.isFinite(v))known=false;else bound=Math.max(bound,Math.abs(v));}
 }
 // Keep rounding slack for linear interpolation and the randomized endpoint mix.
 // Extreme numbers or nonstandard clip durations fall back to the old algorithm.
 const result=known&&bound<Number.MAX_VALUE/4&&def.materialProfile.clips.every(c=>c.duration>=.001)?bound+Math.max(1e-9,bound*Number.EPSILON*32):Infinity;emitters.set(p,result);return result;
}
`;
  assert.equal(code.split(marker).length,2);code=code.replace(marker,helper+marker);
  replace('preferred?:string):{born:number;ordinal:number;phase:SourcePhase}[]{','preferred?:string,particleBound=Infinity):{born:number;ordinal:number;phase:SourcePhase}[]{');
  replace('const maxLife=Math.max(.01,sourceLife(def)),phases=', 'const maxLife=Math.max(.01,Math.min(sourceLife(def),particleBound)),phases=');
 }
 const candidate=dir+'/'+path.basename(file);await fs.writeFile(candidate,code,{flag:'wx'});changes.set(file,code);manifest.push({file,candidate,beforeSha256:sha(before),afterSha256:sha(code)});
}
await fs.writeFile(dir+'/manifest.json',JSON.stringify({scope:'Isolated conservative per-emitter lifetime search bound and lazy local placement. Original cache implementation retained. No emission, RNG, clocks, amount, image, quality or gameplay changes. Decoration branches retain original birth count.',files:manifest},null,2),{flag:'wx'});
for(const variant of ['baseline','candidate'])await build({stdin:{contents:"export {sourceParticleQuads,SourceParticleCache} from './src/render/effects/source/particles';export {SOURCE_EFFECTS} from './src/render/effects/source/player';export {activeBirths,emissionSchedule,sourceLife,sourcePhases} from './src/render/effects/source/timeline';",resolveDir:process.cwd(),loader:'ts'},outfile:dir+'/'+variant+'.mjs',bundle:true,platform:'node',format:'esm',packages:'external',plugins:variant==='candidate'?[{name:'lifetime-bound',setup(b){b.onLoad({filter:/source[\\/](particles|timeline)\.ts$/},args=>({contents:changes.get(path.relative(process.cwd(),args.path).replaceAll('\\','/')),loader:'ts',resolveDir:path.dirname(args.path)}));}}]:[]});
await fs.writeFile('tools/verify-v01-dense-lifetime-candidate.mjs',(await fs.readFile('tools/verify-v01-dense-particle-candidate.mjs','utf8')).replaceAll('dense-particle-candidate','dense-lifetime-candidate').replace('for(const age of [0,.13,.13,.44,.81,1.31,3.7,.2])','for(const age of [0,.13,.13,.44,.81,1.31,3.7,10.1,19.97,.2])'),{flag:'wx'});
console.log(JSON.stringify(manifest));
