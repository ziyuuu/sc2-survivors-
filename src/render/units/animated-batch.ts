import {commitInstances,uploadActive} from './instance-updates';
import * as THREE from 'three';
import {MeshoptSimplifier} from 'meshoptimizer';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {sc2BodyBounds,sc2ModelScale} from '../loaders/sc2-materials';
import {mapAnimations,weaponAttachmentNames} from '../loaders/animations';

export type PoseClip={offset:number;frames:number;duration:number};
const FPS=24,CAPACITY=1024;
const object=new THREE.Object3D();

/** Sample original skeletal clips once, then interpolate bone matrices on the GPU.
 * Hundreds of actors share one mesh/material/pose atlas per original submesh.
 * Simulation time (not render delta) drives playback, including pause/debug speed.
 */
export class AnimatedBatch {
 meshes:THREE.InstancedMesh[]=[];attributes:THREE.InstancedBufferAttribute[]=[];
 tierAttributes:THREE.InstancedBufferAttribute[]=[];
 aimAttributes:THREE.InstancedBufferAttribute[]=[];turretPivot=new THREE.Vector3();
 blendAttributes:THREE.InstancedBufferAttribute[]=[]; weapon=new THREE.Vector3(0,.8,.5);
 weaponTracks=new Map<string,THREE.Vector3[]>();
 clips=new Map<string,PoseClip>();actions:ReturnType<typeof mapAnimations>;
 private lodIndices:{full:THREE.BufferAttribute;low:THREE.BufferAttribute}[]=[];private lowDetail=false;lodRatio=1;
 count=0;bodyHeight:number;scale:number;normalization:THREE.Matrix4;textureBytes=0;boneCount=0;
 constructor(gltf:GLTF,scene:THREE.Scene,height:number,normalization?:THREE.Matrix4,unitScale=1,profile?:string){
  // Nova's exported Bone_Gun is offset from her hand by 0.89 source units.
  // The A rifle pose requires the weapon root at the hand; texture links are already correct.
  if(profile==='hero.nova'){const gun=gltf.scene.getObjectByName('Bone_Gun');if(!gun)throw Error('Nova weapon bone missing');gun.position.set(0,0,0);}
  this.actions=mapAnimations(gltf.animations,profile);
  const mixer=new THREE.AnimationMixer(gltf.scene),rest=this.actions.idle??gltf.animations[0];
  if(rest){mixer.clipAction(rest).play();mixer.setTime(0);}gltf.scene.updateMatrixWorld(true);
  const box=sc2BodyBounds(gltf.scene),center=box.getCenter(new THREE.Vector3());
  const sourceScale=sc2ModelScale(gltf.scene);this.scale=sourceScale===undefined?height/Math.max(.001,box.max.y-box.min.y):1.4*sourceScale;
  this.scale*=unitScale;
  this.normalization=normalization?.clone()??new THREE.Matrix4().makeScale(this.scale,this.scale,this.scale).multiply(new THREE.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z));
  const body=box.clone().applyMatrix4(this.normalization);this.bodyHeight=body.max.y-body.min.y;
  const turret=gltf.scene.getObjectByName('Bone_Turret_Base'),turretBones=new Set<THREE.Object3D>();turret?.traverse(n=>turretBones.add(n));turret?.getWorldPosition(this.turretPivot).applyMatrix4(this.normalization);
  // Only gameplay clips; dance/fidget/portrait sequences remain in the GLB but do not cost GPU memory.
  const clips=[...new Set(Object.values(this.actions).filter((c):c is THREE.AnimationClip=>!!c))];
  let total=0;for(const c of clips){const frames=Math.max(2,Math.ceil(c.duration*FPS)+1);this.clips.set(c.name,{offset:total,frames,duration:c.duration});total+=frames;}
  for(const clip of clips){const attachment=weaponAttachmentNames(clip.name).map(name=>gltf.scene.getObjectByName(name)).find(Boolean);if(!attachment)continue;const p=this.clips.get(clip.name)!,points:THREE.Vector3[]=[];mixer.stopAllAction();const action=mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();for(let f=0;f<p.frames;f++){mixer.setTime(f/(p.frames-1)*clip.duration);gltf.scene.updateMatrixWorld(true);points.push(attachment.getWorldPosition(new THREE.Vector3()).applyMatrix4(this.normalization));}this.weaponTracks.set(clip.name,points);}
  this.weapon.copy(this.weaponAt('attack',.05));
  const nodes:THREE.SkinnedMesh[]=[];gltf.scene.traverse(n=>{
   // The original Nova model stores sword, shotgun and plasma variants in separate skinned meshes.
   // A-group animations use the canister rifle; the other meshes lack visibility keys in glTF.
   if(n instanceof THREE.SkinnedMesh&&(profile!=='hero.nova'||['M3_Mesh_6','M3_Mesh_7','M3_Mesh_15'].includes(n.name)))nodes.push(n);
  });
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
  for(const n of nodes){const geometry=n.geometry.clone(),pose=new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY*4),4).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('unitPose',pose);const tier=new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY),1).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('unitTier',tier);this.tierAttributes.push(tier);
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
   const materials=(Array.isArray(n.material)?n.material:[n.material]).map(m=>{const mat=m.clone() as THREE.MeshStandardMaterial;
    mat.onBeforeCompile=(shader,renderer)=>{m.onBeforeCompile(shader,renderer);
     shader.uniforms.turretPivot={value:this.turretPivot};shader.uniforms.unitBoneAtlas={value:textures.get(paletteKey(n.skeleton))};shader.uniforms.unitBind={value:bind};shader.uniforms.unitAsset={value:assetMatrix};shader.uniforms.unitAccentRange={value:new THREE.Vector2(accentStart,accentTop)};
     shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      attribute vec2 unitAim; attribute float unitTurret; uniform vec3 turretPivot;
      vec3 aimTurret(vec3 p){float s=unitAim.x,c=unitAim.y;return vec3(p.x*c+p.z*s,p.y,p.z*c-p.x*s);}
      attribute vec4 unitPose; attribute vec4 unitBlend; attribute float unitUpper; attribute vec4 skinIndex; attribute vec4 skinWeight;
      uniform sampler2D unitBoneAtlas; uniform mat4 unitBind; uniform mat4 unitAsset;
      varying float unitHit; varying float specialTier; varying float localAccent; attribute float unitTier; uniform vec2 unitAccentRange;
      mat4 unitBone(float bone,float frame){int x=int(bone)*4;int y=int(frame);return mat4(texelFetch(unitBoneAtlas,ivec2(x,y),0),texelFetch(unitBoneAtlas,ivec2(x+1,y),0),texelFetch(unitBoneAtlas,ivec2(x+2,y),0),texelFetch(unitBoneAtlas,ivec2(x+3,y),0));}
      mat4 unitFrame(float frame){mat4 a=unitBone(skinIndex.x,frame)*skinWeight.x;
       if(skinWeight.y>0.0)a+=unitBone(skinIndex.y,frame)*skinWeight.y;
       if(skinWeight.z>0.0)a+=unitBone(skinIndex.z,frame)*skinWeight.z;
       if(skinWeight.w>0.0)a+=unitBone(skinIndex.w,frame)*skinWeight.w;return a;}
      mat4 unitSkin(){mat4 a=unitFrame(unitPose.x);
       if(unitPose.z>0.001)a=a*(1.0-unitPose.z)+unitFrame(unitPose.y)*unitPose.z;
       if(unitBlend.w>0.001&&unitUpper>0.001){mat4 b=unitFrame(unitBlend.x);if(unitBlend.z>0.001)b=b*(1.0-unitBlend.z)+unitFrame(unitBlend.y)*unitBlend.z;float w=unitBlend.w*unitUpper;a=a*(1.0-w)+b*w;}
       return unitAsset*a*unitBind;}`)
      .replace(/void main\(\)\s*\{/, 'void main() {\nmat4 unitTransform=unitSkin();')
      .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=mat3(unitTransform)*objectNormal;objectNormal=mix(objectNormal,aimTurret(objectNormal),unitTurret);')
      .replace('#include <begin_vertex>','vec3 transformed=(unitTransform*vec4(position,1.0)).xyz; transformed=mix(transformed,aimTurret(transformed-turretPivot)+turretPivot,unitTurret); unitHit=unitPose.w; specialTier=unitTier; localAccent=smoothstep(unitAccentRange.x,unitAccentRange.y,position.y);');
     shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float unitHit; varying float specialTier; varying float localAccent;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.6,0.24,0.08)*unitHit; if(specialTier>0.5&&specialTier<4.5){float rim=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),2.0);vec3 glow=specialTier>2.5?vec3(1.0,.58,.12):specialTier>1.5?vec3(1.0,.32,.03):vec3(.54,.1,.85);totalEmissiveRadiance += glow*(specialTier>2.5?.2+rim*2.1:.12+rim*1.5);} if(specialTier>4.5){float variant=mod(specialTier-5.0,3.0);vec3 accent=specialTier<7.5?(variant<.5?vec3(.60,.49,.27):variant<1.5?vec3(.75,.30,.07):vec3(.16,.42,.71)):specialTier<10.5?(variant<.5?vec3(.54,.53,.35):variant<1.5?vec3(.67,.45,.08):vec3(.10,.49,.40)):(variant<.5?vec3(.58,.54,.31):variant<1.5?vec3(.25,.45,.73):vec3(.29,.23,.58));totalEmissiveRadiance+=accent*localAccent*.34;}');
    };mat.customProgramCacheKey=()=> 'sc2-original-gpu-bones-v5:'+m.customProgramCacheKey();return mat;});
   const mesh=new THREE.InstancedMesh(geometry,materials.length===1?materials[0]:materials,CAPACITY);mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);this.meshes.push(mesh);this.attributes.push(pose);this.blendAttributes.push(blend);this.aimAttributes.push(aim);
  }
  mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
 }
 weaponAt(action:keyof ReturnType<typeof mapAnimations>,seconds:number){const clip=this.actions[action],points=clip?this.weaponTracks.get(clip.name):undefined;if(!clip||!points?.length)return this.weapon.clone();const f=Math.max(0,Math.min(points.length-1,seconds/clip.duration*(points.length-1))),i=Math.floor(f);return points[i].clone().lerp(points[Math.min(i+1,points.length-1)],f-i);}
 setLod(low:boolean){if(this.lowDetail===low)return;this.lowDetail=low;this.meshes.forEach((mesh,i)=>{const indices=this.lodIndices[i];if(indices){mesh.geometry.setIndex(low?indices.low:indices.full);if(mesh.geometry.groups.length===1)mesh.geometry.groups[0].count=mesh.geometry.getIndex()!.count;}});}
 begin(){this.count=0;}
 pose(action:keyof ReturnType<typeof mapAnimations>){const clip=this.actions[action]??this.actions.idle;return clip?this.clips.get(clip.name):this.clips.values().next().value;}
 add(x:number,y:number,z:number,facing:number,action:keyof ReturnType<typeof mapAnimations>,seconds:number,once=false,hit=0,shrink=1,interpolate=true,attackSeconds=-1,turretYaw=0,tier=0,attackKey:keyof ReturnType<typeof mapAnimations>='attack'){
  if(this.count>=CAPACITY)return;const p=this.pose(action);if(!p)return;
  const t=once?Math.min(p.duration,Math.max(0,seconds)):((seconds%p.duration)+p.duration)%p.duration;
  const frame=t/p.duration*(p.frames-1),a=Math.floor(frame),b=Math.min(p.frames-1,a+1);
  const attack=this.pose(attackKey),shot=attack&&attackSeconds>=0?Math.min(attack.frames-1,attackSeconds/attack.duration*(attack.frames-1)):0,sa=Math.floor(shot),sb=Math.min((attack?.frames??1)-1,sa+1),weight=attackSeconds>=0?(attackKey==='attackLeft'||attackKey==='attackRight'?Math.min(1,Math.max(0,((attack?.duration??0)-attackSeconds)/.12)):Math.max(0,1-attackSeconds/.55)):0;
  object.position.set(x,y,z);object.rotation.set(0,facing,0);object.scale.setScalar(shrink);object.updateMatrix();
  this.meshes.forEach((m,i)=>{m.setMatrixAt(this.count,object.matrix);this.tierAttributes[i].setX(this.count,tier);this.aimAttributes[i].setXY(this.count,Math.sin(turretYaw),Math.cos(turretYaw));this.attributes[i].setXYZW(this.count,p.offset+a,p.offset+b,interpolate?frame-a:0,hit);this.blendAttributes[i].setXYZW(this.count,(attack?.offset??0)+sa,(attack?.offset??0)+sb,shot-sa,weight);});this.count++;
 }
 end(){this.meshes.forEach((m,i)=>{commitInstances(m,this.count);uploadActive(this.attributes[i],this.count);uploadActive(this.blendAttributes[i],this.count);uploadActive(this.aimAttributes[i],this.count);uploadActive(this.tierAttributes[i],this.count);});}
}
