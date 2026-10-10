import * as THREE from 'three';
import {MATERIAL_ROLES,preparedUnitMaterial,bindUnitMaterial,type PreparedUnitMaterial} from './unit-material-loader';
import {sampleMaterialTrack,sampleBarrierAlpha,type MaterialRef,type UnitMaterialContext,type UnitMaterialPose} from './source-tracks';

type Shader=Parameters<THREE.Material['onBeforeCompile']>[0];
const ROWS=MATERIAL_ROLES.length*2+1;
/** One shared texture per original surface, with a row for each native batch slot. */
export class UnitMaterialSurface {
 readonly material:THREE.Material;readonly texture:THREE.DataTexture;readonly data:Float32Array;
 private changed=false;private clipTracks=new Map<string,Map<number,import('./source-tracks').MaterialTrack>>();
 constructor(readonly prepared:PreparedUnitMaterial,original:THREE.Material,readonly capacity:number){
  this.material=original.clone();bindUnitMaterial(this.material,prepared);
  const {source}=prepared;
  if(source.blend){this.material.transparent=true;this.material.depthWrite=false;
   if(source.blend===2){this.material.blending=THREE.CustomBlending;this.material.blendEquation=THREE.AddEquation;this.material.blendSrc=THREE.OneFactor;this.material.blendDst=THREE.OneFactor;}
   else if(source.blend===3)this.material.blending=THREE.AdditiveBlending;
  }
  this.data=new Float32Array(capacity*ROWS*4);
  this.texture=new THREE.DataTexture(this.data,capacity,ROWS,THREE.RGBAFormat,THREE.FloatType);
  this.texture.minFilter=this.texture.magFilter=THREE.NearestFilter;this.texture.needsUpdate=true;
  for(const clip of prepared.profile.clips)this.clipTracks.set(clip.name,new Map(clip.tracks.map(t=>[t.id,t])));
  // Warm-up draws also use valid defaults; an unassigned slot cannot show a shield.
  this.write(0,{clip:'',seconds:0});
 }
 write(index:number,pose:UnitMaterialPose,context?:UnitMaterialContext){
  if(index>=this.capacity)throw Error('Original material instance capacity exceeded');
  const clips=this.clipTracks.get(pose.clip),attack=pose.attackClip?this.clipTracks.get(pose.attackClip):undefined;
  const read=(ref:MaterialRef)=>{const over=attack?.get(ref.id);return sampleMaterialTrack(over??clips?.get(ref.id),over?pose.attackSeconds??0:pose.seconds,ref);};
  const row=(y:number,values:number[])=>{const offset=(y*this.capacity+index)*4;values.forEach((value,k)=>{const v=Math.fround(value);if(this.data[offset+k]!==v){this.data[offset+k]=v;this.changed=true;}});};
  MATERIAL_ROLES.forEach((role,i)=>{const layer=this.prepared.source.layers[role];if(!layer)return;
   const offset=read(layer.uvOffset),tiling=read(layer.uvTiling),angle=read(layer.uvAngle);
   row(i*2,[Number(read(layer.multiply)??1),Number(read(layer.add)??0),typeof angle==='number'?angle:angle?.z??0,0]);
   row(i*2+1,[typeof offset==='object'?offset?.x??0:0,typeof offset==='object'?offset?.y??0:0,typeof tiling==='object'?tiling?.x??1:1,typeof tiling==='object'?tiling?.y??1:1]);
  });
  row(10,[sampleBarrierAlpha(this.prepared.profile,this.prepared.source.index,context?.barrier),0,0,0]);
 }
 flush(){if(this.changed){this.texture.needsUpdate=true;this.changed=false;}}
 compile(shader:Shader,geometry:THREE.BufferGeometry){
  const {source,textures}=this.prepared,hasUV1=geometry.hasAttribute('uv1');
  const varying='flat varying int umInstance; varying vec2 umUV0; varying vec2 umUV1; varying vec3 umNormal; varying vec3 umView;';
  const uvDeclaration=hasUV1?'\n#ifndef USE_UV1\nattribute vec2 uv1;\n#endif\n':'';
  shader.uniforms.umState={value:this.texture};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+uvDeclaration+varying)
   .replace('#include <project_vertex>',`#include <project_vertex>\numInstance=gl_InstanceID;umUV0=uv;umUV1=${hasUV1?'uv1':'uv'};umNormal=normalize(normalMatrix*mat3(instanceMatrix)*mat3(unitTransform)*normal);umView=-mvPosition.xyz;`);
  let helpers=varying+'uniform sampler2D umState;vec4 umData(int row){return texelFetch(umState,ivec2(umInstance,row),0);}\n';
  const number=(v:number)=>Number(v).toFixed(8);
  for(const [i,role] of MATERIAL_ROLES.entries()){
   const texture=textures[role];if(!texture)continue;const layer=source.layers[role];
   if(layer.uv!==0&&!(layer.uv===1&&hasUV1))throw Error('Unsupported source material UV: '+source.name+'/'+role);
   const f=layer.fresnel;
   const fresnelBase=`clamp(${number(f.min)}+pow(max(0.0,1.0-abs(dot(normalize(umNormal),normalize(umView)))),${number(f.exponent)})*${number(f.maxOffset)},0.0,1.0)`;
   const fresnel=f.type===2?`(1.0-${fresnelBase})`:f.type===1?fresnelBase:'1.0';
   shader.uniforms['umTex'+i]={value:texture};
   helpers+=`uniform sampler2D umTex${i};vec3 umLayer${i}(){vec4 p=umData(${i*2}),u=umData(${i*2+1});float s=sin(p.z),c=cos(p.z);vec2 uv=${layer.uv===1?'umUV1':'umUV0'}*u.zw;uv=mat2(c,-s,s,c)*(uv-.5)+.5+u.xy;vec3 tex=texture2D(umTex${i},uv).rgb;${layer.flags&16?'tex=1.0-tex;':''}vec3 value=tex*p.x+p.y;${layer.flags&32?'value=clamp(value,0.0,1.0);':''}return value*${fresnel};}\n`;
  }
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+helpers);
  const sample=(role:typeof MATERIAL_ROLES[number],fallback:string)=>textures[role]?`umLayer${MATERIAL_ROLES.indexOf(role)}()`:fallback;
  let alpha='diffuseColor.a*=umData(10).x;';
  for(const role of ['alpha','alpha2'] as const)if(textures[role])alpha+=`diffuseColor.a*=clamp(${sample(role,'vec3(1.0)')}.r,0.0,1.0);`;
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',alpha);
  const emission=`max(vec3(0.0),(${sample('emissive','vec3(0.0)')}+${sample('emissive2','vec3(0.0)')})*${number(source.hdrEmission)})`;
  const diffuse=sample('diffuse','vec3(0.0)');
  if(this.material instanceof THREE.MeshBasicMaterial)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`diffuseColor.rgb=${diffuse}+${emission};`);
  else {
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`diffuseColor.rgb*=${diffuse};`);
   // The native hit/tier additions follow this chunk and are deliberately retained.
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`totalEmissiveRadiance=${emission};`);
  }
  // Add ignores texture alpha, but a composite's animated contribution still gates the whole layer.
  if(source.blend===2)shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\ngl_FragColor.rgb*=umData(10).x;');
 }
 get programKey(){return 'm3-instance-material-v1:'+this.prepared.profile.glbSha256+':'+this.prepared.source.index;}
}
export function createUnitMaterialSurface(original:THREE.Material,capacity:number){const prepared=preparedUnitMaterial(original);return prepared?new UnitMaterialSurface(prepared,original,capacity):undefined;}
