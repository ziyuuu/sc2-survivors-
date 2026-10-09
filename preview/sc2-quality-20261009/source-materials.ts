import * as THREE from 'three';

export type ScalarOrVector=number|Record<string,number>;
export interface Track {id:number;frames:number[];values:ScalarOrVector[]}
export interface Ref {id:number;interpolation?:number;default:ScalarOrVector|null}
export interface SourceLayer {filename:string;flags:number;channel:number;multiply:Ref;add:Ref;uvOffset:Ref;uvTiling:Ref;fresnel:{type:number;exponent:number;min:number;maxOffset:number}}
export interface SourceProfile {
 sourceSha256:string;materials:{index:number;name:string;flags:number;hdrEmission:number;layers:Record<string,SourceLayer>}[];
 composites:{name:string;parts:{material:{type:number;index:number};alpha:Ref}[]}[];
 compositeTracks:({name:string}&Track)[];clips:{name:string;duration:number;tracks:Track[]}[];
 bodyProfiles:{id:string;gap?:string;materials?:{name:string;specularity:number;hdrSpecular:number;blend:number}[]}[];
}
export function sampleTrack(track:Track|undefined,time:number,fallback:ScalarOrVector|null,interpolation=1):ScalarOrVector|null{
 if(!track||!track.frames.length)return fallback;
 if(time<=track.frames[0])return track.values[0];
 for(let i=1;i<track.frames.length;i++)if(time<=track.frames[i]){
  const t=(time-track.frames[i-1])/Math.max(1e-9,track.frames[i]-track.frames[i-1]),a=track.values[i-1],b=track.values[i];
  if(interpolation===0)return time===track.frames[i]?b:a;
  if(typeof a==='number'&&typeof b==='number')return a+(b-a)*t;
  if(typeof a==='object'&&typeof b==='object')return Object.fromEntries(Object.keys(a).map(k=>[k,a[k]+(b[k]-a[k])*t]));
  return a;
 }return track.values.at(-1)!;
}
export function coverAlpha(profile:SourceProfile,phase:'inactive'|'start'|'hold'|'end',seconds:number){
 if(phase==='inactive')return Number(profile.composites.find(c=>c.name==='Mat_Immortal_Shield')!.parts[0].alpha.default);
 const name=phase==='start'?'Cover Start_Immortal_Shield':phase==='hold'?'Cover_Immortal_Shield':'Cover End_Immortal_Shield';
 return Number(sampleTrack(profile.compositeTracks.find(t=>t.name===name),seconds,phase==='end'?0:1));
}
export function sourcePhong(original:THREE.MeshStandardMaterial,profile:{specularity:number;hdrSpecular:number},specularAA={value:1}){
 const base=original as THREE.MeshPhysicalMaterial;
 const mat=new THREE.MeshPhongMaterial({name:'source-specular:'+original.name,color:original.color,map:original.map,normalMap:original.normalMap,normalScale:original.normalScale,emissive:original.emissive,emissiveMap:original.emissiveMap,emissiveIntensity:original.emissiveIntensity,shininess:profile.specularity,specular:0xffffff,specularMap:base.specularColorMap,transparent:original.transparent,opacity:original.opacity,alphaMap:original.alphaMap,alphaTest:original.alphaTest,side:original.side,depthWrite:original.depthWrite,blending:original.blending,vertexColors:original.vertexColors});
 mat.userData=structuredClone(original.userData);
 mat.onBeforeCompile=(s,r)=>{original.onBeforeCompile(s,r);s.uniforms.qrSpecularAA=specularAA;
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform float qrSpecularAA;').replace('#include <specularmap_fragment>','float specularStrength=1.0;vec3 vrSpecular=vec3(1.0);\n#ifdef USE_SPECULARMAP\nvrSpecular=texture2D(specularMap,vSpecularMapUv).rgb;\n#endif').replace('#include <lights_phong_fragment>',`#include <lights_phong_fragment>
material.specularColor*=vrSpecular*${Number(profile.hdrSpecular).toFixed(6)};
// Broaden unresolved highlights using the final normal, including the normal map.
// Three's normalized Blinn-Phong lobe preserves energy as its exponent changes.
vec3 qrDx=dFdx(normal),qrDy=dFdy(normal);
float qrVariance=min(0.18,0.5*(dot(qrDx,qrDx)+dot(qrDy,qrDy)))*qrSpecularAA;
material.specularShininess=max(0.0,2.0/(2.0/(shininess+2.0)+qrVariance)-2.0);`);};
 mat.customProgramCacheKey=()=>original.customProgramCacheKey()+':source-phong-filtered-v2:'+profile.specularity+':'+profile.hdrSpecular;
 return mat;
}
