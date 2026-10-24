import {RigidSourceBatch} from './rigid-batch';
import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import catalog from './catalog.json';
import {loadSourceEffect,sourceSurface,type SourceEffectResource} from './materials';
import {SourceDrawBatch} from './draw-batch';
import {sourceParticleQuads,sourcePlacement,SourceParticleCache} from './particles';
import {sourceRibbonQuads,sourceProjectionQuads} from './ribbons';
import {sourcePhase,sourceLife} from './timeline';
import type {SourceEffectDefinition,SourceEffectRequest,SourcePhase} from './types';
import type {UnitMaterialSurface} from '../../materials/unit-material-batch';
import {DisplacementSurface,DISPLACEMENT_LAYER} from './displacement';
import {sourceDecorationMask} from './detail';

export const SOURCE_EFFECTS=catalog as unknown as Record<string,SourceEffectDefinition>;
type MeshInstance={root:THREE.Group;mixer:THREE.AnimationMixer;surfaces:(UnitMaterialSurface|DisplacementSurface)[];actions:Map<string,THREE.AnimationAction>;activeClip?:string;used:boolean;lastUsed:number};
type Ending={request:SourceEffectRequest;ground:(p:{x:number;z:number})=>number;seenAt:number;stopped?:number};
export function sourceEndingTimes(request:SourceEffectRequest,seenAt:number,stopped:number,now:number){const rate=request.clockRate??1;return {age:Math.max(0,now-stopped)*rate,stopAge:request.age+(request.stopTime===undefined?0:Math.max(0,stopped-seenAt)*rate)};}
/** Source meshes, emitters, ribbons and projections have one lifecycle owner.
 * Instances expand on demand. The optional medium preset reduces explicitly
 * classified decoration and refraction; colour/identity layers retain ownership. */
