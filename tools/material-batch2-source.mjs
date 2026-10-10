/** Read every shipped original M3. Originals and existing GLBs are immutable. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {decodeDds,rgbaToPng} from './dds-png.mjs';
import {decodeMaterialDds} from './material-dds.mjs';

const out='reports/local/material-batch2-20261010',check=process.argv.includes('--check');
const hash=b=>createHash('sha256').update(b).digest('hex');
const inventory=JSON.parse(await fs.readFile('reports/local/visual-baseline-20261010/audit/inventory.json','utf8'));
const sourceRecords=new Map(JSON.parse(await fs.readFile('assets/private/m3-pack.json','utf8')).manifest.map(r=>[r.id,r]));
const runtimeRecords=new Map(JSON.parse(await fs.readFile('deploy/runtime/build-assets.json','utf8')).records.map(r=>[r.id,r]));
const {loadM3FromFile}=await import(pathToFileURL(path.resolve('.cache/visual-restoration-reader/m3-loader.js')).href);
const profiles={},sources=new Map(),derived=new Map(),rows=[],gaps=[];
const roles={diffuse:'layer_diff',normal:'layer_norm',specular:'layer_spec',emissive:'layer_emis1',emissive2:'layer_emis2',alpha:'layer_alpha1',alpha2:'layer_alpha2',decal:'layer_decal',gloss:'layer_gloss',ao:'layer_ao',environment:'layer_envi',environmentMask:'layer_envi_mask'};
async function source(file){let r=sources.get(file);const b=await fs.readFile(file);if(!r){r={file,bytes:b.length,sha256:hash(b)};sources.set(file,r);}return {b,r};}
async function write(file,b){if(check){assert.equal(hash(await fs.readFile(file)),hash(b),'Generated file differs: '+file);}else{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,b);}}
async function teamTexture(filename){const file='assets/private/dds/'+filename;if(derived.has(file))return derived.get(file).id;
 const {b,r}=await source(file),image=decodeDds(b);let masked=0;for(let i=3;i<image.rgba.length;i+=4)if(image.rgba[i]<255)masked++;
 if(!masked)return undefined;
 const bytes=rgbaToPng(image),sha=hash(bytes),id='material.team.'+r.sha256.slice(0,20),url='assets/materials/'+id+'.png',gitPath='deploy/runtime/assets/'+sha+'.png';
 const record={id,kind:'material-texture',status:'available',required:true,url,packedFile:'public/'+url,gitPath,sourceFile:file,sourceSha256:r.sha256,packedSha256:sha,bytes:bytes.length,width:image.width,height:image.height,maskedPixels:masked,sourceChannel:'Original diffuse RGBA; alpha is the inverse team-color mask, never body opacity'};
 await write(gitPath,bytes);await write(record.packedFile,bytes);derived.set(file,record);return id;
}
async function layerTextures(filename){const file='assets/private/dds/'+filename,{b,r}=await source(file),images=decodeMaterialDds(b),ids=[];
 for(const [face,image]of images.entries()){
  const key=file+':'+face;if(derived.has(key)){ids.push(derived.get(key).id);continue;}
  const bytes=rgbaToPng(image),sha=hash(bytes),id='material.layer.'+r.sha256.slice(0,20)+(images.length>1?'.'+face:''),url='assets/materials/'+id+'.png',gitPath='deploy/runtime/assets/'+sha+'.png';
  const record={id,kind:'material-texture',status:'available',required:true,url,packedFile:'public/'+url,gitPath,sourceFile:file,sourceSha256:r.sha256,packedSha256:sha,bytes:bytes.length,width:image.width,height:image.height,sourceChannel:'Original RGBA; channel selection is applied by the material shader',...(images.length>1?{cubeFace:face}:{})};
  await write(gitPath,bytes);await write(record.packedFile,bytes);derived.set(key,record);ids.push(id);
 }return ids;
}
for(const runtime of inventory.models){
 const record=sourceRecords.get(runtime.id),key=runtime.id.slice(6),filename=(record?.sourcePath??record?.source??runtime.source?.m3Source)?.replaceAll('\\','/').split('/').at(-1)?.toLowerCase();
 if(!filename){gaps.push({key,reason:'No original M3 source metadata; retain existing runtime model'});continue;}
 const file='assets/private/m3/'+filename,{b,r}=await source(file),s=await loadM3FromFile(path.resolve(file));
 const glb=await fs.readFile(runtimeRecords.get(runtime.id).packedFile);assert.equal(hash(glb),runtime.sha256,'Changed baseline model '+key);
 const json=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)));
 const get=ref=>s.getSectionByReference(ref)?.content??[],str=ref=>String.fromCharCode(...get(ref)).replaceAll('\0','');
 const value=v=>typeof v==='number'?v:v?Object.fromEntries(['x','y','z','w','r','g','b','a'].filter(k=>typeof v[k]==='number').map(k=>[k,v[k]])):null;
 const ref=v=>v?{id:v.header.id,interpolation:v.header.interpolation,default:value(v.default)}:null;
 const layer=l=>l?{filename:str(l.color_bitmap).replaceAll('\\','/').split('/').at(-1).toLowerCase(),flags:l.flags,channel:l.color_channels,uv:l.uv_source,color:ref(l.color_value),multiply:ref(l.color_multiply),add:ref(l.color_add),brightness:ref(l.color_brightness),uvOffset:ref(l.uv_offset),uvAngle:ref(l.uv_angle),uvTiling:ref(l.uv_tiling),flipbook:{rows:l.uv_flipbook_rows,cols:l.uv_flipbook_cols,frame:ref(l.uv_flipbook_frame)},fresnel:{type:l.fresnel_type,exponent:l.fresnel_exponent,min:l.fresnel_min,maxOffset:l.fresnel_max_offset}}:null;
 const all=get(s.model.materials_standard).map((m,index)=>({index,name:str(m.name),version:m.desc.version,geometryVisible:m.desc.version<17||!!(m.flags&0x80000000),flags:m.flags,blend:m.blend_mode,alphaTest:(m.alpha_test_threshold??0)/255,hdrEmission:m.hdr_emis,hdrSpecular:m.hdr_spec??1,specularity:m.specularity??20,emissionModes:[m.blend_mode_emis1,m.blend_mode_emis2],layerBlend:m.blend_mode_layer,layers:Object.fromEntries(Object.entries(roles).map(([role,k])=>[role,layer(get(m[k])[0])]).filter(([,v])=>v))}));
 const materials=all.filter(m=>json.materials?.some(raw=>raw.name===m.name+'#'+m.index));
 const unmapped=(json.materials??[]).filter(raw=>!materials.some(m=>raw.name===m.name+'#'+m.index)).map(m=>m.name);
 if(unmapped.length)gaps.push({key,reason:'Runtime surface has no standard M3 binding',materials:unmapped});
 for(const m of materials){
  const raw=json.materials.find(raw=>raw.name===m.name+'#'+m.index);m.role=raw.extras?.sc2?.role??'body';
  m.teamColor=m.blend===0&&m.layers.diffuse?.channel===1&&!key.startsWith('map.');
  for(const [role,l] of Object.entries(m.layers))if(l.filename){try{
   await source('assets/private/dds/'+l.filename);
   // Restore channels absent from the export, plus RGBA needed for true alpha blending.
   if(['decal','gloss','ao','environment','environmentMask'].includes(role)||l.uv===15||role.startsWith('emissive')&&m.emissionModes[role==='emissive'?0:1]===3){
    const ids=await layerTextures(l.filename);if(ids.length===6)l.cubeTextures=ids;else l.texture=ids[0];l.rawChannels=true;
   }
  }catch(e){if(e.code!=='ENOENT')throw e;gaps.push({key,material:m.name,role,texture:l.filename,reason:'Missing original DDS; retain embedded runtime texture when present'});}}
  if(m.teamColor&&m.layers.diffuse?.filename)m.teamTexture=await teamTexture(m.layers.diffuse.filename);
 }
 const refs=get(s.model.material_references),composites=get(s.model.materials_composite).map(m=>({name:str(m.name),parts:get(m.sections).map(p=>{const q=refs[p.material_reference_index];return {material:{type:q.type,index:q.material_index},alpha:ref(p.alpha_factor)};})}));
 const stcs=get(s.model.sequence_transformation_collections),stgs=get(s.model.sequence_transformation_groups),sd=['sdev','sd2v','sd3v','sd4q','sdcc','sdr3','sdu8','sds6','sdu6','sds3','sdu3','sdfg','sdmb'];
 const ids=new Set(materials.flatMap(m=>Object.values(m.layers).flatMap(l=>[l.color,l.multiply,l.add,l.brightness,l.uvOffset,l.uvAngle,l.uvTiling,l.flipbook?.frame].filter(Boolean).map(r=>r.id))));
 for(const c of composites)for(const p of c.parts)if(p.alpha)ids.add(p.alpha.id);
 const tracks=(c,offset=0,read=get)=>{const a=read(c.anim_ids),refs=read(c.anim_refs),result=[];a.forEach((id,i)=>{if(!ids.has(id))return;const packed=refs[i],entry=read(c[sd[packed>>>16]])[packed&0xffff];if(entry)result.push({id,frames:read(entry.frames).map(t=>(t-offset)/1000),values:read(entry.keys).map(value)});});return result;};
 const clips=get(s.model.sequences).map((q,index)=>({name:str(q.name),duration:(q.anim_ms_end-q.anim_ms_start)/1000,tracks:get(stgs[index]?.stc_indices).flatMap(ci=>tracks(stcs[ci],q.anim_ms_start))}));
 const animationSources=[];
 for(const declared of record?.additionalAnimations??[]){
  if(declared.status==='missing')continue;
  const name=(declared.sourcePath??declared.source).replaceAll('\\','/').split('/').at(-1).toLowerCase(),file='assets/private/m3/'+name;
  const {r:animationSource}=await source(file);assert.equal(animationSource.sha256,declared.sourceSha256??declared.sha256,'Changed animation source '+file);
  const a=await loadM3FromFile(path.resolve(file)),read=ref=>a.getSectionByReference(ref)?.content??[],nameOf=ref=>String.fromCharCode(...read(ref)).replaceAll('\0','');
  const collections=read(a.model.sequence_transformation_collections),groups=read(a.model.sequence_transformation_groups),added=[];
  for(const [index,q]of read(a.model.sequences).entries()){
   const name=nameOf(q.name);if(clips.some(c=>c.name===name)||!json.animations?.some(c=>c.name===name))continue;
   const clip={name,duration:(q.anim_ms_end-q.anim_ms_start)/1000,tracks:read(groups[index]?.stc_indices).flatMap(ci=>tracks(collections[ci],q.anim_ms_start,read))};clips.push(clip);added.push({name,tracks:clip.tracks.length});
  }
  animationSources.push({source:name,sha256:animationSource.sha256,clips:added});
 }
 // The existing rigid-piece export renames the selected native death clip to Death.
 // Reuse that exact source material timeline; do not synthesize material animation.
 if(record?.deathMotion?.adaptedBones?.length&&!clips.some(c=>c.name==='Death')&&json.animations?.some(c=>c.name==='Death')){
  const native=clips.find(c=>/^death$/i.test(c.name))??clips.find(c=>/death/i.test(c.name));
  if(native){clips.push({...native,name:'Death'});animationSources.push({source:filename,sha256:r.sha256,alias:{from:native.name,to:'Death',reason:'Existing original-rigid-bones export preserves this native timeline'}});}
 }
 const compositeIds=new Set(composites.flatMap(c=>c.parts.map(p=>p.alpha?.id))),compositeTracks=stcs.flatMap(c=>tracks(c).filter(t=>compositeIds.has(t.id)).map(t=>({name:str(c.name),...t})));
 profiles[key]={source:filename,sourceSha256:r.sha256,glbSha256:runtime.sha256,materials,composites,compositeTracks,clips,animationSources};
 rows.push({key,source:filename,materials:materials.length,unmapped,tracks:clips.reduce((n,c)=>n+c.tracks.length,0),compositeTracks:compositeTracks.length,teamSurfaces:materials.filter(m=>m.teamTexture).length,illegalUnlitSpecular:(json.materials??[]).filter(m=>m.extensions?.KHR_materials_unlit&&m.extensions?.KHR_materials_specular).length});
}
const generated='// Generated by tools/material-batch2-source.mjs from immutable originals.\nimport type {UnitMaterialProfile} from \'./source-tracks\';\nexport const UNIT_MATERIAL_CATALOG:Record<string,UnitMaterialProfile> = '+JSON.stringify(profiles)+';\n';
// Two source filenames may contain identical DDS bytes. One content identity gets one registry row.
const unique=new Map();for(const record of derived.values()){const prior=unique.get(record.id);if(prior)assert.equal(prior.packedSha256,record.packedSha256,'Derived identity collision');else unique.set(record.id,record);}
const records=[...unique.values()],registry='// Original diffuse masks for render-only team and elite identity colors.\nexport const MATERIAL_TEXTURE_ASSETS = '+JSON.stringify(records.map(({id,kind,status,required,url})=>({id,kind,status,required,url})))+';\n';
// Text output normalizes CRLF when --check is used on a Windows checkout.
for(const [file,text] of [['src/render/materials/unit-material-catalog.ts',generated],['src/assets/material-textures.ts',registry]]){if(check)assert.equal((await fs.readFile(file,'utf8')).replace(/\r\n/g,'\n'),text,file);else await write(file,text);}
const catalog={version:1,generatedSha256:hash(registry),records};await write('deploy/runtime/material-textures.json',JSON.stringify(catalog,null,2)+'\n');
await fs.mkdir(out,{recursive:true});
const report={models:rows.length,originalRuntimeModels:inventory.models.length,rows,gaps,sources:[...sources.values()],textures:records,generatedSha256:hash(generated),method:'All available original M3s reread; per-surface original DDS hashes and raw RGBA team masks; existing runtime GLBs unchanged'};
if(!check)await fs.writeFile(out+'/source-stamp.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({models:rows.length,materials:rows.reduce((n,r)=>n+r.materials,0),gaps,teamTextures:records.length,bytes:records.reduce((n,r)=>n+r.bytes,0),illegalUnlitSpecular:rows.reduce((n,r)=>n+r.illegalUnlitSpecular,0)}));
