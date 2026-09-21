import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {mapAnimations} from '../loaders/animations';

export type PoseClip={offset:number;frames:number;duration:number};
const FPS=24,CAPACITY=1024;
const object=new THREE.Object3D();

/** Sample original skeletal clips once, then interpolate bone matrices on the GPU.
 * Hundreds of actors share one mesh/material/pose atlas per original submesh.
 * Simulation time (not render delta) drives playback, including pause/debug speed.
 */
export class AnimatedBatch {
 meshes:THREE.InstancedMesh[]=[];attributes:THREE.InstancedBufferAttribute[]=[];
 blendAttributes:THREE.InstancedBufferAttribute[]=[]; weapon=new THREE.Vector3(0,.8,.5);
 clips=new Map<string,PoseClip>();actions:ReturnType<typeof mapAnimations>;
 count=0;scale:number;normalization:THREE.Matrix4;textureBytes=0;boneCount=0;
 constructor(gltf:GLTF,scene:THREE.Scene,height:number,normalization?:THREE.Matrix4){
  this.actions=mapAnimations(gltf.animations);
  const mixer=new THREE.AnimationMixer(gltf.scene),rest=this.actions.idle??gltf.animations[0];
  if(rest){mixer.clipAction(rest).play();mixer.setTime(0);}gltf.scene.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(gltf.scene),center=box.getCenter(new THREE.Vector3());
  this.scale=height/Math.max(.001,box.max.y-box.min.y);
  this.normalization=normalization?.clone()??new THREE.Matrix4().makeScale(this.scale,this.scale,this.scale).multiply(new THREE.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z));
  // Only gameplay clips; dance/fidget/portrait sequences remain in the GLB but do not cost GPU memory.
  const clips=[...new Set(Object.values(this.actions).filter((c):c is THREE.AnimationClip=>!!c))];
  let total=0;for(const c of clips){const frames=Math.max(2,Math.ceil(c.duration*FPS)+1);this.clips.set(c.name,{offset:total,frames,duration:c.duration});total+=frames;}
  const attachment=gltf.scene.getObjectByName('Ref_Weapon');if(attachment){const shot=this.actions.attack;if(shot){mixer.stopAllAction();mixer.clipAction(shot).reset().play();mixer.setTime(.05);}gltf.scene.updateMatrixWorld(true);attachment.getWorldPosition(this.weapon).applyMatrix4(this.normalization);}
  const nodes:THREE.SkinnedMesh[]=[];gltf.scene.traverse(n=>{if(n instanceof THREE.SkinnedMesh)nodes.push(n);});
  if(!nodes.length)throw Error('Animated GLB has no skinned mesh');
  // GLTF can duplicate skeleton objects across submeshes; bake each distinct bind palette once.
  const paletteKey=(s:THREE.Skeleton)=>s.bones.map(b=>b.uuid).join(',')+'|'+s.boneInverses.map(m=>m.elements.join(',')).join(';');
  const textures=new Map<string,THREE.DataTexture>();
  for(const n of nodes){const key=paletteKey(n.skeleton);if(textures.has(key))continue;const bones=n.skeleton.bones.length;this.boneCount=Math.max(this.boneCount,bones);
   const data=new Float32Array(total*bones*16);mixer.stopAllAction();
   for(const clip of clips){const p=this.clips.get(clip.name)!;mixer.stopAllAction();const a=mixer.clipAction(clip);a.reset().setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();
    for(let f=0;f<p.frames;f++){mixer.setTime(f/(p.frames-1)*clip.duration);gltf.scene.updateMatrixWorld(true);n.skeleton.update();if(!n.skeleton.boneMatrices)throw Error('Missing bone palette');data.set(n.skeleton.boneMatrices,(p.offset+f)*bones*16);}
   }
   if(!data.every(v=>Number.isFinite(v)&&Math.abs(v)<=65504))throw Error('Original pose has invalid or unbounded bone transforms');
   const packed=Uint16Array.from(data,THREE.DataUtils.toHalfFloat);
   const tex=new THREE.DataTexture(packed,bones*4,total,THREE.RGBAFormat,THREE.HalfFloatType);tex.magFilter=tex.minFilter=THREE.NearestFilter;tex.needsUpdate=true;textures.set(key,tex);this.textureBytes+=packed.byteLength;
  }
  mixer.stopAllAction();if(rest){mixer.clipAction(rest).reset().play();mixer.setTime(0);}gltf.scene.updateMatrixWorld(true);
  for(const n of nodes){const geometry=n.geometry.clone(),pose=new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY*4),4).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('unitPose',pose);
   const blend=new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY*4),4).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('unitBlend',blend);
   const weights=new Float32Array(geometry.attributes.position.count),indices=geometry.getAttribute('skinIndex'),skin=geometry.getAttribute('skinWeight');
   for(let v=0;v<weights.length;v++)for(let k=0;k<4;k++){const bone=n.skeleton.bones[indices.getComponent(v,k)];if(bone&&/spine|shoulder|arm|hand|head|weapon/i.test(bone.name))weights[v]+=skin.getComponent(v,k);}
   geometry.setAttribute('unitUpper',new THREE.BufferAttribute(weights,1));
   const assetMatrix=this.normalization.clone().multiply(n.matrixWorld).multiply(n.bindMatrixInverse),bind=n.bindMatrix.clone();
   const materials=(Array.isArray(n.material)?n.material:[n.material]).map(m=>{const mat=m.clone() as THREE.MeshStandardMaterial;
    mat.onBeforeCompile=shader=>{
     shader.uniforms.unitBoneAtlas={value:textures.get(paletteKey(n.skeleton))};shader.uniforms.unitBind={value:bind};shader.uniforms.unitAsset={value:assetMatrix};
     shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      attribute vec4 unitPose; attribute vec4 unitBlend; attribute float unitUpper; attribute vec4 skinIndex; attribute vec4 skinWeight;
      uniform sampler2D unitBoneAtlas; uniform mat4 unitBind; uniform mat4 unitAsset;
      varying float unitHit;
      mat4 unitBone(float bone,float frame){int x=int(bone)*4;int y=int(frame);return mat4(texelFetch(unitBoneAtlas,ivec2(x,y),0),texelFetch(unitBoneAtlas,ivec2(x+1,y),0),texelFetch(unitBoneAtlas,ivec2(x+2,y),0),texelFetch(unitBoneAtlas,ivec2(x+3,y),0));}
      mat4 unitFrame(float frame){mat4 a=unitBone(skinIndex.x,frame)*skinWeight.x;
       if(skinWeight.y>0.0)a+=unitBone(skinIndex.y,frame)*skinWeight.y;
       if(skinWeight.z>0.0)a+=unitBone(skinIndex.z,frame)*skinWeight.z;
       if(skinWeight.w>0.0)a+=unitBone(skinIndex.w,frame)*skinWeight.w;return a;}
      mat4 unitSkin(){mat4 a=unitFrame(unitPose.x);
       if(unitPose.z>0.001)a=a*(1.0-unitPose.z)+unitFrame(unitPose.y)*unitPose.z;
       if(unitBlend.w>0.001&&unitUpper>0.001){mat4 b=unitFrame(unitBlend.x);if(unitBlend.z>0.001)b=b*(1.0-unitBlend.z)+unitFrame(unitBlend.y)*unitBlend.z;float w=unitBlend.w*unitUpper;a=a*(1.0-w)+b*w;}
       return unitAsset*a*unitBind;}`)
      .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nmat4 unitTransform=unitSkin(); objectNormal=mat3(unitTransform)*objectNormal;')
      .replace('#include <begin_vertex>','vec3 transformed=(unitTransform*vec4(position,1.0)).xyz; unitHit=unitPose.w;');
     shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float unitHit;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.6,0.24,0.08)*unitHit;');
    };mat.customProgramCacheKey=()=> 'sc2-original-gpu-bones-v3';return mat;});
   const mesh=new THREE.InstancedMesh(geometry,materials.length===1?materials[0]:materials,CAPACITY);mesh.frustumCulled=false;mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);this.meshes.push(mesh);this.attributes.push(pose);this.blendAttributes.push(blend);
  }
  mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
 }
 begin(){this.count=0;}
 pose(action:keyof ReturnType<typeof mapAnimations>){const clip=this.actions[action]??this.actions.idle;return clip?this.clips.get(clip.name):this.clips.values().next().value;}
 add(x:number,y:number,z:number,facing:number,action:keyof ReturnType<typeof mapAnimations>,seconds:number,once=false,hit=0,shrink=1,interpolate=true,attackSeconds=-1){
  if(this.count>=CAPACITY)return;const p=this.pose(action);if(!p)return;
  const t=once?Math.min(p.duration,Math.max(0,seconds)):((seconds%p.duration)+p.duration)%p.duration;
  const frame=t/p.duration*(p.frames-1),a=Math.floor(frame),b=Math.min(p.frames-1,a+1);
  const attack=this.pose('attack'),shot=attack&&attackSeconds>=0?Math.min(attack.frames-1,attackSeconds/attack.duration*(attack.frames-1)):0,sa=Math.floor(shot),sb=Math.min((attack?.frames??1)-1,sa+1),weight=attackSeconds>=0?Math.max(0,1-attackSeconds/.55):0;
  object.position.set(x,y,z);object.rotation.set(0,facing,0);object.scale.setScalar(shrink);object.updateMatrix();
  this.meshes.forEach((m,i)=>{m.setMatrixAt(this.count,object.matrix);this.attributes[i].setXYZW(this.count,p.offset+a,p.offset+b,interpolate?frame-a:0,hit);this.blendAttributes[i].setXYZW(this.count,(attack?.offset??0)+sa,(attack?.offset??0)+sb,shot-sa,weight);});this.count++;
 }
 end(){this.meshes.forEach((m,i)=>{m.count=this.count;m.visible=this.count>0;m.instanceMatrix.needsUpdate=true;this.attributes[i].needsUpdate=true;this.blendAttributes[i].needsUpdate=true;});}
}
