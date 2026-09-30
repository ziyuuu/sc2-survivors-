import {deathPoseTime} from './death-clock';
import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {sc2BodyBounds} from '../loaders/sc2-materials';
import type {Pod} from '../../simulation/types';
import type {Race} from '../../data/races';
import {bindPylonBirthMaterial,type PylonBirthMaterialBinding} from './pylon-birth-materials';

/** Race adapters select source building sequences, never fake transport-door bones. */
export class CarrierViewAdapter {
 constructor(readonly race:Race,readonly animations:THREE.AnimationClip[]){}
 clip(state:string){
  // Exact clips audited from the four converted source GLBs (F05 source report).
  // Pylon body has only Stand; its separately loaded PylonBirth actor handles arrival.
  // Matching original death geometry is played by PodView's separate death mixer.
  const names:Record<Race,Record<string,string>>={
   terran:{falling:'Fly End',active:'Stand',opening:'Stand Work',rescued:'Stand'},
   zerg:{falling:'Build A Start',active:'Stand',opening:'Stand Work',rescued:'Stand'},
   protoss:{falling:'Stand',active:'Stand',opening:'Stand',rescued:'Stand'},
  };
  const name=names[this.race][state];return name?this.animations.find(c=>c.name===name):undefined;
 }

}
/** Original temporary building model; its animation never alters the delivery transaction. */
export class PodView {
 root=new THREE.Group();mixer:THREE.AnimationMixer;state='';adapter:CarrierViewAdapter;
 birthMixer?:THREE.AnimationMixer;private model:THREE.Object3D;private birthModel?:THREE.Object3D;private birthDuration=0;
 private deathModel?:THREE.Object3D;private deathMixer?:THREE.AnimationMixer;private deathDuration=0;private deathSourceDuration=0;
 private materials:{material:THREE.Material;opacity:number;emissive:number|null}[]=[];
 private birthMaterials:PylonBirthMaterialBinding[]=[];
 constructor(g:GLTF,scene:THREE.Scene,race:Race='terran',birth?:GLTF,death?:GLTF){
  const model=this.model=clone(g.scene);this.mixer=new THREE.AnimationMixer(model);this.adapter=new CarrierViewAdapter(race,g.animations);
  const stand=this.adapter.clip('active');if(stand){this.mixer.clipAction(stand).play();this.mixer.setTime(0);}model.updateMatrixWorld(true);
  const attach=(body:THREE.Object3D)=>{const box=sc2BodyBounds(body),center=box.getCenter(new THREE.Vector3()),scale=2.7/Math.max(.01,box.max.x-box.min.x,box.max.z-box.min.z);body.scale.setScalar(scale);body.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);this.root.add(body);};
  attach(model);
  if(death){const clip=death.animations.find(c=>/^Death/.test(c.name));if(!clip)throw Error('载体原死亡动作缺失');this.deathModel=clone(death.scene);this.deathMixer=new THREE.AnimationMixer(this.deathModel);this.deathSourceDuration=clip.duration;this.deathDuration=Math.min(6,clip.duration);const action=this.deathMixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();this.deathMixer.setTime(0);attach(this.deathModel);this.deathModel.visible=false;}
  if(birth){const clip=birth.animations.find(c=>c.name==='Stand Build End');if(!clip)throw Error('原水晶塔出现动作缺失：Stand Build End');this.birthModel=clone(birth.scene);this.birthMixer=new THREE.AnimationMixer(this.birthModel);this.birthDuration=clip.duration;const action=this.birthMixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();this.birthMixer.setTime(0);attach(this.birthModel);this.birthModel.visible=false;}
  scene.add(this.root);
  this.root.traverse(n=>{if(!(n instanceof THREE.Mesh))return;n.frustumCulled=false;const materials=(Array.isArray(n.material)?n.material:[n.material]).map((source:THREE.Material)=>{const material=source.clone(),standard=material as THREE.MeshStandardMaterial;material.onBeforeCompile=source.onBeforeCompile;material.customProgramCacheKey=source.customProgramCacheKey;this.materials.push({material,opacity:material.opacity,emissive:typeof standard.emissiveIntensity==='number'?standard.emissiveIntensity:null});if(this.birthModel?.getObjectById(n.id)){const binding=bindPylonBirthMaterial(source,material);if(binding)this.birthMaterials.push(binding);}return material;});n.material=Array.isArray(n.material)?materials:materials[0];});
 }
 dispose(){
  this.mixer.stopAllAction();this.mixer.uncacheRoot(this.mixer.getRoot());this.root.removeFromParent();for(const {material} of this.materials)material.dispose();
  if(this.birthMixer){this.birthMixer.stopAllAction();this.birthMixer.uncacheRoot(this.birthMixer.getRoot());}
  if(this.deathMixer){this.deathMixer.stopAllAction();this.deathMixer.uncacheRoot(this.deathMixer.getRoot());}
  for(const binding of this.birthMaterials)binding.dispose();
  const skeletons=new Set<THREE.Skeleton>();this.root.traverse(n=>{if(n instanceof THREE.SkinnedMesh)skeletons.add(n.skeleton);});for(const skeleton of skeletons)skeleton.dispose();
 }
 update(p:Pod,time:number,visible:boolean,groundY=0){
  this.root.position.set(p.x,groundY,p.z);const age=time-(p.resolvedAt??time);
  this.root.visible=visible&&(!['rescued','destroyed'].includes(p.status)||age<(p.status==='destroyed'?Math.max(1.5,this.deathDuration)+.3:7));if(!this.root.visible)return;
  const state=p.status;
  const showingBirth=state==='falling'&&!!this.birthModel,showingDeath=state==='destroyed'&&!!this.deathModel;this.model.visible=!showingBirth&&!showingDeath;
  if(this.deathModel){this.deathModel.visible=showingDeath;if(showingDeath)this.deathMixer!.setTime(deathPoseTime(age,this.deathSourceDuration,this.deathDuration));}
  if(this.birthModel){this.birthModel.visible=showingBirth;if(showingBirth){const progress=THREE.MathUtils.clamp((time-p.createdAt)/Math.max(.001,p.landedAt-p.createdAt),0,1);this.birthMixer!.setTime(progress*this.birthDuration);}}
  if(state!==this.state){this.mixer.stopAllAction();const clip=this.adapter.clip(state);if(clip){const action=this.mixer.clipAction(clip),loop=state==='active'||state==='opening';action.reset().setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);action.clampWhenFinished=true;action.play();}this.state=state;}
  const seconds=state==='falling'?time-p.createdAt:state==='active'?time-p.landedAt:age;this.mixer.setTime(Math.max(0,seconds));
  const warp=this.adapter.race==='protoss',arrival=warp&&!this.birthModel&&state==='falling'?THREE.MathUtils.clamp((time-p.createdAt)/(p.landedAt-p.createdAt),0,1):1;
  this.root.scale.setScalar(showingDeath?(age>this.deathDuration?Math.max(.01,1-(age-this.deathDuration)/.3):1):.85+.15*arrival);
  for(const entry of this.materials){if(entry.emissive!==null)(entry.material as THREE.MeshStandardMaterial).emissiveIntensity=entry.emissive*(warp&&state==='opening'?1+.65*Math.sin(age*Math.PI*4)**2:1);}
  if(showingBirth)for(const binding of this.birthMaterials)binding.update(this.birthMixer!.time);

 }
}