export class SourceEffectPlayer {decorationFraction=1;displacementEnabled=true;
 ready=false;private loading?:Promise<void>;
 private resources=new Map<string,SourceEffectResource>();private batches=new Map<string,SourceDrawBatch>();private meshPools=new Map<string,MeshInstance[]>();
 private meshCursors=new Map<string,number>();
 private materialReferences=new WeakMap<SourceEffectDefinition,Map<number,number[]>>();
 private rigid=new Map<string,RigidSourceBatch>();
 private particleCache=new SourceParticleCache();
 private requests=new Set<string>();private clock=0;
 private loops=new Map<string,Ending>();
 private modelCounts=new Map<string,{requests:number;meshes:number;particles:number;ribbons:number;projections:number;displacementMeshes:number;displacementQuads:number}>();
 private counts={effects:0,meshes:0,particles:0,ribbonQuads:0,projectionQuads:0,displacementMeshes:0,displacementQuads:0,unrenderedDisplacementQuads:0,missing:0};
 constructor(private scene:THREE.Scene,private camera:THREE.Camera){}
 async load(){if(this.ready)return;if(this.loading)return this.loading;
  const task=(async()=>{for(const definition of Object.values(SOURCE_EFFECTS)){
   if(this.resources.has(definition.id))continue;const resource=await loadSourceEffect(definition),pending=new Map<string,SourceDrawBatch>();let instance:MeshInstance|undefined,displacement:MeshInstance|undefined;
   try{const references=[...definition.particles,...definition.ribbons,...definition.projections].map(p=>p.material_reference_index);
    for(const index of new Set(references))for(const materialIndex of this.materialsFor(definition,index)){const key=definition.id+':'+materialIndex;if(!pending.has(key))pending.set(key,new SourceDrawBatch(this.scene,resource.materials[materialIndex]));}
    for(const index of new Set(references)){const ref=definition.materialReferences[index];if(ref.type===2){const key=definition.id+':displacement:'+ref.material_index;pending.set(key,new SourceDrawBatch(this.scene,resource.displacement[ref.material_index]));}}
    if(resource.gltf){const rigid=RigidSourceBatch.create(resource,this.scene);if(rigid)this.rigid.set(definition.id,rigid);else{instance=this.makeMesh(resource);instance.root.visible=false;}}
    if(resource.displacementGltf){displacement=this.makeMesh(resource,true);displacement.root.visible=false;}
   }catch(error){this.rigid.get(definition.id)?.dispose();this.rigid.delete(definition.id);for(const batch of pending.values())batch.dispose();if(instance)this.releaseMesh(instance);if(displacement)this.releaseMesh(displacement);throw error;}
   for(const [key,batch]of pending)this.batches.set(key,batch);if(instance)this.meshPools.set(definition.id,[instance]);if(displacement)this.meshPools.set(definition.id+':displacement',[displacement]);this.resources.set(definition.id,resource);
  }this.ready=true;})();this.loading=task;try{await task;}finally{this.loading=undefined;}
 }
 private materialsFor(def:SourceEffectDefinition,index:number):number[]{
  let cache=this.materialReferences.get(def);if(!cache){cache=new Map();this.materialReferences.set(def,cache);}const found=cache.get(index);if(found)return found;
  const ref=def.materialReferences[index];if(!ref)throw Error('Missing original effect material reference '+def.id+':'+index);
  if(ref.type===1){const values=[ref.material_index];cache.set(index,values);return values;}
  // Type 2 is submitted to its separate signed screen-offset pass below.
  if(ref.type===2){const values:number[]=[];cache.set(index,values);return values;}
  if(ref.type===3){const composite=def.materialProfile.composites[ref.material_index];if(!composite||composite.parts.some(p=>p.material.type!==1))throw Error('Unsupported original emitter composite '+def.id+':'+index);const values=composite.parts.map(p=>p.material.index);cache.set(index,values);return values;}
  throw Error('Unsupported original emitter material '+def.id+':'+ref.type);
 }
 private makeMesh(resource:SourceEffectResource,displacement=false):MeshInstance{
  const gltf=displacement?resource.displacementGltf!:resource.gltf!;
  const root=new THREE.Group(),object=clone(gltf.scene),surfaces:(UnitMaterialSurface|DisplacementSurface)[]=[];root.name='source-combat-'+resource.definition.id;root.userData.visualRole='effect';root.add(object);root.matrixAutoUpdate=false;
  try{object.traverse(node=>{if(!(node instanceof THREE.Mesh))return;node.userData.visualRole='effect';node.castShadow=node.receiveShadow=false;node.frustumCulled=false;
   if(displacement){const native=resource.displacement[Number(node.userData.displacementMaterial)];if(!native)throw Error('Unknown original displacement surface '+node.name);const surface=new DisplacementSurface(native);surfaces.push(surface);node.material=surface.material;node.layers.set(DISPLACEMENT_LAYER);node.userData.displacement=true;node.renderOrder=native.source.priority;}
   else {const bind=(material:THREE.Material)=>{const native=resource.materials.find(r=>r.base===material||r.base.name===material.name);if(!native)throw Error('Unknown original combat mesh material '+material.name);const surface=sourceSurface(native,node.geometry,1);surfaces.push(surface);return surface.material;};node.material=Array.isArray(node.material)?node.material.map(bind):bind(node.material);}
  });}catch(error){for(const s of surfaces){s.material.dispose();s.texture.dispose();}const skeletons=new Set<THREE.Skeleton>();object.traverse(n=>{if(n instanceof THREE.SkinnedMesh)skeletons.add(n.skeleton);});for(const s of skeletons)s.dispose();throw error;}
  this.scene.add(root);
  const mixer=new THREE.AnimationMixer(object),actions=new Map(gltf.animations.map(c=>[c.name,mixer.clipAction(c)]));return {root,mixer,surfaces,actions,used:false,lastUsed:0};
 }
 preparationEntries(){
  return [...[...this.meshPools].map(([key,pool])=>({key:key+':mesh',root:pool[0].root as THREE.Object3D,displacement:pool[0].surfaces.some(s=>s instanceof DisplacementSurface)})),
   ...[...this.batches].map(([key,batch])=>({key:key+':particles',root:batch.mesh as THREE.Object3D,displacement:batch.surface instanceof DisplacementSurface}))];
 }
 async prepareMeshes(compile:(root:THREE.Object3D,displacement:boolean)=>Promise<unknown>){
  for(const rigid of this.rigid.values())await rigid.prepare(compile);
  for(const pool of this.meshPools.values()){
   const root=pool[0].root,visible=root.visible;root.visible=true;
   try{await compile(root,pool[0].surfaces.some(s=>s instanceof DisplacementSurface));}finally{root.visible=visible;}
  }
  for(const batch of this.batches.values())if(batch.surface instanceof DisplacementSurface){const {mesh}=batch,visible=mesh.visible,count=mesh.count;mesh.visible=true;mesh.count=1;try{await compile(mesh,true);}finally{mesh.visible=visible;mesh.count=count;}}
 }
 begin(time:number){this.meshCursors.clear();for(const rigid of this.rigid.values())rigid.begin();this.particleCache.begin(time);this.clock=time;this.requests.clear();this.modelCounts.clear();this.counts={effects:0,meshes:0,particles:0,ribbonQuads:0,projectionQuads:0,displacementMeshes:0,displacementQuads:0,unrenderedDisplacementQuads:0,missing:0};for(const b of this.batches.values())b.begin();for(const pool of this.meshPools.values())for(const m of pool){m.used=false;m.root.visible=false;}}
 add(request:SourceEffectRequest,ground:(p:{x:number;z:number})=>number){
  this.play(request,ground);if(request.loop)this.loops.set(request.key,{request,ground,seenAt:this.clock});
 }
 private play(request:SourceEffectRequest,ground:(p:{x:number;z:number})=>number,particlesOnly=false){
  if(!this.ready)throw Error('Original combat effects are not ready');if(this.requests.has(request.key))throw Error('Duplicate core combat layer '+request.key);this.requests.add(request.key);
  const resource=this.resources.get(request.model);if(!resource){this.counts.missing++;throw Error('Unknown required combat effect '+request.model);}const def=resource.definition;if(request.age<0||!request.loop&&request.age>sourceLife(def))return;
  this.counts.effects++;const phase=sourcePhase(def,request.age,request.loop,request.seed,request.clip);
  const hasMesh=!particlesOnly&&!!resource.gltf&&request.mesh!==false;if(hasMesh){const rigid=this.rigid.get(def.id);if(rigid){rigid.add(request,phase);this.counts.meshes++;}else this.mesh(resource,request,phase);}
  // Baneling's ordinary death body is owned by the unit renderer (mesh:false),
  // but its type-2 surface belongs exclusively to this refraction pass.
  if(this.displacementEnabled&&!particlesOnly&&resource.displacementGltf)this.mesh(resource,request,phase,true);
  const decoration=this.decorationFraction<1?sourceDecorationMask(def):undefined;
  const particles=sourceParticleQuads(def,request,this.camera,ground,this.particleCache,decoration?.size?this.decorationFraction:1,decoration),ribbons=particlesOnly?[]:sourceRibbonQuads(def,request,this.camera),projections=particlesOnly?[]:sourceProjectionQuads(def,request,ground);this.counts.particles+=particles.length;this.counts.ribbonQuads+=ribbons.length;this.counts.projectionQuads+=projections.length;
  let displacementQuads=0;
  for(const quads of [particles,ribbons,projections])for(const quad of quads){const ref=def.materialReferences[quad.materialReference];
   if(ref.type===2){if(!this.displacementEnabled)continue;const batch=this.batches.get(def.id+':displacement:'+ref.material_index);if(!batch)throw Error('Unprepared original displacement '+def.id);batch.add(quad);displacementQuads++;}
   else for(const material of this.materialsFor(def,quad.materialReference)){const batch=this.batches.get(def.id+':'+material);if(!batch)throw Error('Unprepared source combat layer '+def.id+':'+material);batch.add(quad);}
  }
  const model=this.modelCounts.get(def.id)??{requests:0,meshes:0,particles:0,ribbons:0,projections:0,displacementMeshes:0,displacementQuads:0};model.requests++;model.meshes+=Number(hasMesh);model.particles+=particles.length;model.ribbons+=ribbons.length;model.projections+=projections.length;model.displacementMeshes+=this.displacementEnabled&&!particlesOnly&&resource.displacementGltf?(this.meshPools.get(def.id+':displacement')?.[0].surfaces.length??0):0;model.displacementQuads+=displacementQuads;this.counts.displacementQuads+=displacementQuads;this.modelCounts.set(def.id,model);
 }
 private mesh(resource:SourceEffectResource,request:SourceEffectRequest,phase:SourcePhase,displacement=false){
  const key=resource.definition.id+(displacement?':displacement':''),pool=this.meshPools.get(key)!,cursor=this.meshCursors.get(key)??0;let instance=pool[cursor];this.meshCursors.set(key,cursor+1);if(!instance){instance=this.makeMesh(resource,displacement);pool.push(instance);}instance.used=true;instance.lastUsed=this.clock;instance.root.visible=true;
  // Exported GLBs contain the original Z-up conversion; the outer placement
  // cancels that wrapper once before applying the same transform as emitters.
  instance.root.matrix.copy(sourcePlacement(resource.definition,request.placement,request.age)).multiply(new THREE.Matrix4().makeRotationX(Math.PI/2));instance.root.matrixWorldNeedsUpdate=true;
  const action=instance.actions.get(phase.clip.name);if(instance.activeClip!==phase.clip.name){instance.mixer.stopAllAction();action?.reset().setLoop(THREE.LoopOnce,1).play();if(action)action.clampWhenFinished=true;instance.activeClip=phase.clip.name;}if(action){action.enabled=true;action.paused=false;action.time=phase.seconds;instance.mixer.update(0);}
  for(const surface of instance.surfaces){surface.write(0,{clip:phase.clip.name,seconds:phase.seconds});surface.flush();}
  for(const billboard of resource.definition.billboards??[]){const name=resource.definition.bones[billboard.bone]?.name;if(!name)continue;let node:THREE.Object3D|undefined;instance.root.traverse(n=>{if(n.name===name||n.userData.originalName===name)node=n;});if(node?.parent){instance.root.updateMatrixWorld(true);const parent=node.parent.getWorldQuaternion(new THREE.Quaternion()).invert(),rotation=this.camera.getWorldQuaternion(new THREE.Quaternion());node.quaternion.copy(parent.multiply(rotation));}}
  if(displacement)this.counts.displacementMeshes+=instance.surfaces.length;else this.counts.meshes++;
 }
 end(){
  for(const [key,ending]of this.loops){
   if(this.requests.has(key))continue;ending.stopped??=Math.min(this.clock,ending.request.stopTime??this.clock);const {request,ground}=ending,def=this.resources.get(request.model)!.definition,{age,stopAge}=sourceEndingTimes(request,ending.seenAt,ending.stopped,this.clock);
   if(age>sourceLife(def)){this.loops.delete(key);continue;}
   // Stop new births at the native channel end, retain already emitted source
   // particles, and play the authored Death clip once at the last real placement.
   this.play({...request,key:'ending-particles:'+key,age:stopAge+age,stopAt:stopAge,mesh:false},ground,true);
   const death=sourcePhase(def,sourceLife(def),false,request.seed).clip;
   if(/^death(?:\s|$)/i.test(death.name))this.play({...request,key:'ending-death:'+key,age,loop:false,hostedBeam:false,clip:death.name},ground);
  }
  for(const rigid of this.rigid.values())rigid.end();this.particleCache.end();for(const b of this.batches.values())b.end();for(const [key,pool]of this.meshPools){const retained=pool.filter((m,i)=>{if(i===0||m.used||this.clock-m.lastUsed<2)return true;this.releaseMesh(m);return false;});this.meshPools.set(key,retained);}
 }
 private releaseMesh(m:MeshInstance){m.mixer.stopAllAction();m.mixer.uncacheRoot(m.mixer.getRoot());m.root.removeFromParent();const skeletons=new Set<THREE.Skeleton>();m.root.traverse(n=>{if(n instanceof THREE.SkinnedMesh)skeletons.add(n.skeleton);});for(const s of skeletons)s.dispose();for(const s of m.surfaces){s.material.dispose();s.texture.dispose();}}
 reset(){this.particleCache.reset();this.loops.clear();this.begin(0);for(const [key,pool]of this.meshPools){for(const m of pool.slice(1))this.releaseMesh(m);this.meshPools.set(key,pool.slice(0,1));}this.end();}
 report(){return {decorationFraction:this.decorationFraction,displacementEnabled:this.displacementEnabled,rigid:[...this.rigid.values()].map(r=>r.report()),particleCache:this.particleCache.report(),ready:this.ready,models:this.resources.size,requiredModels:Object.keys(SOURCE_EFFECTS).length,...this.counts,activeRequests:[...this.requests],modelDraws:[...this.modelCounts].map(([model,counts])=>({model,...counts})),endingChannels:[...this.loops.values()].filter(e=>e.stopped!==undefined).length,meshInstances:[...this.meshPools.values()].reduce((n,p)=>n+p.length,0),batches:[...this.batches].map(([key,b])=>({key,...b.report()}))};}
}
