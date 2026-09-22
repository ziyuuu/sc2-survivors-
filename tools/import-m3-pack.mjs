/** Local-only M3 -> animated GLB / DDS -> PNG. No image upload or archive download. */
import {cascProvenance} from './casc-provenance.mjs';
import {replacedBySelection} from './asset-selection.mjs';
import {fetchBinary} from './fetch-binary.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {ddsToPng} from './dds-png.mjs';
import {materialEntries,materialDdsToPng,convertMaterialPixels,applyTeamColor} from './m3-materials.mjs';
import {decodeDds,rgbaToPng} from './dds-png.mjs';
import {adaptM3Scene} from './m3-scene.mjs';
import {DOMParser} from '@xmldom/xmldom';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {QuaternionKeyframeTrack,AnimationClip,Group,Mesh,PlaneGeometry,MeshStandardMaterial} from 'three';
import {M3_TOOL_REVISION,M3_MODELS,M3_EFFECTS,EXPANSION_MODELS} from './m3-catalog.mjs';
import {inspectGlb} from './glb-inspect.mjs';

const provider='https://dist.sc2arcade.com/star-assets/';
const toolDir='.cache/m3-converter',privateDir='assets/private/m3';
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const dir of [toolDir,privateDir,'assets/private/dds','public/assets/animated','public/assets/effects'])await fs.mkdir(dir,{recursive:true});
async function get(url,file,validate){
 let bytes;try{bytes=await fs.readFile(file);validate(bytes);return bytes;}catch{}
 bytes=await fetchBinary(url,120);validate(bytes);await fs.writeFile(file+'.part',bytes);await fs.rename(file+'.part',file);return bytes;
}
// Download only audited source files at a pinned revision; never execute package install scripts.
for(const file of ['src/m3-loader.js','src/structures.xml','LICENSE']){
 const bytes=await get(`https://raw.githubusercontent.com/sc2-arcade-watcher/star-tools-three-m3-loader/${M3_TOOL_REVISION}/${file}`,`${toolDir}/${path.basename(file)}.source`,b=>{if(b.length<500||b.subarray(0,100).toString().includes('<!DOCTYPE html'))throw Error('Invalid converter source');});
 let source=bytes.toString();if(file.endsWith('.js'))source=source.replace("'../vendor/GLTFExporter.js'","'three/addons/exporters/GLTFExporter.js'").replace("'xmldom'","'@xmldom/xmldom'");
 await fs.writeFile(`${toolDir}/${path.basename(file)}`,source);
}
const parser=await import(pathToFileURL(path.resolve(toolDir,'m3-loader.js')).href);
const selected=new Set(process.argv.slice(2)),matches=id=>!selected.size||selected.has(id);
let previous={manifest:[],failures:[]};if(selected.size){try{previous=JSON.parse(await fs.readFile('assets/private/m3-pack.json','utf8'));}catch{}}
const manifest=previous.manifest.filter(a=>!replacedBySelection(a.id,selected)),failures=previous.failures.filter(a=>!replacedBySelection(a.id,selected));
function checkM3(b){if(b.length<24||!['43DM','33DM'].includes(b.subarray(0,4).toString()))throw Error('Invalid M3 magic/header');const index=b.readUInt32LE(4),count=b.readUInt32LE(8);if(index>=b.length||count===0||index+count*16>b.length)throw Error('Invalid M3 section table');}
async function m3(name){const file=`${privateDir}/${name}.m3`,url=provider+`models/${name}.m3`;const bytes=await get(url,file,checkM3);return {sections:await parser.loadM3FromFile(file),source:url,sourceSha256:sha(bytes),...cascProvenance(file,bytes)};}
const textureCache=new Map();
async function png(name,options={}){
 name=path.basename(name.replaceAll('\\','/')).toLowerCase();if(!/^[a-z0-9_. -]+\.dds$/.test(name))throw Error('Unsafe DDS name');
 const key=name+'|'+(options.normal?'normal':options.channel??0);if(textureCache.has(key))return textureCache.get(key);
 const input=`assets/private/dds/${name}`,output=`assets/private/dds/${name}${options.normal?'.normal':options.channel>=2?'.channel'+options.channel:''}.png`;
 const dds=await get(provider+'textures/'+encodeURIComponent(name),input,b=>{if(b.length<128||b.subarray(0,4).toString()!=='DDS '||b.readUInt32LE(4)!==124)throw Error('Invalid DDS header');});
 const bytes=options.normal||options.channel>=2?materialDdsToPng(dds,options):ddsToPng(dds);await fs.writeFile(output,bytes);textureCache.set(key,bytes);return bytes;
}
function unpack(b){const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));const o=20+b.readUInt32LE(12);return {j,bin:b.subarray(o+8,o+8+b.readUInt32LE(o))};}
function pack(j,bin){const str=Buffer.from(JSON.stringify(j));const json=Buffer.alloc(Math.ceil(str.length/4)*4,32);str.copy(json);const padded=Buffer.alloc(Math.ceil(bin.length/4)*4);bin.copy(padded);const b=Buffer.alloc(28+json.length+padded.length);b.write('glTF');b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(json.length,12);b.writeUInt32LE(0x4e4f534a,16);json.copy(b,20);b.writeUInt32LE(padded.length,20+json.length);b.writeUInt32LE(0x004e4942,24+json.length);padded.copy(b,28+json.length);return b;}
const modelDefinitions=new Map();
await fs.mkdir('.cache/sc2-data',{recursive:true});
for(const layer of ['liberty','swarm','void'])await get('https://raw.githubusercontent.com/Joshua-Leibold/SC2Data/fbbd6429b1eb6978c78a092dc68ba09029d03171/mods/'+layer+'.sc2mod/base.sc2data/gamedata/modeldata.xml','.cache/sc2-data/'+layer+'-modeldata.xml',b=>{if(!b.toString().includes('<Catalog'))throw Error('Invalid ModelData XML');});
for(const layer of ['liberty','swarm','void']){try{const doc=new DOMParser().parseFromString(await fs.readFile('.cache/sc2-data/'+layer+'-modeldata.xml','utf8'),'text/xml');for(const n of Array.from(doc.getElementsByTagName('CModel'))){const id=n.getAttribute('id');if(!id)continue;const prev=modelDefinitions.get(id)??{};const scale=Array.from(n.childNodes).find(n=>n.nodeName==='ScaleMin')?.getAttribute('value');modelDefinitions.set(id,{parent:n.getAttribute('parent')||prev.parent,scale:scale?Number(scale.split(',')[0]):prev.scale});}}catch{}}
function sourceScale(id){const expansion=EXPANSION_MODELS.find(a=>a.id===id);if(expansion?.sourceScale)return Number(expansion.sourceScale.split(',')[0]);const names={marine:'Marine',marauder:'Marauder',hydralisk:'Hydralisk',hellion:'Hellion',tank:'SiegeTank',medivac:'Medivac',zergling:'Zergling',roach:'Roach',baneling:'Baneling',ravager:'Ravager',scv:'SCV',drone:'Drone'};let name=names[id.replace('model.','').split('.')[0]];for(let n=0;name&&n<12;n++){const d=modelDefinitions.get(name);if(!d)break;if(d.scale>0)return d.scale;name=d.parent;}return name?1:undefined;}
async function layerPixels(layer,normal=false){const name=layer.filename.toLowerCase(),file='assets/private/dds/'+name;const bytes=await get(provider+'textures/'+encodeURIComponent(name),file,b=>{if(b.length<128||b.subarray(0,4).toString()!=='DDS ')throw Error('Invalid DDS '+name);});return convertMaterialPixels(decodeDds(bytes),{normal,channel:normal?0:layer.channel});}
async function extraAnimations(id,base){
 const names={'model.marine':'marine_swarmanims','model.hellion':'hellion_swarmanims','model.tank':'tank_swarmanims','model.baneling':'baneling_voidanims'},name=names[id];if(!name)return {clips:[],reports:[]};
 const source=provider+'models/'+name+'.m3a',file=privateDir+'/'+name+'.m3a';
 try{const bytes=await get(source,file,checkM3),s=await parser.loadM3FromFile(file),str=(s,r)=>String.fromCharCode(...(s.getSectionByReference(r)?.content??[])).replace(/\0/g,'');
  const original=new Map();for(const b of base.getSectionByReference(base.model.bones)?.content??[])for(const [key,property] of [['location','position'],['rotation','quaternion'],['scale','scale']])original.set(b[key].header.id,{name:str(base,b.name),property});
  const binding=new Map();for(const b of s.getSectionByReference(s.model.bones)?.content??[])for(const [key,property] of [['location','position'],['rotation','quaternion'],['scale','scale']]){const match=original.get(b[key].header.id);if(match&&match.property===property)binding.set(str(s,b.name)+'.'+property,match.name+'.'+property);}
  const clips=parser.buildAnimationClips(s.model,s).filter(c=>c.tracks.length&&c.tracks.every(t=>binding.has(t.name)));for(const c of clips)for(const t of c.tracks)t.name=binding.get(t.name);
  return {clips,reports:[{source,sha256:sha(bytes),clips:clips.map(c=>c.name),binding:clips.length?'matched original animation header IDs':'rejected: incomplete binding to current base skeleton',usedForCombat:false}]};
 }catch(e){return {clips:[],reports:[{source,status:'missing',error:e.message}]};}
}
for(const [id,name] of M3_MODELS.filter(([id])=>matches(id))){try{
 const {sections:s,...provenance}=await m3(name);let group,specs,geometryReport;
 if(!s.model.vertices.entries&&s.model.projections.entries&&s.model.materials_splatterrainbake.entries){
  group=new Group();group.rotation.x=-Math.PI/2;specs=new Map();geometryReport=[];const mats=materialEntries(s,s.model.materials_splatterrainbake);
  for(const projection of s.getSectionByReference(s.model.projections).content){const ref=s.getSectionByReference(s.model.material_references).content[projection.material_reference_index],spec=mats[ref.material_index];if(ref.type!==9||!spec)throw Error('Unsupported original projection');const left=projection.box_offset_x_left.default,right=projection.box_offset_x_right.default,front=projection.box_offset_y_front.default,back=projection.box_offset_y_back.default,key=spec.name+'#projection';const geo=new PlaneGeometry(right-left,back-front);geo.translate((right+left)/2,(back+front)/2,.025);const mat=new MeshStandardMaterial({transparent:true,depthWrite:false});mat.name=key;const mesh=new Mesh(geo,mat);mesh.userData={sc2Role:'effect'};group.add(mesh);specs.set(key,{...spec,blend:1,role:'effect',availableUvs:[0]});geometryReport.push({type:9,role:'original-ground-projection',status:'converted',bounds:[left,right,front,back]});}
 }else {group=parser.buildThreeMeshesFromModel(s.model,s,{textureBasePath:path.resolve('assets/private/dds')});({specs,report:geometryReport}=adaptM3Scene(group,s,parser));}
 const cliffMaterial=name.startsWith('cliffmade13_')?'labcliff1_material':name.startsWith('cliffnatural0ex1_')?'marsaraex2_cliff0_material':name.startsWith('cliffmade0ex1_')?'marsaraex2_cliff1_material':null;
 if(id.startsWith('model.map.')&&cliffMaterial){const materialModel=await m3(cliffMaterial),materials=materialEntries(materialModel.sections);if(materials.length!==1)throw Error('Unexpected original cliff material count');for(const [key,spec] of specs)specs.set(key,{...spec,...materials[0],availableUvs:spec.availableUvs,role:spec.role});}

 // userData contains live bones/maps in the upstream parser, which GLTF must not serialize.
 const bones=group.userData.bones??[];group.userData={source:provenance.source,sc2ModelScale:sourceScale(id),attachments:parser.buildAttachmentPoints(s.model,s)};
 const additional=await extraAnimations(id,s);let clips=[...parser.buildAnimationClips(s.model,s),...additional.clips].filter(c=>c.duration>0);
 const clipSources=clips.map(c=>({name:c.name,source:additional.clips.includes(c)?additional.reports[0]?.source:provenance.source,duration:c.duration,tracks:c.tracks.length}));
 // Preserve a truly static Stand pose as a valid clip, without fabricating motion.
 clips=clips.map(c=>c.tracks.length?c:new AnimationClip(c.name,c.duration,bones[0]?[new QuaternionKeyframeTrack(bones[0].name+'.quaternion',[0,c.duration],[...bones[0].quaternion.toArray(),...bones[0].quaternion.toArray()])]:[])).filter(c=>c.tracks.length);
 group.updateMatrixWorld(true);
 const raw=Buffer.from(await new GLTFExporter().parseAsync(group,{binary:true,animations:clips}));const {j,bin}=unpack(raw);const chunks=[bin];let length=bin.length;
 const imageIds=new Map();j.images=[];j.textures=[];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}];
 const layerReport=[];
 const embedBytes=(key,img)=>{let index=imageIds.get(key);if(index!==undefined)return index;const padding=Buffer.alloc((4-length%4)%4);chunks.push(padding);length+=padding.length;const bv=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:length,byteLength:img.length});chunks.push(img);length+=img.length;index=j.images.length;j.images.push({bufferView:bv,mimeType:'image/png'});j.textures.push({sampler:0,source:index});imageIds.set(key,index);return index;};
 const embed=async(layer,normal=false,team=false)=>{const key=layer.filename.toLowerCase()+'|'+(normal?'normal':layer.channel)+(team?'|team:'+id.split('.')[1]:'');if(imageIds.has(key))return imageIds.get(key);let pixels=await layerPixels(layer,normal);if(team)pixels=applyTeamColor(pixels,(['marine','marauder','hellion','tank','medivac','scv','elite','hero'].includes(id.split('.')[1]))?[35,92,194]:[137,55,51]);return embedBytes(key,rgbaToPng(pixels));};
 const extension=name=>{j.extensionsUsed??=[];if(!j.extensionsUsed.includes(name))j.extensionsUsed.push(name);};
 for(const mat of j.materials??[]){const spec=specs.get(mat.name);if(!spec)continue;const report={name:mat.name,index:spec.index,role:spec.role,type:1,blend:spec.blend,layers:[],unsupported:[]};
  mat.extras={sc2:{role:spec.role,blend:spec.blend,flags:spec.flags,layers:[],teamColor:spec.blend===0&&spec.layers.diffuse?.channel===1}};
  if(spec.blend){mat.alphaMode='BLEND';}else if(spec.alphaTest>0){mat.alphaMode='MASK';mat.alphaCutoff=spec.alphaTest;}
  if(spec.flags&16){extension('KHR_materials_unlit');mat.extensions??={};mat.extensions.KHR_materials_unlit={};}mat.doubleSided=!!(spec.flags&8);mat.pbrMetallicRoughness??={};mat.pbrMetallicRoughness.metallicFactor=0;
  for(const [role,layer] of Object.entries(spec.layers)){
   if(!layer.filename)continue;
   if(!spec.availableUvs.includes(layer.uv)){report.unsupported.push({role,reason:'Unavailable UV source',...layer});continue;}
   const index=await embed(layer,role==='normal',role==='diffuse'&&!id.startsWith('model.map.')&&spec.blend===0&&layer.channel===1),info={index,texCoord:layer.uv};report.layers.push({role,...layer,source:provider+'textures/'+layer.filename.toLowerCase()});
   if(role==='diffuse')mat.pbrMetallicRoughness.baseColorTexture=info;
   else if(role==='normal')mat.normalTexture={...info,scale:1};
   else if(role==='specular'){extension('KHR_materials_specular');mat.extensions??={};mat.extensions.KHR_materials_specular={specularFactor:1,specularColorFactor:[1,1,1],specularColorTexture:info};mat.pbrMetallicRoughness.roughnessFactor=Math.max(.25,Math.min(.9,Math.pow(2/(Math.max(0,spec.specularity)+2),.25)));}
   else if(role==='emissive'){extension('KHR_materials_emissive_strength');mat.extensions??={};mat.extensions.KHR_materials_emissive_strength={emissiveStrength:Math.max(0,spec.emissiveStrength*layer.multiplier)};mat.emissiveFactor=[1,1,1];mat.emissiveTexture=info;}
   else mat.extras.sc2.layers.push({role,index,uv:layer.uv,multiplier:layer.multiplier,add:layer.add,invert:!!(layer.flags&16)});
  }
  layerReport.push(report);
 }
 j.buffers[0].byteLength=length;j.asset.extras={m3Source:provenance.source,converterRevision:M3_TOOL_REVISION,particleSystemsExported:false,materialPipelineVersion:3};
 const bytes=pack(j,Buffer.concat(chunks)),info=inspectGlb(bytes);if(!info.animationNames.length&&!id.startsWith('model.terrain.')&&!id.startsWith('model.loot.')&&!id.startsWith('model.map.'))throw Error('No usable animations exported');
 const packedFile=`public/assets/animated/${id}.glb`;await fs.writeFile(packedFile,bytes);
 manifest.push({id,kind:'model',packedFile,required:false,materialPipelineVersion:3,materials:layerReport,geometry:geometryReport,clipSources,additionalAnimations:additional.reports,verification:{bytes:true,bindings:true,humanVisual:false},...provenance,sha256:sha(bytes),animations:info.animationNames,bones:bones.length,originalParticles:s.model.particle_systems?.entries??0});
 console.log(`${id}: ${info.animationNames.length} clips, ${bones.length} bones, ${bytes.length} bytes`);
}catch(e){failures.push({id,name,error:e.message});console.error(id,e.message);}}

