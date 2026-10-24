import * as THREE from 'three';
import type {SourceEffectDefinition,SourceEffectRequest,SourceEmitter,SourcePhase,SourcePlacement} from './types';
import {activeBirths,boneMatrices,lifeCurve,sourceNumber as number,sourceVector as vector,sourceRandom,sourcePhase,sourcePhases,sourceSample,particleLifetimeBound} from './timeline';
import type {MaterialRef} from '../../materials/source-tracks';
import type {SourceQuad} from './draw-batch';

export interface SourceParticleQuad extends SourceQuad {materialReference:number;emitter:number;born:number}
const zAxis=new THREE.Vector3(0,0,1),up=new THREE.Vector3(0,1,0),xAxis=new THREE.Vector3(1,0,0);
const conversion=new THREE.Matrix4().makeRotationX(-Math.PI/2);
const linear=(v:number)=>{v=Math.max(0,v/255);return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
const randRange=(a:number,b:number,r:number)=>a+(b-a)*r;
const expandedEmitters=new WeakMap<SourceEffectDefinition,{p:SourceEmitter;index:number}[]>();
function emittersFor(def:SourceEffectDefinition){let emitters=expandedEmitters.get(def);if(!emitters){emitters=def.particles.flatMap((p,index)=>[{p,index},...((p.copy_indices as number[]|undefined)??[]).map(copy=>({p:{...p,...def.copies[copy]},index:index+1000*(copy+1)}))]);expandedEmitters.set(def,emitters);}return emitters;}
const birthSamples=new WeakMap<SourceEmitter,WeakMap<SourcePhase['clip'],Map<number,SourceEmitter>>>();
function birthEmitter(emitter:SourceEmitter,phase:SourcePhase){let clips=birthSamples.get(emitter);if(!clips){clips=new WeakMap();birthSamples.set(emitter,clips);}let samples=clips.get(phase.clip);if(!samples){samples=new Map();clips.set(phase.clip,samples);}const hit=samples.get(phase.seconds);if(hit)return hit;
 const result={...emitter};for(const [key,value] of Object.entries(emitter))if(value&&typeof value==='object'&&!Array.isArray(value)&&'id'in value&&'default'in value){const sampled=sourceSample(phase.clip,phase.seconds,value as unknown as MaterialRef);if(sampled!==null)result[key]=sampled;}
 if(samples.size>=512)samples.clear();samples.set(phase.seconds,result);return result;
}
type Variation=[number,number,number,number];
const dynamicDefaults={emit_speed:0,emit_speed_randomize:0,drag:0,gravity:0,mass_randomize:0,mass:1,mass2:1,noise_amplitude:0,noise_frequency:0,local_forces:0,bounce:0,size_smoothing:0,size_anim_mid:.5,size_hold:0,rotation_anim_mid:.5,rotation_smoothing:0,instance_tail:1,color_anim_mid:.5,color_smoothing:0,color_hold:0,alpha_anim_mid:.5,alpha_hold:0,uv_flipbook_cols:1,uv_flipbook_rows:1,uv_flipbook_start_lifespan_factor:1,uv_flipbook_start_init_index:0,uv_flipbook_start_stop_index:0,uv_flipbook_end_init_index:0,uv_flipbook_end_stop_index:0,flags:0};
type ParticleDynamics=Record<keyof typeof dynamicDefaults,number>&{emit_speed_random:number;variation:Record<'speed'|'size'|'rotation'|'alpha',Variation>};
// A sampled emitter has one exact birth phase. Share its immutable interpretation,
// but keep per-particle randomness and every age-dependent operation unchanged.
const dynamicsByEmitter=new WeakMap<SourceEmitter,ParticleDynamics>();
function particleDynamics(p:SourceEmitter,phase:SourcePhase):ParticleDynamics{
 let value=dynamicsByEmitter.get(p);if(value)return value;
 const parsed=Object.fromEntries(Object.entries(dynamicDefaults).map(([key,fallback])=>[key,number(p,key,phase,fallback)])) as Record<keyof typeof dynamicDefaults,number>;
 const variation=Object.fromEntries(['speed','size','rotation','alpha'].map(key=>[key,[number(p,key+'_var_amplitude',phase),number(p,key+'_var_shape',phase),number(p,key+'_var_frequency',phase),number(p,'phase_shift',phase)]])) as ParticleDynamics['variation'];
 value={...parsed,emit_speed_random:number(p,'emit_speed_random',phase,parsed.emit_speed),variation};dynamicsByEmitter.set(p,value);return value;
}
type ParticleBirth={p:SourceEmitter;d:ParticleDynamics;initial:THREE.Vector3;direction:THREE.Vector3;colors:ReturnType<typeof particleColors>;sizes:number[];rotation:number[]};
type BirthEntry={seen:number;value:ParticleBirth};
type CachedRequest={definition:SourceEffectDefinition;seed:number;seen:number;births:Map<string,BirthEntry>};
/** Only live particle births retain event-specific data. Capacity limits reuse,
 * never particle admission. World RNG and rendered clocks are not involved. */
export class SourceParticleCache {
 private frame=0;private time=-Infinity;private requests=new Map<string,CachedRequest>();private count=0;hits=0;misses=0;
 constructor(readonly limit=8192){}
 begin(time:number){if(time<this.time)this.reset();this.time=time;this.frame++;}
 get(def:SourceEffectDefinition,request:SourceEffectRequest,index:number,birth:{ordinal:number;phase:SourcePhase},create:()=>ParticleBirth){
  let state=this.requests.get(request.key);if(state&&(state.definition!==def||state.seed!==request.seed)){this.count-=state.births.size;this.requests.delete(request.key);state=undefined;}
  if(!state){state={definition:def,seed:request.seed,seen:this.frame,births:new Map()};this.requests.set(request.key,state);}state.seen=this.frame;
  const key=index+':'+birth.phase.clip.name+':'+birth.phase.seconds+':'+birth.ordinal,entry=state.births.get(key);if(entry){entry.seen=this.frame;this.hits++;return entry.value;}
  this.misses++;const value=create();if(this.count<this.limit){state.births.set(key,{seen:this.frame,value});this.count++;}return value;
 }
 end(){for(const [key,state] of this.requests){if(state.seen!==this.frame){this.count-=state.births.size;this.requests.delete(key);}else for(const [id,entry] of state.births)if(entry.seen!==this.frame){state.births.delete(id);this.count--;}}}
 reset(){this.requests.clear();this.count=0;this.frame=0;this.time=-Infinity;}
 report(){return {liveBirths:this.count,requests:this.requests.size,limit:this.limit,hits:this.hits,misses:this.misses};}
}
export function sourcePlacement(def:SourceEffectDefinition,p:SourcePlacement,sampleAge=p.age??0){
 if(p.matrix)return new THREE.Matrix4().fromArray(p.matrix);
 const translation=new THREE.Vector3(p.x,p.y,p.z);if(p.from&&p.age&&sampleAge<p.age)translation.lerp(new THREE.Vector3(p.from.x,p.from.y,p.from.z),1-Math.max(0,sampleAge/p.age));
 const forward=p.direction?new THREE.Vector3(p.direction.x,p.direction.y,p.direction.z).normalize():p.end?new THREE.Vector3(p.end.x-p.x,p.end.y-p.y,p.end.z-p.z).normalize():new THREE.Vector3(Math.sin(p.facing),0,Math.cos(p.facing));
 const rotation=new THREE.Quaternion().setFromUnitVectors(zAxis,forward.lengthSq()?forward:zAxis),scale=(p.scale??1)*1.4;
 const v=new THREE.Vector3((def.scale[0]??1)*scale,(def.scale[1]??1)*scale,(def.scale[2]??1)*scale);
 if(p.end){const anchor=def.bones.find(b=>b.name==='Attacher'),length=Math.abs(anchor?.rest?.position[1]??(anchor?.location.default as Record<string,number>|undefined)?.y??0);if(length>.001)v.y=new THREE.Vector3(p.end.x-p.x,p.end.y-p.y,p.end.z-p.z).length()/length;}
 return new THREE.Matrix4().compose(translation,rotation,new THREE.Vector3(1,1,1)).multiply(conversion).multiply(new THREE.Matrix4().makeScale(v.x,v.y,v.z));
}
export function variation(p:SourceEmitter,key:string,phase:SourcePhase,age:number,seed:number){
 const amplitude=number(p,key+'_var_amplitude',phase);if(amplitude===0)return 0;const shape=number(p,key+'_var_shape',phase),f=age*number(p,key+'_var_frequency',phase)+number(p,'phase_shift',phase);
 const wave=shape===1?Math.sin(f*2*Math.PI):shape===2?Math.cos(f*2*Math.PI):shape===3?(f%1)*2-1:shape===4?Math.sin(f*2*Math.PI)>=0?1:-1:shape===5?sourceRandom(seed,Math.floor(f))*2-1:shape===6?randRange(sourceRandom(seed,Math.floor(f)),sourceRandom(seed,Math.floor(f)+1),f-Math.floor(f))*2-1:0;return amplitude*wave;
}
function dynamicVariation(v:Variation,age:number,seed:number){
 const [amplitude,shape,frequency,shift]=v;if(amplitude===0)return 0;const f=age*frequency+shift;
 const wave=shape===1?Math.sin(f*2*Math.PI):shape===2?Math.cos(f*2*Math.PI):shape===3?(f%1)*2-1:shape===4?Math.sin(f*2*Math.PI)>=0?1:-1:shape===5?sourceRandom(seed,Math.floor(f))*2-1:shape===6?randRange(sourceRandom(seed,Math.floor(f)),sourceRandom(seed,Math.floor(f)+1),f-Math.floor(f))*2-1:0;return amplitude*wave;
}
function shapePoint(p:SourceEmitter,phase:SourcePhase,seed:number){
 const r=(i:number)=>sourceRandom(seed,i),shape=number(p,'emit_shape',phase),size=vector(p,'emit_shape_size',phase),cut=vector(p,'emit_shape_size_cutout',phase),radius=number(p,'emit_shape_radius',phase),inner=number(p,'emit_shape_radius_cutout',phase),cutout=(number(p,'flags',phase)&16)!==0;
 const at=new THREE.Vector3();
 if(shape===1||shape===3){at.set((r(1)-.5)*size.x,(r(2)-.5)*size.y,shape===3?(r(3)-.5)*size.z:0);if(cutout&&Math.abs(at.x)<cut.x*.5&&Math.abs(at.y)<cut.y*.5&&(shape===1||Math.abs(at.z)<cut.z*.5)){const axis=Math.floor(r(4)*(shape===1?2:3)),min=[cut.x,cut.y,cut.z][axis],max=[size.x,size.y,size.z][axis];at.setComponent(axis,(r(5)<.5?-1:1)*(min+(max-min)*r(6))*.5);}}
 else if(shape===2){const z=r(1)*2-1,a=r(2)*Math.PI*2,rho=Math.cbrt((cutout?inner**3:0)+(radius**3-(cutout?inner**3:0))*r(3)),plane=Math.sqrt(Math.max(0,1-z*z));at.set(Math.cos(a)*plane*rho,Math.sin(a)*plane*rho,z*rho);}
 else if(shape===4||shape===5){const a=r(1)*Math.PI*2,rho=Math.sqrt((cutout?inner**2:0)+(radius**2-(cutout?inner**2:0))*r(2));at.set(Math.cos(a)*rho,Math.sin(a)*rho,shape===4?(r(3)-.5)*size.z:0);}
 else if(shape!==0)throw Error('Unsupported original emission shape '+shape);
 return at;
}
function particleColors(p:SourceEmitter,phase:SourcePhase,seed:number){return ['init','mid','end'].map(key=>{const a=vector(p,'color_'+key,phase,{r:255,g:255,b:255,a:255}),b=vector(p,'color2_'+key,phase,a),rgb=number(p,'color_randomize',phase)?sourceRandom(seed,60):0,alpha=number(p,'alpha_randomize',phase)?sourceRandom(seed,61):0;return {r:randRange(a.r,b.r,rgb),g:randRange(a.g,b.g,rgb),b:randRange(a.b,b.b,rgb),a:randRange(a.a,b.a,alpha)};});}
function sourceColor(d:ParticleDynamics,t:number,colors:ReturnType<typeof particleColors>):[number,number,number,number]{
 const mid=d.color_anim_mid,smooth=d.color_smoothing,hold=smooth>=3?d.color_hold:0;
 const channel=(key:'r'|'g'|'b')=>linear(lifeCurve(colors[0][key],colors[1][key],colors[2][key],t,mid,smooth,hold));
 const alpha=lifeCurve(colors[0].a,colors[1].a,colors[2].a,t,d.alpha_anim_mid,smooth,smooth>=3?d.alpha_hold:0)/255;
 return [channel('r'),channel('g'),channel('b'),Math.max(0,Math.min(1,alpha))];
}
function particleBirth(emitter:SourceEmitter,phase:SourcePhase,seed:number):ParticleBirth {
 const p=birthEmitter(emitter,phase),random=(i:number)=>sourceRandom(seed,i),initial=shapePoint(p,phase,seed),angles=new THREE.Euler(number(p,'emit_angle_x',phase)+(random(8)-.5)*number(p,'emit_spread_x',phase),number(p,'emit_angle_y',phase)+(random(9)-.5)*number(p,'emit_spread_y',phase),0,'YXZ');
 let direction=new THREE.Vector3(0,0,1).applyEuler(angles);const emitType=number(p,'emit_type',phase);if(emitType===1)direction=initial.lengthSq()?initial.clone().normalize():new THREE.Vector3(random(11)-.5,random(12)-.5,random(13)-.5).normalize();if(emitType===2)direction.set(0,0,random(14)<.5?-1:1);
 const sizeA=vector(p,'size',phase,{x:1,y:1,z:1}),sizeB=vector(p,'size2',phase,sizeA),sizeRandom=number(p,'size_randomize',phase)?random(40):0,sizes=['x','y','z'].map(k=>randRange(sizeA[k],sizeB[k],sizeRandom));
 const turnA=vector(p,'rotation',phase),turnB=vector(p,'rotation2',phase,turnA),rr=number(p,'rotation_randomize',phase)?random(41):0,rotation=['x','y','z'].map(k=>randRange(turnA[k],turnB[k],rr));
 return {p,d:particleDynamics(p,phase),initial,direction,colors:particleColors(p,phase,seed),sizes,rotation};
}
function particleUv(d:ParticleDynamics,t:number,seed:number):[number,number,number,number]{
 const cols=Math.max(1,d.uv_flipbook_cols),rows=Math.max(1,d.uv_flipbook_rows),mid=d.uv_flipbook_start_lifespan_factor,start=d.uv_flipbook_start_init_index,a=d.uv_flipbook_start_stop_index,b=d.uv_flipbook_end_init_index,end=d.uv_flipbook_end_stop_index;
 let frame=t<=mid?randRange(start,a,Math.min(1,t/Math.max(1e-9,mid))):randRange(b,end,(t-mid)/Math.max(1e-9,1-mid));
 if(d.flags&0x10000)frame+=Math.floor(sourceRandom(seed,73)*cols*rows);
 frame=((Math.floor(frame)%(cols*rows))+(cols*rows))%(cols*rows);return [(frame%cols)/cols,(rows-1-Math.floor(frame/cols))/rows,1/cols,1/rows];
}
function particleScratch(){return {velocity:new THREE.Vector3(),local:new THREE.Vector3(),worldVelocity:new THREE.Vector3(),emitterOrigin:new THREE.Vector3(),parentScale:new THREE.Vector3(),along:new THREE.Vector3(),eye:new THREE.Vector3(),right:new THREE.Vector3(),normal:new THREE.Vector3(),scale:new THREE.Vector3(),basis:new THREE.Matrix4(),rotation:new THREE.Quaternion(),turn:new THREE.Quaternion()};}
type ParticleScratch=ReturnType<typeof particleScratch>;
function orient(position:THREE.Vector3,direction:THREE.Vector3,camera:THREE.Camera,type:number,angle:number,bone:THREE.Matrix4,s:ParticleScratch){
 const q=s.rotation;
 if(type===5||type===6)q.setFromAxisAngle(xAxis,-Math.PI/2);
 else if(type===2)q.setFromUnitVectors(zAxis,s.along.copy(direction).normalize());
 else if(type===7)bone.decompose(s.eye,q,s.scale);
 else q.copy(camera.quaternion);
 if(type===1||type===6||type===9||type===10){const along=s.along.copy(direction).normalize(),eye=type===6?up:s.eye.copy(camera.position).sub(position).normalize(),right=s.right.crossVectors(along,eye).normalize(),normal=s.normal.crossVectors(right,along).normalize();if(right.lengthSq()>.01)q.setFromRotationMatrix(s.basis.makeBasis(right,along,normal));}
 else q.multiply(s.turn.setFromAxisAngle(zAxis,angle));return q;
}
type BirthLife={normal:number;random:number;randomized:boolean};
const livesByEmitter=new WeakMap<SourceEmitter,WeakMap<SourcePhase['clip'],Map<number,BirthLife>>>();
function birthLife(emitter:SourceEmitter,phase:SourcePhase){
 let clips=livesByEmitter.get(emitter);if(!clips){clips=new WeakMap();livesByEmitter.set(emitter,clips);}let times=clips.get(phase.clip);if(!times){times=new Map();clips.set(phase.clip,times);}const hit=times.get(phase.seconds);if(hit)return hit;
 const normal=number(emitter,'lifespan',phase),value={normal,random:number(emitter,'lifespan_random',phase,normal),randomized:!!number(emitter,'lifespan_randomize',phase)};
 if(times.size>=512)times.clear();times.set(phase.seconds,value);return value;
}
/** Replay all authored emitters analytically from native time, including after a render gap. */
export function sourceParticleQuads(def:SourceEffectDefinition,request:SourceEffectRequest,camera:THREE.Camera,ground:(p:{x:number;z:number})=>number,cache?:SourceParticleCache,decorationFraction=1,decorationEmitters?:ReadonlySet<number>):SourceParticleQuad[]{
 const result:SourceParticleQuad[]=[];if(!def.particles.length)return result;
 const phases=sourcePhases(def,request.age,request.loop,request.seed,request.clip),phaseNow=sourcePhase(def,request.age,request.loop,request.seed,request.clip,phases);let nowPlacement:THREE.Matrix4|undefined,nowBones:THREE.Matrix4[]|undefined;
 const emitters=emittersFor(def);let scratch:ParticleScratch|undefined;
 for(const {p:emitter,index}of emitters){let emitted=0,parentLocal:THREE.Matrix4|undefined,localScale:number|undefined,lastParent:THREE.Matrix4|undefined,lastBorn:number|undefined,lastClip:SourcePhase['clip']|undefined,lastSeconds:number|undefined,scaleParent:THREE.Matrix4|undefined;const flags=number(emitter,'flags',phaseNow),additional=number(emitter,'additional_flags',phaseNow),worldSpace=!!(additional&8)||!!number(emitter,'world_space',phaseNow),type=number(emitter,'particle_type',phaseNow),max=number(emitter,'emit_max',phaseNow,Infinity);
  const births=activeBirths(def,emitter,request.age,!!request.loop,request.seed,request.clip,phases,decorationFraction>=1||decorationEmitters&&!decorationEmitters.has(index%1000)?particleLifetimeBound(def,emitter):Infinity);
  for(const birth of births){const age=request.age-birth.born,phase=birth.phase,seed=(request.seed^Math.imul(index+1,7919)^Math.imul(birth.ordinal+1,104729))>>>0,random=(i:number)=>sourceRandom(seed,i);
   const lifespan=birthLife(emitter,phase),life=(additional&2)||lifespan.randomized?randRange(lifespan.normal,lifespan.random,random(18)):lifespan.normal;if(life<=0||age<0||age>=life||request.stopAt!==undefined&&birth.born>request.stopAt)continue;
   if(emitted>=max)break;emitted++;if(decorationFraction<1&&(!decorationEmitters||decorationEmitters.has(index%1000))&&emitted>1&&births.length>3&&sourceRandom(seed,997)>=decorationFraction)continue;const t=age/life;
   const born=cache?cache.get(def,request,index,birth,()=>particleBirth(emitter,phase,seed)):particleBirth(emitter,phase,seed),{p,d,initial}=born,s=scratch??=particleScratch(),direction=s.velocity.copy(born.direction);
   const speedA=d.emit_speed,speed=((additional&1)||d.emit_speed_randomize?randRange(speedA,d.emit_speed_random,random(19)):speedA)+dynamicVariation(d.variation.speed,age,seed),velocity=direction.multiplyScalar(speed);
   // PAR_.gravity is the signed source Z acceleration (zAcceleration in the
   // independent M3 schema), not a positive downward magnitude. In particular
   // BanelingDeath authors -20: negating it launched the acid upwards.
   const drag=Math.max(0,d.drag),travel=drag>1e-8?(1-Math.exp(-drag*age))/drag:age,local=s.local.copy(initial).addScaledVector(velocity,travel),gravity=d.gravity*(flags&0x20000?((additional&4)||d.mass_randomize?randRange(d.mass,d.mass2,random(20)):d.mass):1);local.z+=.5*gravity*age*age;
   const noise=d.noise_amplitude,frequency=d.noise_frequency;if(noise)for(let axis=0;axis<3;axis++)local.setComponent(axis,local.getComponent(axis)+noise*Math.sin(age*frequency+random(30+axis)*Math.PI*2));
   // Local forces use authored channels and source-space positions. Integrating on
   // an age grid, rather than render dt, makes paused and restored views identical.
   const localForces=d.local_forces,forces=def.forces.length?def.forces.filter(f=>(Number(f.channels)&localForces)!==0):undefined;
   if(forces?.length){const pose=boneMatrices(def,phase),emitter=pose[p.bone]??new THREE.Matrix4(),inverse=emitter.clone().invert(),position=initial.clone(),v=velocity.clone(),steps=Math.max(1,Math.ceil(age*60)),dt=age/steps;
    for(let step=0;step<steps;step++){const acceleration=new THREE.Vector3(0,0,gravity);for(const f of forces){const center=new THREE.Vector3().setFromMatrixPosition(pose[f.bone]??new THREE.Matrix4()).applyMatrix4(inverse),delta=position.clone().sub(center),distance=delta.length(),radius=number(f,'width',phase);if(distance>1e-5&&(!radius||distance<=radius))acceleration.addScaledVector(delta.normalize(),number(f,'strength',phase));}v.addScaledVector(acceleration,dt).multiplyScalar(Math.exp(-drag*dt));position.addScaledVector(v,dt);}local.copy(position);
   }
   // Local-space particles of this emitter share the exact current parent.
   // Scratch belongs to this call, so nested ground callbacks cannot corrupt it.
   let parent:THREE.Matrix4;
   if(worldSpace){if(lastParent&&lastBorn===birth.born&&lastClip===phase.clip&&lastSeconds===phase.seconds)parent=lastParent;
    else{parent=sourcePlacement(def,request.placement,birth.born).multiply(boneMatrices(def,phase)[p.bone]??new THREE.Matrix4());lastParent=parent;lastBorn=birth.born;lastClip=phase.clip;lastSeconds=phase.seconds;}}
   else parent=parentLocal??(parentLocal=(nowPlacement??=sourcePlacement(def,request.placement,request.age)).clone().multiply((nowBones??=boneMatrices(def,phaseNow))[p.bone]??new THREE.Matrix4()));
   const at=local.applyMatrix4(parent),worldVelocity=s.worldVelocity.copy(velocity).transformDirection(parent).multiplyScalar(speed);
   if(flags&2){const floor=ground(at)+.025;if(at.y<floor){const restitution=d.bounce;at.y=floor+(floor-at.y)*Math.max(0,restitution);worldVelocity.y=Math.abs(worldVelocity.y)*restitution;}}
   const sizes=born.sizes,smoothing=d.size_smoothing,baseSize=lifeCurve(sizes[0],sizes[1],sizes[2],t,d.size_anim_mid,smoothing,smoothing>=3?d.size_hold:0)+dynamicVariation(d.variation.size,age,seed),unitScale=(request.placement.scale??1)*1.4;
   let nativeScale=localScale;if(parent!==scaleParent||nativeScale===undefined){const parentScale=s.parentScale.setFromMatrixScale(parent);nativeScale=Math.max(0,(parentScale.x+parentScale.z)*.5);localScale=nativeScale;scaleParent=parent;}
   let width=Math.max(0,baseSize*nativeScale),length=width;const rot=born.rotation,angle=lifeCurve(rot[0],rot[1],rot[2],t,d.rotation_anim_mid,d.rotation_smoothing)+dynamicVariation(d.variation.rotation,age,seed);
   let along=worldVelocity;
   if(type===1||type===6||type===10){const tail=d.instance_tail*unitScale,computed=Math.abs(speed*travel)*unitScale;length=flags&0x100000?tail:flags&0x40000?Math.min(tail,computed):computed*tail;length=Math.max(width,length);at.addScaledVector(s.along.copy(along).normalize(),-length*.5);}
   if(type===9){const emitterOrigin=s.emitterOrigin.set(0,0,0).applyMatrix4(parent);along=s.worldVelocity.copy(at).sub(emitterOrigin);length=Math.max(width,along.length());at.lerp(emitterOrigin,.5);}
   const color=sourceColor(d,t,born.colors);color[3]=Math.max(0,Math.min(1,color[3]+dynamicVariation(d.variation.alpha,age,seed)));if(color[3]<=0||width<=0)continue;
   if(type===5||type===6)at.y=ground(at)+.03;
   const matrix=new THREE.Matrix4().compose(at,orient(at,along,camera,type,angle,parent,s),s.scale.set(width,length,1));
   result.push({materialReference:p.material_reference_index,emitter:index,born:birth.born,matrix,color,uv:particleUv(d,t,seed),phase:phaseNow});
  }
 }
 return result;
}
