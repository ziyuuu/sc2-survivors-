import * as THREE from 'three';
import {MATERIAL_ROLES,preparedUnitMaterial,bindUnitMaterial,type PreparedUnitMaterial,type MaterialRole} from './unit-material-loader';
import {sampleMaterialTrack,sampleBarrierAlpha,type MaterialRef,type UnitMaterialContext,type UnitMaterialPose} from './source-tracks';

type Shader=Pick<Parameters<THREE.Material['onBeforeCompile']>[0],'uniforms'|'vertexShader'|'fragmentShader'>;
const PARAM=(i:number)=>i<5?i*2:11+(i-5)*2,COLOR=MATERIAL_ROLES.length*2+1,TEAM=COLOR+MATERIAL_ROLES.length,APPARITION=TEAM+1,ROWS=APPARITION+1;
export const UNIT_MATERIAL_TEAM_ROW=TEAM;
const linear=(v:number)=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const DEFAULT_TEAM=[linear(0x52/255),linear(0x82/255),linear(0xb4/255)] as const;
let uploadEpoch=0;
export const materialUploadTotals={bytes:0,calls:0,full:0,partial:0};
/** Existing surfaces must completely repopulate a newly restored GL context. */
export function restoreMaterialUploads(){uploadEpoch++;}
// Intern exact generated source, not a lossy hash or an asset identity. Different
// models can use the same program while retaining their own textures/uniforms.
const sourcePrograms=new Map<string,number>();
const shaderHooks=()=>({uniforms:{},vertexShader:'#include <common>\n#include <project_vertex>',fragmentShader:['common','map_fragment','alphamap_fragment','emissivemap_fragment','normal_fragment_maps','lights_physical_fragment','lights_fragment_end','aomap_fragment','opaque_fragment'].map(name=>`#include <${name}>`).join('\n')});
/** Source curves are indexed by draw slot, populated from stable entity clocks each frame. */
export class UnitMaterialSurface {
 readonly material:THREE.Material;readonly texture:THREE.DataTexture;readonly data:Float32Array;
 private slotRows:(readonly number[][]|undefined)[]=[];
 private changed=false;private clipTracks=new Map<string,Map<number,import('./source-tracks').MaterialTrack>>();
 private programKeys=new Map<string,string>();
 private layers: {layer:import('./source-tracks').MaterialLayer;param:number;color:number;srgb:boolean}[]=[];
 private composite?:MaterialRef;private immortal=false;
 private staticClips=new Set<string>();private staticSamples=new Map<string,readonly number[][]>();
 private samples=new Map<string,readonly number[][]>();private lastSampleKey='';private lastSample?:readonly number[][];
 private uploadedEpoch=-1;private dirtyMin=new Int32Array(ROWS).fill(0x7fffffff);private dirtyMax=new Int32Array(ROWS).fill(-1);
 private pendingUpload={bytes:0,calls:1,partial:false};
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
  this.pendingUpload.bytes=this.data.byteLength;
  this.texture.onUpdate=()=>{const p=this.pendingUpload;materialUploadTotals.bytes+=p.bytes;materialUploadTotals.calls+=p.calls;if(p.partial)materialUploadTotals.partial++;else materialUploadTotals.full++;this.uploadedEpoch=uploadEpoch;this.dirtyMin.fill(0x7fffffff);this.dirtyMax.fill(-1);this.changed=false;};
  for(const clip of prepared.profile.clips)this.clipTracks.set(clip.name,new Map(clip.tracks.map(t=>[t.id,t])));
  this.layers=MATERIAL_ROLES.flatMap((role,i)=>{const layer=source.layers[role];return layer?[{layer,param:PARAM(i),color:COLOR+i,srgb:!['normal','alpha','alpha2','gloss','ao','environmentMask'].includes(role)}]:[];});
  this.composite=prepared.profile.composites.flatMap(c=>c.parts).find(p=>p.material.type===1&&p.material.index===source.index)?.alpha;
  this.immortal=prepared.profile.source.toLowerCase().includes('immortal');
  const refs=new Set<number>();const collect=(v:unknown)=>{if(!v||typeof v!=='object')return;if('id'in v&&'default'in v)refs.add(Number(v.id));for(const child of Object.values(v))collect(child);};collect(source.layers);if(this.composite)refs.add(this.composite.id);
  if(!this.immortal)for(const clip of prepared.profile.clips)if(!clip.tracks.some(t=>refs.has(t.id)))this.staticClips.add(clip.name);
  this.write(0,{clip:'',seconds:0});
 }
 write(index:number,pose:UnitMaterialPose,context?:UnitMaterialContext){
  if(index>=this.capacity)throw Error('Original material instance capacity exceeded');
  // A source actor submits many quads at exactly the same authored phase. Cache
  // only those inputs that affect material rows, never entity/world state.
  const team=context?.teamColor??DEFAULT_TEAM,barrier=context?.barrier;
  const staticPose=this.staticClips.has(pose.clip)&&(!pose.attackClip||this.staticClips.has(pose.attackClip));
  const key=JSON.stringify([pose.clip,staticPose?0:pose.seconds,pose.attackClip,staticPose?0:pose.attackSeconds,barrier?.phase,barrier?.seconds,...team,context?.activity??0,context?.apparition?.tint,context?.apparition?.opacity]);
  let rows=key===this.lastSampleKey?this.lastSample:(staticPose?this.staticSamples:this.samples).get(key);
  if(!rows){rows=this.sample(pose,context);const cache=staticPose?this.staticSamples:this.samples;if(cache.size<(staticPose?64:2048))cache.set(key,rows);this.lastSampleKey=key;this.lastSample=rows;}
  if(this.slotRows[index]===rows)return;this.slotRows[index]=rows;
  for(const values of rows){const y=values[0],offset=(y*this.capacity+index)*4;let dirty=false;for(let k=1;k<values.length;k++){const v=values[k];if(this.data[offset+k-1]!==v){this.data[offset+k-1]=v;this.changed=dirty=true;}}if(dirty){this.dirtyMin[y]=Math.min(this.dirtyMin[y],index);this.dirtyMax[y]=Math.max(this.dirtyMax[y],index);}}
 }
 private sample(pose:UnitMaterialPose,context?:UnitMaterialContext){
  const clips=this.clipTracks.get(pose.clip),attack=pose.attackClip?this.clipTracks.get(pose.attackClip):undefined;
  const read=(ref:MaterialRef)=>{const over=attack?.get(ref.id);return sampleMaterialTrack(over??clips?.get(ref.id),over?pose.attackSeconds??0:pose.seconds,ref);};
  const rows:number[][]=[],row=(y:number,values:readonly number[])=>{rows.push([y,...values.map(Math.fround)]);};
  for(const {layer,param,color:colorRow,srgb} of this.layers){
   const offset=read(layer.uvOffset),tiling=read(layer.uvTiling),angle=read(layer.uvAngle),color=read(layer.color),brightness=layer.brightness?Number(read(layer.brightness)):1;
   row(param,[Number(read(layer.multiply)??1)*brightness,Number(read(layer.add)??0),typeof angle==='number'?angle:angle?.z??0,layer.flipbook?.frame?Number(read(layer.flipbook.frame)):0]);
   row(param+1,[typeof offset==='object'?offset?.x??0:0,typeof offset==='object'?offset?.y??0:0,typeof tiling==='object'?tiling?.x??1:1,typeof tiling==='object'?tiling?.y??1:1]);
   if(color&&typeof color==='object'){const c=(key:string)=>{const v=(color[key]??255)/255;return srgb?linear(v):v;};row(colorRow,[c('r'),c('g'),c('b'),(color.a??255)/255]);}
  }
  const {profile,source}=this.prepared;
  const alpha=this.immortal?sampleBarrierAlpha(profile,source.index,context?.barrier):this.composite?Number(read(this.composite)):1;
  row(10,[alpha,0,0,0]);row(TEAM,[...(context?.teamColor??DEFAULT_TEAM),context?.activity??0]);
  row(APPARITION,[...(context?.apparition?.tint??[1,1,1]),context?.apparition?.opacity??1]);
  return rows;
 }
 flush(){
  if(this.changed||this.uploadedEpoch!==uploadEpoch){
   const ranges:{start:number;count:number}[]=[];let components=0;
   for(let y=0;y<ROWS;y++)if(this.dirtyMax[y]>=0){const count=(this.dirtyMax[y]-this.dirtyMin[y]+1)*4;ranges.push({start:(y*this.capacity+this.dirtyMin[y])*4,count});components+=count;}
   // r186 ranges must stay within one RGBA row. Bound command overhead; dense
   // or fragmented changes use the original single whole-table upload.
   const partial=this.uploadedEpoch===uploadEpoch&&ranges.length>0&&ranges.length<=8&&components<this.data.length*.25;
   this.texture.clearUpdateRanges();if(partial)for(const range of ranges)this.texture.addUpdateRange(range.start,range.count);
   this.pendingUpload={bytes:partial?components*4:this.data.byteLength,calls:partial?ranges.length:1,partial};
   this.texture.needsUpdate=true;this.changed=false;
  }
  this.samples.clear();this.lastSample=undefined;this.lastSampleKey='';
 }
 compile(shader:Shader,geometry:THREE.BufferGeometry,instanced=true,depthOnly=false){
  const {source,textures,teamTexture}=this.prepared,hasUV1=geometry.hasAttribute('uv1');
  const varying='flat varying int umInstance; varying vec2 umUV0; varying vec2 umUV1; varying vec3 umNormal; varying vec3 umView; varying vec4 umClip;';
  const uvDeclaration=hasUV1?'\n#ifndef USE_UV1\nattribute vec2 uv1;\n#endif\n':'';
  shader.uniforms.umState={value:this.texture};
  shader.uniforms.umApparitionPass={value:0};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+uvDeclaration+varying)
   .replace('#include <project_vertex>',`#include <project_vertex>\numInstance=${instanced?'gl_InstanceID':'0'};umUV0=uv;umUV1=${hasUV1?'uv1':'uv'};umNormal=normalize(normalMatrix*${instanced?'mat3(instanceMatrix)*mat3(unitTransform)*':' '}normal);umView=-mvPosition.xyz;umClip=gl_Position;`);
  let helpers=varying+'uniform float umApparitionPass;uniform sampler2D umState;vec4 umData(int row){return texelFetch(umState,ivec2(umInstance,row),0);}\n';
  const number=(v:number)=>Number(v).toFixed(8),enabled=(role:MaterialRole)=>!!textures[role]||!!(source.layers[role]?.flags&0x400);
  for(const [i,role]of MATERIAL_ROLES.entries()){
   if(depthOnly&&role!=='alpha'&&role!=='alpha2'&&!(role==='diffuse'&&source.blend&&source.layers.diffuse?.channel===1))continue;
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
  if(teamTexture&&!depthOnly){shader.uniforms.umTeamTexture={value:teamTexture};helpers+='uniform sampler2D umTeamTexture;\n';}
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+helpers);
  const sample=(role:MaterialRole,fallback:string)=>enabled(role)?`umLayer${MATERIAL_ROLES.indexOf(role)}().rgb`:fallback;
  // Original bodies/depth and transparent apparitions share immutable geometry,
  // poses and instance data, but each pass owns only its respective slots.
  let alpha=`vec4 umApparition=umData(${APPARITION});if(umApparitionPass<.5){if(umApparition.a<1.0)discard;}else{if(umApparition.a>=1.0)discard;diffuseColor.a*=umApparition.a;}diffuseColor.a*=umData(10).x;`;
  for(const role of ['alpha','alpha2']as const)if(source.layers[role])alpha+=`diffuseColor.a*=clamp(umLayer${MATERIAL_ROLES.indexOf(role)}().r,0.0,1.0);`;
  if(source.blend&&source.layers.diffuse?.channel===1&&textures.diffuse)alpha+='diffuseColor.a*=umLayer0().a;';
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',alpha);
  if(depthOnly)return;
  let diffuse=`vec3 umDiffuse=${sample('diffuse','vec3(0.0)')};`;
  if(teamTexture)diffuse+=`vec4 umTeam=texture2D(umTeamTexture,umUv0());float umMask=1.0-umTeam.a;umDiffuse=mix(umTeam.rgb,umData(${TEAM}).rgb,umMask)*umData(0).x+umData(0).y;`;
  if(enabled('decal'))diffuse+=`vec4 umDecal=umLayer7();umDiffuse=mix(umDiffuse,umDecal.rgb,umDecal.a);`;
  let emission='vec3 umEmission=vec3(0.0);';
  for(const [j,role]of (['emissive','emissive2']as const).entries())if(enabled(role)){
   const value=sample(role,'vec3(0.0)'),mode=source.emissionModes?.[j]??2;
   emission+=mode===0?`umEmission=${j?'umEmission':'umDiffuse'}*${value};`:mode===1?`umEmission=${j?'umEmission':'umDiffuse'}*${value}*2.0;`:mode===3?`umEmission=mix(umEmission,${value},umLayer${j+1}().a);`:mode===4?`umEmission+=${value}*umData(${TEAM}).rgb;`:mode===5?`umDiffuse+=${value}*umData(${TEAM}).rgb;`:`umEmission+=${value};`;
  }
  emission+=`umEmission=max(vec3(0.0),umEmission*${number(source.hdrEmission)})*(1.0+.16*umData(${TEAM}).a);`;
  const body=diffuse+emission+`umDiffuse*=umData(${APPARITION}).rgb;umEmission*=umData(${APPARITION}).rgb;`;
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
 programKey(geometry:THREE.BufferGeometry,instanced=true){
  const layout=`${instanced}:${geometry.hasAttribute('uv1')}`;let key=this.programKeys.get(layout);if(key)return key;
  const color=shaderHooks(),depth=shaderHooks();this.compile(color,geometry,instanced);this.compile(depth,geometry,instanced,true);
  const source=JSON.stringify([this.material.type,color.vertexShader,color.fragmentShader,depth.vertexShader,depth.fragmentShader]);
  let id=sourcePrograms.get(source);if(id===undefined){id=sourcePrograms.size;sourcePrograms.set(source,id);}
  key='m3-instance-material-v3:'+id;this.programKeys.set(layout,key);return key;
 }
}
export function createUnitMaterialSurface(original:THREE.Material,capacity:number){const prepared=preparedUnitMaterial(original);return prepared?new UnitMaterialSurface(prepared,original,capacity):undefined;}
