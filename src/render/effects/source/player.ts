import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import catalog from './catalog.json';
import {loadSourceEffect,sourceSurface,type SourceEffectResource} from './materials';
import {SourceDrawBatch} from './draw-batch';
import {sourceParticleQuads,sourcePlacement} from './particles';
import {sourceRibbonQuads,sourceProjectionQuads} from './ribbons';
import {sourcePhase,sourceLife} from './timeline';
import type {SourceEffectDefinition,SourceEffectRequest,SourcePhase} from './types';
import type {UnitMaterialSurface} from '../../materials/unit-material-batch';

export const SOURCE_EFFECTS=catalog as unknown as Record<string,SourceEffectDefinition>;
type MeshInstance={root:THREE.Group;mixer:THREE.AnimationMixer;surfaces:UnitMaterialSurface[];actions:Map<string,THREE.AnimationAction>;activeClip?:string;used:boolean;lastUsed:number};
type Ending={request:SourceEffectRequest;ground:(p:{x:number;z:number})=>number;stopped?:number};
/** Source meshes, emitters, ribbons and projections have one lifecycle owner.
 * Instances expand on demand; no quality option can discard a required layer. */
export class SourceEffectPlayer {
 ready=false;private loading?:Promise<void>;
 private resources=new Map<string,SourceEffectResource>();private batches=new Map<string,SourceDrawBatch>();private meshPools=new Map<string,MeshInstance[]>();
 private requests=new Set<string>();private clock=0;
 private loops=new Map<string,Ending>();
 private modelCounts=new Map<string,{requests:number;meshes:number;particles:number;ribbons:number;projections:number}>();
 private counts={effects:0,meshes:0,particles:0,ribbonQuads:0,projectionQuads:0,unrenderedDisplacementQuads:0,missing:0};
 constructor(private scene:THREE.Scene,private camera:THREE.Camera){}
 async load(){if(this.ready)return;if(this.loading)return this.loading;
  const task=(async()=>{for(const definition of Object.values(SOURCE_EFFECTS)){
   if(this.resources.has(definition.id))continue;const resource=await loadSourceEffect(definition),pending=new Map<string,SourceDrawBatch>();let instance:MeshInstance|undefined;
   try{const references=[...definition.particles,...definition.ribbons,...definition.projections].map(p=>p.material_reference_index);
    for(const index of new Set(references))for(const materialIndex of this.materialsFor(definition,index)){const key=definition.id+':'+materialIndex;if(!pending.has(key))pending.set(key,new SourceDrawBatch(this.scene,resource.materials[materialIndex]));}
    if(resource.gltf){instance=this.makeMesh(resource);instance.root.visible=false;}
   }catch(error){for(const batch of pending.values())batch.dispose();if(instance)this.releaseMesh(instance);throw error;}
   for(const [key,batch]of pending)this.batches.set(key,batch);if(instance)this.meshPools.set(definition.id,[instance]);this.resources.set(definition.id,resource);
  }this.ready=true;})();this.loading=task;try{await task;}finally{this.loading=undefined;}
 }
 private materialsFor(def:SourceEffectDefinition,index:number):number[]{
  const ref=def.materialReferences[index];if(!ref)throw Error('Missing original effect material reference '+def.id+':'+index);
  if(ref.type===1)return [ref.material_index];
  // Original background refraction is an explicitly reported unsupported layer.
  // Never replace it with an opaque or emissive substitute.
  if(ref.type===2)return [];
  if(ref.type===3){const composite=def.materialProfile.composites[ref.material_index];if(!composite||composite.parts.some(p=>p.material.type!==1))throw Error('Unsupported original emitter composite '+def.id+':'+index);return composite.parts.map(p=>p.material.index);}
  throw Error('Unsupported original emitter material '+def.id+':'+ref.type);
 }
 private makeMesh(resource:SourceEffectResource):MeshInstance{
  const root=new THREE.Group(),object=clone(resource.gltf!.scene),surfaces:UnitMaterialSurface[]=[];root.name='source-combat-'+resource.definition.id;root.userData.visualRole='effect';root.add(object);root.matrixAutoUpdate=false;
  try{object.traverse(node=>{if(!(node instanceof THREE.Mesh))return;node.userData.visualRole='effect';node.castShadow=node.receiveShadow=false;node.frustumCulled=false;
   const bind=(material:THREE.Material)=>{const native=resource.materials.find(r=>r.base===material||r.base.name===material.name);if(!native)throw Error('Unknown original combat mesh material '+material.name);const surface=sourceSurface(native,node.geometry,1);surfaces.push(surface);return surface.material;};node.material=Array.isArray(node.material)?node.material.map(bind):bind(node.material);
  });}catch(error){for(const s of surfaces){s.material.dispose();s.texture.dispose();}const skeletons=new Set<THREE.Skeleton>();object.traverse(n=>{if(n instanceof THREE.SkinnedMesh)skeletons.add(n.skeleton);});for(const s of skeletons)s.dispose();throw error;}
  this.scene.add(root);
  const mixer=new THREE.AnimationMixer(object),actions=new Map(resource.gltf!.animations.map(c=>[c.name,mixer.clipAction(c)]));return {root,mixer,surfaces,actions,used:false,lastUsed:0};
 }
 async prepareMeshes(compile:(root:THREE.Group)=>Promise<unknown>){
  for(const pool of this.meshPools.values()){
   const root=pool[0].root,visible=root.visible;root.visible=true;
   try{await compile(root);}finally{root.visible=visible;}
  }
 }
 begin(time:number){this.clock=time;this.requests.clear();this.modelCounts.clear();this.counts={effects:0,meshes:0,particles:0,ribbonQuads:0,projectionQuads:0,unrenderedDisplacementQuads:0,missing:0};for(const b of this.batches.values())b.begin();for(const pool of this.meshPools.values())for(const m of pool){m.used=false;m.root.visible=false;}}
 add(request:SourceEffectRequest,ground:(p:{x:number;z:number})=>number){
  this.play(request,ground);if(request.loop)this.loops.set(request.key,{request,ground});
 }
 private play(request:SourceEffectRequest,ground:(p:{x:number;z:number})=>number,particlesOnly=false){
  if(!this.ready)throw Error('Original combat effects are not ready');if(this.requests.has(request.key))throw Error('Duplicate core combat layer '+request.key);this.requests.add(request.key);
  const resource=this.resources.get(request.model);if(!resource){this.counts.missing++;throw Error('Unknown required combat effect '+request.model);}const def=resource.definition;if(request.age<0||!request.loop&&request.age>sourceLife(def))return;
  this.counts.effects++;const phase=sourcePhase(def,request.age,request.loop,request.seed,request.clip);
  const hasMesh=!particlesOnly&&!!resource.gltf&&request.mesh!==false;if(hasMesh)this.mesh(resource,request,phase);
  const available=(q:{materialReference:number})=>{if(def.materialReferences[q.materialReference]?.type===2){this.counts.unrenderedDisplacementQuads++;return false;}return true;};
  const particles=sourceParticleQuads(def,request,this.camera,ground).filter(available),ribbons=particlesOnly?[]:sourceRibbonQuads(def,request,this.camera).filter(available),projections=particlesOnly?[]:sourceProjectionQuads(def,request,ground).filter(available);this.counts.particles+=particles.length;this.counts.ribbonQuads+=ribbons.length;this.counts.projectionQuads+=projections.length;
  const model=this.modelCounts.get(def.id)??{requests:0,meshes:0,particles:0,ribbons:0,projections:0};model.requests++;model.meshes+=Number(hasMesh);model.particles+=particles.length;model.ribbons+=ribbons.length;model.projections+=projections.length;this.modelCounts.set(def.id,model);
  for(const quad of [...particles,...ribbons,...projections])for(const material of this.materialsFor(def,quad.materialReference)){const batch=this.batches.get(def.id+':'+material);if(!batch)throw Error('Unprepared source combat layer '+def.id+':'+material);batch.add(quad);}
 }
 private mesh(resource:SourceEffectResource,request:SourceEffectRequest,phase:SourcePhase){
  const pool=this.meshPools.get(resource.definition.id)!;let instance=pool.find(m=>!m.used);if(!instance){instance=this.makeMesh(resource);pool.push(instance);}instance.used=true;instance.lastUsed=this.clock;instance.root.visible=true;
  // Exported GLBs contain the original Z-up conversion; the outer placement
  // cancels that wrapper once before applying the same transform as emitters.
  instance.root.matrix.copy(sourcePlacement(resource.definition,request.placement,request.age)).multiply(new THREE.Matrix4().makeRotationX(Math.PI/2));instance.root.matrixWorldNeedsUpdate=true;
  const action=instance.actions.get(phase.clip.name);if(instance.activeClip!==phase.clip.name){instance.mixer.stopAllAction();action?.reset().setLoop(THREE.LoopOnce,1).play();if(action)action.clampWhenFinished=true;instance.activeClip=phase.clip.name;}if(action){action.enabled=true;action.paused=false;action.time=phase.seconds;instance.mixer.update(0);}
  for(const surface of instance.surfaces){surface.write(0,{clip:phase.clip.name,seconds:phase.seconds});surface.flush();}
  for(const billboard of resource.definition.billboards??[]){const name=resource.definition.bones[billboard.bone]?.name;if(!name)continue;let node:THREE.Object3D|undefined;instance.root.traverse(n=>{if(n.name===name||n.userData.originalName===name)node=n;});if(node?.parent){instance.root.updateMatrixWorld(true);const parent=node.parent.getWorldQuaternion(new THREE.Quaternion()).invert(),rotation=this.camera.getWorldQuaternion(new THREE.Quaternion());node.quaternion.copy(parent.multiply(rotation));}}
  this.counts.meshes++;
 }
 end(){
  for(const [key,ending]of this.loops){
   if(this.requests.has(key))continue;ending.stopped??=this.clock;const {request,ground}=ending,def=this.resources.get(request.model)!.definition,age=(this.clock-ending.stopped)*(request.clockRate??1);
   if(age>sourceLife(def)){this.loops.delete(key);continue;}
   // Stop new births at the native channel end, retain already emitted source
   // particles, and play the authored Death clip once at the last real placement.
   this.play({...request,key:'ending-particles:'+key,age:request.age+age,stopAt:request.age,mesh:false},ground,true);
   const death=sourcePhase(def,sourceLife(def),false,request.seed).clip;
   if(/^death(?:\s|$)/i.test(death.name))this.play({...request,key:'ending-death:'+key,age,loop:false,clip:death.name},ground);
  }
  for(const b of this.batches.values())b.end();for(const [key,pool]of this.meshPools){const retained=pool.filter((m,i)=>{if(i===0||m.used||this.clock-m.lastUsed<2)return true;this.releaseMesh(m);return false;});this.meshPools.set(key,retained);}
 }
 private releaseMesh(m:MeshInstance){m.mixer.stopAllAction();m.mixer.uncacheRoot(m.mixer.getRoot());m.root.removeFromParent();const skeletons=new Set<THREE.Skeleton>();m.root.traverse(n=>{if(n instanceof THREE.SkinnedMesh)skeletons.add(n.skeleton);});for(const s of skeletons)s.dispose();for(const s of m.surfaces){s.material.dispose();s.texture.dispose();}}
 reset(){this.loops.clear();this.begin(0);for(const [key,pool]of this.meshPools){for(const m of pool.slice(1))this.releaseMesh(m);this.meshPools.set(key,pool.slice(0,1));}this.end();}
 report(){return {ready:this.ready,models:this.resources.size,requiredModels:Object.keys(SOURCE_EFFECTS).length,...this.counts,activeRequests:[...this.requests],modelDraws:[...this.modelCounts].map(([model,counts])=>({model,...counts})),endingChannels:[...this.loops.values()].filter(e=>e.stopped!==undefined).length,meshInstances:[...this.meshPools.values()].reduce((n,p)=>n+p.length,0),batches:[...this.batches].map(([key,b])=>({key,...b.report()}))};}
}
