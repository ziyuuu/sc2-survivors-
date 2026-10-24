import {preparePoseData,preparePoseDataAsync,posePaletteKey,type PosePreparation,type PosePreparationControl} from './sampled-poses';
import {unitMaterialTextures} from '../materials/unit-material-loader';
import {commitInstances,uploadActive} from './instance-updates';

import {compileUnitPose} from './unit-pose-shader';
import {bindSourceDepth} from '../materials/posed-depth';
import * as THREE from 'three';
import {MeshoptSimplifier} from 'meshoptimizer';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';

import {mapAnimations} from '../loaders/animations';
import type {AnimationMode} from '../settings/quality';
import {createUnitMaterialSurface,type UnitMaterialSurface} from '../materials/unit-material-batch';
import type {UnitMaterialContext} from '../materials/source-tracks';

export type PoseClip={offset:number;frames:number;duration:number};
const CAPACITY=1024;
const object=new THREE.Object3D();

/** Sample original skeletal clips once, then interpolate bone matrices on the GPU.
 * Hundreds of actors share one mesh/material/pose atlas per original submesh.
 * Simulation time (not render delta) drives playback, including pause/debug speed.
 */
export class AnimatedBatch {
 meshes:THREE.InstancedMesh[]=[];attributes:THREE.InstancedBufferAttribute[]=[];
 readonly apparitionMeshes:THREE.InstancedMesh[]=[];private apparitionCount=0;
 private apparitionAttributes:THREE.InstancedBufferAttribute[]=[];
 get allMeshes(){return [...this.meshes,...this.apparitionMeshes];}
 tierAttributes:THREE.InstancedBufferAttribute[]=[];
 aimAttributes:THREE.InstancedBufferAttribute[]=[];turretPivot=new THREE.Vector3();
 blendAttributes:THREE.InstancedBufferAttribute[]=[]; weapon=new THREE.Vector3(0,.8,.5);
 weaponTracks=new Map<string,THREE.Vector3[]>();
 clips=new Map<string,PoseClip>();actions:ReturnType<typeof mapAnimations>;
 private lodIndices:{full:THREE.BufferAttribute;low:THREE.BufferAttribute}[]=[];private lowDetail=false;lodRatio=1;
 count=0;bodyOutline:THREE.Vector3[];bodyRadius:number;bodyHeight:number;scale:number;normalization:THREE.Matrix4;textureBytes=0;boneCount=0;
 animationMode:AnimationMode='complete';
 private ownedPoseTextures:THREE.Texture[]=[];
 readonly materialSurfaces:UnitMaterialSurface[]=[];
 private simplePose=false;
 static async create(gltf:GLTF,scene:THREE.Scene,height:number,normalization?:THREE.Matrix4,unitScale=1,profile?:string,referenceBodyHeight?:number,control:PosePreparationControl={}){
  const data=await preparePoseDataAsync([gltf,height,normalization,unitScale,profile,referenceBodyHeight],control);
  const batch=new AnimatedBatch(gltf,scene,height,normalization,unitScale,profile,referenceBodyHeight,data,true);
  try{for(const _ of batch.buildMeshes(data,scene)){if(control.cancelled?.())throw Error('模型准备已取消');if(control.yield)await control.yield();}if(control.cancelled?.())throw Error('模型准备已取消');return batch;}
  catch(error){batch.dispose();throw error;}
 }
 constructor(gltf:GLTF,scene:THREE.Scene,height:number,normalization?:THREE.Matrix4,unitScale=1,profile?:string,referenceBodyHeight?:number,prepared?:PosePreparation,deferred=false){
  this.simplePose=profile?.startsWith('fun-')??false;
  const data=prepared??preparePoseData(gltf,height,normalization,unitScale,profile,referenceBodyHeight);
  this.actions=data.actions;this.scale=data.scale;this.normalization=data.normalization;this.bodyHeight=data.bodyHeight;this.bodyRadius=data.bodyRadius;this.bodyOutline=data.bodyOutline;this.turretPivot.copy(data.turretPivot);this.clips=data.clips;this.weaponTracks=data.weaponTracks;this.weapon.copy(data.weapon);this.boneCount=data.boneCount;
  if(!deferred)for(const _ of this.buildMeshes(data,scene)){}
 }
 private *buildMeshes(data:PosePreparation,scene:THREE.Scene){
  const nodes=data.nodes,turretBones=data.turretBones,paletteKey=posePaletteKey,textures=new Map<string,THREE.DataTexture>();
  for(const [key,palette]of data.palettes){const tex=new THREE.DataTexture(palette.packed,palette.bones*4,data.totalFrames,THREE.RGBAFormat,THREE.HalfFloatType);tex.magFilter=tex.minFilter=THREE.NearestFilter;tex.needsUpdate=true;textures.set(key,tex);this.ownedPoseTextures.push(tex);this.textureBytes+=palette.packed.byteLength;}
  for(const n of nodes){const geometry=n.geometry.clone(),pose=new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY*4),4).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('unitPose',pose);const tier=new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY),1).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('unitTier',tier);this.tierAttributes.push(tier);
   const apparition=new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY*4).fill(1),4).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('unitApparition',apparition);this.apparitionAttributes.push(apparition);
   const full=geometry.getIndex();if(full&&geometry.groups.length<=1&&MeshoptSimplifier.supported){const position=geometry.getAttribute('position'),positions=new Float32Array(position.count*3);for(let v=0;v<position.count;v++){positions[v*3]=position.getX(v);positions[v*3+1]=position.getY(v);positions[v*3+2]=position.getZ(v);}
    const [indices]=MeshoptSimplifier.simplify(new Uint32Array(full.array),positions,3,Math.max(3,Math.floor(full.count*.3/3)*3),.035,['RegularizeLight']);const low=new THREE.BufferAttribute(indices,1);this.lodIndices.push({full,low});this.lodRatio=Math.min(this.lodRatio,indices.length/full.count);
   }else if(full)this.lodIndices.push({full,low:full});
   const blend=new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY*4),4).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('unitBlend',blend);
   const weights=new Float32Array(geometry.attributes.position.count),indices=geometry.getAttribute('skinIndex'),skin=geometry.getAttribute('skinWeight');
   for(let v=0;v<weights.length;v++)for(let k=0;k<4;k++){const bone=n.skeleton.bones[indices.getComponent(v,k)];if(bone&&/spine|shoulder|arm|hand|head|weapon/i.test(bone.name))weights[v]+=skin.getComponent(v,k);}
   geometry.setAttribute('unitUpper',new THREE.BufferAttribute(weights,1));
   const turretWeights=new Float32Array(weights.length);for(let v=0;v<weights.length;v++)for(let k=0;k<4;k++)if(turretBones.has(n.skeleton.bones[indices.getComponent(v,k)]))turretWeights[v]+=skin.getComponent(v,k);geometry.setAttribute('unitTurret',new THREE.BufferAttribute(turretWeights,1));
   const aim=new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY*2),2).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('unitAim',aim);
   const assetMatrix=this.normalization.clone().multiply(n.matrixWorld).multiply(n.bindMatrixInverse),bind=n.bindMatrix.clone();
   geometry.computeBoundingBox();const accentTop=geometry.boundingBox?.max.y??0,accentBottom=geometry.boundingBox?.min.y??0,accentStart=accentTop-Math.max(.001,accentTop-accentBottom)*.18;
   const poseUniforms={simple:this.simplePose,atlas:textures.get(paletteKey(n.skeleton))!,bind,asset:assetMatrix,pivot:this.turretPivot,accent:new THREE.Vector2(accentStart,accentTop)};
   const materials=(Array.isArray(n.material)?n.material:[n.material]).map(m=>{const surface=createUnitMaterialSurface(m,CAPACITY),mat=surface?.material??m.clone();if(surface)this.materialSurfaces.push(surface);
    mat.onBeforeCompile=(shader,renderer)=>{if(!surface)m.onBeforeCompile(shader,renderer);
     compileUnitPose(shader,poseUniforms);
     shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float unitHit; varying float specialTier; varying float localAccent;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat hitRim=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),3.0); totalEmissiveRadiance += (diffuseColor.rgb*.32+vec3(.18,.07,.025))*unitHit*(.12+.88*hitRim); if(specialTier<-.5){float dissolve=clamp(-specialTier-1.0,0.0,1.0);float grain=fract(sin(dot(vViewPosition.xy,vec2(12.9898,78.233)))*43758.5453);if(grain<dissolve)discard;totalEmissiveRadiance+=vec3(.15,.5,.68)*sin(dissolve*3.14159)*.8;} if(specialTier>0.5&&specialTier<4.5){float rim=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),2.0);vec3 glow=specialTier>2.5?vec3(1.0,.58,.12):specialTier>1.5?vec3(1.0,.32,.03):vec3(.54,.1,.85);totalEmissiveRadiance += glow*(specialTier>2.5?.2+rim*2.1:.12+rim*1.5);} if(specialTier>14.5){float phase=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);if(phase<.7)discard;totalEmissiveRadiance+=vec3(.12,.35,.6)*.45;} if(specialTier>13.5){float heroRim=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),7.0);totalEmissiveRadiance+=vec3(1.0,.49,.10)*heroRim*.72;}');
     surface?.compile(shader,geometry);if(!surface)compileFallbackApparition(shader);
    };mat.customProgramCacheKey=()=> 'sc2-original-gpu-bones-v11:'+(this.simplePose?'fun-simple:':'')+(surface?.programKey(geometry)??m.customProgramCacheKey());
    bindSourceDepth(mat,{key:()=>surface?'sc2-original-gpu-bones-depth-v11:'+(this.simplePose?'fun-simple:':'')+surface.programKey(geometry,true,true):mat.customProgramCacheKey(),compile:(shader,renderer)=>{if(!surface)m.onBeforeCompile(shader,renderer);compileUnitPose(shader,poseUniforms);surface?.compile(shader,geometry,true,true);if(!surface)compileFallbackApparition(shader);shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float specialTier;').replace('#include <alphatest_fragment>','#include <alphatest_fragment>\nif(specialTier<-.5||specialTier>14.5)discard;');}});return mat;});
   const mesh=new THREE.InstancedMesh(geometry,materials.length===1?materials[0]:materials,CAPACITY);mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);this.meshes.push(mesh);this.attributes.push(pose);this.blendAttributes.push(blend);this.aimAttributes.push(aim);yield;
  }
  this.ownedPoseTextures=[...textures.values()];
 }
 /** Extra colour pass only, sharing the original poses, geometry and slot data.
  * Real bodies retain their original materials and depth/shadow behaviour. */
 enableApparitions(scene:THREE.Scene){if(this.apparitionMeshes.length)return;
  for(const base of this.meshes){const originals=Array.isArray(base.material)?base.material:[base.material],materials=originals.map(original=>{
   const material=original.clone();material.transparent=true;material.depthWrite=false;material.forceSinglePass=true;material.userData.visualRole='effect';
   material.onBeforeCompile=(shader,renderer)=>{original.onBeforeCompile(shader,renderer);if(shader.uniforms.umApparitionPass)shader.uniforms.umApparitionPass.value=1;};
   material.customProgramCacheKey=()=>original.customProgramCacheKey()+':apparition-alpha';return material;
  });
   const mesh=new THREE.InstancedMesh(base.geometry,materials.length===1?materials[0]:materials,CAPACITY);mesh.instanceMatrix=base.instanceMatrix;mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;mesh.count=0;mesh.userData.visualRole='effect';mesh.name='equipment-apparition';scene.add(mesh);this.apparitionMeshes.push(mesh);
  }
 }
 /** Retire optional batches that have never entered a battle. Shared image data
  * remains in the immutable decoder cache; only this batch's GPU wrappers retire. */
 dispose(){const textures=new Set<THREE.Texture>([...this.ownedPoseTextures,...this.materialSurfaces.map(s=>s.texture)]);
  for(const mesh of this.apparitionMeshes){mesh.removeFromParent();for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.dispose();mesh.dispose();}
  for(const mesh of this.meshes){mesh.removeFromParent();mesh.geometry.dispose();for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);for(const value of unitMaterialTextures(material))textures.add(value);material.dispose();}mesh.dispose();}
  for(const texture of textures)texture.dispose();
 }
 weaponAt(action:keyof ReturnType<typeof mapAnimations>,seconds:number,side?:string){const clip=this.actions[action],points=clip?this.weaponTracks.get(clip.name+(side?':'+side:''))??this.weaponTracks.get(clip.name):undefined;if(!clip||!points?.length)return this.weapon.clone();const f=Math.max(0,Math.min(points.length-1,seconds/clip.duration*(points.length-1))),i=Math.floor(f);return points[i].clone().lerp(points[Math.min(i+1,points.length-1)],f-i);}
 setLod(low:boolean){if(this.lowDetail===low)return;this.lowDetail=low;this.meshes.forEach((mesh,i)=>{const indices=this.lodIndices[i];if(indices){mesh.geometry.setIndex(low?indices.low:indices.full);if(mesh.geometry.groups.length===1)mesh.geometry.groups[0].count=mesh.geometry.getIndex()!.count;}});}
 begin(){this.count=0;this.apparitionCount=0;}
 pose(action:keyof ReturnType<typeof mapAnimations>){const clip=this.actions[action]??this.actions.idle;return clip?this.clips.get(clip.name):this.clips.values().next().value;}
 add(x:number,y:number,z:number,facing:number,action:keyof ReturnType<typeof mapAnimations>,seconds:number,once=false,hit=0,shrink=1,interpolate=true,attackSeconds=-1,turretYaw=0,tier=0,attackKey:keyof ReturnType<typeof mapAnimations>='attack',poseSampled=false,materialContext?:UnitMaterialContext){
  if(this.count>=CAPACITY)return;const p=this.pose(action);if(!p)return;
  if(materialContext?.apparition)this.apparitionCount++;
  const apparition=materialContext?.apparition;for(const attribute of this.apparitionAttributes)attribute.setXYZW(this.count,...(apparition?.tint??[1,1,1]),apparition?.opacity??1);
  if(this.animationMode==='energy-saving'){interpolate=false;if(!poseSampled){seconds=Math.floor(seconds*15)/15;if(attackSeconds>=0)attackSeconds=Math.floor(attackSeconds*15)/15;}}
  const t=once?Math.min(p.duration,Math.max(0,seconds)):((seconds%p.duration)+p.duration)%p.duration;
  const frame=t/p.duration*(p.frames-1),a=Math.floor(frame),b=Math.min(p.frames-1,a+1);
  const attack=this.pose(attackKey),shot=attack&&attackSeconds>=0?Math.min(attack.frames-1,attackSeconds/attack.duration*(attack.frames-1)):0,sa=Math.floor(shot),sb=Math.min((attack?.frames??1)-1,sa+1),weight=attackSeconds>=0?(attackKey==='attackLeft'||attackKey==='attackRight'?Math.min(1,Math.max(0,((attack?.duration??0)-attackSeconds)/.12)):Math.max(0,1-attackSeconds/.55)):0;
  if(this.materialSurfaces.length){const pose={clip:(this.actions[action]??this.actions.idle)?.name??'',seconds:t,attackClip:weight>.001?this.actions[attackKey]?.name:undefined,attackSeconds:Math.max(0,Math.min(attack?.duration??0,attackSeconds))};for(const surface of this.materialSurfaces)surface.write(this.count,pose,materialContext);}
  object.position.set(x,y,z);object.rotation.set(0,facing,0);object.scale.setScalar(shrink);object.updateMatrix();
  this.meshes.forEach((m,i)=>{m.setMatrixAt(this.count,object.matrix);this.tierAttributes[i].setX(this.count,tier);this.aimAttributes[i].setXY(this.count,Math.sin(turretYaw),Math.cos(turretYaw));this.attributes[i].setXYZW(this.count,p.offset+a,p.offset+b,interpolate?frame-a:0,hit);this.blendAttributes[i].setXYZW(this.count,(attack?.offset??0)+sa,(attack?.offset??0)+sb,interpolate?shot-sa:0,weight);});this.count++;
 }
 end(){this.meshes.forEach((m,i)=>{commitInstances(m,this.count);uploadActive(this.attributes[i],this.count);uploadActive(this.blendAttributes[i],this.count);uploadActive(this.aimAttributes[i],this.count);uploadActive(this.tierAttributes[i],this.count);uploadActive(this.apparitionAttributes[i],this.count);});for(const mesh of this.apparitionMeshes){mesh.count=this.apparitionCount?this.count:0;mesh.visible=mesh.count>0;}for(const surface of this.materialSurfaces)surface.flush();}
}

/** Converted fallback materials need the same instance isolation as source surfaces. */
function compileFallbackApparition(shader:THREE.WebGLProgramParametersWithUniforms){
 shader.uniforms.umApparitionPass={value:0};
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 unitApparition;varying vec4 fallbackApparition;').replace('#include <begin_vertex>','#include <begin_vertex>\nfallbackApparition=unitApparition;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec4 fallbackApparition;uniform float umApparitionPass;').replace('#include <alphatest_fragment>','if(umApparitionPass<.5){if(fallbackApparition.a<1.0)discard;}else{if(fallbackApparition.a>=1.0)discard;diffuseColor.a*=fallbackApparition.a;}diffuseColor.rgb*=fallbackApparition.rgb;\n#include <alphatest_fragment>');
}
