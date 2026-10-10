import fs from 'node:fs/promises';
import {UNIT_MATERIAL_CATALOG as profiles} from '../src/render/materials/unit-material-catalog.ts';
const metadata=JSON.parse(await fs.readFile('deploy/runtime/build-assets.json','utf8'));
const rows=[];
for(const [key,profile]of Object.entries(profiles)){
 const record=metadata.records.find(r=>r.id==='model.'+key),bytes=await fs.readFile(record.packedFile),g=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
 const missingClips=(g.animations??[]).filter(a=>!profile.clips.some(c=>c.name===a.name)).map(a=>a.name),missingUvs=[];
 for(const mesh of g.meshes)for(const primitive of mesh.primitives){const raw=g.materials[primitive.material],m=profile.materials.find(m=>raw.name===m.name+'#'+m.index);if(!m)throw Error('Unbound '+key+'/'+raw.name);
  for(const [role,layer]of Object.entries(m.layers))if((layer.filename||layer.flags&1024)&&layer.uv===1&&primitive.attributes.TEXCOORD_1===undefined)missingUvs.push({mesh:mesh.name,material:m.name,role,uv:layer.uv});
 }
 rows.push({key,surfaces:profile.materials.length,sourceGeometryVisible:profile.materials.filter(m=>m.geometryVisible).length,emissionModes:[...new Set(profile.materials.flatMap(m=>m.emissionModes))],glbMaterialInstances:g.materials.length,missingClips,missingUvs});
}
await fs.writeFile('reports/local/material-batch2-20261010/coverage.json',JSON.stringify({rows},null,2));console.log(JSON.stringify({models:rows.length,missingClips:rows.filter(r=>r.missingClips.length),missingUvs:rows.filter(r=>r.missingUvs.length)}));
