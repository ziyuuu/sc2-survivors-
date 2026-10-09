/** Read-only original-source inventory for every shipped model. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const sourceRoot=path.resolve(process.argv[2]??'D:/星际'),out=path.join(sourceRoot,'reports/local/visual-plan-validation-20261009');
const {loadM3FromFile}=await import(pathToFileURL(path.join(sourceRoot,'.cache/visual-restoration-reader/m3-loader.js')).href);
const pack=JSON.parse(await fs.readFile(path.join(sourceRoot,'assets/private/m3-pack.json'),'utf8'));const sourceRecords=new Map(pack.manifest.map(m=>[m.id,m]));
const inventory=JSON.parse(await fs.readFile(path.join(out,'inventory.json'),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex'),profiles={},cache=new Map(),failures=[],textures=new Map();
const m3Files=(await fs.readdir(path.join(sourceRoot,'assets/private/m3'))).filter(x=>x.endsWith('.m3'));
for(const model of inventory.models){
 const record=sourceRecords.get(model.id),source=record?.sourcePath??record?.source??model.source?.m3Source;
 if(!source){failures.push({id:model.id,kind:'no-m3-source-metadata'});continue;}
 const name=source.replaceAll('\\','/').split('/').at(-1).toLowerCase(),file=path.join(sourceRoot,'assets/private/m3',name);
 if(cache.has(name)){profiles[model.id]={...cache.get(name),aliasSource:name};continue;}
 try{
  const bytes=await fs.readFile(file),s=await loadM3FromFile(file),get=r=>s.getSectionByReference(r)?.content??[],str=r=>String.fromCharCode(...get(r)).replaceAll('\0','');
  const vector=v=>typeof v==='number'?v:v?Object.fromEntries(['x','y','z','w','r','g','b','a'].filter(k=>typeof v[k]==='number').map(k=>[k,v[k]])):null;
  const ref=r=>r?{id:r.header?.id,interpolation:r.header?.interpolation,default:vector(r.default)}:null;
  const layer=l=>l?{filename:str(l.color_bitmap),flags:l.flags,channel:l.color_channels,uv:l.uv_source,color:ref(l.color_value),multiply:ref(l.color_multiply),add:ref(l.color_add),uvOffset:ref(l.uv_offset),uvAngle:ref(l.uv_angle),uvTiling:ref(l.uv_tiling),fresnel:{type:l.fresnel_type,exponent:l.fresnel_exponent,min:l.fresnel_min,maxOffset:l.fresnel_max_offset}}:null;
  const roles={diffuse:'layer_diff',normal:'layer_norm',specular:'layer_spec',emissive:'layer_emis1',emissive2:'layer_emis2',alpha:'layer_alpha1',alpha2:'layer_alpha2'};
  const materials=get(s.model.materials_standard).map((m,index)=>({index,name:str(m.name),flags:m.flags,blend:m.blend_mode,hdrEmission:m.hdr_emis,hdrSpecular:m.hdr_spec,specularity:m.specularity,layers:Object.fromEntries(Object.entries(roles).map(([role,k])=>[role,layer(get(m[k])[0])]))}));
  const refs=get(s.model.material_references),composites=get(s.model.materials_composite).map(m=>({name:str(m.name),parts:get(m.sections).map(p=>{const r=refs[p.material_reference_index];return {material:{type:r?.type,index:r?.material_index},alpha:ref(p.alpha_factor)};})}));
  const stcs=get(s.model.sequence_transformation_collections),stgs=get(s.model.sequence_transformation_groups),sd=['sdev','sd2v','sd3v','sd4q','sdcc','sdr3','sdu8','sds6','sdu6','sds3','sdu3','sdfg','sdmb'];
  const materialRefs=new Set(materials.flatMap(m=>Object.values(m.layers).filter(Boolean).flatMap(l=>[l.color,l.multiply,l.add,l.uvOffset,l.uvAngle,l.uvTiling].filter(Boolean).map(r=>r.id))));
  for(const c of composites)for(const p of c.parts)if(p.alpha)materialRefs.add(p.alpha.id);
  const clips=get(s.model.sequences).map((q,index)=>{const tracks=[];for(const ci of get(stgs[index]?.stc_indices)){const c=stcs[ci],ids=get(c.anim_ids),refs=get(c.anim_refs);ids.forEach((id,i)=>{if(!materialRefs.has(id))return;const packed=refs[i],entry=get(c[sd[packed>>>16]])[packed&0xffff];if(entry)tracks.push({id,frames:get(entry.frames).map(t=>(t-q.anim_ms_start)/1000),values:get(entry.keys).map(vector)});});}return {name:str(q.name),duration:(q.anim_ms_end-q.anim_ms_start)/1000,tracks};});
  const compositeTracks=[];for(const c of stcs){const ids=get(c.anim_ids),refs=get(c.anim_refs);ids.forEach((id,i)=>{if(!composites.some(m=>m.parts.some(p=>p.alpha?.id===id)))return;const packed=refs[i],entry=get(c[sd[packed>>>16]])[packed&0xffff];if(entry)compositeTracks.push({name:str(c.name),id,frames:get(entry.frames).map(t=>t/1000),values:get(entry.keys).map(vector)});});}
  const profile={source:name,sourceSha256:hash(bytes),bytes:bytes.length,materials,composites,compositeTracks,clips};
  for(const m of materials)for(const [role,l] of Object.entries(m.layers))if(l?.filename){const texture=l.filename.replaceAll('\\','/').split('/').at(-1).toLowerCase();if(textures.has(texture))continue;try{const b=await fs.readFile(path.join(sourceRoot,'assets/private/dds',texture));textures.set(texture,{name:texture,sha256:hash(b),bytes:b.length});}catch{textures.set(texture,{name:texture,missing:true,firstModel:model.id,role});}}
  cache.set(name,profile);profiles[model.id]=profile;
 }catch(e){failures.push({id:model.id,source:name,kind:'source-load-failure',message:String(e)});}
}
const rows=inventory.models.map(m=>({model:m.id,loaded:!!profiles[m.id],source:profiles[m.id]?.source,materials:profiles[m.id]?.materials.length,composites:profiles[m.id]?.composites.length,animatedMaterialTracks:profiles[m.id]?.clips.reduce((n,c)=>n+c.tracks.length,0),particleSystemsExported:m.source?.particleSystemsExported,bodyBoundsSource:'original GLB geometry and animation inventory'}));
const result={method:'Read-only local original M3 and DDS audit. No conversion, texture paint, runtime repair or source edits. Missing source records remain open.',counts:{shippedModels:inventory.models.length,parsedModels:rows.filter(x=>x.loaded).length,uniqueSources:cache.size,sourceBytes:[...cache.values()].reduce((n,p)=>n+p.bytes,0),textures:textures.size,missingTextures:[...textures.values()].filter(t=>t.missing).length,failures:failures.length},rows,failures,textures:[...textures.values()],profiles};
await fs.writeFile(path.join(out,'source-audit.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({counts:result.counts,failures}));
