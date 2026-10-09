/** Local source extraction for this visual sample; the production asset store is read-only. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {decodeDds,rgbaToPng} from '../../tools/dds-png.mjs';
import {convertMaterialPixels} from '../../tools/m3-materials.mjs';
const sourceRoot=path.resolve(process.argv[2]??'D:/星际'),out=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/,''));
const output=path.resolve('preview/sc2-quality-20261009'),textures=path.join(output,'source-textures');
await fs.mkdir(textures,{recursive:true});
const {loadM3FromFile}=await import(pathToFileURL(path.join(sourceRoot,'.cache/visual-restoration-reader/m3-loader.js')).href);
const hash=b=>createHash('sha256').update(b).digest('hex'),pack=JSON.parse(await fs.readFile(path.join(sourceRoot,'assets/private/m3-pack.json')));
const profiles={},copied=new Map();
for(const key of ['marine','marauder','thor','roach','hydralisk','zergling','ultralisk','immortal','zealot','marine.death','marauder.death','thor.death','roach.death','hydralisk.death','zergling.death','ultralisk.death','immortal.death','zealot.death']){
 const record=pack.manifest.find(a=>a.id==='model.'+key);if(!record)throw Error('Missing source '+key);
 const basename=(record.sourcePath??record.source).replaceAll('\\','/').split('/').at(-1).toLowerCase(),file=path.join(sourceRoot,'assets/private/m3',basename),bytes=await fs.readFile(file),s=await loadM3FromFile(file);
 const get=r=>s.getSectionByReference(r)?.content??[],str=r=>String.fromCharCode(...get(r)).replaceAll('\0','');
 const vector=v=>typeof v==='number'?v:v?Object.fromEntries(['x','y','z','w','r','g','b','a'].filter(k=>typeof v[k]==='number').map(k=>[k,v[k]])):null;
 const ref=r=>r?{id:r.header?.id,interpolation:r.header?.interpolation,default:vector(r.default)}:null;
 const layer=l=>l?{filename:str(l.color_bitmap),flags:l.flags,channel:l.color_channels,uv:l.uv_source,color:ref(l.color_value),multiply:ref(l.color_multiply),add:ref(l.color_add),uvOffset:ref(l.uv_offset),uvAngle:ref(l.uv_angle),uvTiling:ref(l.uv_tiling),fresnel:{type:l.fresnel_type,exponent:l.fresnel_exponent,min:l.fresnel_min,maxOffset:l.fresnel_max_offset}}:null;
 const roles={diffuse:'layer_diff',specular:'layer_spec',emissive:'layer_emis1',emissive2:'layer_emis2',alpha:'layer_alpha1',alpha2:'layer_alpha2'};
 const materials=get(s.model.materials_standard).map((m,index)=>({index,name:str(m.name),flags:m.flags,blend:m.blend_mode,hdrEmission:m.hdr_emis,hdrSpecular:m.hdr_spec,specularity:m.specularity,layers:Object.fromEntries(Object.entries(roles).map(([role,k])=>[role,layer(get(m[k])[0])]))}));
 const refs=get(s.model.material_references),composites=get(s.model.materials_composite).map(m=>({name:str(m.name),parts:get(m.sections).map(p=>{const r=refs[p.material_reference_index];return{material:{type:r.type,index:r.material_index},alpha:ref(p.alpha_factor)};})}));
 const stcs=get(s.model.sequence_transformation_collections),stgs=get(s.model.sequence_transformation_groups),sd=['sdev','sd2v','sd3v','sd4q','sdcc','sdr3','sdu8','sds6','sdu6','sds3','sdu3','sdfg','sdmb'];
 const materialRefs=new Set(materials.flatMap(m=>Object.values(m.layers).filter(Boolean).flatMap(l=>[l.color,l.multiply,l.add,l.uvOffset,l.uvAngle,l.uvTiling].filter(Boolean).map(r=>r.id))));
 for(const c of composites)for(const p of c.parts)if(p.alpha)materialRefs.add(p.alpha.id);
 const clips=get(s.model.sequences).map((q,index)=>{const tracks=[];for(const ci of get(stgs[index]?.stc_indices)){const c=stcs[ci],ids=get(c.anim_ids),refs=get(c.anim_refs);ids.forEach((id,i)=>{if(!materialRefs.has(id))return;const packed=refs[i],entry=get(c[sd[packed>>>16]])[packed&0xffff];if(entry)tracks.push({id,frames:get(entry.frames).map(t=>(t-q.anim_ms_start)/1000),values:get(entry.keys).map(vector)});});}return {name:str(q.name),duration:(q.anim_ms_end-q.anim_ms_start)/1000,tracks};});
 const compositeTracks=[];for(const c of stcs){const ids=get(c.anim_ids),refs=get(c.anim_refs);ids.forEach((id,i)=>{if(!composites.some(m=>m.parts.some(p=>p.alpha?.id===id)))return;const packed=refs[i],entry=get(c[sd[packed>>>16]])[packed&0xffff];if(entry)compositeTracks.push({name:str(c.name),id,frames:get(entry.frames).map(t=>t/1000),values:get(entry.keys).map(vector)});});}
 for(const m of materials){const l=m.layers.diffuse;if(m.blend!==0||l?.channel!==1||!l.filename)continue;const name=l.filename.replaceAll('\\','/').split('/').at(-1).toLowerCase();if(!copied.has(name)){const dds=await fs.readFile(path.join(sourceRoot,'assets/private/dds',name)),png=rgbaToPng(decodeDds(dds));await fs.writeFile(path.join(textures,name+'.png'),png);copied.set(name,{source:name,sha256:hash(dds),pngSha256:hash(png),bytes:png.length});}m.teamTexture='./source-textures/'+name+'.png';}
 profiles[key]={source:basename,sourceSha256:hash(bytes),materials,composites,compositeTracks,clips};
}
for(const [name,normal] of [['castanarex2_panels.dds',false],['castanarex2_panelsnormal.dds',true]]){const dds=await fs.readFile(path.join(sourceRoot,'assets/private/dds',name)),pixels=convertMaterialPixels(decodeDds(dds),{normal});for(let i=3;i<pixels.rgba.length;i+=4)pixels.rgba[i]=255;const png=rgbaToPng(pixels);await fs.writeFile(path.join(textures,name+'.png'),png);copied.set(name,{source:name,sha256:hash(dds),pngSha256:hash(png),bytes:png.length,normal,alpha:'opaque terrain RGB; source alpha is not transparency'});}
const result={version:2,method:'Original local M3 tracks and DDS team masks; exact DDS decoding, no painted replacement. Original assets remain unchanged.',profiles,textures:[...copied.values()]};
await fs.writeFile(path.join(output,'materials-source.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({profiles:Object.keys(profiles).length,textures:copied.size,bytes:[...copied.values()].reduce((a,b)=>a+b.bytes,0)}));
