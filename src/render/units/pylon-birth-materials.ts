import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import source from './pylon-birth-materials.json';
import {clearSourceDepth} from '../materials/posed-depth';
const alphaTextures=new WeakMap<THREE.Material,THREE.Texture>();
type Curve<T>={default:T;times:number[];values:T[];interpolation:number};
function sample<T extends number|{x:number;y:number}>(curve:Curve<T>,time:number):T{
 if(!curve.times.length)return curve.default;
 let i=0;while(i<curve.times.length-1&&curve.times[i+1]<=time)i++;
 if(i===curve.times.length-1||time<=curve.times[0]||curve.interpolation===0)return curve.values[i];
 const f=(time-curve.times[i])/(curve.times[i+1]-curve.times[i]),a=curve.values[i],b=curve.values[i+1];
 return (typeof a==='number'?a+((b as number)-a)*f:{x:a.x+((b as {x:number;y:number}).x-a.x)*f,y:a.y+((b as {x:number;y:number}).y-a.y)*f}) as T;
}
/** Resolve the original scalar alpha texture while the resource gate is active. */
export async function preparePylonBirthMaterials(g:GLTF){
 const jobs:Promise<void>[]=[];g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;for(const m of Array.isArray(n.material)?n.material:[n.material]){
  if(m.name.split('#')[0]!=='pylon_te')continue;
  const layer=m.userData.sc2?.layers?.find((l:{role:string})=>l.role==='alpha');if(layer?.index===undefined)throw Error('PylonBirth original alpha layer missing');
  jobs.push(g.parser.getDependency('texture',layer.index).then((texture:THREE.Texture)=>{alphaTextures.set(m,texture);}));
 }});await Promise.all(jobs);
 // Compile the same material variant behind the loading gate; instance clones
 // still receive independent texture transforms and source-time samples.
 g.scene.traverse(n=>{if(n instanceof THREE.Mesh)for(const m of Array.isArray(n.material)?n.material:[n.material])bindPylonBirthMaterial(m,m)?.update(0);});
}
export type PylonBirthMaterialBinding={update:(seconds:number)=>void;dispose:()=>void};
/** Narrow source adapter: preserve original M3 multipliers and UV tracks, no guessed pulse. */
export function bindPylonBirthMaterial(original:THREE.Material,material:THREE.Material):PylonBirthMaterialBinding|undefined{
 const data=source.materials.find(m=>m.name===original.name.split('#')[0]);if(!data)return;
 const m=material as THREE.MeshStandardMaterial,textures:THREE.Texture[]=[];
 if(m.emissiveMap){m.emissiveMap=m.emissiveMap.clone();textures.push(m.emissiveMap);}
 if(data.alpha){const texture=alphaTextures.get(original);if(!texture)throw Error('PylonBirth alpha texture not prepared');m.alphaMap=texture.clone();m.alphaMap.channel=1;textures.push(m.alphaMap);}
 // The additive source material contains emission only. A missing diffuse image
 // must not become Three's default white lit surface over the entire body.
 if(data.blend===2)m.color.set(0);
 // Original auxiliary alpha is now the standard independent alphaMap; do not
 // multiply by its source default zero again in the generic static-layer shader.
 m.onBeforeCompile=()=>{};m.customProgramCacheKey=()=>`sc2-pylon-birth-v1:${data.name}`;clearSourceDepth(m);m.needsUpdate=true;
 return {update(seconds){
  const time=THREE.MathUtils.clamp(seconds,0,source.duration),emission=sample(data.emissive.offset,time);
  m.emissiveIntensity=data.hdr*sample(data.emissive.multiplier,time);m.emissiveMap?.offset.set(emission.x,emission.y);
  if(data.alpha){const uv=sample(data.alpha.offset,time);m.opacity=sample(data.alpha.multiplier,time);m.alphaMap!.offset.set(uv.x,uv.y);}
 },dispose(){for(const texture of textures)texture.dispose();}};
}
