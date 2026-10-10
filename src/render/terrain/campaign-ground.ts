import * as THREE from 'three';
import {assetUrl} from '../../assets/manifest';
import {CAMPAIGN_MAP_SIZE,MAP_THEMES,type RadialTerrain} from '../../data/campaign-map';
import {campaignSurface} from '../../data/campaign-landscape';
import {campaignTerrainArray} from './campaign-textures';

export interface LandscapeResources {textures:THREE.Texture[];geometries:THREE.BufferGeometry[];materials:THREE.Material[]}

/** The map material owns its paint and light fields. It does not change unit or effect lighting. */
export async function createCampaignGround(terrain:RadialTerrain,resources:LandscapeResources){
 const {textures,geometries,materials}=resources,{theme,seed}=terrain.recipe,palette=MAP_THEMES[theme],size=CAMPAIGN_MAP_SIZE;
 const requireUrl=(id:string)=>{const u=assetUrl(id);if(!u)throw Error('缺少地表：'+id);return u;};
 // Register each successful allocation immediately, so a second failed load is disposable too.
 const loadArray=async(id:string,linear=false)=>{const t=await campaignTerrainArray(requireUrl(id),linear);textures.push(t);return t;};
 const colorLayers=theme==='char'?null:await loadArray('map.terrain.diffuse'),normalLayers=theme==='char'?null:await loadArray('map.terrain.normal',true);
 const charUniforms:Record<string,{value:THREE.Texture}>={};
 if(theme==='char')for(const [name,id,linear] of [['charSoil','terrain.char',false],['charRock','terrain.rock',false],['charCracked','terrain.cracked',false],['charSoilNormal','terrain.char.normal',true],['charRockNormal','terrain.rock.normal',true]] as const){
  const t=await new THREE.TextureLoader().loadAsync(requireUrl(id));t.colorSpace=linear?THREE.NoColorSpace:THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;textures.push(t);charUniforms[name]={value:t};
 }
 const pixels=new Uint8Array([255,255,255,255]),flatNormal=new Uint8Array([128,128,255,255]);
 const map=new THREE.DataTexture(pixels,1,1),normalMap=new THREE.DataTexture(flatNormal,1,1);map.needsUpdate=normalMap.needsUpdate=true;textures.push(map,normalMap);
 const resolution=512,weights=new Uint8Array(resolution*resolution*4),detail=new Uint8Array(weights.length),legacyShadePixels=new Uint8Array(weights.length);
 const solids=terrain.definition.placements.filter(p=>p.type==='landmark');
 for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
  const wx=(x+.5)/resolution*size-size/2,wz=size/2-(y+.5)/resolution*size,at=(y*resolution+x)*4;
  const field=campaignSurface(theme,wx,wz,seed);let shade=1,contactShade=1,projectedShade=1;
  for(const p of solids){
   const r=p.blockerSize!,dx=wx-(p.position[0]-size/2),dz=wz-(size/2-p.position[1]);
   if(Math.abs(dx)>r*4||Math.abs(dz)>r*4)continue;
   const contact=Math.max(0,1-Math.hypot(dx,dz)/(r*1.3));
   const shadow=Math.max(0,1-Math.hypot((dx-r*.65)/(r*1.7),(dz+r*.45)/(r*.95)));
   shade*=1-contact*.23-shadow*.26;
   contactShade*=1-contact*.23;projectedShade*=1-shadow*.26;
  }
  weights[at]=Math.round(field.weights[0]*255);weights[at+1]=Math.round(field.weights[1]*255);weights[at+2]=Math.round(field.weights[2]*255);weights[at+3]=Math.round(Math.max(.45,shade)*255);
  legacyShadePixels.set([Math.round(Math.max(.45,contactShade)*255),Math.round(Math.max(.45,projectedShade)*255),255,255],at);
  detail[at]=Math.round(field.paint*255);detail[at+1]=Math.round(field.glow*255);detail[at+2]=Math.round((field.variation-.7)/.7*255);detail[at+3]=255;
 }
 const fieldTexture=(data:Uint8Array,width:number,height:number)=>{const t=new THREE.DataTexture(data,width,height);t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;textures.push(t);return t;};
 const field=fieldTexture(weights,resolution,resolution),paint=fieldTexture(detail,resolution,resolution),legacyShade=fieldTexture(legacyShadePixels,resolution,resolution);
 const shadowActive={value:0},contactActive={value:0};
 const rw=terrain.definition.walkWidth,rh=terrain.definition.walkHeight,revealPixels=new Uint8Array(rw*rh),horizontal=new Float32Array(rw*rh);
 const reveal=new THREE.DataTexture(revealPixels,rw,rh,THREE.RedFormat);reveal.minFilter=reveal.magFilter=THREE.LinearFilter;textures.push(reveal);
 const updateStage=(value:number)=>{
  // A soft fog edge describes the fixed collision boundary without a staircase of half-unit cells.
  for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){
   let sum=0;for(let dx=-3;dx<=3;dx++){const sx=Math.max(0,Math.min(rw-1,x+dx)),opened=terrain.definition.reveal[y*rw+sx];sum+=(opened>0&&opened<=value?1:0)*(4-Math.abs(dx));}horizontal[y*rw+x]=sum/16;
  }
  for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){
   let sum=0;for(let dy=-3;dy<=3;dy++)sum+=horizontal[Math.max(0,Math.min(rh-1,y+dy))*rw+x]*(4-Math.abs(dy));revealPixels[y*rw+x]=Math.round(sum/16*255);
  }
  reveal.needsUpdate=true;
 };updateStage(terrain.stage);
 const stage={value:terrain.stage},material=new THREE.MeshStandardMaterial({map,normalMap,normalScale:new THREE.Vector2(.58,.58),roughness:theme==='industrial'?.78:.94,color:palette.tint});materials.push(material);
 const layerColor=(layer:number)=>`texture(groundLayers,vec3(groundUV,${layer}.0)).rgb`;
 const first=theme==='char'?'texture2D(charSoil,groundUV).rgb':layerColor(palette.layers[0]);
 const second=theme==='char'?'mix(texture2D(charRock,groundUV).rgb,texture2D(charRock,charRockUV).rgb,charMix)':layerColor(palette.layers[1]);
 const third=theme==='char'?'texture2D(charCracked,groundUV).rgb':layerColor(palette.layers[2]);
 const paintColor=theme==='industrial'?'vec3(.46,.32,.105)':theme==='frontier'?'vec3(.11,.13,.14)':'vec3(.16,.15,.135)';
 material.onBeforeCompile=s=>{
  Object.assign(s.uniforms,{groundLayers:{value:colorLayers},groundNormals:{value:normalLayers},groundField:{value:field},groundPaint:{value:paint},groundReveal:{value:reveal},groundStage:stage,groundLegacyShade:{value:legacyShade},groundShadowActive:shadowActive,groundContactActive:contactActive,...charUniforms});
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
   uniform highp sampler2DArray groundLayers;
   uniform highp sampler2DArray groundNormals;
   uniform sampler2D groundField;uniform sampler2D groundPaint;uniform sampler2D groundReveal;uniform sampler2D groundLegacyShade;uniform float groundShadowActive;uniform float groundContactActive;
   uniform float groundStage;${Object.keys(charUniforms).map(name=>'uniform sampler2D '+name+';').join('')}`);
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`
   vec2 groundUV=vMapUv*${theme==='industrial'?'20.0':theme==='char'?'13.0':'18.0'};
   vec4 field=texture2D(groundField,vMapUv),detail=texture2D(groundPaint,vMapUv);
   ${theme==='char'?`groundUV+=sin(groundUV.yx*.63+vec2(1.7,.2))*.22;
   vec2 charRockUV=groundUV*.713+vec2(13.7,31.3);float charMix=smoothstep(.22,.65,detail.b)*.75;`:''}
   vec3 weights=field.rgb/max(.001,field.r+field.g+field.b);
   vec3 groundColor=${first}*weights.x;
   vec3 secondGround=${second};
   if(weights.y>.002)groundColor+=secondGround*weights.y;
   if(weights.z>.002)groundColor+=${third}*weights.z;
   float paintAmount=detail.r;
   ${theme==='industrial'?`vec2 p=(vMapUv-vec2(.5))*vec2(160.0,-160.0);float pad=max(abs(p.x),abs(p.y));
   float roadEdge=min(abs(abs(p.x)-5.05),abs(abs(p.y)-5.05));
   float dashes=smoothstep(.1,.4,sin((abs(p.x)<abs(p.y)?p.y:p.x)*1.1));
   float stripes=(1.0-smoothstep(.045,.045+fwidth(roadEdge)*1.4,roadEdge))*dashes*smoothstep(8.2,9.0,pad);
   float frame=abs(pad-8.0);paintAmount=max(stripes,(1.0-smoothstep(.045,.045+fwidth(frame)*1.4,frame))*.55)*(.35+detail.b*.5);`:''}
   groundColor=mix(groundColor,${paintColor},paintAmount*.7);
   float opened=texture2D(groundReveal,vMapUv).r;
   vec2 legacyShade=texture2D(groundLegacyShade,vMapUv).rg;
   float groundShade=groundShadowActive>.5?(groundContactActive>.5?1.0:legacyShade.r):(groundContactActive>.5?legacyShade.g:field.a);
   diffuseColor.rgb*=groundColor*groundShade*(.7+detail.b*.7)*mix(.28,1.0,opened);`);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',theme==='char'?`
   vec3 rockNormal=mix(texture2D(charRockNormal,groundUV).rgb,texture2D(charRockNormal,charRockUV).rgb,charMix);
   vec3 groundNormal=mix(texture2D(charSoilNormal,groundUV).rgb,rockNormal,weights.y+weights.z);
   vec3 mapN=normalize(groundNormal*2.0-1.0);mapN.xy*=normalScale;normal=normalize(tbn*mapN);`:`
   vec3 groundNormal=texture(groundNormals,vec3(groundUV,${palette.layers[0]}.0)).rgb*weights.x;
   if(weights.y>.002)groundNormal+=texture(groundNormals,vec3(groundUV,${palette.layers[1]}.0)).rgb*weights.y;
   if(weights.z>.002)groundNormal+=texture(groundNormals,vec3(groundUV,${palette.layers[2]}.0)).rgb*weights.z;
   vec3 mapN=normalize(groundNormal*2.0-1.0);mapN.xy*=normalScale;normal=normalize(tbn*mapN);`);
  if(theme==='char')s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat heat=max(0.0,secondGround.r-max(secondGround.g,secondGround.b)*1.45);totalEmissiveRadiance+=vec3(2.4,.25,.012)*heat*weights.y*opened;');
 };
 material.customProgramCacheKey=()=>`campaign-painted-ground-${theme}-v4`;
 const geometry=new THREE.PlaneGeometry(size,size,size,size);geometry.rotateX(-Math.PI/2);
 const positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i);positions.setY(i,terrain.height({x,z})-.018);uv.setXY(i,(x+size/2)/size,(size/2-z)/size);}
 geometry.computeVertexNormals();geometry.computeBoundingSphere();geometries.push(geometry);
 const ground=new THREE.Mesh(geometry,material);ground.name='campaign-traversable-ground';
 return {ground,stage,updateStage,setLighting:(active:{shadow:boolean;contact:boolean})=>{shadowActive.value=Number(active.shadow);contactActive.value=Number(active.contact);}};
}
