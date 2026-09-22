import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {sc2BodyBounds} from '../loaders/sc2-materials';
import type {Pod} from '../../simulation/types';
/** Original Birth/Stand/Death. No open clip exists: rotate the original door bones locally. */
export class PodView {
 root=new THREE.Group();mixer:THREE.AnimationMixer;clips:Record<string,THREE.AnimationClip|undefined>={};state='';
 doors:{node:THREE.Object3D;base:THREE.Quaternion}[]=[];
 constructor(g:GLTF,scene:THREE.Scene){const model=clone(g.scene);this.mixer=new THREE.AnimationMixer(model);for(const c of g.animations)this.clips[c.name.toLowerCase()]=c;
  const stand=this.clips.stand;if(stand){this.mixer.clipAction(stand).play();this.mixer.setTime(0);}model.updateMatrixWorld(true);
  const box=sc2BodyBounds(model),center=box.getCenter(new THREE.Vector3()),scale=2.7/Math.max(.01,box.max.y-box.min.y);
  model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);this.root.add(model);scene.add(this.root);
  model.traverse(n=>{if(n instanceof THREE.Mesh)n.frustumCulled=false;if(/DropPod_Door/i.test(n.name))this.doors.push({node:n,base:n.quaternion.clone()});});
 }
 dispose(){
  this.mixer.stopAllAction();this.mixer.uncacheRoot(this.mixer.getRoot());this.root.removeFromParent();
  // SkeletonUtils gives each pod its own skeleton; geometry/materials still belong to the asset cache.
  const skeletons=new Set<THREE.Skeleton>();this.root.traverse(n=>{if(n instanceof THREE.SkinnedMesh)skeletons.add(n.skeleton);});for(const skeleton of skeletons)skeleton.dispose();
 }
 update(p:Pod,time:number,visible:boolean,groundY=0){this.root.position.set(p.x,groundY,p.z);const age=time-(p.resolvedAt??time);
  this.root.visible=visible&&(!['rescued','destroyed'].includes(p.status)||age<7);if(!this.root.visible)return;
  for(const d of this.doors)d.node.quaternion.copy(d.base);
  const name=p.status==='falling'?'birth':p.status==='destroyed'?'death':'stand';
  if(name!==this.state){this.mixer.stopAllAction();const clip=this.clips[name];if(clip){const a=this.mixer.clipAction(clip);a.reset().setLoop(name==='stand'?THREE.LoopRepeat:THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();}this.state=name;}
  const seconds=name==='birth'?time-p.createdAt:name==='death'?age:time-p.landedAt;this.mixer.setTime(Math.max(0,seconds));
  if(p.status==='opening'||p.status==='rescued'){const opening=p.status==='rescued'?1:Math.min(1,age/1.2);for(const d of this.doors)d.node.rotateX(opening*-Math.PI*.43);}
 }
}
