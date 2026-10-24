import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {MATERIAL_ROLES,bindUnitMaterial,type PreparedUnitMaterial} from '../materials/unit-material-loader';
import {createUnitMaterialSurface,type UnitMaterialSurface} from '../materials/unit-material-batch';
import type {UnitMaterialProfile} from '../materials/source-tracks';
import {bindSourceDepth} from '../materials/posed-depth';

export async function prepareFortMaterials(g:GLTF){
 let profile:UnitMaterialProfile|undefined;g.scene.traverse(n=>{if(n.userData.sc2FortMaterials)profile=n.userData.sc2FortMaterials;});if(!profile)throw Error('Missing original equipment-fort material profile');
 const materials=new Set<THREE.Material>();g.scene.traverse(n=>{if(n instanceof THREE.Mesh)for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m);});
 for(const material of materials){const source=profile.materials.find(s=>s.name+'#'+s.index===material.name),raw=g.parser.json.materials.find((m:{name:string})=>m.name===material.name);if(!source||!raw)throw Error('Unbound native fort material '+material.name);const textures:PreparedUnitMaterial['textures']={};
  for(const role of MATERIAL_ROLES){const layer=source.layers[role];if(!layer?.filename)continue;const info=role==='diffuse'?raw.pbrMetallicRoughness?.baseColorTexture:role==='normal'?raw.normalTexture:role==='specular'?raw.extensions?.KHR_materials_specular?.specularColorTexture:role==='emissive'?raw.emissiveTexture:raw.extras?.sc2?.layers?.find((l:{role:string})=>l.role===role);if(info?.index===undefined)throw Error('Missing original fort material layer '+material.name+'/'+role);const texture=(await g.parser.getDependency('texture',info.index) as THREE.Texture).clone();texture.colorSpace=['normal','alpha','alpha2','gloss','ao','environmentMask'].includes(role)?THREE.NoColorSpace:THREE.SRGBColorSpace;texture.flipY=false;texture.wrapS=layer.flags&4?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;texture.wrapT=layer.flags&8?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;texture.needsUpdate=true;textures[role]=texture;}
  bindUnitMaterial(material,{profile,source,textures});
 }
}
const surfaces=new WeakMap<THREE.Object3D,UnitMaterialSurface[]>();
function bind(root:THREE.Object3D){const result:UnitMaterialSurface[]=[];root.traverse(n=>{if(!(n instanceof THREE.Mesh))return;const map=(material:THREE.Material)=>{const surface=createUnitMaterialSurface(material,1);if(!surface)return material;const m=surface.material;m.onBeforeCompile=shader=>surface.compile(shader,n.geometry,false);m.customProgramCacheKey=()=>surface.programKey(n.geometry,false);bindSourceDepth(m,{key:()=>surface.programKey(n.geometry,false,true),compile:shader=>surface.compile(shader,n.geometry,false,true)});result.push(surface);n.userData.nativeFortMaterial=true;return m;};n.material=Array.isArray(n.material)?n.material.map(map):map(n.material);});surfaces.set(root,result);return result;}
export function updateFortMaterials(root:THREE.Object3D,clip:string,seconds:number){for(const surface of surfaces.get(root)??bind(root)){surface.write(0,{clip,seconds});surface.flush();}}
export function disposeFortMaterials(root:THREE.Object3D){for(const surface of surfaces.get(root)??[]){surface.texture.dispose();surface.material.dispose();}surfaces.delete(root);}
