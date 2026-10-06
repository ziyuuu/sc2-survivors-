/** Preview-only original M3 conversion, using the project's audited M3/material adapters. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {materialEntries,convertMaterialPixels,applyTeamColor} from './m3-materials.mjs';
import {adaptM3Scene} from './m3-scene.mjs';
import {decodeDds,rgbaToPng} from './dds-png.mjs';
const root='.cache/hero-combat-lab/original-assets',out='.cache/hero-combat-lab/upgrade-assets';
const parser=await import(pathToFileURL(path.resolve('.cache/m3-converter/m3-loader.js')).href);
const sha=b=>createHash('sha256').update(b).digest('hex');
const names=['vikingfightermissile','missileturretmissile'],models=[];
await fs.mkdir(out,{recursive:true});
const requests=new Map();
for(const name of names){
 const s=await parser.loadM3FromFile(path.resolve(root,name+'.m3'));
 const group=parser.buildThreeMeshesFromModel(s.model,s,{textureBasePath:path.resolve(root)});
 const {specs,report}=adaptM3Scene(group,s,parser);
 for(const spec of specs.values())for(const layer of Object.values(spec.layers))if(layer.filename&&spec.availableUvs.includes(layer.uv)){
  const file=layer.filename.toLowerCase();if(!/^[a-z0-9_]+\.dds$/.test(file))throw Error('Unsafe texture '+file);
  requests.set(file,{name:file,sourcePath:'mods/liberty.sc2mod/base.sc2assets/Assets/Textures/'+file});
 }
 const summary={name,bones:group.userData.bones?.length??0,geometry:report,materials:[...specs.values()].map(s=>({name:s.name,role:s.role,layers:Object.fromEntries(Object.entries(s.layers).map(([key,l])=>[key,{filename:l.filename,channel:l.channel,uv:l.uv,multiplier:l.multiplier}]))})),originalParticleSystems:s.model.particle_systems?.entries??0};
 models.push({name,s,group,specs,summary});
}
await fs.writeFile('.cache/hero-combat-lab/missile-texture-requests.json',JSON.stringify([...requests.values()],null,2));
await fs.writeFile(out+'/inspection.json',JSON.stringify(models.map(m=>m.summary),null,2));
if(process.argv.includes('--inspect')){console.log(JSON.stringify({models:models.map(m=>m.summary),requiredTextures:[...requests.keys()]}));process.exit(0);}
function unpack(b){const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));const o=20+b.readUInt32LE(12);return {j,bin:b.subarray(o+8,o+8+b.readUInt32LE(o))};}
function pack(j,bin){const str=Buffer.from(JSON.stringify(j)),json=Buffer.alloc(Math.ceil(str.length/4)*4,32);str.copy(json);const padded=Buffer.alloc(Math.ceil(bin.length/4)*4);bin.copy(padded);const b=Buffer.alloc(28+json.length+padded.length);b.write('glTF');b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(json.length,12);b.writeUInt32LE(0x4e4f534a,16);json.copy(b,20);b.writeUInt32LE(padded.length,20+json.length);b.writeUInt32LE(0x004e4942,24+json.length);padded.copy(b,28+json.length);return b;}
const sources=JSON.parse(await fs.readFile(root+'/sources.json','utf8'));
const outputs=[];
for(const {name,group,specs,summary} of models){
 group.userData={source:sources.find(s=>s.name===name+'.m3'),particleSystemsExported:false};group.updateMatrixWorld(true);
 const raw=Buffer.from(await new GLTFExporter().parseAsync(group,{binary:true}));
 const {j,bin}=unpack(raw),chunks=[bin];let length=bin.length;
 j.images=[];j.textures=[];j.samplers=[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}];
 const imageIds=new Map(),layerReport=[];
 async function embed(layer,normal=false,team=false){
  const file=layer.filename.toLowerCase(),key=file+'|'+(normal?'normal':layer.channel)+(team?'|team':'');if(imageIds.has(key))return imageIds.get(key);
  let pixels=convertMaterialPixels(decodeDds(await fs.readFile(root+'/'+file)),{normal,channel:normal?0:layer.channel});if(team)pixels=applyTeamColor(pixels,[170,180,196]);
  const img=rgbaToPng(pixels),padding=Buffer.alloc((4-length%4)%4);chunks.push(padding);length+=padding.length;
  const bv=j.bufferViews.length;j.bufferViews.push({buffer:0,byteOffset:length,byteLength:img.length});chunks.push(img);length+=img.length;
  const index=j.images.length;j.images.push({bufferView:bv,mimeType:'image/png'});j.textures.push({sampler:0,source:index});imageIds.set(key,index);return index;
 }
 function extension(name){j.extensionsUsed??=[];if(!j.extensionsUsed.includes(name))j.extensionsUsed.push(name);}
 for(const mat of j.materials??[]){
  const spec=specs.get(mat.name);if(!spec)continue;
  mat.extras={sc2:{role:spec.role,blend:spec.blend,flags:spec.flags,layers:[],teamColor:spec.blend===0&&spec.layers.diffuse?.channel===1}};
  if(spec.blend)mat.alphaMode='BLEND';else if(spec.alphaTest>0){mat.alphaMode='MASK';mat.alphaCutoff=spec.alphaTest;}
  if(spec.flags&16){extension('KHR_materials_unlit');mat.extensions??={};mat.extensions.KHR_materials_unlit={};}mat.doubleSided=!!(spec.flags&8);mat.pbrMetallicRoughness??={};mat.pbrMetallicRoughness.metallicFactor=0;
  for(const [role,layer] of Object.entries(spec.layers)){
   if(!layer.filename||!spec.availableUvs.includes(layer.uv))continue;
   const index=await embed(layer,role==='normal',role==='diffuse'&&spec.blend===0&&layer.channel===1),info={index,texCoord:layer.uv};layerReport.push({material:mat.name,role,file:layer.filename,...sources.find(s=>s.name===layer.filename.toLowerCase())});
   if(role==='diffuse')mat.pbrMetallicRoughness.baseColorTexture=info;
   else if(role==='normal')mat.normalTexture={...info,scale:1};
   else if(role==='specular'){extension('KHR_materials_specular');mat.extensions??={};mat.extensions.KHR_materials_specular={specularFactor:1,specularColorFactor:[1,1,1],specularColorTexture:info};mat.pbrMetallicRoughness.roughnessFactor=Math.max(.25,Math.min(.9,Math.pow(2/(Math.max(0,spec.specularity)+2),.25)));}
   else if(role==='emissive'){extension('KHR_materials_emissive_strength');mat.extensions??={};mat.extensions.KHR_materials_emissive_strength={emissiveStrength:Math.max(0,spec.emissiveStrength*layer.multiplier)};mat.emissiveFactor=[1,1,1];mat.emissiveTexture=info;}
   else mat.extras.sc2.layers.push({role,index,uv:layer.uv,multiplier:layer.multiplier,add:layer.add,invert:!!(layer.flags&16)});
  }
 }
 j.buffers[0].byteLength=length;j.asset.extras={previewOnly:true,particleSystemsExported:false,materialPipelineVersion:3};
 const bytes=pack(j,Buffer.concat(chunks)),file=out+'/'+name+'.glb';await fs.writeFile(file,bytes);
 outputs.push({id:'model.hero-upgrade.'+name,name,file,bytes:bytes.length,sha256:sha(bytes),original:sources.find(s=>s.name===name+'.m3'),layers:layerReport,geometry:summary.geometry,authoredEffects:'Only the rigid original missile body and original texture/material channels are converted. Exhaust, smoke and timing are authored locally.'});
}
await fs.writeFile(out+'/manifest.json',JSON.stringify(outputs,null,2));console.log(JSON.stringify(outputs.map(({id,file,bytes,sha256,geometry})=>({id,file,bytes,sha256,geometry}))));
