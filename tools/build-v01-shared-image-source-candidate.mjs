import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const base='reports/local/v01-20261024';let code=await fs.readFile(base+'/build-web.mjs','utf8');
const before='plugins:[{name:';assert.equal(code.split(before).length,2);
const target="const gltf=await loadUnitMaterialGltf(new GLTFLoader(),url,assetKey+suffix);",original=await fs.readFile('src/render/scene/battle-renderer.ts','utf8');assert.equal(original.split(target).length,2);
const transformed="import {configureSharedImageLoader} from '../../../tools/v01-shared-image-source-candidate';\n"+original.replace(target,"const gltf=await loadUnitMaterialGltf(configureSharedImageLoader(new GLTFLoader()),url,assetKey+suffix);");
await fs.writeFile(base+'/spike-shared-source-renderer.ts',transformed,{flag:'wx'});
code=code.replace(before,`plugins:[{name:'isolated-spike-shared-source-candidate',enforce:'pre',async transform(code,id){if(id.replaceAll('\\\\','/').endsWith('/src/render/scene/battle-renderer.ts'))return fs.readFile(base+'/spike-shared-source-renderer.ts','utf8');}},{name:`);
code=code.replace('globalThis.D04=D04;globalThis.A03=',"globalThis.D04=D04;globalThis.V01ImageSource={configureSharedImageLoader,imageSourceMetrics};globalThis.A03=");
code=code.replace('import * as D04 from',"import {configureSharedImageLoader,imageSourceMetrics} from \\\"../tools/v01-shared-image-source-candidate\\\";import * as D04 from");
// Keep the generated main.ts string quoting identical to the existing builder.
code=code.replaceAll('\\\"','"');
code=code.replace('production bytes recorded unchanged','isolated exact embedded image sharing candidate; original bytes and separate patch hash recorded');
await fs.writeFile(base+'/build-shared-source-candidate.mjs',code,{flag:'wx'});
await fs.writeFile(base+'/spike-shared-source-patch.json',JSON.stringify({status:'isolated-candidate',file:'src/render/scene/battle-renderer.ts',originalSha256:createHash('sha256').update(original).digest('hex'),transformedSha256:createHash('sha256').update(transformed).digest('hex'),helper:'tools/v01-shared-image-source-candidate.ts',helperSha256:createHash('sha256').update(await fs.readFile('tools/v01-shared-image-source-candidate.ts')).digest('hex'),scope:'Exact encoded-image SHA and decoder options identify shared ImageBitmap Sources before decoding. Separate material wrappers and original sampler settings; only detached background unit loads. No production edits.'},null,2));
console.log('Prepared exact-image-source isolated build.');
