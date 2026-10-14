/** Source-only extraction. No existing model, material or runtime resource is rewritten. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {AnimationMixer,Box3,Matrix4,Quaternion,Vector3} from 'three';
import {adaptM3Scene} from './m3-scene.mjs';
import {normalizeBoneBindings} from './m3-animation-bindings.mjs';
import {decodeMaterialDds} from './material-dds.mjs';
import {rgbaToPng} from './dds-png.mjs';
import {convertMaterialPixels} from './m3-materials.mjs';

const argument=(name,fallback)=>process.argv.find(a=>a.startsWith(name+'='))?.slice(name.length+1)??fallback;
const sha=b=>createHash('sha256').update(b).digest('hex'),out=argument('--out','reports/local/combat-effects-20261012'),append=process.argv.includes('--append');
const parser=await import(pathToFileURL(path.resolve('.cache/visual-restoration-reader/m3-loader.js')).href);
const sourceMap=JSON.parse(await fs.readFile(out+'/source-map.json','utf8'));
const originals=JSON.parse((await fs.readFile(argument('--dependencies','tools/combat-effects-dependencies.json'),'utf8')).replace(/^\uFEFF/,''));
const known=new Map(originals.map(r=>[(r.requestedFile??r.installFile).toLowerCase(),r])),sources=new Map(),records=new Map(),profiles={},issues=[],unsupportedLayers=[];
if(append){const prior=JSON.parse(await fs.readFile('deploy/runtime/combat-effects.json','utf8'));for(const record of prior.records)records.set(record.id,record);Object.assign(profiles,JSON.parse(await fs.readFile('src/render/effects/source/catalog.json','utf8')));}
const bodyModels=new Set(sourceMap.routes.flatMap(r=>r.models.body??[]));
const unitRecords=JSON.parse(await fs.readFile('assets/private/m3-pack.json','utf8')).manifest;
const roles={diffuse:'layer_diff',normal:'layer_norm',specular:'layer_spec',emissive:'layer_emis1',emissive2:'layer_emis2',alpha:'layer_alpha1',alpha2:'layer_alpha2',decal:'layer_decal',gloss:'layer_gloss',ao:'layer_ao',environment:'layer_envi',environmentMask:'layer_envi_mask'};
async function source(file){const r=known.get(file.toLowerCase());assert.ok(r,'Unverified source '+file);const bytes=await fs.readFile(r.installFile);assert.equal(sha(bytes),r.sha256,'Changed source '+file);sources.set(file,{file:r.installFile,requestedFile:file,bytes:bytes.length,sha256:r.sha256});return bytes;}
async function immutable(file,bytes){const old=await fs.readFile(file).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});if(old){assert.equal(sha(old),sha(bytes),'Changed content-addressed resource '+file);return;}await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);}
async function asset(id,kind,ext,bytes,sourceFile){const packedSha256=sha(bytes),url='assets/combat-effects/'+id+'.'+ext,gitPath='deploy/runtime/assets/'+packedSha256+'.'+ext;const r={id,kind,status:'available',required:true,url,packedFile:'public/'+url,gitPath,bytes:bytes.length,packedSha256,sourceFile:sources.get(sourceFile)?.file??sourceFile,sourceSha256:sources.get(sourceFile)?.sha256};await immutable(gitPath,bytes);await fs.mkdir(path.dirname(r.packedFile),{recursive:true});await fs.writeFile(r.packedFile,bytes);records.set(id,r);return id;}
async function textures(filename,normal=false){const file='assets/private/dds/'+filename,b=await source(file),hash=sha(b),images=decodeMaterialDds(b),ids=[];for(const [i,image]of images.entries()){const id='combat-fx.texture.'+hash.slice(0,24)+(normal?'.normal':'')+(images.length===6?'.'+i:'');if(!records.has(id))await asset(id,'combat-effect-texture','png',rgbaToPng(normal?convertMaterialPixels(image,{normal:true}):image),file);ids.push(id);}return ids;}
const value=v=>typeof v==='number'?v:v?Object.fromEntries(['x','y','z','w','r','g','b','a'].filter(k=>typeof v[k]==='number').map(k=>[k,v[k]])):null;
const ref=v=>v?{id:v.header.id,interpolation:v.header.interpolation,flags:v.header.flags,default:value(v.default)}:null;
for(const m of sourceMap.models){
 if(append&&profiles[m.modelDataId])throw Error('Append cannot replace an existing source definition '+m.modelDataId);
 const filename=path.posix.basename(m.assetPath).toLowerCase(),file='assets/private/m3/'+filename,bytes=await source(file),s=await parser.loadM3FromFile(path.resolve(known.get(file.toLowerCase()).installFile));
 const get=r=>s.getSectionByReference(r)?.content??[],str=r=>String.fromCharCode(...get(r)).replaceAll('\0','');
 const clean=v=>{if(v===null||v===undefined)return null;if(typeof v==='number')return Number.isFinite(v)?v:null;if(typeof v!=='object')return v;if(v.header&&'default'in v)return ref(v);if('entries'in v&&'index'in v)return get(v).map(clean);if(Array.isArray(v))return v.map(clean);return Object.fromEntries(Object.entries(v).filter(([k])=>k!=='desc'&&!k.startsWith('__')).map(([k,x])=>[k,clean(x)]));};
 const layer=l=>l?{filename:str(l.color_bitmap).replaceAll('\\','/').split('/').at(-1).toLowerCase(),flags:l.flags,channel:l.color_channels,uv:l.uv_source,color:ref(l.color_value),multiply:ref(l.color_multiply),add:ref(l.color_add),brightness:ref(l.color_brightness),uvOffset:ref(l.uv_offset),uvAngle:ref(l.uv_angle),uvTiling:ref(l.uv_tiling),flipbook:{rows:l.uv_flipbook_rows,cols:l.uv_flipbook_cols,frame:ref(l.uv_flipbook_frame)},fresnel:{type:l.fresnel_type,exponent:l.fresnel_exponent,min:l.fresnel_min,maxOffset:l.fresnel_max_offset}}:null;
 const materials=get(s.model.materials_standard).map((mat,index)=>({index,name:str(mat.name),version:mat.desc.version,geometryVisible:mat.desc.version<17||!!(mat.flags&0x80000000),flags:mat.flags,blend:mat.blend_mode,alphaTest:(mat.alpha_test_threshold??0)/255,hdrEmission:mat.hdr_emis,hdrSpecular:mat.hdr_spec??1,specularity:mat.specularity??20,emissionModes:[mat.blend_mode_emis1,mat.blend_mode_emis2],layerBlend:mat.blend_mode_layer,role:'effect',layers:Object.fromEntries(Object.entries(roles).map(([role,key])=>[role,layer(get(mat[key])[0])]).filter(([,v])=>v))}));
 for(const material of materials)for(const [role,l]of Object.entries(material.layers))if(l.filename){const ids=await textures(l.filename,role==='normal');if(ids.length===6)l.cubeTextures=ids;else l.texture=ids[0];l.rawChannels=true;}
 const displacementMaterials=get(s.model.materials_displacement).map(mat=>({name:str(mat.name),strength:ref(mat.strength_factor),flags:mat.flags,priority:mat.priority,layers:{normal:layer(get(mat.layer_norm)[0]),strength:layer(get(mat.layer_strength)[0])}}));
 for(const material of displacementMaterials)for(const [role,l]of Object.entries(material.layers))if(l?.filename){const ids=await textures(l.filename,role==='normal');if(ids.length===6)l.cubeTextures=ids;else l.texture=ids[0];}
 const refs=get(s.model.material_references).map(clean),composites=get(s.model.materials_composite).map(c=>({name:str(c.name),parts:get(c.sections).map(p=>({material:{type:refs[p.material_reference_index].type,index:refs[p.material_reference_index].material_index},alpha:ref(p.alpha_factor)}))}));
 const stcs=get(s.model.sequence_transformation_collections),stgs=get(s.model.sequence_transformation_groups),sd=['sdev','sd2v','sd3v','sd4q','sdcc','sdr3','sdu8','sds6','sdu6','sds3','sdu3','sdfg','sdmb'];
 const tracks=(c,offset=0,read=get)=>{const ids=read(c?.anim_ids),refs=read(c?.anim_refs),result=[];ids.forEach((id,i)=>{const packed=refs[i],entry=read(c[sd[packed>>>16]])[packed&0xffff];if(entry)result.push({id,frames:read(entry.frames).map(t=>(t-offset)/1000),values:read(entry.keys).map(clean)});});return result;};
 const clips=get(s.model.sequences).map((q,index)=>({name:str(q.name),duration:(q.anim_ms_end-q.anim_ms_start)/1000,flags:q.flags,tracks:get(stgs[index]?.stc_indices).flatMap(ci=>tracks(stcs[ci],q.anim_ms_start))}));
 const animationSources=[];
 if(bodyModels.has(m.modelDataId)){
  const native=unitRecords.find(r=>r.sourcePath?.toLowerCase().endsWith('/'+filename));
  for(const declared of native?.additionalAnimations??[]){if(!declared.clips?.length)continue;const animationFile='assets/private/m3/'+path.posix.basename(declared.sourcePath).toLowerCase(),buffer=await fs.readFile(animationFile);assert.equal(sha(buffer),declared.sourceSha256,'Changed body animation '+animationFile);sources.set(animationFile,{file:animationFile,bytes:buffer.length,sha256:sha(buffer)});const a=await parser.loadM3FromFile(path.resolve(animationFile)),read=r=>a.getSectionByReference(r)?.content??[],nameOf=r=>String.fromCharCode(...read(r)).replaceAll('\0',''),collections=read(a.model.sequence_transformation_collections),groups=read(a.model.sequence_transformation_groups);for(const [i,q]of read(a.model.sequences).entries()){const name=nameOf(q.name);if(!declared.clips.includes(name)||clips.some(c=>c.name===name))continue;clips.push({name,duration:(q.anim_ms_end-q.anim_ms_start)/1000,flags:q.flags,tracks:read(groups[i]?.stc_indices).flatMap(ci=>tracks(collections[ci],q.anim_ms_start,read))});}animationSources.push({source:animationFile,sha256:sha(buffer)});}
 }
 const rests=get(s.model.bone_rests).map(r=>new Matrix4().fromArray(['x','y','z','w'].flatMap(k=>['x','y','z','w'].map(l=>r.matrix[k][l]))).invert());
 const bones=get(s.model.bones).map((b,i)=>{const m=rests[i],p=new Vector3(),q=new Quaternion(),scale=new Vector3();if(m)(b.parent>=0&&rests[b.parent]?rests[b.parent].clone().invert().multiply(m):m).decompose(p,q,scale);return {name:str(b.name),parent:b.parent,flags:b.flags,location:ref(b.location),rotation:ref(b.rotation),scale:ref(b.scale),...(m?{rest:{position:p.toArray(),rotation:q.toArray(),scale:scale.toArray()}}:{})};});
 let glbId,glbSha256='',meshReport=[],referenceBounds;
 if(s.model.vertices.entries&&!bodyModels.has(m.modelDataId)){
  const group=parser.buildThreeMeshesFromModel(s.model,s),adapt=adaptM3Scene(group,s,parser),meshBones=group.userData.bones??[],animations=parser.buildAnimationClips(s.model,s).filter(c=>c.tracks.length&&c.duration>0);meshReport=adapt.report;
  group.userData={sourceFile:file,sourceSha256:sha(bytes)};const renamed=normalizeBoneBindings(meshBones,animations);
  group.userData.originalBoneNames=Object.fromEntries(Object.entries(renamed).map(([a,b])=>[b,a]));
  group.traverse(n=>{if(n.isMesh){n.frustumCulled=false;n.material.userData={};}});group.updateMatrixWorld(true);
  const glb=Buffer.from(await new GLTFExporter().parseAsync(group,{binary:true,animations}));
  glbId=await asset('combat-fx.mesh.'+m.modelDataId,'combat-effect-model','glb',glb,file);glbSha256=sha(glb);
  if(['GuardianShield','HighTemplarPsiStormModel','ProtossShieldDamage','ProtossShieldRipple','ProtossShieldFull'].includes(m.modelDataId)){
   const clip=animations.find(c=>/^Stand/.test(c.name)),mixer=new AnimationMixer(group);
   if(clip){mixer.clipAction(clip).play();mixer.setTime(Math.min(.5,clip.duration));}
   group.updateMatrixWorld(true);const bounds=new Box3().setFromObject(group,true);
   referenceBounds={clip:clip?.name??clips.find(c=>/^Stand/.test(c.name))?.name??'Reference pose',seconds:Math.min(.5,clip?.duration??0),min:bounds.min.toArray(),max:bounds.max.toArray(),radius:Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x),Math.abs(bounds.min.z),Math.abs(bounds.max.z))};
   mixer.stopAllAction();mixer.uncacheRoot(group);
  }
 }
 const particles=get(s.model.particle_systems).map(clean),copies=get(s.model.particle_copies).map(clean),ribbons=get(s.model.ribbons).map(clean);
 const compositeIds=new Set(composites.flatMap(c=>c.parts.map(p=>p.alpha?.id))),compositeTracks=stcs.flatMap(c=>tracks(c).filter(t=>compositeIds.has(t.id)).map(t=>({name:str(c.name),...t})));
 const profile={source:filename,sourceSha256:sha(bytes),glbSha256,materials,composites,compositeTracks,clips,animationSources};
 profiles[m.modelDataId]={id:m.modelDataId,source:known.get(file.toLowerCase()).installFile,sourceSha256:sha(bytes),scale:m.scale,glbId,referenceBounds,materialProfile:profile,bones,materialReferences:refs,displacementMaterials,particles,copies,ribbons,projections:get(s.model.projections).map(clean),forces:get(s.model.forces).map(clean),billboards:get(s.model.billboards).map(clean),attachments:parser.buildAttachmentPoints(s.model,s)};
 for(const [i,p]of particles.entries())if(p.model_paths?.length)issues.push({model:m.modelDataId,emitter:i,kind:'model-particle-dependency',paths:p.model_paths});
 for(const [i,p]of [...particles,...ribbons].entries()){const r=refs[p.material_reference_index];if(r?.type===2)unsupportedLayers.push({model:m.modelDataId,emitter:i,kind:'screen-displacement',reference:r});else if(r?.type!==1&&!(r?.type===3&&composites[r.material_index]?.parts.every(p=>p.material.type===1)))issues.push({model:m.modelDataId,emitter:i,kind:'emitter-material',reference:r});}
 for(const row of meshReport)if(row.status==='excluded'&&row.type===2)unsupportedLayers.push({model:m.modelDataId,kind:'screen-displacement',...row});
 for(const row of meshReport)if(row.status==='excluded'&&row.type!==2)issues.push({model:m.modelDataId,kind:'mesh',...row});
 console.log(JSON.stringify({model:m.modelDataId,meshes:meshReport.filter(r=>r.status==='converted').length,particles:particles.length,ribbons:ribbons.length,clips:clips.length}));
}
await fs.mkdir('src/render/effects/source',{recursive:true});
const registry='// Generated by tools/prepare-combat-effects.mjs from pinned original M3 and DDS sources.\nexport const COMBAT_EFFECT_ASSETS = '+JSON.stringify([...records.values()].map(({id,kind,status,required,url})=>({id,kind,status,required,url})))+';\n';
await fs.writeFile('src/assets/combat-effects.ts',registry);
await fs.writeFile('src/render/effects/source/catalog.json',JSON.stringify(profiles));
await fs.writeFile('deploy/runtime/combat-effects.json',JSON.stringify({version:1,generatedSha256:sha(registry),catalogSha256:sha(JSON.stringify(profiles)),records:[...records.values()]},null,2)+'\n');
const report={models:Object.keys(profiles).length,sources:[...sources.values()],records:[...records.values()],issues,unsupportedLayers,sourceReader:'.cache/visual-restoration-reader/m3-loader.js',sourceReaderSha256:sha(await fs.readFile('.cache/visual-restoration-reader/m3-loader.js'))};
await fs.writeFile(out+'/extraction.json',JSON.stringify(report,null,2));console.log(JSON.stringify({models:report.models,sources:sources.size,resources:records.size,issues}));
if(issues.length)process.exitCode=2;
