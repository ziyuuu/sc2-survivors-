import * as THREE from 'three';
import type {BattleRenderer} from '../../src/render/scene/battle-renderer';
import type {World} from '../../src/simulation/world';
import {SOURCE_ABILITIES} from '../../src/data/expansion-units';

export type ScalarOrVector=number|Record<string,number>;
export interface Track {id:number;frames:number[];values:ScalarOrVector[]}
export interface Ref {id:number;default:ScalarOrVector|null}
export interface SourceLayer {filename:string;flags:number;channel:number;multiply:Ref;add:Ref;uvOffset:Ref;uvTiling:Ref;fresnel:{type:number;exponent:number;min:number;maxOffset:number}}
export interface SourceProfile {
 sourceSha256:string;materials:{index:number;name:string;flags:number;hdrEmission:number;layers:Record<string,SourceLayer>}[];
 composites:{name:string;parts:{material:{type:number;index:number};alpha:Ref}[]}[];
 compositeTracks:({name:string}&Track)[];clips:{name:string;duration:number;tracks:Track[]}[];
 bodyProfiles:{id:string;gap?:string;materials?:{name:string;specularity:number;hdrSpecular:number;blend:number}[]}[];
}
export function sampleTrack(track:Track|undefined,time:number,fallback:ScalarOrVector|null):ScalarOrVector|null{
 if(!track||!track.frames.length)return fallback;
 if(time<=track.frames[0])return track.values[0];
 for(let i=1;i<track.frames.length;i++)if(time<=track.frames[i]){
  const t=(time-track.frames[i-1])/Math.max(1e-9,track.frames[i]-track.frames[i-1]),a=track.values[i-1],b=track.values[i];
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
type Materials=THREE.Material|THREE.Material[];
type Original={mesh:THREE.InstancedMesh;original:Materials;restored:Materials;data:Float32Array;texture:THREE.DataTexture;sourceIndex:number;composite:boolean};
/** Reuses original meshes/textures. Restores discarded composite alpha and emission-only layers. */
export class SourceMaterialTrial {
 private surfaces:Original[]=[];private edges=new Map<number,{active:boolean;endedAt:number}>();private matrix=new THREE.Matrix4();
 enabled=false;coverPreview:'world'|'inactive'|'start'|'hold'|'end'='world';previewTime=.1;
 private textures:THREE.Texture[]=[];
 constructor(private renderer:BattleRenderer,readonly profile:SourceProfile){}
 async prepare(){
  const batch=this.renderer.gpu.get('immortal'),g=this.renderer.batches.get('immortal')?.gltf;if(!batch||!g)return;
  const json=g.parser.json,capacity=1024;
  for(const mesh of batch.meshes){
   const original=mesh.material,materials=Array.isArray(original)?original:[original];
   if(!materials.every(m=>m.userData.sc2?.role==='effect'))continue;
   const raw=json.materials.find((m:{name:string})=>m.name===materials[0].name),index=Number(materials[0].name.split('#').at(-1)),source=this.profile.materials.find(m=>m.index===index)!;
   if(!source||source.layers.diffuse.filename)throw Error('Unexpected diffuse surface in emission trial');
   const primaryIndex=raw.emissiveTexture?.index,secondaryIndex=raw.extras.sc2.layers.find((l:{role:string})=>l.role==='emissive2')?.index;
   const textureFor=async(i:number|undefined)=>{if(i===undefined)return null;const t=(await g.parser.getDependency('texture',i) as THREE.Texture).clone();t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;this.textures.push(t);return t;};
   const primary=await textureFor(primaryIndex),secondary=await textureFor(secondaryIndex);
   const data=new Float32Array(capacity*4*3),texture=new THREE.DataTexture(data,capacity,3,THREE.RGBAFormat,THREE.FloatType);texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.needsUpdate=true;this.textures.push(texture);
   const mat=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:materials[0].side,blending:THREE.AdditiveBlending});
   mat.name='source-emission:'+materials[0].name;mat.userData=structuredClone(materials[0].userData);
   const originalCompile=materials[0].onBeforeCompile,key=materials[0].customProgramCacheKey.bind(materials[0]);
   mat.onBeforeCompile=(s,r)=>{
    originalCompile.call(materials[0],s,r);
    Object.assign(s.uniforms,{vrLayerData:{value:texture},vrPrimary:{value:primary},vrSecondary:{value:secondary},vrFresnel:{value:new THREE.Vector4(source.layers.emissive.fresnel.type,source.layers.emissive.fresnel.exponent,source.layers.emissive.fresnel.min,source.layers.emissive.fresnel.maxOffset)}});
    const shared='varying vec3 vrValues;varying vec2 vrUV1;varying vec2 vrUV2;varying vec3 vrViewNormal;varying vec3 vrViewPosition;';
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform sampler2D vrLayerData;'+shared).replace('#include <project_vertex>',`#include <project_vertex>
     vec4 vrD=texelFetch(vrLayerData,ivec2(gl_InstanceID,0),0);vec4 vrU=texelFetch(vrLayerData,ivec2(gl_InstanceID,1),0);vec4 vrV=texelFetch(vrLayerData,ivec2(gl_InstanceID,2),0);
     vrValues=vrD.xyz;vrUV1=uv*vrU.zw+vrU.xy;vrUV2=uv*vrV.zw+vrV.xy;
     vrViewNormal=normalize(normalMatrix*mat3(instanceMatrix)*mat3(unitTransform)*normal);vrViewPosition=-mvPosition.xyz;`);
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\n'+shared+'uniform sampler2D vrPrimary;uniform sampler2D vrSecondary;uniform vec4 vrFresnel;').replace('#include <map_fragment>',`
     if(vrValues.z<.00001)discard;
     float vrRim=1.0-abs(dot(normalize(vrViewNormal),normalize(vrViewPosition)));float vrF=vrFresnel.x>.5?clamp(vrFresnel.z+pow(max(0.0,vrRim),vrFresnel.y)*vrFresnel.w,0.0,1.0):1.0;
     vec3 vrEmission=${primary?'texture2D(vrPrimary,vrUV1).rgb*vrValues.x*vrF':'vec3(0.0)'}${secondary?'+texture2D(vrSecondary,vrUV2).rgb*vrValues.y':''};
     diffuseColor.rgb=vrEmission;diffuseColor.a*=vrValues.z;`);
   };mat.customProgramCacheKey=()=>key()+':source-emission-composite-v1:'+index;
   this.surfaces.push({mesh,original,restored:mat,data,texture,sourceIndex:index,composite:this.profile.composites.some(c=>c.parts.some(p=>p.material.type===1&&p.material.index===index))});
  }
 }
 setEnabled(value:boolean){this.enabled=value;for(const s of this.surfaces)s.mesh.material=value?s.restored:s.original;}
 update(world:World){
  if(!this.enabled)return;
  const units=[...world.entities.values()].filter(u=>u.hp>0&&u.unitType==='immortal'&&!u.heroId&&!u.eliteId);
  const batch=this.renderer.gpu.get('immortal')!;
  for(const s of this.surfaces){for(let i=0;i<s.mesh.count;i++){
   s.mesh.getMatrixAt(i,this.matrix);const x=this.matrix.elements[12],z=this.matrix.elements[14],unit=units.find(u=>Math.abs(u.x-x)<.015&&Math.abs(u.z-z)<.015);if(!unit)throw Error('Missing immutable World identity for Immortal trial');
   const pose=batch.attributes[0],frame=pose.getX(i)+pose.getZ(i),clipEntry=[...batch.clips].find(([,p])=>frame>=p.offset-1e-4&&frame<=p.offset+p.frames-1+1e-4),clipName=clipEntry?.[0]??'Stand',clip=clipEntry?.[1],time=clip?(frame-clip.offset)/(clip.frames-1)*clip.duration:0;
   const srcClip=this.profile.clips.find(c=>c.name===clipName),material=this.profile.materials.find(m=>m.index===s.sourceIndex)!;
   const read=(r:Ref|undefined)=>r?sampleTrack(srcClip?.tracks.find(t=>t.id===r.id),time,r.default):null;
   const layer1=material.layers.emissive,layer2=material.layers.emissive2;
   let alpha=1;
   if(s.composite){if(this.coverPreview!=='world')alpha=coverAlpha(this.profile,this.coverPreview,this.previewTime);else{
    const active=(unit.barrier??0)>0,edge=this.edges.get(unit.id);if(edge?.active&&!active)edge.endedAt=world.time;
    if(active){const start=(unit.barrierReady??world.time)-SOURCE_ABILITIES.immortalBarrier.cooldown;alpha=coverAlpha(this.profile,'start',Math.max(0,world.time-start));}else alpha=edge?.active||edge&&world.time-edge.endedAt<.166?coverAlpha(this.profile,'end',world.time-(edge?.endedAt??world.time)):coverAlpha(this.profile,'inactive',0);
    this.edges.set(unit.id,{active,endedAt:edge?.endedAt??-Infinity});
   }}
   const offset=i*4,capacity=s.mesh.instanceMatrix.count;
   s.data[offset]=Number(read(layer1.multiply)??1)*material.hdrEmission;s.data[offset+1]=layer2.filename?Number(read(layer2.multiply)??1):0;s.data[offset+2]=alpha;
   const setUV=(layer:SourceLayer,row:number)=>{const uv=read(layer.uvOffset) as Record<string,number>|null,tiling=read(layer.uvTiling) as Record<string,number>|null,at=(row*capacity+i)*4;s.data[at]=uv?.x??0;s.data[at+1]=uv?.y??0;s.data[at+2]=tiling?.x??1;s.data[at+3]=tiling?.y??1;};setUV(layer1,1);setUV(layer2,2);
  }s.texture.needsUpdate=true;}
 }
 report(){return {restoredSurfaces:this.surfaces.length,meshesRetained:true,originalSource:this.profile.sourceSha256,compositeDefault:this.profile.composites[0]?.parts[0]?.alpha.default,preview:this.coverPreview};}
}

export function sourcePhong(original:THREE.MeshStandardMaterial,profile:{specularity:number;hdrSpecular:number}){
 const base=original as THREE.MeshPhysicalMaterial;
 const mat=new THREE.MeshPhongMaterial({name:'source-specular:'+original.name,color:original.color,map:original.map,normalMap:original.normalMap,normalScale:original.normalScale,emissive:original.emissive,emissiveMap:original.emissiveMap,emissiveIntensity:original.emissiveIntensity,shininess:profile.specularity,specular:0xffffff,specularMap:base.specularColorMap,transparent:original.transparent,opacity:original.opacity,alphaMap:original.alphaMap,alphaTest:original.alphaTest,side:original.side,depthWrite:original.depthWrite,blending:original.blending});
 mat.userData=structuredClone(original.userData);
 mat.onBeforeCompile=(s,r)=>{original.onBeforeCompile(s,r);s.fragmentShader=s.fragmentShader.replace('#include <specularmap_fragment>','float specularStrength=1.0;vec3 vrSpecular=vec3(1.0);\n#ifdef USE_SPECULARMAP\nvrSpecular=texture2D(specularMap,vSpecularMapUv).rgb;\n#endif').replace('#include <lights_phong_fragment>','#include <lights_phong_fragment>\nmaterial.specularColor*=vrSpecular*'+Number(profile.hdrSpecular).toFixed(6)+';');};
 mat.customProgramCacheKey=()=>original.customProgramCacheKey()+':source-phong-v1:'+profile.specularity+':'+profile.hdrSpecular;
 return mat;
}
