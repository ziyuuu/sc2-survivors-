import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {sc2BodyBounds,sc2ModelScale} from '../src/render/loaders/sc2-materials';
import {mapAnimations,weaponAttachmentNames} from '../src/render/loaders/animations';
import {bodyOutline} from '../src/render/units/body-outline';

export type PoseLayout={offset:number;frames:number;duration:number};
export type PosePreparation={
 actions:ReturnType<typeof mapAnimations>;scale:number;normalization:THREE.Matrix4;
 bodyHeight:number;bodyRadius:number;bodyOutline:THREE.Vector3[];turretPivot:THREE.Vector3;turretBones:Set<THREE.Object3D>;
 clips:Map<string,PoseLayout>;weaponTracks:Map<string,THREE.Vector3[]>;weapon:THREE.Vector3;
 nodes:THREE.SkinnedMesh[];palettes:Map<string,{bones:number;packed:Uint16Array}>;totalFrames:number;boneCount:number;
};
export type PosePreparationControl={cancelled?:()=>boolean;progress?:(done:number,total:number)=>void;yield?:()=>Promise<void>;sliceMs?:number};
export const posePaletteKey=(s:THREE.Skeleton)=>s.bones.map(b=>b.uuid).join(',')+'|'+s.boneInverses.map(m=>m.elements.join(',')).join(';');
export async function yieldPreparation(){
 const scheduler=(globalThis as typeof globalThis&{scheduler?:{yield?:()=>Promise<void>}}).scheduler;
 if(typeof scheduler?.yield==='function')await scheduler.yield();else await new Promise<void>(resolve=>setTimeout(resolve,0));
}
type Progress={done:number;total:number};

