import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {sourceSurface,type SourceEffectResource,type SourceMaterialResource} from './materials';
import {sourcePlacement} from './particles';
import type {SourceEffectRequest,SourcePhase} from './types';
import type {UnitMaterialSurface} from '../../materials/unit-material-batch';
import {commitInstances,uploadActive} from '../../units/instance-updates';

type Part={node:THREE.SkinnedMesh;bone:number;resource:SourceMaterialResource;mesh:THREE.InstancedMesh;surface:UnitMaterialSurface;normal:THREE.InstancedBufferAttribute;rawNormal:THREE.InstancedBufferAttribute};
type Pose={matrix:THREE.Matrix4;node:THREE.Matrix4;skin:THREE.Matrix3};
const undoConversion=new THREE.Matrix4().makeRotationX(Math.PI/2);
/** Only opaque single-bone surfaces qualify. All other original meshes retain their existing path. */
export class RigidSourceBatch {
 static create(resource:SourceEffectResource,scene:THREE.Scene){
  if(!resource.gltf||resource.definition.billboards?.length)return null;
  const nodes:THREE.Mesh[]=[];resource.gltf.scene.traverse(n=>{if(n instanceof THREE.Mesh)nodes.push(n);});
  if(!nodes.length||nodes.some(n=>!(n instanceof THREE.SkinnedMesh)||Array.isArray(n.material)||n.material.transparent||n.geometry.hasAttribute('tangent')||n.morphTargetInfluences?.length||rigidBone(n as THREE.SkinnedMesh)<0))return null;
  return new RigidSourceBatch(resource,scene);
 }
 private object:THREE.Object3D;private mixer:THREE.AnimationMixer;private actions:Map<string,THREE.AnimationAction>;private activeClip?:string;
 private parts:Part[]=[];private capacity=64;private count=0;private poses:SourcePhase[]=[];private phases=new Map<string,Map<number,Pose[]>>();
 constructor(private resource:SourceEffectResource,private scene:THREE.Scene){
  this.object=clone(resource.gltf!.scene);this.mixer=new THREE.AnimationMixer(this.object);this.actions=new Map(resource.gltf!.animations.map(c=>[c.name,this.mixer.clipAction(c)]));
  this.object.traverse(n=>{if(!(n instanceof THREE.SkinnedMesh))return;const m=n.material as THREE.Material,r=resource.materials.find(r=>r.base===m||r.base.name===m.name)!;this.parts.push({node:n,bone:rigidBone(n),resource:r,mesh:null!,surface:null!,normal:null!,rawNormal:null!});});this.grow(64);
 }
 private grow(size:number){this.capacity=2**Math.ceil(Math.log2(size));for(const part of this.parts){const old=part.mesh,oldSurface=part.surface,oldNormal=part.normal,oldRawNormal=part.rawNormal,geometry=part.node.geometry.clone();geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');
   part.normal=new THREE.InstancedBufferAttribute(new Float32Array(this.capacity*9),9).setUsage(THREE.DynamicDrawUsage);part.rawNormal=new THREE.InstancedBufferAttribute(new Float32Array(this.capacity*9),9).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('sourceRigidNormal',part.normal);geometry.setAttribute('sourceRigidRawNormal',part.rawNormal);
   part.surface=sourceSurface(part.resource,geometry,this.capacity,false,true);const mesh=part.mesh=new THREE.InstancedMesh(geometry,part.surface.material,this.capacity);mesh.name='source-rigid-'+this.resource.definition.id;mesh.userData.visualRole='effect';mesh.userData.combatEffect=true;mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(mesh);
   const compile=part.surface.material.onBeforeCompile,key=part.surface.material.customProgramCacheKey;
   part.surface.material.onBeforeCompile=(shader,renderer)=>{compile.call(part.surface.material,shader,renderer);shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute mat3 sourceRigidNormal;attribute mat3 sourceRigidRawNormal;').replace('#include <defaultnormal_vertex>',THREE.ShaderChunk.defaultnormal_vertex.replace('mat3 im = mat3( instanceMatrix );','mat3 im = sourceRigidNormal;').replace('transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );','')).replace('mat3(instanceMatrix)*mat3(unitTransform)*normal','sourceRigidRawNormal*normal');};
   part.surface.material.customProgramCacheKey=()=>key.call(part.surface.material)+':rigid-native-normal-v2';
   if(old){mesh.instanceMatrix.array.set(old.instanceMatrix.array);part.normal.array.set(oldNormal.array);part.rawNormal.array.set(oldRawNormal.array);for(let i=0;i<this.count;i++)part.surface.write(i,{clip:this.poses[i].clip.name,seconds:this.poses[i].seconds});old.removeFromParent();old.geometry.dispose();old.dispose();oldSurface.material.dispose();oldSurface.texture.dispose();}
  }}
 begin(){this.count=0;this.poses.length=0;this.phases.clear();}
 add(request:SourceEffectRequest,phase:SourcePhase){
  if(this.count===this.capacity)this.grow(this.capacity*2);
  let times=this.phases.get(phase.clip.name);if(!times){times=new Map();this.phases.set(phase.clip.name,times);}let transforms=times.get(phase.seconds);
  if(!transforms){const action=this.actions.get(phase.clip.name);if(this.activeClip!==phase.clip.name){this.mixer.stopAllAction();action?.reset().setLoop(THREE.LoopOnce,1).play();if(action)action.clampWhenFinished=true;this.activeClip=phase.clip.name;}if(action){action.enabled=true;action.paused=false;action.time=phase.seconds;this.mixer.update(0);}this.object.updateMatrixWorld(true);
   transforms=this.parts.map(p=>{const matrix=new THREE.Matrix4().multiplyMatrices(p.node.skeleton.bones[p.bone].matrixWorld,p.node.skeleton.boneInverses[p.bone]).multiply(p.node.bindMatrix);return {matrix,node:p.node.matrixWorld.clone(),skin:new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().multiplyMatrices(p.node.bindMatrixInverse,matrix))};});times.set(phase.seconds,transforms);
  }
  const placement=sourcePlacement(this.resource.definition,request.placement,request.age).multiply(undoConversion);
  for(let n=0;n<this.parts.length;n++){const p=this.parts[n],pose=transforms[n],normal=new THREE.Matrix3().getNormalMatrix(new THREE.Matrix4().multiplyMatrices(placement,pose.node));p.rawNormal.array.set(normal.elements,this.count*9);normal.multiply(pose.skin);p.normal.array.set(normal.elements,this.count*9);p.mesh.setMatrixAt(this.count,new THREE.Matrix4().multiplyMatrices(placement,pose.matrix));p.surface.write(this.count,{clip:phase.clip.name,seconds:phase.seconds});}this.poses.push(phase);this.count++;
 }
 end(){for(const p of this.parts){commitInstances(p.mesh,this.count);uploadActive(p.normal,this.count);uploadActive(p.rawNormal,this.count);p.surface.flush();}}
 async prepare(compile:(root:THREE.Object3D,displacement:boolean)=>Promise<unknown>){for(const p of this.parts){const count=p.mesh.count,visible=p.mesh.visible;p.mesh.count=1;p.mesh.visible=true;try{await compile(p.mesh,false);}finally{p.mesh.count=count;p.mesh.visible=visible;}}}
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.object);for(const p of this.parts){p.mesh.removeFromParent();p.mesh.geometry.dispose();p.mesh.dispose();p.surface.material.dispose();p.surface.texture.dispose();}const skeletons=new Set<THREE.Skeleton>();this.object.traverse(n=>{if(n instanceof THREE.SkinnedMesh)skeletons.add(n.skeleton);});for(const skeleton of skeletons)skeleton.dispose();}
 report(){return {model:this.resource.definition.id,instances:this.count,surfaces:this.parts.length,capacity:this.capacity};}
}
function rigidBone(node:THREE.SkinnedMesh){const indices=node.geometry.getAttribute('skinIndex'),weights=node.geometry.getAttribute('skinWeight');if(!indices||!weights)return -1;let bone=-1;
 for(let i=0;i<weights.count;i++){let found=-1;for(let j=0;j<4;j++){const weight=weights.getComponent(i,j);if(weight===0)continue;if(weight!==1||found!==-1)return -1;found=indices.getComponent(i,j);}if(found<0||bone>=0&&found!==bone)return -1;bone=found;}return bone;
}
