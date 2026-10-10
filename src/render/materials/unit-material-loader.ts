import * as THREE from 'three';
import type {GLTF,GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {assetUrl} from '../../assets/manifest';
import {prepareEmbeddedAssetIds} from '../../assets/offline-pack';
import {restoreSc2Materials} from '../loaders/sc2-materials';
import {UNIT_MATERIAL_CATALOG} from './unit-material-catalog';
import type {SourceMaterial,UnitMaterialProfile} from './source-tracks';

// First five roles retain the batch-1 row contract; new channels follow the composite row.
export const MATERIAL_ROLES=['diffuse','emissive','emissive2','alpha','alpha2','specular','normal','decal','gloss','ao','environment','environmentMask'] as const;
export type MaterialRole=typeof MATERIAL_ROLES[number];
export interface PreparedUnitMaterial {profile:UnitMaterialProfile;source:SourceMaterial;textures:Partial<Record<MaterialRole,THREE.Texture>>;teamTexture?:THREE.Texture}
const prepared=new WeakMap<THREE.Material,PreparedUnitMaterial>();
export const preparedUnitMaterial=(material:THREE.Material)=>prepared.get(material);
export const bindUnitMaterial=(material:THREE.Material,description:PreparedUnitMaterial)=>prepared.set(material,description);
/** Let the existing quality and preload paths reach every custom shader sampler. */
export const unitMaterialTextures=(material:THREE.Material)=>{const p=prepared.get(material);return p?[...Object.values(p.textures),...(p.teamTexture?[p.teamTexture]:[])]:[];};
export function unitMaterialDependencies(key:string){const p=UNIT_MATERIAL_CATALOG[key];return p?[...new Set(p.materials.flatMap(m=>[...(m.teamTexture?[m.teamTexture]:[]),...Object.values(m.layers).flatMap(l=>l.texture?[l.texture]:l.cubeTextures??[])]))]:[];}

/** Remove an invalid extension pair only in the verified in-memory GLB. Source bytes stay intact. */
export function legalMaterialGlb(bytes:ArrayBuffer){
 const header=new DataView(bytes),length=header.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,length)));let changed=false;
 for(const material of json.materials??[])if(material.extensions?.KHR_materials_unlit&&material.extensions?.KHR_materials_specular){delete material.extensions.KHR_materials_specular;changed=true;}
 if(!changed)return bytes;
 const encoded=new TextEncoder().encode(JSON.stringify(json)),padded=(encoded.length+3)&~3,tail=new Uint8Array(bytes,20+length),result=new Uint8Array(20+padded+tail.length),view=new DataView(result.buffer);
 result.set(new Uint8Array(bytes,0,20));view.setUint32(8,result.length,true);view.setUint32(12,padded,true);result.fill(32,20,20+padded);result.set(encoded,20);result.set(tail,20+padded);return result.buffer;
}

/** Bind every shipped source surface by both model hash and original material index/name. */
export async function loadUnitMaterialGltf(loader:GLTFLoader,url:string,key:string):Promise<GLTF>{
 const profile=UNIT_MATERIAL_CATALOG[key];
 if(!profile)return restoreSc2Materials(await loader.loadAsync(url));
 const response=await fetch(url);if(!response.ok)throw Error('Original material model could not load: '+key);
 const bytes=await response.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);
 const sha=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(sha!==profile.glbSha256)throw Error('Original material profile/GLB hash mismatch: '+key);
 await prepareEmbeddedAssetIds(unitMaterialDependencies(key));
 const gltf=await loader.parseAsync(legalMaterialGlb(bytes),''),imageLoader=new THREE.TextureLoader(),cubeLoader=new THREE.CubeTextureLoader();
 const derivedUrl=(id:string)=>{const value=assetUrl(id);if(!value)throw Error('Original material resource missing: '+id);return value;};
 const seen=new Set<THREE.Material>(),jobs:Promise<void>[]=[];
 gltf.scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;for(const material of Array.isArray(n.material)?n.material:[n.material]){
  if(seen.has(material))continue;seen.add(material);
  const source=profile.materials.find(m=>m.name+'#'+m.index===material.name);
  const materialIndex=gltf.parser.associations.get(material)?.materials;
  const raw=materialIndex===undefined?gltf.parser.json.materials.find((m:{name:string})=>m.name===material.name):gltf.parser.json.materials[materialIndex];
  if(!source||!raw)throw Error('Unbound original material: '+key+'/'+material.name);
  material.visible=source.geometryVisible!==false;
  jobs.push((async()=>{
   const textures:PreparedUnitMaterial['textures']={};
   for(const role of MATERIAL_ROLES){
    const layer=source.layers[role];if(!layer?.filename)continue;
    const info=role==='diffuse'?raw.pbrMetallicRoughness?.baseColorTexture:role==='normal'?raw.normalTexture:role==='specular'?raw.extensions?.KHR_materials_specular?.specularColorTexture:role==='emissive'?raw.emissiveTexture:raw.extras?.sc2?.layers?.find((l:{role:string})=>l.role===role);
    let texture:THREE.Texture;
    if(layer.cubeTextures)texture=await cubeLoader.loadAsync(layer.cubeTextures.map(derivedUrl));
    else if(layer.texture)texture=await imageLoader.loadAsync(derivedUrl(layer.texture));
    else if(info?.index!==undefined)texture=(await gltf.parser.getDependency('texture',info.index) as THREE.Texture).clone();
    else if(role==='specular'&&material instanceof THREE.MeshBasicMaterial)continue;
    else if(['decal','gloss','ao','environment','environmentMask'].includes(role))continue; // Recorded source gaps only.
    else throw Error('Missing original material texture: '+key+'/'+material.name+'/'+role);
    // Embedded layers already have channel extraction. Derived RGBA is selected once in the shader.
    texture.colorSpace=['normal','alpha','alpha2','gloss','ao','environmentMask'].includes(role)?THREE.NoColorSpace:THREE.SRGBColorSpace;
    texture.flipY=false;texture.wrapS=layer.flags&4?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;texture.wrapT=layer.flags&8?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;
    texture.needsUpdate=true;textures[role]=texture;
   }
   let teamTexture:THREE.Texture|undefined;
   if(source.teamTexture){teamTexture=await imageLoader.loadAsync(derivedUrl(source.teamTexture));teamTexture.flipY=false;teamTexture.colorSpace=THREE.SRGBColorSpace;teamTexture.wrapS=textures.diffuse?.wrapS??THREE.RepeatWrapping;teamTexture.wrapT=textures.diffuse?.wrapT??THREE.RepeatWrapping;teamTexture.needsUpdate=true;}
   prepared.set(material,{profile,source,textures,teamTexture});
  })());
 }});
 await Promise.all(jobs);return gltf;
}
