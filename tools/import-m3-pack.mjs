/** Local-only M3 -> animated GLB / DDS -> PNG. No image upload or archive download. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {ddsToPng} from './dds-png.mjs';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {QuaternionKeyframeTrack,AnimationClip} from 'three';
import {M3_TOOL_REVISION,M3_MODELS,M3_EFFECTS} from './m3-catalog.mjs';
import {inspectGlb} from './glb-inspect.mjs';

const provider='https://dist.sc2arcade.com/star-assets/';
const toolDir='.cache/m3-converter',privateDir='assets/private/m3';
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const dir of [toolDir,privateDir,'assets/private/dds','public/assets/animated','public/assets/effects'])await fs.mkdir(dir,{recursive:true});
async function get(url,file,validate){
 let bytes;try{bytes=await fs.readFile(file);validate(bytes);return bytes;}catch{}
 const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(`HTTP ${r.status}: ${url}`);
 bytes=Buffer.from(await r.arrayBuffer());validate(bytes);await fs.writeFile(file+'.part',bytes);await fs.rename(file+'.part',file);return bytes;
}
// Download only audited source files at a pinned revision; never execute package install scripts.
for(const file of ['src/m3-loader.js','src/structures.xml','LICENSE']){
 const bytes=await get(`https://raw.githubusercontent.com/sc2-arcade-watcher/star-tools-three-m3-loader/${M3_TOOL_REVISION}/${file}`,`${toolDir}/${path.basename(file)}.source`,b=>{if(b.length<500||b.subarray(0,100).toString().includes('<!DOCTYPE html'))throw Error('Invalid converter source');});
 let source=bytes.toString();if(file.endsWith('.js'))source=source.replace("'../vendor/GLTFExporter.js'","'three/addons/exporters/GLTFExporter.js'").replace("'xmldom'","'@xmldom/xmldom'");
 await fs.writeFile(`${toolDir}/${path.basename(file)}`,source);
}
const parser=await import(pathToFileURL(path.resolve(toolDir,'m3-loader.js')).href);
const manifest=[],failures=[];
function checkM3(b){if(b.length<24||!['43DM','33DM'].includes(b.subarray(0,4).toString()))throw Error('Invalid M3 magic/header');const index=b.readUInt32LE(4),count=b.readUInt32LE(8);if(index>=b.length||count===0||index+count*16>b.length)throw Error('Invalid M3 section table');}
async function m3(name){const file=`${privateDir}/${name}.m3`,url=provider+`models/${name}.m3`;const bytes=await get(url,file,checkM3);return {sections:await parser.loadM3FromFile(file),source:url,sourceSha256:sha(bytes)};}
const textureCache=new Map();
async function png(name){
 name=path.basename(name.replaceAll('\\','/')).toLowerCase();if(!/^[a-z0-9_. -]+\.dds$/.test(name))throw Error('Unsafe DDS name');
 if(textureCache.has(name))return textureCache.get(name);
 const input=`assets/private/dds/${name}`,output=`assets/private/dds/${name}.png`;
 const dds=await get(provider+'textures/'+encodeURIComponent(name),input,b=>{if(b.length<128||b.subarray(0,4).toString()!=='DDS '||b.readUInt32LE(4)!==124)throw Error('Invalid DDS header');});
 const bytes=ddsToPng(dds);await fs.writeFile(output,bytes);textureCache.set(name,bytes);return bytes;
}
function unpack(b){const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));const o=20+b.readUInt32LE(12);return {j,bin:b.subarray(o+8,o+8+b.readUInt32LE(o))};}
function pack(j,bin){const str=Buffer.from(JSON.stringify(j));const json=Buffer.alloc(Math.ceil(str.length/4)*4,32);str.copy(json);const padded=Buffer.alloc(Math.ceil(bin.length/4)*4);bin.copy(padded);const b=Buffer.alloc(28+json.length+padded.length);b.write('glTF');b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(json.length,12);b.writeUInt32LE(0x4e4f534a,16);json.copy(b,20);b.writeUInt32LE(padded.length,20+json.length);b.writeUInt32LE(0x004e4942,24+json.length);padded.copy(b,28+json.length);return b;}
for(const [id,name] of M3_MODELS){try{
 const {sections:s,...provenance}=await m3(name),group=parser.buildThreeMeshesFromModel(s.model,s,{textureBasePath:path.resolve('assets/private/dds')});
 const materials=parser.buildMaterialList(s.model,s),materialTextures=new Map();
 for(const [matName,set] of group.userData.matNameToMaterials??[]){const tex=materials.find(m=>m.name===matName)?.textures.find(t=>t.label==='Diffuse')?.filename;for(const material of set){material.name=matName;material.userData={};material.color.set(0xffffff);material.roughness=.8;if(tex)materialTextures.set(matName,tex);}}
 // userData contains live bones/maps in the upstream parser, which GLTF must not serialize.
 const bones=group.userData.bones??[];group.userData={source:provenance.source,attachments:parser.buildAttachmentPoints(s.model,s)};
 let clips=parser.buildAnimationClips(s.model,s).filter(c=>c.duration>0);
 // Preserve a truly static Stand pose as a valid clip, without fabricating motion.
 clips=clips.map(c=>c.tracks.length?c:new AnimationClip(c.name,c.duration,bones[0]?[new QuaternionKeyframeTrack(bones[0].name+'.quaternion',[0,c.duration],[...bones[0].quaternion.toArray(),...bones[0].quaternion.toArray()])]:[])).filter(c=>c.tracks.length);
 group.updateMatrixWorld(true);
 const raw=Buffer.from(await new GLTFExporter().parseAsync(group,{binary:true,animations:clips}));const {j,bin}=unpack(raw);const chunks=[bin];let length=bin.length;
 const imageIds=new Map();j.images=[];j.textures=[];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}];
 for(const mat of j.materials??[]){const name=materialTextures.get(mat.name);if(!name)continue;let index=imageIds.get(name);if(index===undefined){const img=await png(name);const padding=Buffer.alloc((4-length%4)%4);chunks.push(padding);length+=padding.length;const bv=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:length,byteLength:img.length});chunks.push(img);length+=img.length;index=j.images.length;j.images.push({bufferView:bv,mimeType:'image/png'});j.textures.push({sampler:0,source:index});imageIds.set(name,index);}mat.pbrMetallicRoughness.baseColorTexture={index};}
 j.buffers[0].byteLength=length;j.asset.extras={m3Source:provenance.source,converterRevision:M3_TOOL_REVISION,particleSystemsExported:false};
 const bytes=pack(j,Buffer.concat(chunks)),info=inspectGlb(bytes);if(!info.animationNames.length)throw Error('No usable animations exported');
 const packedFile=`public/assets/animated/${id}.glb`;await fs.writeFile(packedFile,bytes);
 manifest.push({id,kind:'model',packedFile,required:false,...provenance,sha256:sha(bytes),animations:info.animationNames,bones:bones.length,originalParticles:s.model.particle_systems?.entries??0});
 console.log(`${id}: ${info.animationNames.length} clips, ${bones.length} bones, ${bytes.length} bytes`);
}catch(e){failures.push({id,name,error:e.message});console.error(id,e.message);}}

// Extract exact texture references and flipbook layout from each original effect's materials/particles.
function str(s,ref){const c=s.getSectionByReference(ref)?.content;return c?String.fromCharCode(...c).replace(/\0/g,''):'';}
for(const [effectId,name] of M3_EFFECTS){try{
 const {sections:s,...provenance}=await m3(name);const mats=s.getSectionByReference(s.model.materials_standard)?.content??[];
 const refs=s.getSectionByReference(s.model.material_references)?.content??[];const particles=s.getSectionByReference(s.model.particle_systems)?.content??[];
 for(let i=0;i<mats.length;i++){const mat=mats[i];let texture;
  for(const key of ['layer_diff','layer_emis','layer_emis2']){const layer=s.getSectionByReference(mat[key])?.content[0];const p=str(s,layer?.color_bitmap);if(p){texture=path.basename(p.replaceAll('\\','/'));break;}}
  if(!texture)continue;const p=particles.find(p=>(refs[p.material_reference_index]?.material_index??p.material_reference_index)===i);
  const bytes=await png(texture),id=effectId+'.'+i,packedFile=`public/assets/effects/${id}.png`;await fs.writeFile(packedFile,bytes);
  const columns=Math.max(1,p?.uv_flipbook_cols??1),rows=Math.max(1,p?.uv_flipbook_rows??1),startFrame=p?.uv_flipbook_start_init_index??0,endFrame=Math.min(columns*rows-1,Math.max(startFrame,p?.uv_flipbook_start_stop_index??0,p?.uv_flipbook_end_init_index??0));
  manifest.push({id,kind:'effect-texture',packedFile,required:false,...provenance,textureSource:provider+'textures/'+texture.toLowerCase(),sha256:sha(bytes),sprite:{columns,rows,startFrame,endFrame},particle:{life:p?.lifespan?.default,size:p?.size?.default,colors:[p?.color_init?.default,p?.color_mid?.default,p?.color_end?.default]}});
 }
 console.log(`${effectId}: extracted original effect textures`);
}catch(e){failures.push({id:effectId,name,error:e.message});console.error(effectId,e.message);}}
await fs.writeFile('assets/private/m3-pack.json',JSON.stringify({revision:M3_TOOL_REVISION,manifest,failures},null,2));
await fs.writeFile('reports/local/m3-import.json',JSON.stringify({revision:M3_TOOL_REVISION,manifest,failures},null,2));
console.log(`Imported ${manifest.length} assets; ${failures.length} failures. Original M3/DDS remain private.`);
if(failures.some(f=>M3_MODELS.slice(0,8).some(([id])=>id===f.id)))process.exitCode=1;
