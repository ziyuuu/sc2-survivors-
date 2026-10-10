import * as THREE from 'three';
import {MATERIAL_ROLES,preparedUnitMaterial,bindUnitMaterial,type PreparedUnitMaterial,type MaterialRole} from './unit-material-loader';
import {sampleMaterialTrack,sampleBarrierAlpha,type MaterialRef,type UnitMaterialContext,type UnitMaterialPose} from './source-tracks';

type Shader=Parameters<THREE.Material['onBeforeCompile']>[0];
const PARAM=(i:number)=>i<5?i*2:11+(i-5)*2,COLOR=MATERIAL_ROLES.length*2+1,TEAM=COLOR+MATERIAL_ROLES.length,ROWS=TEAM+1;
const linear=(v:number)=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const DEFAULT_TEAM=[linear(0x52/255),linear(0x82/255),linear(0xb4/255)] as const;
/** Source curves are indexed by draw slot, populated from stable entity clocks each frame. */
export class UnitMaterialSurface {
 readonly material:THREE.Material;readonly texture:THREE.DataTexture;readonly data:Float32Array;
 private changed=false;private clipTracks=new Map<string,Map<number,import('./source-tracks').MaterialTrack>>();
 constructor(readonly prepared:PreparedUnitMaterial,original:THREE.Material,readonly capacity:number){
  this.material=original.clone();bindUnitMaterial(this.material,prepared);
  const {source}=prepared;this.material.visible=source.geometryVisible!==false;
  // Native PBR stays in place. Custom samplers own these channels, avoiding double modulation.
  if(this.material instanceof THREE.MeshStandardMaterial){this.material.map=null;this.material.emissiveMap=null;this.material.alphaMap=null;this.material.color.setRGB(1,1,1);}
  if(this.material instanceof THREE.MeshPhysicalMaterial)this.material.specularColorMap=null;
  if(this.material instanceof THREE.MeshBasicMaterial){this.material.map=null;this.material.alphaMap=null;this.material.color.setRGB(1,1,1);}
  this.material.alphaTest=source.alphaTest??this.material.alphaTest;
  if(source.blend){this.material.transparent=true;this.material.depthWrite=false;
   if(source.blend===2){this.material.blending=THREE.CustomBlending;this.material.blendEquation=THREE.AddEquation;this.material.blendSrc=THREE.OneFactor;this.material.blendDst=THREE.OneFactor;}
   else if(source.blend===3)this.material.blending=THREE.AdditiveBlending;
  }
  this.data=new Float32Array(capacity*ROWS*4);
  this.texture=new THREE.DataTexture(this.data,capacity,ROWS,THREE.RGBAFormat,THREE.FloatType);
  this.texture.minFilter=this.texture.magFilter=THREE.NearestFilter;this.texture.needsUpdate=true;
  for(const clip of prepared.profile.clips)this.clipTracks.set(clip.name,new Map(clip.tracks.map(t=>[t.id,t])));
  this.write(0,{clip:'',seconds:0});
 }
 write(index:number,pose:UnitMaterialPose,context?:UnitMaterialContext){
  if(index>=this.capacity)throw Error('Original material instance capacity exceeded');
  const clips=this.clipTracks.get(pose.clip),attack=pose.attackClip?this.clipTracks.get(pose.attackClip):undefined;
  const read=(ref:MaterialRef)=>{const over=attack?.get(ref.id);return sampleMaterialTrack(over??clips?.get(ref.id),over?pose.attackSeconds??0:pose.seconds,ref);};
  const row=(y:number,values:readonly number[])=>{const offset=(y*this.capacity+index)*4;values.forEach((value,k)=>{const v=Math.fround(value);if(this.data[offset+k]!==v){this.data[offset+k]=v;this.changed=true;}});};
  MATERIAL_ROLES.forEach((role,i)=>{const layer=this.prepared.source.layers[role];if(!layer)return;
   const offset=read(layer.uvOffset),tiling=read(layer.uvTiling),angle=read(layer.uvAngle),color=read(layer.color),brightness=layer.brightness?Number(read(layer.brightness)):1;
   row(PARAM(i),[Number(read(layer.multiply)??1)*brightness,Number(read(layer.add)??0),typeof angle==='number'?angle:angle?.z??0,layer.flipbook?.frame?Number(read(layer.flipbook.frame)):0]);
   row(PARAM(i)+1,[typeof offset==='object'?offset?.x??0:0,typeof offset==='object'?offset?.y??0:0,typeof tiling==='object'?tiling?.x??1:1,typeof tiling==='object'?tiling?.y??1:1]);
   if(color&&typeof color==='object'){const srgb=!['normal','alpha','alpha2','gloss','ao','environmentMask'].includes(role),c=(key:string)=>{const v=(color[key]??255)/255;return srgb?linear(v):v;};row(COLOR+i,[c('r'),c('g'),c('b'),(color.a??255)/255]);}
  });
  const {profile,source}=this.prepared,part=profile.composites.flatMap(c=>c.parts).find(p=>p.material.type===1&&p.material.index===source.index);
  const alpha=profile.source.toLowerCase().includes('immortal')?sampleBarrierAlpha(profile,source.index,context?.barrier):part?Number(read(part.alpha)):1;
  row(10,[alpha,0,0,0]);row(TEAM,[...(context?.teamColor??DEFAULT_TEAM),context?.activity??0]);
 }
 flush(){if(this.changed){this.texture.needsUpdate=true;this.changed=false;}}
 compile(shader:Shader,geometry:THREE.BufferGeometry,instanced=true){
  const {source,textures,teamTexture}=this.prepared,hasUV1=geometry.hasAttribute('uv1');
  const varying='flat varying int umInstance; varying vec2 umUV0; varying vec2 umUV1; varying vec3 umNormal; varying vec3 umView; varying vec4 umClip;';
  const uvDeclaration=hasUV1?'\n#ifndef USE_UV1\nattribute vec2 uv1;\n#endif\n':'';
  shader.uniforms.umState={value:this.texture};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+uvDeclaration+varying)
   .replace('#include <project_vertex>',`#include <project_vertex>\numInstance=${instanced?'gl_InstanceID':'0'};umUV0=uv;umUV1=${hasUV1?'uv1':'uv'};umNormal=normalize(normalMatrix*${instanced?'mat3(instanceMatrix)*mat3(unitTransform)*':' '}normal);umView=-mvPosition.xyz;umClip=gl_Position;`);
  let helpers=varying+'uniform sampler2D umState;vec4 umData(int row){return texelFetch(umState,ivec2(umInstance,row),0);}\n';
  const number=(v:number)=>Number(v).toFixed(8),enabled=(role:MaterialRole)=>!!textures[role]||!!(source.layers[role]?.flags&0x400);
  for(const [i,role]of MATERIAL_ROLES.entries()){
   const layer=source.layers[role];if(!layer)continue;
   const texture=textures[role],uv=layer.uv;
   // UV1 can be absent on source submeshes that do not carry the decal; use the source UV0 only for that submesh.
   if(texture&&![0,1,2,3,7,8,15].includes(uv))throw Error('Unsupported source material UV: '+source.name+'/'+role+'/'+uv);
   const f=layer.fresnel,base=`clamp(${number(f.min)}+pow(max(0.0,1.0-abs(dot(normalize(umNormal),normalize(umView)))),${number(f.exponent)})*${number(f.maxOffset)},0.0,1.0)`;
   const fresnel=f.type===2?`(1.0-${base})`:f.type===1?base:'1.0';
   const reflection='inverseTransformDirection(reflect(-normalize(umView),normalize(umNormal)),viewMatrix)';
   const coords=uv===1?'umUV1':uv===15?'umClip.xy/umClip.w*.5+.5':[3,8].includes(uv)?`vec2(atan(${reflection}.z,${reflection}.x)/6.2831853+.5,asin(clamp(${reflection}.y,-1.0,1.0))/3.1415927+.5)`:'umUV0';
   helpers+=`vec2 umUv${i}(){vec4 p=umData(${PARAM(i)}),u=umData(${PARAM(i)+1});float s=sin(p.z),c=cos(p.z);vec2 uv=${coords}*u.zw;uv=mat2(c,-s,s,c)*(uv-.5)+.5+u.xy;`;
   if(layer.flipbook&&layer.flipbook.rows>0&&layer.flipbook.cols>0){const {rows,cols}=layer.flipbook;helpers+=`float frame=mod(floor(p.w),${number(rows*cols)});uv=(uv+vec2(mod(frame,${number(cols)}),floor(frame/${number(cols)})))/vec2(${number(cols)},${number(rows)});`;}
   helpers+='return uv;}\n';
   let sample=role.startsWith('alpha')?'vec4(1.0)':'vec4(0.0)';
   if(texture){const cube=texture instanceof THREE.CubeTexture;shader.uniforms['umTex'+i]={value:texture};helpers+=`uniform ${cube?'samplerCube':'sampler2D'} umTex${i};\n`;sample=cube?`textureCube(umTex${i},${reflection})`:`texture2D(umTex${i},umUv${i}())`;}
   if(layer.flags&0x400)sample=`umData(${COLOR+i})`;
   helpers+=`vec4 umLayer${i}(){vec4 p=umData(${PARAM(i)}),tex=${sample};`;
   if(layer.rawChannels){if(layer.channel>=2)helpers+=`tex=vec4(tex.${['','','a','r','g','b'][layer.channel]});`;else if(layer.channel===0)helpers+='tex.a=1.0;';}
   helpers+=`${layer.flags&16?'tex.rgb=1.0-tex.rgb;':''}vec3 value=tex.rgb*p.x+p.y;${layer.flags&32?'value=clamp(value,0.0,1.0);':''}return vec4(value*${fresnel},tex.a);}\n`;
  }
  if(teamTexture){shader.uniforms.umTeamTexture={value:teamTexture};helpers+='uniform sampler2D umTeamTexture;\n';}
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+helpers);
  const sample=(role:MaterialRole,fallback:string)=>enabled(role)?`umLayer${MATERIAL_ROLES.indexOf(role)}().rgb`:fallback;
  let alpha='diffuseColor.a*=umData(10).x;';
  for(const role of ['alpha','alpha2']as const)if(source.layers[role])alpha+=`diffuseColor.a*=clamp(umLayer${MATERIAL_ROLES.indexOf(role)}().r,0.0,1.0);`;
  if(source.blend&&source.layers.diffuse?.channel===1&&textures.diffuse)alpha+='diffuseColor.a*=umLayer0().a;';
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',alpha);
  let diffuse=`vec3 umDiffuse=${sample('diffuse','vec3(0.0)')};`;
  if(teamTexture)diffuse+=`vec4 umTeam=texture2D(umTeamTexture,umUv0());float umMask=1.0-umTeam.a;umDiffuse=mix(umTeam.rgb,umData(${TEAM}).rgb,umMask)*umData(0).x+umData(0).y;`;
  if(enabled('decal'))diffuse+=`vec4 umDecal=umLayer7();umDiffuse=mix(umDiffuse,umDecal.rgb,umDecal.a);`;
  let emission='vec3 umEmission=vec3(0.0);';
  for(const [j,role]of (['emissive','emissive2']as const).entries())if(enabled(role)){
   const value=sample(role,'vec3(0.0)'),mode=source.emissionModes?.[j]??2;
   emission+=mode===0?`umEmission=${j?'umEmission':'umDiffuse'}*${value};`:mode===1?`umEmission=${j?'umEmission':'umDiffuse'}*${value}*2.0;`:mode===3?`umEmission=mix(umEmission,${value},umLayer${j+1}().a);`:mode===4?`umEmission+=${value}*umData(${TEAM}).rgb;`:mode===5?`umDiffuse+=${value}*umData(${TEAM}).rgb;`:`umEmission+=${value};`;
  }
  emission+=`umEmission=max(vec3(0.0),umEmission*${number(source.hdrEmission)})*(1.0+.16*umData(${TEAM}).a);`;
  const body=diffuse+emission;
  if(this.material instanceof THREE.MeshBasicMaterial)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',body+'diffuseColor.rgb=umDiffuse+umEmission;');
  else {
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',body+'diffuseColor.rgb*=umDiffuse;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','totalEmissiveRadiance=umEmission;');
   if(textures.normal){const normal=THREE.ShaderChunk.normal_fragment_maps.replace('texture2D( normalMap, vNormalMapUv )','texture2D( umTex6, umUv6() )');shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',normal);}
   const gloss=enabled('gloss')?'roughnessFactor=clamp(1.0-umLayer8().r,.04,1.0);':'';
   // Filter only unresolved normal variation in the specular lobe, leaving the diffuse texture sharp.
   const aa='vec3 umDx=dFdx(normal),umDy=dFdy(normal);float umVariance=max(dot(umDx,umDx),dot(umDy,umDy));roughnessFactor=sqrt(clamp(roughnessFactor*roughnessFactor+min(.20,umVariance*.5),.0016,1.0));';
   const spec=enabled('specular')?`material.specularColor=mix(clamp(${sample('specular','vec3(1.0)')}*${number(.04*(source.hdrSpecular??1))},vec3(0.0),vec3(1.0)),diffuseColor.rgb,metalnessFactor);`:'';
   shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',gloss+aa+'\n#include <lights_physical_fragment>\n'+spec);
   if(enabled('environment'))shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>\nreflectedLight.indirectSpecular+=${sample('environment','vec3(0.0)')}*${sample('environmentMask','vec3(1.0)')}*material.specularColor*(1.0-roughnessFactor*.5);`);
   if(enabled('ao'))shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>\nreflectedLight.indirectDiffuse*=clamp(${sample('ao','vec3(1.0)')},0.0,1.0);`);
  }
  // Add ignores texture alpha, but source composite opacity still gates the whole surface.
  if(source.blend===2)shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\ngl_FragColor.rgb*=umData(10).x;');
 }
 get programKey(){return 'm3-instance-material-v2:'+this.prepared.profile.glbSha256+':'+this.prepared.source.index;}
}
export function createUnitMaterialSurface(original:THREE.Material,capacity:number){const prepared=preparedUnitMaterial(original);return prepared?new UnitMaterialSurface(prepared,original,capacity):undefined;}