// Extract exact texture references and flipbook layout from each original effect's materials/particles.
function str(s,ref){const c=s.getSectionByReference(ref)?.content;return c?String.fromCharCode(...c).replace(/\0/g,''):'';}
for(const [effectId,name] of M3_EFFECTS.filter(([id])=>matches(id))){try{
 const {sections:s,...provenance}=await m3(name);const mats=s.getSectionByReference(s.model.materials_standard)?.content??[];
 const refs=s.getSectionByReference(s.model.material_references)?.content??[];const particles=s.getSectionByReference(s.model.particle_systems)?.content??[];
 for(let i=0;i<mats.length;i++){const mat=mats[i];let texture;
  for(const key of ['layer_diff','layer_emis1','layer_emis2']){const layer=s.getSectionByReference(mat[key])?.content[0];const p=str(s,layer?.color_bitmap);if(p){texture=path.basename(p.replaceAll('\\','/'));break;}}
  if(!texture)continue;const p=particles.find(p=>(refs[p.material_reference_index]?.material_index??p.material_reference_index)===i);
  let bytes;try{bytes=await png(texture);}catch(e){failures.push({id:effectId+'.'+i,name:texture,error:e.message});continue;}const id=effectId+'.'+i,packedFile=`public/assets/effects/${id}.png`;await fs.writeFile(packedFile,bytes);
  const columns=Math.max(1,p?.uv_flipbook_cols??1),rows=Math.max(1,p?.uv_flipbook_rows??1),startFrame=p?.uv_flipbook_start_init_index??0,endFrame=Math.min(columns*rows-1,Math.max(startFrame,p?.uv_flipbook_start_stop_index??0,p?.uv_flipbook_end_init_index??0));
  manifest.push({id,kind:'effect-texture',packedFile,required:false,...provenance,textureSource:provider+'textures/'+texture.toLowerCase(),textureProvenance:cascProvenance('assets/private/dds/'+texture.toLowerCase()),sha256:sha(bytes),sprite:{columns,rows,startFrame,endFrame},particle:{life:p?.lifespan?.default,size:p?{x:p.size?.default?.x,y:p.size?.default?.y,z:p.size?.default?.z}:undefined,colors:[p?.color_init?.default,p?.color_mid?.default,p?.color_end?.default].map(c=>c?{r:c.r,g:c.g,b:c.b,a:c.a}:null)}});
 }
 console.log(`${effectId}: extracted original effect textures`);
}catch(e){failures.push({id:effectId,name,error:e.message});console.error(effectId,e.message);}}
await fs.writeFile('assets/private/m3-pack.json',JSON.stringify({revision:M3_TOOL_REVISION,manifest,failures},null,2));
await fs.writeFile('reports/local/m3-import.json',JSON.stringify({revision:M3_TOOL_REVISION,manifest,failures},null,2));
console.log(`Imported ${manifest.length} assets; ${failures.length} failures. Original M3/DDS remain private.`);
if(failures.some(f=>M3_MODELS.slice(0,8).some(([id])=>id===f.id)))process.exitCode=1;
