import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const base='reports/local/v01-20261024',dir=base+'/spike-retention-candidate',file='render/units/animated-batch.ts';
await fs.mkdir(dir,{recursive:false});await fs.cp(base+'/spike-original/src',dir+'/src',{recursive:true});
const original=await fs.readFile('src/'+file,'utf8');assert.equal(original,await fs.readFile(dir+'/src/'+file,'utf8'));
let code=original;const a='const surface=createUnitMaterialSurface(m,CAPACITY),mat=surface?.material??m.clone();';assert.equal(code.split(a).length,2);code=code.replace(a,'const surface=createUnitMaterialSurface(m,CAPACITY),mat=surface?.material??m.clone(),fallbackMaterial=surface?undefined:m;');
assert.equal(code.split('if(!surface)m.onBeforeCompile(shader,renderer);').length,3);code=code.replaceAll('if(!surface)m.onBeforeCompile(shader,renderer);','if(fallbackMaterial)fallbackMaterial.onBeforeCompile(shader,renderer);');
assert.equal(code.split('surface?.programKey(geometry)??m.customProgramCacheKey()').length,2);code=code.replace('surface?.programKey(geometry)??m.customProgramCacheKey()','surface?.programKey(geometry)??fallbackMaterial!.customProgramCacheKey()');
await fs.writeFile(dir+'/src/'+file,code);await fs.writeFile(dir+'/patch.json',JSON.stringify({status:'isolated-candidate',file:'src/'+file,originalSha256:createHash('sha256').update(original).digest('hex'),candidateSha256:createHash('sha256').update(code).digest('hex'),scope:'Stop source-material closures retaining replaced images only when a prepared source surface exists. Preserve original fallback material and every texture used by the actual surface; no shader, sampler, scheduling, UI or gameplay changes.'},null,2));
console.log(dir);
