import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import type {CampaignTheme} from '../../data/campaign-landscape';
import {MAP_VISUAL_PROFILES} from './map-visual-profile';
import {bindSceneTextures} from '../materials/scene-textures';
import {copySourceDepth} from '../materials/posed-depth';
import type {LandscapeResources} from './campaign-ground';

/** These adapters own cloned display materials; the source glTF and its source-depth binding stay intact. */
export async function prepareEnvironmentMaterials(g:GLTF,theme:CampaignTheme,coating:THREE.Texture,resources:LandscapeResources){
 const pairs=new Map<THREE.Material,THREE.Material>(),samplers=await g.parser.getDependencies('texture') as THREE.Texture[];let emissionRepairs=0;
 const rawMaterials=new Set<THREE.Material>();g.scene.traverse(n=>{if(n instanceof THREE.Mesh)for(const m of Array.isArray(n.material)?n.material:[n.material])rawMaterials.add(m);});
 for(const raw of rawMaterials){
  const material=raw.clone();material.onBeforeCompile=raw.onBeforeCompile;material.customProgramCacheKey=raw.customProgramCacheKey.bind(raw);copySourceDepth(raw,material);resources.materials.push(material);pairs.set(raw,material);
  const definition=g.parser.json.materials?.find((m:{name?:string})=>m.name===raw.name);
  // glTF unlit ignores emissiveTexture, yet these original environment surfaces contain only emission.
  if(definition?.emissiveTexture&&!definition.pbrMetallicRoughness?.baseColorTexture){
   if(material instanceof THREE.MeshBasicMaterial){const texture=(await g.parser.getDependency('texture',definition.emissiveTexture.index) as THREE.Texture).clone();texture.colorSpace=THREE.SRGBColorSpace;texture.channel=definition.emissiveTexture.texCoord??0;texture.needsUpdate=true;resources.textures.push(texture);material.map=texture;material.color.fromArray(definition.emissiveFactor??[1,1,1]).multiplyScalar(definition.extensions?.KHR_materials_emissive_strength?.emissiveStrength??1);emissionRepairs++;}
   else if(material instanceof THREE.MeshStandardMaterial){material.color.set(0x000000);emissionRepairs++;}
  }
  bindSceneTextures(material,[...samplers,coating]);bindSceneTextures(raw,samplers);
  if(!(material instanceof THREE.MeshStandardMaterial)||material.transparent||material.userData.sc2?.role==='effect')continue;
  bindEnvironmentCoating(material,theme,coating);
 }
 return {pairs,emissionRepairs};
}

export function bindEnvironmentCoating(material:THREE.MeshStandardMaterial,theme:CampaignTheme,coating:THREE.Texture){
  const p=MAP_VISUAL_PROFILES[theme],tint=p.layers.find(l=>l.source===p.coating)?.tint??[1,1,1],original=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   original.call(material,shader,renderer);shader.uniforms.environmentCoating={value:coating};
   const vary='varying vec3 envWorldPosition;varying vec3 envWorldNormal;varying float envAboveBase;';
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+vary).replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\nenvWorldNormal=inverseTransformDirection(transformedNormal,viewMatrix);').replace('#include <project_vertex>',`#include <project_vertex>\nvec4 envPoint=vec4(transformed,1.0);vec4 envBase=vec4(0.0,0.0,0.0,1.0);\n#ifdef USE_INSTANCING\nenvPoint=instanceMatrix*envPoint;envBase=instanceMatrix*envBase;\n#endif\nenvWorldPosition=(modelMatrix*envPoint).xyz;envAboveBase=envWorldPosition.y-(modelMatrix*envBase).y;`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+vary+'uniform sampler2D environmentCoating;').replace('#include <map_fragment>',`#include <map_fragment>\nvec3 envPixels=texture2D(environmentCoating,envWorldPosition.xz*vec2(.125,-.125)).rgb*vec3(${tint.map(n=>n.toFixed(6)).join(',')});float envGrain=dot(envPixels,vec3(.2126,.7152,.0722));float envUp=smoothstep(${theme==='ice'?'.16,.8':'.32,.9'},normalize(envWorldNormal).y);float envBaseCoverage=exp(-max(0.0,envAboveBase)*3.5);float envCover=${theme==='ice'?'envUp*(.78+envGrain*.22)':'(envUp*.55+envBaseCoverage*.45)*(.55+envGrain*.45)'}*${p.coatingStrength.toFixed(6)};diffuseColor.rgb=mix(diffuseColor.rgb,envPixels,clamp(envCover,0.0,1.0));`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.97,clamp(envCover,0.0,1.0));');
  };material.customProgramCacheKey=()=>key()+':environment-coating-v1:'+theme;material.needsUpdate=true;
}

/** Only used by the per-map diagnostic rollback; matches the preceding ice adapter. */
export function bindLegacySnow(material:THREE.Material){const original=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);material.onBeforeCompile=(shader,renderer)=>{original.call(material,shader,renderer);shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 landscapeWorldNormal;').replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\nlandscapeWorldNormal=inverseTransformDirection(transformedNormal,viewMatrix);');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 landscapeWorldNormal;').replace('#include <map_fragment>','#include <map_fragment>\nfloat snow=smoothstep(.22,.78,normalize(landscapeWorldNormal).y)*.78;float textureDetail=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.82,.87)*(.76+textureDetail*.3),snow);');};material.customProgramCacheKey=()=>key()+':campaign-snow-v1';}
