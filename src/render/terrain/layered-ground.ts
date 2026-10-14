import * as THREE from 'three';
import {CAMPAIGN_MAP_SIZE,type RadialTerrain} from '../../data/campaign-map';
import type {TerrainQuery,MapPlacement} from '../../data/map-definition';
import type {CampaignTheme} from '../../data/campaign-landscape';
import {MAP_VISUAL_PROFILES} from './map-visual-profile';
import {loadEnvironmentTexture} from './environment-texture';
import {visualGroundField} from './visual-fields';
import {bindSceneTextures} from '../materials/scene-textures';
export type {LandscapeResources} from './campaign-ground-legacy';
import type {LandscapeResources} from './campaign-ground-legacy';

/** A single terrain surface receives the existing sunlight, posed shadows and contact pass. */
export interface VisualGroundOptions {placements?:readonly MapPlacement[];height?:(x:number,z:number)=>number;softenPads?:boolean}
export async function createVisualGround(terrain:TerrainQuery,theme:CampaignTheme,seed:number,resources:LandscapeResources,options:VisualGroundOptions={}){
 const {textures,geometries,materials}=resources,p=MAP_VISUAL_PROFILES[theme],size=CAMPAIGN_MAP_SIZE;
 const colors:THREE.Texture[]=[],normals:THREE.Texture[]=[];
 for(const layer of p.layers){colors.push(await loadEnvironmentTexture(layer.source,resources));normals.push(await loadEnvironmentTexture(layer.source+'-normal',resources,true));}
 const fieldTexture=(data:Uint8Array,width:number,height:number)=>{const t=new THREE.DataTexture(data,width,height);t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;textures.push(t);return t;};
 const map=fieldTexture(new Uint8Array([255,255,255,255]),1,1),normalMap=fieldTexture(new Uint8Array([128,128,255,255]),1,1),resolution=512;
 const weights=new Uint8Array(resolution*resolution*4),details=new Uint8Array(weights.length),solids=(options.placements??terrain.definition?.placements??[]).filter(p=>p.type==='landmark');
 for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
  const wx=(x+.5)/resolution*size-size/2,wz=size/2-(y+.5)/resolution*size,at=(y*resolution+x)*4,f=visualGroundField(theme,wx,wz,seed,solids);
  if(options.softenPads&&(theme==='ice'||theme==='frontier')){const ice=theme==='ice',index=ice?3:2,r=Math.hypot((wx+(ice?16:22))/(ice?8:10),(wz-(ice?15:20))/(ice?6:7)),t=THREE.MathUtils.clamp((r-.35)/1.25,0,1),edge=(1-t*t*(3-2*t))*(.42+f.macro*.35),removed=f.weights[index]*(1-edge);f.weights[index]-=removed;f.weights[0]+=removed;}
  weights.set(f.weights.map(w=>Math.round(w*255)),at);details.set([Math.round(f.paint*255),Math.round((f.variation-.8)*510),Math.round(f.base*255),Math.round(f.macro*255)],at);
 }
 const field=fieldTexture(weights,resolution,resolution),detail=fieldTexture(details,resolution,resolution),d=terrain.definition,rw=d?.walkWidth??1,rh=d?.walkHeight??1;
 const revealPixels=new Uint8Array(rw*rh),horizontal=new Float32Array(rw*rh),reveal=new THREE.DataTexture(revealPixels,rw,rh,THREE.RedFormat);reveal.minFilter=reveal.magFilter=THREE.LinearFilter;textures.push(reveal);
 const updateStage=(value:number)=>{
  if(!d){revealPixels[0]=255;reveal.needsUpdate=true;return;}
  for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){let sum=0;for(let dx=-3;dx<=3;dx++){const at=y*rw+Math.max(0,Math.min(rw-1,x+dx)),opened=d.reveal[at];sum+=(opened>0&&opened<=value?1:0)*(4-Math.abs(dx));}horizontal[y*rw+x]=sum/16;}
  for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){let sum=0;for(let dy=-3;dy<=3;dy++)sum+=horizontal[Math.max(0,Math.min(rh-1,y+dy))*rw+x]*(4-Math.abs(dy));revealPixels[y*rw+x]=Math.round(sum/16*255);}reveal.needsUpdate=true;
 };const stage={value:'stage' in terrain?Number(terrain.stage):18};updateStage(stage.value);
 const bases={value:1},material=new THREE.MeshStandardMaterial({map,normalMap,normalScale:new THREE.Vector2(1,1),roughness:1});materials.push(material);
 const number=(n:number)=>n.toFixed(6),vector=(v:readonly number[])=>'vec3('+v.map(number).join(',')+')';
 material.name='original-ground:'+theme;bindSceneTextures(material,[...colors,...normals,field,detail,reveal]);
 material.onBeforeCompile=s=>{
  Object.assign(s.uniforms,{visualField:{value:field},visualDetail:{value:detail},visualReveal:{value:reveal},visualBases:bases});
  for(let i=0;i<p.layers.length;i++){s.uniforms['visualColor'+i]={value:colors[i]};s.uniforms['visualNormal'+i]={value:normals[i]};}
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>\nuniform sampler2D visualField;uniform sampler2D visualDetail;uniform sampler2D visualReveal;uniform float visualBases;\n${p.layers.map((_,i)=>`uniform sampler2D visualColor${i};uniform sampler2D visualNormal${i};`).join('\n')}`);
  let colorCode='vec4 visualW=texture2D(visualField,vMapUv);visualW/=max(.001,dot(visualW,vec4(1.0)));vec4 visualD=texture2D(visualDetail,vMapUv);';
  colorCode+=`visualW=mix(visualW,vec4(${[0,1,2,3].map(i=>i===p.baseLayer?'1.0':'0.0').join(',')}),visualD.b*visualBases*${number(p.baseStrength)});vec3 visualColor=vec3(0.0);vec3 visualN=vec3(0.0);float visualRough=0.0;float visualMetal=0.0;float visualHeat=0.0;`;
  for(const [i,l]of p.layers.entries()){
   // Natural layers use a smooth phase variation plus a rotated second scale. Panel UVs stay straight.
   // Rotate the sampled tangent normal back with the inverse UV rotation before blending.
   colorCode+=`\nvec2 visualUv${i}=vMapUv*${number(size/l.meters)}${l.macro>0?'+vec2(visualD.a*.16,visualD.g*.21)':''};vec2 visualUvB${i}=vec2(-visualUv${i}.y,visualUv${i}.x)*.613+vec2(13.7,31.3);float visualMix${i}=(.24+visualD.a*.76)*${number(l.macro)};vec3 visualC${i}=mix(texture2D(visualColor${i},visualUv${i}).rgb,texture2D(visualColor${i},visualUvB${i}).rgb,visualMix${i});vec3 visualNa${i}=texture2D(visualNormal${i},visualUv${i}).rgb*2.0-1.0;vec3 visualNb${i}=texture2D(visualNormal${i},visualUvB${i}).rgb*2.0-1.0;visualNb${i}.xy=vec2(visualNb${i}.y,-visualNb${i}.x);vec3 visualNm${i}=mix(visualNa${i},visualNb${i},visualMix${i});visualNm${i}.xy*=${number(l.normal)};visualN+=normalize(visualNm${i})*visualW[${i}];visualColor+=visualC${i}*${vector(l.tint)}*visualW[${i}];visualRough+=${number(l.roughness)}*visualW[${i}];visualMetal+=${number(l.metalness)}*visualW[${i}];${theme==='char'&&i===1?'visualHeat=max(0.0,visualC1.r-max(visualC1.g,visualC1.b)*1.6)*visualW[1];':''}`;
  }
  colorCode+=`float visualOpen=texture2D(visualReveal,vMapUv).r;visualColor=mix(visualColor,${theme==='industrial'?'vec3(.36,.25,.08)':'visualColor*.78'},visualD.r);diffuseColor.rgb*=visualColor*(.8+visualD.g*.5)*mix(.28,1.0,visualOpen);`;
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',colorCode).replace('#include <normal_fragment_maps>','normal=normalize(tbn*normalize(visualN));').replace('#include <roughnessmap_fragment>','float roughnessFactor=visualRough;').replace('#include <metalnessmap_fragment>','float metalnessFactor=visualMetal;');
  if(theme==='char')s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.8,.19,.008)*visualHeat*visualOpen;');
 };
 material.customProgramCacheKey=()=>`original-ground-v1:${theme}:${JSON.stringify(p.layers)}`;
 const geometry=new THREE.PlaneGeometry(size,size,terrain.definition?size:1,terrain.definition?size:1);geometry.rotateX(-Math.PI/2);const positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i);positions.setY(i,(options.height?.(x,z)??terrain.height({x,z}))-.018);uv.setXY(i,(x+size/2)/size,(size/2-z)/size);}geometry.computeVertexNormals();geometry.computeBoundingSphere();geometries.push(geometry);
 const ground=new THREE.Mesh(geometry,material);ground.name=terrain.definition?'campaign-traversable-ground':'endless-traversable-ground';
 return {ground,stage,updateStage,setBases:(active:boolean)=>{bases.value=Number(active);},setLighting:(_active:{shadow:boolean;contact:boolean})=>{},report:()=>({profile:theme,layers:p.layers.map(l=>({...l})),bases:!!bases.value,independentMipmaps:true,sourceAlphaUsed:false})};
}
export const createCampaignGround=(terrain:RadialTerrain,resources:LandscapeResources,options:VisualGroundOptions={})=>createVisualGround(terrain,terrain.recipe.theme,terrain.recipe.seed,resources,options);
