/** Read source semantics only. Does not convert or overwrite runtime resources. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {DOMParser} from '@xmldom/xmldom';
const revision='ee0eff037e2e40d2aad72f4f856af0710b8a44e5';
const cache=path.resolve('.cache/visual-restoration-reader'),out='reports/local/visual-restoration-20261006';
await fs.mkdir(cache,{recursive:true});await fs.mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),reader=[];
for(const name of ['m3-loader.js','structures.xml','LICENSE']){
 const file=path.join(cache,name),sourceFile=file+'.source';
 let source;try{source=await fs.readFile(sourceFile);}catch{
  try{source=await fs.readFile(file);if(name==='m3-loader.js')source=Buffer.from(source.toString().replace("'three/addons/exporters/GLTFExporter.js'","'../vendor/GLTFExporter.js'").replace("'@xmldom/xmldom'","'xmldom'"));}catch{
   const response=await fetch(`https://raw.githubusercontent.com/sc2-arcade-watcher/star-tools-three-m3-loader/${revision}/${name==='LICENSE'?'':'src/'}${name}`);if(!response.ok)throw Error(`Missing pinned reader ${name}`);source=Buffer.from(await response.arrayBuffer());
  }await fs.writeFile(sourceFile,source);
 }
 reader.push({name,revision,sha256:hash(source),bytes:source.length});
 const patched=name==='m3-loader.js'?source.toString().replace("'../vendor/GLTFExporter.js'","'three/addons/exporters/GLTFExporter.js'").replace("'xmldom'","'@xmldom/xmldom'"):source;
 await fs.writeFile(file,patched);
}
const {loadM3FromFile}=await import(pathToFileURL(path.join(cache,'m3-loader.js')).href);
const file='assets/private/m3/immortal_ex2.m3',bytes=await fs.readFile(file),sections=await loadM3FromFile(file);
const get=r=>sections.getSectionByReference(r)?.content??[],str=r=>String.fromCharCode(...get(r)).replaceAll('\0','');
const vector=v=>typeof v==='number'?v:v?Object.fromEntries(['x','y','z','w','r','g','b','a'].filter(k=>typeof v[k]==='number').map(k=>[k,v[k]])):null;
const ref=r=>r?{id:r.header?.id,flags:r.header?.flags,interpolation:r.header?.interpolation,default:vector(r.default),null:vector(r.null)}:null;
const layer=l=>l?{filename:str(l.color_bitmap),flags:l.flags,channel:l.color_channels,uv:l.uv_source,color:ref(l.color_value),multiply:ref(l.color_multiply),add:ref(l.color_add),uvOffset:ref(l.uv_offset),uvAngle:ref(l.uv_angle),uvTiling:ref(l.uv_tiling),fresnel:{type:l.fresnel_type,exponent:l.fresnel_exponent,min:l.fresnel_min,maxOffset:l.fresnel_max_offset}}:null;
const roles={diffuse:'layer_diff',emissive:'layer_emis1',emissive2:'layer_emis2',alpha:'layer_alpha1',alpha2:'layer_alpha2'};
const materials=get(sections.model.materials_standard).map((m,index)=>({index,name:str(m.name),flags:m.flags,blend:m.blend_mode,hdrEmission:m.hdr_emis,hdrSpecular:m.hdr_spec,specularity:m.specularity,layers:Object.fromEntries(Object.entries(roles).map(([role,k])=>[role,layer(get(m[k])[0])]))}));
const materialReferences=get(sections.model.material_references);
const composites=get(sections.model.materials_composite).map(m=>({name:str(m.name),parts:get(m.sections).map(p=>{const r=materialReferences[p.material_reference_index];return{materialReference:p.material_reference_index,material:{type:r.type,index:r.material_index},alpha:ref(p.alpha_factor)};})}));
const stcs=get(sections.model.sequence_transformation_collections),stgs=get(sections.model.sequence_transformation_groups),sd=['sdev','sd2v','sd3v','sd4q','sdcc','sdr3','sdu8','sds6','sdu6','sds3','sdu3','sdfg','sdmb'];
const materialRefs=new Set(materials.flatMap(m=>Object.values(m.layers).filter(Boolean).flatMap(l=>[l.color,l.multiply,l.add,l.uvOffset,l.uvAngle,l.uvTiling].filter(Boolean).map(r=>r.id))));
for(const c of composites)for(const p of c.parts)if(p.alpha)materialRefs.add(p.alpha.id);
const sequences=get(sections.model.sequences).map((q,index)=>{
 const tracks=[];
 for(const ci of get(stgs[index]?.stc_indices)){
  const c=stcs[ci],ids=get(c.anim_ids),refs=get(c.anim_refs);
  ids.forEach((id,i)=>{if(!materialRefs.has(id))return;const packed=refs[i],kind=sd[packed>>>16],entry=get(c[kind])[packed&0xffff];if(!entry)return;tracks.push({id,kind,concurrent:!!c.concurrent,collection:str(c.name),frames:get(entry.frames).map(t=>(t-q.anim_ms_start)/1000),values:get(entry.keys).map(vector)});});
 }
 return {name:str(q.name),startMs:q.anim_ms_start,endMs:q.anim_ms_end,duration:(q.anim_ms_end-q.anim_ms_start)/1000,tracks};
});
const compositeTracks=[];for(const c of stcs){const ids=get(c.anim_ids),refs=get(c.anim_refs);ids.forEach((id,i)=>{if(!composites.some(m=>m.parts.some(p=>p.alpha?.id===id)))return;const packed=refs[i],entry=get(c[sd[packed>>>16]])[packed&0xffff];if(entry)compositeTracks.push({name:str(c.name),id,frames:get(entry.frames).map(t=>t/1000),values:get(entry.keys).map(vector)});});}
const actorFiles=['assets/private/actor-source/mods/liberty.sc2mod/base.sc2data/GameData/ActorData.xml','assets/private/actor-source/mods/void.sc2mod/base.sc2data/GameData/ActorData.xml'];
const actors=[];for(const af of actorFiles){const b=await fs.readFile(af),doc=new DOMParser().parseFromString(b.toString(),'text/xml');actors.push({file:af,sha256:hash(b),immortal:[...doc.getElementsByTagName('CActorUnit')].filter(n=>n.getAttribute('id')==='Immortal').flatMap(n=>[...n.getElementsByTagName('On')].map(x=>({terms:x.getAttribute('Terms'),send:x.getAttribute('Send')})))});}
const lightFile='assets/private/maps/KairosJunctionLE/Base.SC2Data/GameData/LightData.xml',lightBytes=await fs.readFile(lightFile),lightDoc=new DOMParser().parseFromString(lightBytes.toString(),'text/xml');
const sourceLight={file:lightFile,sha256:hash(lightBytes),ambient:lightDoc.getElementsByTagName('AmbientColor')[0]?.getAttribute('value'),parameters:Object.fromEntries([...lightDoc.getElementsByTagName('Param')].map(n=>[n.getAttribute('index'),Number(n.getAttribute('value'))]))};
const report={method:'Pinned original local M3 material refs, composite alpha and material animation tracks; source Actor Cover events and original Kairos MarSaraEx2 lighting. No runtime asset regeneration or native-SC2 visual equivalence claim.',reader,source:{file,sha256:hash(bytes),bytes:bytes.length},materials,composites,compositeTracks,sequences,actors,sourceLight};
await fs.writeFile(out+'/source-semantics.json',JSON.stringify(report,null,2));
const bodyProfiles=[];
const sourcePack=JSON.parse(await fs.readFile('assets/private/m3-pack.json','utf8'));
for(const id of ['model.marine','model.marauder','model.tank','model.roach','model.zealot','model.hero.raynor','model.hero.fenix']){
 const record=sourcePack.manifest.find(a=>a.id===id);if(!record)continue;
 const basename=(record.sourcePath??record.source).replaceAll('\\','/').split('/').at(-1).toLowerCase();
 let originalFile='assets/private/m3/'+basename;
 try{const data=await fs.readFile(originalFile),s=await loadM3FromFile(originalFile),getS=r=>s.getSectionByReference(r)?.content??[],textS=r=>String.fromCharCode(...getS(r)).replaceAll('\0','');bodyProfiles.push({id,sourceSha256:hash(data),materials:getS(s.model.materials_standard).map((m,index)=>({name:textS(m.name)+'#'+index,specularity:m.specularity,hdrSpecular:m.hdr_spec,blend:m.blend_mode}))});}catch(error){bodyProfiles.push({id,gap:String(error.message)});}
}
bodyProfiles.push({id:'model.immortal',sourceSha256:hash(bytes),materials:materials.map(m=>({name:m.name+'#'+m.index,specularity:m.specularity,hdrSpecular:m.hdrSpecular,blend:m.blend}))});
const profile={version:1,sourceSha256:hash(bytes),materials,composites,compositeTracks,clips:sequences.filter(q=>/^(Stand|Walk|Attack|Birth|Cover)/i.test(q.name)).map(q=>({name:q.name,duration:q.duration,tracks:q.tracks})),sourceLight,bodyProfiles};
await fs.mkdir('preview/visual-restoration-20261006',{recursive:true});await fs.writeFile('preview/visual-restoration-20261006/source-semantics.json',JSON.stringify(profile,null,2));
console.log(JSON.stringify({source:report.source,materials:materials.map(m=>({name:m.name,diffuse:m.layers.diffuse?.filename,alpha:m.layers.alpha?.multiply,emissiveDefault:m.layers.emissive?.multiply?.default})),clips:sequences.filter(q=>/^(Stand$|Cover|Birth)/i.test(q.name)).map(q=>({name:q.name,tracks:q.tracks.map(t=>({id:t.id,kind:t.kind,frames:t.frames,values:t.values}))}))},null,2));
