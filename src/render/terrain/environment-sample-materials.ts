import * as THREE from 'three';
import {prepareEmbeddedAssetIds} from '../../assets/offline-pack';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {assetUrl} from '../../assets/manifest';
import {bindSceneTextures} from '../materials/scene-textures';
import {bindSourceDepth} from '../materials/posed-depth';
import type {LandscapeResources} from './campaign-ground';
import type {CampaignMapPresentation} from './campaign-map';
import data from './environment-sample-assets.json';

interface Layer {filename:string;uv:number;channel:number;multiply:number;add:number;flags:number}
interface SourceMaterial {name:string;index:number;flags:number;blend:number;specularity:number;hdrEnvironment:number;layers:Record<string,Layer>}
interface Projection {bone:string;active:number;box:number[];layers:Record<string,Layer>;name:string}
interface SourceModel {sourceFile:string;sourceSha256:string;standard:SourceMaterial[];projections:Projection[]}
const models=data.models as unknown as Record<string,SourceModel>,files=data.files as Record<string,string[]>;
const textureCache=new WeakMap<LandscapeResources,Map<string,Promise<THREE.Texture>>>();
export {data as environmentSampleAssets};
export function sampleTexture(filename:string,resources:LandscapeResources){
 filename=filename.toLowerCase();let cache=textureCache.get(resources);if(!cache){cache=new Map();textureCache.set(resources,cache)}const prior=cache.get(filename);if(prior)return prior;
 const promise=(async()=>{const id=files[filename]?.[0],record=data.records.find(r=>r.id===id);if(!record)throw Error('Missing source-bound scenery texture '+filename);await prepareEmbeddedAssetIds([id]);const url=assetUrl(id);if(!url)throw Error('Source scenery texture is not prepared: '+id);const t=await new THREE.TextureLoader().loadAsync(url);resources.textures.push(t);t.name=id;t.colorSpace=record.linear?THREE.NoColorSpace:THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t})();cache.set(filename,promise);return promise;
}
const channel=(expression:string,layer:Layer)=>`clamp(${layer.channel>=2?expression+'.'+(['a','r','g','b'][layer.channel-2]??'r'):expression+'.r'}*${layer.multiply.toFixed(6)}+${layer.add.toFixed(6)},0.0,1.0)`;
/** Static source channels omitted by the old map export. Matches the existing unit PBR adaptation. */
export async function prepareEnvironmentSampleModel(g:GLTF,id:string,resources:LandscapeResources){
 const source=models[id];if(!source)return;const seen=new Set<THREE.Material>();const jobs:Promise<void>[]=[];
 g.scene.traverse(n=>{if(!(n instanceof THREE.Mesh))return;for(const raw of Array.isArray(n.material)?n.material:[n.material]){if(seen.has(raw))continue;seen.add(raw);const definition=source.standard.find(s=>s.name===raw.name);if(!definition||!(raw instanceof THREE.MeshStandardMaterial))continue;
 jobs.push((async()=>{
  if(id==='model.map.cliffnatural0ex1_bbbc_00'){
   const color=await sampleTexture(definition.layers.layer_diff.filename,resources),normal=await sampleTexture(definition.layers.layer_norm.filename,resources);
   // Original UV 18 is terrain-generated; authored world triplanar coordinates supply the missing web channel.
   raw.map=color;raw.normalMap=normal;raw.transparent=false;raw.opacity=1;raw.alphaTest=0;raw.depthWrite=true;raw.vertexColors=false;raw.color.set(0xffffff);raw.roughness=.9;raw.userData.sc2={...(raw.userData.sc2??{}),role:'body',layers:[]};n.userData.sc2Role='body';
   raw.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{cliffColor:{value:color},cliffNormal:{value:normal}});const vary='varying vec3 sampleWorld;varying vec3 sampleWorldNormal;';
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+vary).replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\nsampleWorldNormal=inverseTransformDirection(transformedNormal,viewMatrix);').replace('#include <project_vertex>','#include <project_vertex>\nvec4 samplePosition=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nsamplePosition=instanceMatrix*samplePosition;\n#endif\nsampleWorld=(modelMatrix*samplePosition).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+vary+'uniform sampler2D cliffColor;uniform sampler2D cliffNormal;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 cliffAxis=normalize(sampleWorldNormal);vec3 cliffWeight=pow(abs(cliffAxis),vec3(4.0));cliffWeight/=max(.0001,dot(cliffWeight,vec3(1.0)));vec2 cliffUvX=sampleWorld.zy*.25;vec2 cliffUvY=vec2(sampleWorld.x,-sampleWorld.z)*.25;vec2 cliffUvZ=sampleWorld.xy*.25;vec4 cliffPixels=texture2D(cliffColor,cliffUvX)*cliffWeight.x+texture2D(cliffColor,cliffUvY)*cliffWeight.y+texture2D(cliffColor,cliffUvZ)*cliffWeight.z;diffuseColor.rgb*=cliffPixels.rgb;diffuseColor.a*=clamp(cliffPixels.a+1.0,0.0,1.0);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`vec3 cliffNx=texture2D(cliffNormal,cliffUvX).xyz*2.0-1.0;vec3 cliffNy=texture2D(cliffNormal,cliffUvY).xyz*2.0-1.0;vec3 cliffNz=texture2D(cliffNormal,cliffUvZ).xyz*2.0-1.0;vec3 cliffN=normalize(vec3(cliffNx.z*sign(cliffAxis.x),cliffNx.y,cliffNx.x)*cliffWeight.x+vec3(cliffNy.x,cliffNy.z*sign(cliffAxis.y),-cliffNy.y)*cliffWeight.y+vec3(cliffNz.x,cliffNz.y,cliffNz.z*sign(cliffAxis.z))*cliffWeight.z);normal=normalize(mat3(viewMatrix)*cliffN);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\nmaterial.specularColor*=clamp(cliffPixels.b*.075,0.0,1.0);');
   };raw.customProgramCacheKey=()=> 'source-cliff-uv18-world-v1';bindSourceDepth(raw,{key:()=> 'source-cliff-saturated-alpha-v1',compile:shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\ndiffuseColor.a=1.0;')}});bindSceneTextures(raw,[color,normal]);raw.needsUpdate=true;return;
  }
  const gloss=definition.layers.layer_gloss,environment=definition.layers.layer_envi,mask=definition.layers.layer_envi_mask;
  const extra:THREE.Texture[]=[];const glossTexture=gloss?await sampleTexture(gloss.filename,resources):undefined,environmentTexture=environment?await sampleTexture(environment.filename,resources):undefined,maskTexture=mask?await sampleTexture(mask.filename,resources):undefined;
  if(!glossTexture&&!environmentTexture)return;for(const t of [glossTexture,environmentTexture,maskTexture])if(t){t.flipY=false;extra.push(t);}
  const original=raw.onBeforeCompile,key=raw.customProgramCacheKey.bind(raw);raw.onBeforeCompile=(shader,renderer)=>{original.call(raw,shader,renderer);Object.assign(shader.uniforms,{sampleGloss:{value:glossTexture},sampleEnvironment:{value:environmentTexture},sampleEnvironmentMask:{value:maskTexture}});
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 sampleUv;').replace('#include <uv_vertex>','#include <uv_vertex>\nsampleUv=uv;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 sampleUv;uniform sampler2D sampleGloss;uniform sampler2D sampleEnvironment;uniform sampler2D sampleEnvironmentMask;');
   if(glossTexture)shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=clamp(1.0-${channel('texture2D(sampleGloss,sampleUv)',gloss)},.04,1.0);`);
   if(environmentTexture)shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>\nvec3 sampleReflection=inverseTransformDirection(reflect(-normalize(vViewPosition),normal),viewMatrix);vec2 sampleReflectionUv=vec2(atan(sampleReflection.z,sampleReflection.x)/6.2831853+.5,asin(clamp(sampleReflection.y,-1.0,1.0))/3.1415927+.5);reflectedLight.indirectSpecular+=texture2D(sampleEnvironment,sampleReflectionUv).rgb*${maskTexture?channel('texture2D(sampleEnvironmentMask,sampleUv)',mask):'1.0'}*material.specularColor*(1.0-roughnessFactor*.5)*${definition.hdrEnvironment.toFixed(6)};`);
  };raw.customProgramCacheKey=()=>key()+':sample-source-extras:'+id;bindSceneTextures(raw,extra);raw.needsUpdate=true;
 })());}});await Promise.all(jobs);
}

