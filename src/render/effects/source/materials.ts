import * as THREE from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {assetUrl} from '../../../assets/manifest';
import {prepareEmbeddedAssetIds} from '../../../assets/offline-pack';
import {sharedMaterialTextures} from '../../materials/shared-textures';
import {MATERIAL_ROLES,bindUnitMaterial,type PreparedUnitMaterial} from '../../materials/unit-material-loader';
import {UnitMaterialSurface} from '../../materials/unit-material-batch';
import type {SourceEffectDefinition} from './types';
import type {DisplacementResource} from './displacement';

export interface SourceMaterialResource {base:THREE.Material;prepared:PreparedUnitMaterial}
export interface SourceEffectResource {definition:SourceEffectDefinition;materials:SourceMaterialResource[];displacement:DisplacementResource[];gltf?:GLTF;displacementGltf?:GLTF}
export function sourceDependencies(def:SourceEffectDefinition){return [...new Set([...(def.glbId?[def.glbId]:[]),...(def.displacementGlb?[def.displacementGlb.id]:[]),...def.materialProfile.materials.flatMap(m=>Object.values(m.layers).flatMap(l=>l.texture?[l.texture]:l.cubeTextures??[])),...(def.displacementMaterials??[]).flatMap(m=>Object.values(m.layers).flatMap(l=>l?.texture?[l.texture]:l?.cubeTextures??[]))])];}
export async function loadSourceEffect(definition:SourceEffectDefinition):Promise<SourceEffectResource>{
 await prepareEmbeddedAssetIds(sourceDependencies(definition));
 const materials:SourceMaterialResource[]=[];
 for(const source of definition.materialProfile.materials){
  const textures:PreparedUnitMaterial['textures']={};
  for(const role of MATERIAL_ROLES){const layer=source.layers[role];if(!layer)continue;const ids=layer.cubeTextures??(layer.texture?[layer.texture]:[]);if(!ids.length)continue;
   const urls=ids.map(id=>{const url=assetUrl(id);if(!url)throw Error('Missing original combat texture: '+id);return url;});
   const texture=urls.length===6?await sharedMaterialTextures.cube(urls):await sharedMaterialTextures.image(urls[0]);
   texture.flipY=false;texture.colorSpace=['normal','alpha','alpha2','gloss','ao','environmentMask'].includes(role)?THREE.NoColorSpace:THREE.SRGBColorSpace;
   texture.wrapS=layer.flags&4?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;texture.wrapT=layer.flags&8?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;texture.needsUpdate=true;textures[role]=texture;
  }
  const base:THREE.Material=source.flags&16?new THREE.MeshBasicMaterial({color:0xffffff}):new THREE.MeshStandardMaterial({color:0xffffff,metalness:0,roughness:.8});
  base.name=source.name+'#'+source.index;base.side=source.flags&8?THREE.DoubleSide:THREE.FrontSide;base.depthWrite=!source.blend;base.transparent=!!source.blend;base.forceSinglePass=true;
  if(source.blend===4)base.blending=THREE.MultiplyBlending;
  if(source.blend===5){base.blending=THREE.CustomBlending;base.blendSrc=THREE.DstColorFactor;base.blendDst=THREE.SrcColorFactor;}
  if(base instanceof THREE.MeshStandardMaterial&&textures.normal){base.normalMap=textures.normal;base.normalScale.set(1,1);}
  const prepared={profile:definition.materialProfile,source,textures};bindUnitMaterial(base,prepared);materials.push({base,prepared});
 }
 let gltf:GLTF|undefined;
 if(definition.glbId){const url=assetUrl(definition.glbId);if(!url)throw Error('Missing original combat mesh: '+definition.glbId);const response=await fetch(url);if(!response.ok)throw Error('Could not load original combat mesh: '+definition.glbId);const bytes=await response.arrayBuffer(),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');if(sha!==definition.materialProfile.glbSha256)throw Error('Combat mesh/source mismatch: '+definition.id);
  gltf=await new GLTFLoader().parseAsync(bytes,'');gltf.scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;n.frustumCulled=false;n.castShadow=false;n.receiveShadow=false;
   const bind=(m:THREE.Material)=>{const resource=materials.find(r=>r.base.name===m.name);if(!resource)throw Error('Unbound combat surface: '+m.name);return resource.base;};n.material=Array.isArray(n.material)?n.material.map(bind):bind(n.material);
  });
 }
 const displacement:DisplacementResource[]=[];
 for(const source of definition.displacementMaterials??[]){const textures:DisplacementResource['textures']={};for(const role of ['normal','strength']as const){const layer=source.layers[role];if(!layer?.texture)continue;const url=assetUrl(layer.texture);if(!url)throw Error('Missing original displacement texture '+layer.texture);const texture=await sharedMaterialTextures.image(url);texture.flipY=false;texture.colorSpace=THREE.NoColorSpace;texture.wrapS=layer.flags&4?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;texture.wrapT=layer.flags&8?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;texture.needsUpdate=true;textures[role]=texture;}displacement.push({definition,source,textures});}
 let displacementGltf:GLTF|undefined;
 if(definition.displacementGlb){const {id,sha256}=definition.displacementGlb,url=assetUrl(id);if(!url)throw Error('Missing original displacement mesh '+id);const response=await fetch(url);if(!response.ok)throw Error('Could not load original displacement mesh '+id);const bytes=await response.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');if(hash!==sha256)throw Error('Displacement mesh/source mismatch '+id);displacementGltf=await new GLTFLoader().parseAsync(bytes,'');}
 return {definition,materials,displacement,gltf,displacementGltf};
}
/** Each draw owns source curves; immutable images are shared through independent wrappers. */
export function sourceSurface(resource:SourceMaterialResource,geometry:THREE.BufferGeometry,capacity:number,particles=false,instances=false){
 // Particle flipbooks (6) and world-Z projection (5) are effect-only coordinate
 // sources. Keep the shared unit material generator and replace these exact UV
 // expressions below; ordinary body surfaces are unaffected.
 const original=resource.prepared.source,layers=Object.fromEntries(Object.entries(original.layers).map(([role,layer])=>[role,{...layer,uv:[5,6].includes(layer.uv)?0:layer.uv}]));
 const prepared={...resource.prepared,source:{...original,layers,...(particles?{geometryVisible:true}:{})}};
 const surface=new UnitMaterialSurface(prepared,resource.base,capacity),mat=surface.material;
 if(particles){mat.side=THREE.DoubleSide;mat.transparent=true;mat.depthWrite=false;}
 mat.onBeforeCompile=(shader)=>{
  if(particles||instances)shader.vertexShader=shader.vertexShader.replace('void main() {','void main() {\nmat4 unitTransform=mat4(1.0);');
  surface.compile(shader,geometry,particles||instances);
  if(particles)shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float sourceMaterialSlot;').replace('umInstance=gl_InstanceID;','umInstance=int(sourceMaterialSlot);');
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 fxParticleUV;varying vec2 fxWorldUV;')
   .replace('umUV0=uv;',`umUV0=uv;fxParticleUV=${particles?'uv*sourceUv.zw+sourceUv.xy':'uv'};fxWorldUV=(modelMatrix*${particles||instances?'instanceMatrix*':''}vec4(transformed,1.0)).xz*vec2(1.0,-1.0)/1.4;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 fxParticleUV;varying vec2 fxWorldUV;');
  for(const [i,role]of MATERIAL_ROLES.entries()){const uv=original.layers[role]?.uv;if(uv===5||uv===6){const expression=new RegExp('(vec2 umUv'+i+'\\(\\)\\{[^}]*?vec2 uv=)umUV0');shader.fragmentShader=shader.fragmentShader.replace(expression,'$1'+(uv===6?'fxParticleUV':'fxWorldUV'));}}
  if(particles){shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 sourceColor;attribute vec4 sourceUv;attribute float sourceSegmentedUv;varying vec4 fxColor;')
   .replace('umUV0=uv;','umUV0=mix(uv,uv*sourceUv.zw+sourceUv.xy,sourceSegmentedUv);fxColor=sourceColor;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec4 fxColor;')
    .replace('#include <opaque_fragment>','outgoingLight*=fxColor.rgb;diffuseColor.a*=fxColor.a;\n#include <opaque_fragment>');
   if(prepared.source.blend===2)shader.fragmentShader=shader.fragmentShader.replace('gl_FragColor.rgb*=umData(10).x;','gl_FragColor.rgb*=umData(10).x*fxColor.a;');
  }
 };
 mat.customProgramCacheKey=()=>surface.programKey(geometry,particles||instances)+':palette-rigid:'+Number(instances)+':combat:'+Number(particles)+':'+MATERIAL_ROLES.map(role=>original.layers[role]?.uv??0).join(',');
 return surface;
}
