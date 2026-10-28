/** Reproducible input inventory; never recompress a lossy derivative. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {loadBuildAssets} from './load-build-assets.mjs';
import {UNIT_MATERIAL_CATALOG} from '../src/render/materials/unit-material-catalog.ts';
import {initialMenuAssetIds} from '../src/assets/menu-assets.ts';
const packed=path.resolve(process.argv[2]??'sites/size-optimized-site/public'),output=path.resolve(process.argv[3]??'dist/quality-20261028');
const records=await loadBuildAssets(),protectedIds=new Set();
for(const profile of Object.values(UNIT_MATERIAL_CATALOG))for(const m of profile.materials){if(m.teamTexture)protectedIds.add(m.teamTexture);for(const [role,layer]of Object.entries(m.layers)){if(layer.texture&&(!['diffuse','emissive','emissive2','specular'].includes(role)||layer.flipbook))protectedIds.add(layer.texture);for(const id of layer.cubeTextures??[])protectedIds.add(id);}}
await fs.mkdir(output,{recursive:true});
await fs.writeFile(output+'/quality-input.json',JSON.stringify({packed,output,records,protectedIds:[...protectedIds],menuIds:initialMenuAssetIds(records.map(r=>r.id))}));
console.log(JSON.stringify({input:output+'/quality-input.json',records:records.length,protectedIds:protectedIds.size}));
