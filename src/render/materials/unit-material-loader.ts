import * as THREE from 'three';
import type {GLTF,GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {restoreSc2Materials} from '../loaders/sc2-materials';
import {UNIT_MATERIAL_PROFILES} from './unit-material-profiles';
import type {SourceMaterial,UnitMaterialProfile} from './source-tracks';

export const MATERIAL_ROLES=['diffuse','emissive','emissive2','alpha','alpha2'] as const;
export interface PreparedUnitMaterial {profile:UnitMaterialProfile;source:SourceMaterial;textures:Partial<Record<typeof MATERIAL_ROLES[number],THREE.Texture>>}
const prepared=new WeakMap<THREE.Material,PreparedUnitMaterial>();
export const preparedUnitMaterial=(material:THREE.Material)=>prepared.get(material);
export const bindUnitMaterial=(material:THREE.Material,description:PreparedUnitMaterial)=>prepared.set(material,description);
/** Let the existing quality and preload paths reach custom shader samplers too. */
export const unitMaterialTextures=(material:THREE.Material)=>Object.values(prepared.get(material)?.textures??{});

/** Four immutable GLBs only. Reject stale metadata instead of guessing a material binding. */
export async function loadUnitMaterialGltf(loader:GLTFLoader,url:string,key:string):Promise<GLTF>{
 const profile=UNIT_MATERIAL_PROFILES[key];
 if(!profile)return restoreSc2Materials(await loader.loadAsync(url));
 const response=await fetch(url);if(!response.ok)throw Error('Original material model could not load: '+key);
 const bytes=await response.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);
 const sha=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(sha!==profile.glbSha256)throw Error('Original material profile/GLB hash mismatch: '+key);
 const gltf=await loader.parseAsync(bytes,'');
 const seen=new Set<THREE.Material>(),jobs:Promise<void>[]=[];
 gltf.scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;for(const material of Array.isArray(n.material)?n.material:[n.material]){
  if(seen.has(material))continue;seen.add(material);
  const source=profile.materials.find(m=>m.name+'#'+m.index===material.name);
  const raw=gltf.parser.json.materials.find((m:{name:string})=>m.name===material.name);
  if(!source||!raw)throw Error('Unbound original material: '+key+'/'+material.name);
  jobs.push((async()=>{
   const textures:PreparedUnitMaterial['textures']={};
   for(const role of MATERIAL_ROLES){
    const layer=source.layers[role];if(!layer?.filename)continue;
    const info=role==='diffuse'?raw.pbrMetallicRoughness?.baseColorTexture:role==='emissive'?raw.emissiveTexture:raw.extras?.sc2?.layers?.find((l:{role:string})=>l.role===role);
    if(!info)throw Error('Missing original material texture: '+key+'/'+material.name+'/'+role);
    // Embedded images already contain the original M3 channel selection. Do not extract it twice.
    const texture=(await gltf.parser.getDependency('texture',info.index) as THREE.Texture).clone();
    texture.colorSpace=role.startsWith('alpha')?THREE.NoColorSpace:THREE.SRGBColorSpace;
    texture.wrapS=layer.flags&4?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;
    texture.wrapT=layer.flags&8?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;
    texture.needsUpdate=true;textures[role]=texture;
   }
   prepared.set(material,{profile,source,textures});
  })());
 }});
 await Promise.all(jobs);return gltf;
}