/** Original type-9 static projection, sampled onto actual terrain rather than a floating rectangle. */
export const decorateEnvironmentSampleInstances:NonNullable<CampaignMapPresentation['decorateInstances']>=async({root,model,id,matrices,bodyBox,terrain,resources})=>{
 const source=models[id];if(!source?.projections.length)return;const center=bodyBox.getCenter(new THREE.Vector3());
 for(const projection of source.projections){if(!projection.active)continue;const bone=model.scene.getObjectByName(projection.bone);if(!bone)throw Error('Missing source scenery projection attachment '+projection.bone);const diff=projection.layers.layer_diff;if(!diff)continue;const map=await sampleTexture(diff.filename,resources),normal=projection.layers.layer_norm?await sampleTexture(projection.layers.layer_norm.filename,resources):undefined;
 const spec=projection.layers.layer_spec,specular=spec?await sampleTexture(spec.filename,resources):undefined;
 // These use the source glTF UV convention; terrain/world UV textures keep their own convention.
 for(const t of [map,normal,specular])if(t)t.flipY=false;
 const material=new THREE.MeshStandardMaterial({map,normalMap:normal,roughness:.95,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,side:THREE.DoubleSide});material.name='original-scenery-projection:'+id;resources.materials.push(material);bindSceneTextures(material,[map,...normal?[normal]:[],...specular?[specular]:[]]);
 if(specular){material.onBeforeCompile=s=>{s.uniforms.sampleProjectionSpecular={value:specular};s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D sampleProjectionSpecular;').replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>\nmaterial.specularColor*=texture2D(sampleProjectionSpecular,vMapUv).rgb*${spec.multiply.toFixed(6)}+vec3(${spec.add.toFixed(6)});`)};material.customProgramCacheKey=()=> 'source-scenery-projection-specular:'+id;}
 for(const matrix of matrices){const segments=10,g=new THREE.PlaneGeometry(1,1,segments,segments),p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){const v=new THREE.Vector3(THREE.MathUtils.lerp(projection.box[0],projection.box[1],uv.getX(i)),THREE.MathUtils.lerp(projection.box[2],projection.box[3],uv.getY(i)),0).applyMatrix4(bone.matrixWorld);v.x-=center.x;v.y-=bodyBox.min.y;v.z-=center.z;v.applyMatrix4(matrix);p.setXYZ(i,v.x,terrain.height({x:v.x,z:v.z})+.008,v.z)}g.computeVertexNormals();g.computeBoundingSphere();resources.geometries.push(g);const mesh=new THREE.Mesh(g,material);mesh.name=material.name;root.add(mesh);
 }
 }
};
