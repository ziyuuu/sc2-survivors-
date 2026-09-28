import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadM3FromFile} from '../.cache/m3-converter/m3-loader.js';
import {localSourceFile} from './local-source-cache.mjs';
const input=JSON.parse(fs.readFileSync('tools/closeout-building-models.json')).filter(x=>x.id.endsWith('.death'));
const rows=[];
for(const entry of input){
 const path=localSourceFile(`assets/private/m3/${entry.name}.m3`),bytes=fs.readFileSync(path),s=await loadM3FromFile(path),get=r=>s.getSectionByReference(r)?.content??[],str=r=>String.fromCharCode(...get(r)).replaceAll('\0','');
 rows.push({id:entry.id,source:entry.assetPath,sourceBuild:'B97563',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,bones:s.model.bones.entries,particles:s.model.particle_systems.entries,ribbons:s.model.ribbons.entries,rigidBodies:s.model.physics_rigidbodies.entries,displacementMaterials:s.model.materials_displacement.entries,sequences:get(s.model.sequences).map(a=>({name:str(a.name),durationMs:a.anim_ms_end-a.anim_ms_start})),events:get(s.model.sequence_transformation_collections).flatMap(c=>get(c.sdev).flatMap(e=>get(e.keys).map((k,i)=>({at:get(e.frames)[i],name:str(k.name),bone:k.bone})))),runtimeStatus:'not-complete: original particle/rigid-body event interpreter unavailable; body-only GLB is not equivalent'});
}
fs.writeFileSync('reports/local/second-pass-death-audit.json',JSON.stringify({at:new Date().toISOString(),scope:'Local original bytes verified, no original-source modification or replacement geometry.',rows},null,2));console.log(JSON.stringify(rows.map(({id,particles,rigidBodies})=>({id,particles,rigidBodies}))));