/** CPU-only output. One original pose traversal feeds every socket and bind palette. */
function* samples(gltf:GLTF,height:number,normalization?:THREE.Matrix4,unitScale=1,profile?:string,referenceBodyHeight?:number):Generator<Progress,PosePreparation>{
 if(profile==='hero.nova'){const gun=gltf.scene.getObjectByName('Bone_Gun');if(!gun)throw Error('Nova weapon bone missing');gun.position.set(0,0,0);}
 const actions=mapAnimations(gltf.animations,profile),mixer=new THREE.AnimationMixer(gltf.scene),rest=actions.idle??gltf.animations[0];
 try{
  if(rest){mixer.clipAction(rest).play();mixer.setTime(0);}gltf.scene.updateMatrixWorld(true);
  const box=sc2BodyBounds(gltf.scene),center=box.getCenter(new THREE.Vector3()),sourceScale=sc2ModelScale(gltf.scene);
  let scale=(sourceScale===undefined?height/Math.max(.001,box.max.y-box.min.y):1.4*sourceScale)*unitScale;
  if(referenceBodyHeight!==undefined&&referenceBodyHeight>0)scale=referenceBodyHeight/Math.max(.001,box.max.y-box.min.y);
  const transform=normalization?.clone()??new THREE.Matrix4().makeScale(scale,scale,scale).multiply(new THREE.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z));
  const body=box.clone().applyMatrix4(transform),outline=bodyOutline(gltf.scene,transform),turretPivot=new THREE.Vector3(),turretBones=new Set<THREE.Object3D>(),turret=gltf.scene.getObjectByName('Bone_Turret_Base');
  turret?.traverse(node=>turretBones.add(node));turret?.getWorldPosition(turretPivot).applyMatrix4(transform);
  const selected=[...new Set(Object.values(actions).filter((clip):clip is THREE.AnimationClip=>!!clip))],clips=new Map<string,PoseLayout>();
  let total=0;for(const clip of selected){const frames=Math.max(2,Math.ceil(clip.duration*24)+1);clips.set(clip.name,{offset:total,frames,duration:clip.duration});total+=frames;}
  const mountSides:(string|undefined)[]=[undefined,'Left','Right','Bottom','Center'];gltf.scene.traverse(node=>{const match=/^Ref_Weapon[ _](.+)$/.exec(node.name);if(match&&!mountSides.includes(match[1]))mountSides.push(match[1]);});
  const nodes:THREE.SkinnedMesh[]=[];gltf.scene.traverse(node=>{if(node instanceof THREE.SkinnedMesh&&(profile!=='hero.nova'||['M3_Mesh_6','M3_Mesh_7','M3_Mesh_15'].includes(node.name)))nodes.push(node);});
  if(!nodes.length)throw Error('Animated GLB has no skinned mesh');
  const palettes=new Map<string,{bones:number;packed:Uint16Array}>(),skeletons=new Map<string,THREE.Skeleton>();let boneCount=0;
  for(const node of nodes){const key=posePaletteKey(node.skeleton);if(palettes.has(key))continue;const bones=node.skeleton.bones.length;boneCount=Math.max(boneCount,bones);palettes.set(key,{bones,packed:new Uint16Array(total*bones*16)});skeletons.set(key,node.skeleton);}
  const weaponTracks=new Map<string,THREE.Vector3[]>();let done=0;
  for(const clip of selected){
   const layout=clips.get(clip.name)!,mounts:{key:string;attachment:THREE.Object3D;points:THREE.Vector3[]}[]=[];
   for(const side of mountSides){const attachment=weaponAttachmentNames(clip.name,profile,side).map(name=>gltf.scene.getObjectByName(name)).find(Boolean);if(attachment)mounts.push({key:clip.name+(side?':'+side:''),attachment,points:[]});}
   mixer.stopAllAction();const action=mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
   for(let frame=0;frame<layout.frames;frame++){
    mixer.setTime(frame/(layout.frames-1)*clip.duration);gltf.scene.updateMatrixWorld(true);
    for(const mount of mounts)mount.points.push(mount.attachment.getWorldPosition(new THREE.Vector3()).applyMatrix4(transform));
    for(const [key,palette]of palettes){const skeleton=skeletons.get(key)!;skeleton.update();const matrix=skeleton.boneMatrices;if(!matrix)throw Error('Missing bone palette');const offset=(layout.offset+frame)*palette.bones*16;
     for(let i=0;i<matrix.length;i++){const value=matrix[i];if(!Number.isFinite(value)||Math.abs(value)>65504)throw Error('Original pose has invalid or unbounded bone transforms');palette.packed[offset+i]=THREE.DataUtils.toHalfFloat(value);}
    }
    yield {done:++done,total};
   }
   for(const mount of mounts)weaponTracks.set(mount.key,mount.points);
  }
  const weapon=new THREE.Vector3(0,.8,.5),attack=actions.attack,points=attack?weaponTracks.get(attack.name):undefined;
  if(attack&&points?.length){const frame=Math.max(0,Math.min(points.length-1,.05/attack.duration*(points.length-1))),index=Math.floor(frame);weapon.copy(points[index]).lerp(points[Math.min(index+1,points.length-1)],frame-index);}
  return {actions,scale,normalization:transform,bodyHeight:body.max.y-body.min.y,bodyRadius:Math.max(body.max.x-body.min.x,body.max.z-body.min.z)/2,bodyOutline:outline,turretPivot,turretBones,clips,weaponTracks,weapon,nodes,palettes,totalFrames:total,boneCount};
 }finally{
  mixer.stopAllAction();if(rest){mixer.clipAction(rest).reset().play();mixer.setTime(0);}gltf.scene.updateMatrixWorld(true);mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
 }
}
type SampleArguments=Parameters<typeof samples>;
export function preparePoseData(...args:SampleArguments){const iterator=samples(...args);for(;;){const step=iterator.next();if(step.done)return step.value;}}
export async function preparePoseDataAsync(args:SampleArguments,control:PosePreparationControl={}):Promise<PosePreparation>{
 const iterator=samples(...args),check=()=>{if(control.cancelled?.())throw Error('模型准备已取消');};let began=performance.now();
 try{for(;;){check();const step=iterator.next();if(step.done){check();return step.value;}if(performance.now()-began>=(control.sliceMs??8)){control.progress?.(step.value.done,step.value.total);await(control.yield??yieldPreparation)();check();began=performance.now();}}}
 finally{iterator.return(undefined as never);}
}
