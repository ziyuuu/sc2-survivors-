import * as THREE from 'three';
import type {SourceEffectDefinition,SourceEffectRequest,SourceEmitter,SourcePhase,SourcePlacement} from './types';
import {activeBirths,boneMatrices,emissionSchedule,lifeCurve,sourceNumber as number,sourceVector as vector,sourceRandom,sourcePhase,sourcePhases,sourceSample,particleLifetimeBound} from './timeline';
import type {MaterialRef} from '../../materials/source-tracks';
import type {SourceQuad} from './draw-batch';
import {groundParticleMotion} from './particle-ground';

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
const dynamicDefaults={emit_speed:0,emit_speed_randomize:0,drag:0,gravity:0,mass_randomize:0,mass:1,mass2:1,noise_amplitude:0,noise_frequency:0,local_forces:0,bounce:0,friction:1,size_smoothing:0,size_anim_mid:.5,size_hold:0,rotation_anim_mid:.5,rotation_smoothing:0,instance_tail:1,color_anim_mid:.5,color_smoothing:0,color_hold:0,alpha_anim_mid:.5,alpha_hold:0,uv_flipbook_cols:1,uv_flipbook_rows:1,uv_flipbook_start_lifespan_factor:1,uv_flipbook_start_init_index:0,uv_flipbook_start_stop_index:0,uv_flipbook_end_init_index:0,uv_flipbook_end_stop_index:0,flags:0};
type ParticleDynamics=Record<keyof typeof dynamicDefaults,number>&{emit_speed_random:number;variation:Record<'speed'|'size'|'rotation'|'alpha',Variation>;linearBillboard:boolean};
// A sampled emitter has one exact birth phase. Share its immutable interpretation,
// but keep per-particle randomness and every age-dependent operation unchanged.
const dynamicsByEmitter=new WeakMap<SourceEmitter,ParticleDynamics>();
function particleDynamics(p:SourceEmitter,phase:SourcePhase):ParticleDynamics{
 let value=dynamicsByEmitter.get(p);if(value)return value;
 const parsed=Object.fromEntries(Object.entries(dynamicDefaults).map(([key,fallback])=>[key,number(p,key,phase,fallback)])) as Record<keyof typeof dynamicDefaults,number>;
 const variation=Object.fromEntries(['speed','size','rotation','alpha'].map(key=>[key,[number(p,key+'_var_amplitude',phase),number(p,key+'_var_shape',phase),number(p,key+'_var_frequency',phase),number(p,'phase_shift',phase)]])) as ParticleDynamics['variation'];
 const linearBillboard=!parsed.local_forces&&!parsed.noise_amplitude&&!Object.values(variation).some(v=>v[0])&&
  !parsed.size_smoothing&&!parsed.rotation_smoothing&&!parsed.color_smoothing&&
  parsed.size_anim_mid===parsed.rotation_anim_mid&&parsed.size_anim_mid===parsed.color_anim_mid&&parsed.size_anim_mid===parsed.alpha_anim_mid&&
  parsed.uv_flipbook_cols<=1&&parsed.uv_flipbook_rows<=1;
 value={...parsed,emit_speed_random:number(p,'emit_speed_random',phase,parsed.emit_speed),variation,linearBillboard};dynamicsByEmitter.set(p,value);return value;
}
type ParticleBirth={p:SourceEmitter;d:ParticleDynamics;initial:THREE.Vector3;direction:THREE.Vector3;colors:ReturnType<typeof particleColors>;grey:boolean;white:boolean;sizes:number[];rotation:number[];quad?:SourceParticleQuad;launch?:{velocity:THREE.Vector3;gravity:THREE.Vector3}};
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
 const v=new THREE.Vector3((def.scale[0]??1)*scale*(p.widthScale??1),(def.scale[1]??1)*scale,(def.scale[2]??1)*scale);
 if(p.end){const anchor=def.bones.find(b=>b.name==='Attacher'),length=Math.abs(anchor?.rest?.position[1]??(anchor?.location.default as Record<string,number>|undefined)?.y??0);if(length>.001)v.y=new THREE.Vector3(p.end.x-p.x,p.end.y-p.y,p.end.z-p.z).length()/length;}
 return new THREE.Matrix4().compose(translation,rotation,new THREE.Vector3(1,1,1)).multiply(new THREE.Matrix4().makeScale(1,p.heightScale??1,1)).multiply(conversion).multiply(new THREE.Matrix4().makeScale(v.x,v.y,v.z));
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
function sourceColor(d:ParticleDynamics,t:number,born:ParticleBirth,out:SourceQuad['color']=[0,0,0,0]){
 const colors=born.colors;
 const mid=d.color_anim_mid,smooth=d.color_smoothing,hold=smooth>=3?d.color_hold:0;
 const channel=(key:'r'|'g'|'b')=>linear(lifeCurve(colors[0][key],colors[1][key],colors[2][key],t,mid,smooth,hold));
 const alpha=lifeCurve(colors[0].a,colors[1].a,colors[2].a,t,d.alpha_anim_mid,smooth,smooth>=3?d.alpha_hold:0)/255;
 out[0]=born.white?1:channel('r');out[1]=born.grey?out[0]:channel('g');out[2]=born.grey?out[0]:channel('b');
 out[3]=Math.max(0,Math.min(1,alpha));return out;
}
function particleBirth(emitter:SourceEmitter,phase:SourcePhase,seed:number):ParticleBirth {
 const p=birthEmitter(emitter,phase),random=(i:number)=>sourceRandom(seed,i),initial=shapePoint(p,phase,seed),angles=new THREE.Euler(number(p,'emit_angle_x',phase)+(random(8)-.5)*number(p,'emit_spread_x',phase),number(p,'emit_angle_y',phase)+(random(9)-.5)*number(p,'emit_spread_y',phase),0,'YXZ');
 let direction=new THREE.Vector3(0,0,1).applyEuler(angles);const emitType=number(p,'emit_type',phase);if(emitType===1)direction=initial.lengthSq()?initial.clone().normalize():new THREE.Vector3(random(11)-.5,random(12)-.5,random(13)-.5).normalize();if(emitType===2)direction.set(0,0,random(14)<.5?-1:1);
 const sizeA=vector(p,'size',phase,{x:1,y:1,z:1}),sizeB=vector(p,'size2',phase,sizeA),sizeRandom=number(p,'size_randomize',phase)?random(40):0,sizes=['x','y','z'].map(k=>randRange(sizeA[k],sizeB[k],sizeRandom));
 const turnA=vector(p,'rotation',phase),turnB=vector(p,'rotation2',phase,turnA),rr=number(p,'rotation_randomize',phase)?random(41):0,rotation=['x','y','z'].map(k=>randRange(turnA[k],turnB[k],rr));
 const colors=particleColors(p,phase,seed),grey=colors.every(c=>c.r===c.g&&c.g===c.b);
 return {p,d:particleDynamics(p,phase),initial,direction,colors,grey,white:grey&&colors.every(c=>c.r===255),sizes,rotation};
}
function particleUv(d:ParticleDynamics,t:number,seed:number,out:SourceQuad['uv']=[0,0,1,1]){
 const cols=Math.max(1,d.uv_flipbook_cols),rows=Math.max(1,d.uv_flipbook_rows),mid=d.uv_flipbook_start_lifespan_factor,start=d.uv_flipbook_start_init_index,a=d.uv_flipbook_start_stop_index,b=d.uv_flipbook_end_init_index,end=d.uv_flipbook_end_stop_index;
 if(cols===1&&rows===1)return out;
 let frame=t<=mid?randRange(start,a,Math.min(1,t/Math.max(1e-9,mid))):randRange(b,end,(t-mid)/Math.max(1e-9,1-mid));
 if(d.flags&0x10000)frame+=Math.floor(sourceRandom(seed,73)*cols*rows);
 frame=((Math.floor(frame)%(cols*rows))+(cols*rows))%(cols*rows);out[0]=(frame%cols)/cols;out[1]=(rows-1-Math.floor(frame/cols))/rows;out[2]=1/cols;out[3]=1/rows;return out;
}
function particleScratch(){return {velocity:new THREE.Vector3(),motion:new THREE.Vector3(),gravity:new THREE.Vector3(),local:new THREE.Vector3(),worldVelocity:new THREE.Vector3(),emitterOrigin:new THREE.Vector3(),parentScale:new THREE.Vector3(),along:new THREE.Vector3(),eye:new THREE.Vector3(),right:new THREE.Vector3(),normal:new THREE.Vector3(),scale:new THREE.Vector3(),basis:new THREE.Matrix4(),linear:new THREE.Matrix3(),rotation:new THREE.Quaternion(),turn:new THREE.Quaternion()};}
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
type LocalForce={center:THREE.Vector3;radius:number;strength:number};
const forceFrames=new WeakMap<SourceEffectDefinition,WeakMap<SourceEmitter,LocalForce[]>>();
function localForceFrame(def:SourceEffectDefinition,p:SourceEmitter,phase:SourcePhase,channels:number){
 if(!channels||!def.forces.length)return;
 let frames=forceFrames.get(def);if(!frames){frames=new WeakMap();forceFrames.set(def,frames);}
 const existing=frames.get(p);if(existing)return existing;
 const matched=def.forces.filter(f=>(Number(f.channels)&channels)!==0),forces:LocalForce[]=[];
 if(matched.length){
  const pose=boneMatrices(def,phase),inverse=(pose[p.bone]??new THREE.Matrix4()).clone().invert();
  for(const f of matched)forces.push({center:new THREE.Vector3().setFromMatrixPosition(pose[f.bone]??new THREE.Matrix4()).applyMatrix4(inverse),radius:number(f,'width',phase),strength:number(f,'strength',phase)});
 }
 frames.set(p,forces);return forces;
}
// The force centres and tracks are sampled at birth. Keep the original age
// grid (including its last fractional step) and integrate without allocation.
function integrateForces(forces:LocalForce[],initial:THREE.Vector3,velocity:THREE.Vector3,acceleration:THREE.Vector3,age:number,drag:number,position:THREE.Vector3,motion:THREE.Vector3){
 let {x,y,z}=initial,vx=velocity.x,vy=velocity.y,vz=velocity.z;
 const steps=Math.max(1,Math.ceil(age*60)),dt=age/steps,damping=Math.exp(-drag*dt);
 for(let step=0;step<steps;step++){
  let ax=acceleration.x,ay=acceleration.y,az=acceleration.z;
  for(const {center,radius,strength} of forces){
   const dx=x-center.x,dy=y-center.y,dz=z-center.z,distance=Math.sqrt(dx*dx+dy*dy+dz*dz);
   if(distance>1e-5&&(!radius||distance<=radius)){const inv=1/distance;ax+=dx*inv*strength;ay+=dy*inv*strength;az+=dz*inv*strength;}
  }
  vx=(vx+ax*dt)*damping;vy=(vy+ay*dt)*damping;vz=(vz+az*dt)*damping;
  x+=vx*dt;y+=vy*dt;z+=vz*dt;
 }
 position.set(x,y,z);motion.set(vx,vy,vz);
}
type ScheduledParticle={born:number;ordinal:number;phase:SourcePhase;lifespan:BirthLife};
type PreparedEmitter={births:ScheduledParticle[];bones:Map<number,THREE.Matrix4>};
const stationaryClips=new WeakMap<SourceEffectDefinition,WeakMap<SourcePhase['clip'],Map<SourceEmitter,PreparedEmitter>>>();
function prepareStationaryClip(def:SourceEffectDefinition,clip:SourcePhase['clip']){
 let clips=stationaryClips.get(def);if(!clips){clips=new WeakMap();stationaryClips.set(def,clips);}
 const prior=clips.get(clip);if(prior)return prior;
 const emitters=new Map<SourceEmitter,PreparedEmitter>();
 for(const {p:emitter} of emittersFor(def)){
  const bones=new Map<number,THREE.Matrix4>(),births=emissionSchedule(emitter,clip).map(({time,ordinal})=>{
   const phase={clip,seconds:time,offset:0,cycle:0};
   if(!bones.has(time)){
    const p=birthEmitter(emitter,phase),d=particleDynamics(p,phase);
    bones.set(time,boneMatrices(def,phase)[p.bone]??new THREE.Matrix4());
    birthLife(emitter,phase);localForceFrame(def,p,phase,d.local_forces);
   }
   return {born:time,ordinal,phase,lifespan:birthLife(emitter,phase)};
  });
  emitters.set(emitter,{births,bones});
 }
 clips.set(clip,emitters);return emitters;
}
type ParentFrame={matrix:THREE.Matrix4;gravityAxis:THREE.Vector3;scale:number};
type StationaryEvent={def:SourceEffectDefinition;seed:number;position:SourcePlacement;placement:THREE.Matrix4;gravityScale:number;clip:SourcePhase['clip'];seen:number;plan:Map<SourceEmitter,PreparedEmitter>;samples:Map<number,ParticleBirth[]>;parents:Map<THREE.Matrix4,ParentFrame>};
/** A stationary single-clip impact has one transform per emitter birth, even
 * when eight different impacts are on screen. Only immutable clip data is shared. */
export class StationaryParticleCache {
 private events=new Map<string,StationaryEvent>();private frame=0;private time=-Infinity;
 prepare(def:SourceEffectDefinition,name:string){const clip=def.materialProfile.clips.find(c=>c.name===name);if(clip)prepareStationaryClip(def,clip);}
 begin(time:number){if(time<this.time)this.events.clear();this.time=time;this.frame++;}
 event(def:SourceEffectDefinition,request:SourceEffectRequest,clip:SourcePhase['clip']){
  const p=request.placement;
  if(request.loop||request.clip!==clip.name||p.from||p.end||p.matrix||p.direction)return;
  let e=this.events.get(request.key);
  if(e){const q=e.position;if(e.def!==def||e.seed!==request.seed||e.clip!==clip||p.x!==q.x||p.y!==q.y||p.z!==q.z||p.scale!==q.scale||p.widthScale!==q.widthScale||p.heightScale!==q.heightScale||p.facing!==q.facing)e=undefined;}
  if(!e){
   if(!this.events.has(request.key)&&this.events.size>=24)return; // Additional effects use the ordinary sampler.
   const placement=sourcePlacement(def,p);
   e={def,seed:request.seed,position:{...p},placement,gravityScale:new THREE.Vector3().setFromMatrixColumn(placement,2).length(),clip,seen:this.frame,plan:prepareStationaryClip(def,clip),samples:new Map(),parents:new Map()};
   this.events.set(request.key,e);
  }
  e.seen=this.frame;return e;
 }
 end(){for(const [key,e] of this.events)if(e.seen!==this.frame)this.events.delete(key);}
 reset(){this.events.clear();this.time=-Infinity;}
 get size(){return this.events.size;}
}
function stationaryParent(e:StationaryEvent,bone:THREE.Matrix4){
 let frame=e.parents.get(bone);
 if(!frame){
  const matrix=e.placement.clone().multiply(bone),scale=new THREE.Vector3().setFromMatrixScale(matrix);
  frame={matrix,gravityAxis:new THREE.Vector3(0,e.gravityScale,0).applyMatrix3(new THREE.Matrix3().setFromMatrix4(matrix).invert()),scale:Math.max(0,(scale.x+scale.z)*.5)};
  e.parents.set(bone,frame);
 }
 return frame;
}
// The long-lived smoke billboards use the same linear midpoint for size, turn,
// RGB and alpha. Evaluate that authored envelope once, still facing the live camera.
function sampleLinearBillboard(b:ParticleBirth,fixed:ParentFrame,phase:SourcePhase,index:number,birthTime:number,age:number,t:number,seed:number,additional:number,camera:THREE.Camera,s:ParticleScratch){
 const d=b.d;
 if(!b.launch){
  const speed=(additional&1)||d.emit_speed_randomize?randRange(d.emit_speed,d.emit_speed_random,sourceRandom(seed,19)):d.emit_speed;
  b.launch={velocity:b.direction.clone().multiplyScalar(speed),gravity:fixed.gravityAxis.clone().multiplyScalar(d.gravity)};
 }
 const mid=Math.max(.000001,Math.min(.999999,d.size_anim_mid)),i=t<=mid?0:1;
 const f=t<mid?t/Math.max(.000001,mid):t===mid?1:(t-mid)/Math.max(.000001,1-mid);
 const a=b.colors[i],end=b.colors[i+1],width=Math.max(0,randRange(b.sizes[i],b.sizes[i+1],f)*fixed.scale),alpha=Math.max(0,Math.min(1,randRange(a.a,end.a,f)/255));
 if(width<=0||alpha<=0)return;
 const q=b.quad??={materialReference:b.p.material_reference_index,emitter:index,born:birthTime,phase,matrix:new THREE.Matrix4(),color:[0,0,0,0],uv:[0,0,1,1]};
 q.color[0]=b.white?1:linear(randRange(a.r,end.r,f));q.color[1]=b.grey?q.color[0]:linear(randRange(a.g,end.g,f));q.color[2]=b.grey?q.color[0]:linear(randRange(a.b,end.b,f));q.color[3]=alpha;
 const drag=Math.max(0,d.drag),travel=drag>1e-8?(1-Math.exp(-drag*age))/drag:age;
 const position=s.local.copy(b.initial).addScaledVector(b.launch.velocity,travel).addScaledVector(b.launch.gravity,.5*age*age).applyMatrix4(fixed.matrix);
 const angle=randRange(b.rotation[i],b.rotation[i+1],f),rotation=s.rotation.copy(camera.quaternion).multiply(s.turn.setFromAxisAngle(zAxis,angle));
 q.matrix.compose(position,rotation,s.scale.set(width,width,1));q.phase=phase;return q;
}
/** Replay all authored emitters analytically from native time, including after a render gap. */
export function sourceParticleQuads(def:SourceEffectDefinition,request:SourceEffectRequest,camera:THREE.Camera,ground:(p:{x:number;z:number})=>number,cache?:SourceParticleCache,decorationFraction=1,decorationEmitters?:ReadonlySet<number>,stationaryCache?:StationaryParticleCache):SourceParticleQuad[]{
 const result:SourceParticleQuad[]=[];if(!def.particles.length)return result;
 const phases=sourcePhases(def,request.age,request.loop,request.seed,request.clip),phaseNow=sourcePhase(def,request.age,request.loop,request.seed,request.clip,phases);let nowPlacement:THREE.Matrix4|undefined,nowBones:THREE.Matrix4[]|undefined;
 const stationary=decorationFraction===1?stationaryCache?.event(def,request,phaseNow.clip):undefined;
 const emitters=emittersFor(def);let scratch:ParticleScratch|undefined;
 for(const {p:emitter,index}of emitters){let emitted=0,parentLocal:THREE.Matrix4|undefined,localScale:number|undefined,lastParent:THREE.Matrix4|undefined,lastBorn:number|undefined,lastClip:SourcePhase['clip']|undefined,lastSeconds:number|undefined,scaleParent:THREE.Matrix4|undefined,gravityParent:THREE.Matrix4|undefined,gravityAxis:THREE.Vector3|undefined,gravityScale=1;const flags=number(emitter,'flags',phaseNow),additional=number(emitter,'additional_flags',phaseNow),worldSpace=!!(additional&8)||!!number(emitter,'world_space',phaseNow),type=number(emitter,'particle_type',phaseNow),max=number(emitter,'emit_max',phaseNow,Infinity);
  const plan=stationary?.plan.get(emitter);
  let samples=stationary?.samples.get(index);if(stationary&&!samples){samples=[];stationary.samples.set(index,samples);}
  const births=plan?.births??activeBirths(def,emitter,request.age,!!request.loop,request.seed,request.clip,phases,decorationFraction>=1||decorationEmitters&&!decorationEmitters.has(index%1000)?particleLifetimeBound(def,emitter):Infinity);
  for(const birth of births){if(birth.born>request.age+1e-8&&plan)break;const age=request.age-birth.born,phase=birth.phase,seed=(request.seed^Math.imul(index+1,7919)^Math.imul(birth.ordinal+1,104729))>>>0,random=(i:number)=>sourceRandom(seed,i);
   const lifespan=plan?(birth as ScheduledParticle).lifespan:birthLife(emitter,phase),life=(additional&2)||lifespan.randomized?randRange(lifespan.normal,lifespan.random,random(18)):lifespan.normal;if(life<=0||age<0||age>=life||request.stopAt!==undefined&&birth.born>request.stopAt)continue;
   if(emitted>=max)break;emitted++;if(decorationFraction<1&&(!decorationEmitters||decorationEmitters.has(index%1000))&&emitted>1&&births.length>3&&sourceRandom(seed,997)>=decorationFraction)continue;const t=age/life;
   const born=samples?(samples[birth.ordinal]??=particleBirth(emitter,phase,seed)):cache?cache.get(def,request,index,birth,()=>particleBirth(emitter,phase,seed)):particleBirth(emitter,phase,seed),{p,d,initial}=born,s=scratch??=particleScratch(),direction=s.velocity.copy(born.direction);
   // Emitter bones orient the launch, not gravity. Express world-up in the
   // emitter frame before integrating; tilted spark bones must still fall down.
   let parent:THREE.Matrix4;
   const fixed=stationary&&plan&&worldSpace?stationaryParent(stationary,plan.bones.get(phase.seconds)!):undefined;
   if(fixed&&type===0&&d.linearBillboard&&!(flags&(2|0x20000))&&typeof emitter.additional_flags!=='object'){
    const quad=sampleLinearBillboard(born,fixed,phaseNow,index,birth.born,age,t,seed,additional,camera,s);
    if(quad)result.push(quad);continue;
   }
   if(fixed){parent=fixed.matrix;gravityAxis=fixed.gravityAxis;gravityParent=parent;gravityScale=stationary!.gravityScale;}
   else if(worldSpace){if(lastParent&&lastBorn===birth.born&&lastClip===phase.clip&&lastSeconds===phase.seconds)parent=lastParent;
    else{const placement=sourcePlacement(def,request.placement,birth.born);if(d.gravity)gravityScale=s.parentScale.setFromMatrixColumn(placement,2).length();parent=placement.multiply(boneMatrices(def,phase)[p.bone]??new THREE.Matrix4());lastParent=parent;lastBorn=birth.born;lastClip=phase.clip;lastSeconds=phase.seconds;}}
   else {const placement=nowPlacement??=sourcePlacement(def,request.placement,request.age);parent=parentLocal??(parentLocal=placement.clone().multiply((nowBones??=boneMatrices(def,phaseNow))[p.bone]??new THREE.Matrix4()));if(d.gravity)gravityScale=s.parentScale.setFromMatrixColumn(placement,2).length();}
   if(d.gravity&&parent!==gravityParent){gravityAxis=new THREE.Vector3(0,gravityScale,0).applyMatrix3(s.linear.setFromMatrix4(parent).invert());gravityParent=parent;}
   const speedA=d.emit_speed,speed=((additional&1)||d.emit_speed_randomize?randRange(speedA,d.emit_speed_random,random(19)):speedA)+dynamicVariation(d.variation.speed,age,seed),velocity=direction.multiplyScalar(speed);
   // PAR_.gravity is the signed source Z acceleration (zAcceleration in the
   // independent M3 schema), not a positive downward magnitude. In particular
   // BanelingDeath authors -20: negating it launched the acid upwards.
   const drag=Math.max(0,d.drag),travel=drag>1e-8?(1-Math.exp(-drag*age))/drag:age,local=s.local.copy(initial).addScaledVector(velocity,travel),gravity=d.gravity*(flags&0x20000?((additional&4)||d.mass_randomize?randRange(d.mass,d.mass2,random(20)):d.mass):1),acceleration=s.gravity.set(0,0,0);if(gravity)acceleration.copy(gravityAxis!).multiplyScalar(gravity);local.addScaledVector(acceleration,.5*age*age);
   // A tail follows the derivative of the same trajectory as its head. Keeping
   // the launch velocity made falling tank sparks draw backwards after turning.
   const tailParticle=type===1||type===6||type===10,motion=s.motion.copy(velocity);if(tailParticle){motion.multiplyScalar(Math.exp(-drag*age));motion.addScaledVector(acceleration,age);}
   if(tailParticle&&d.variation.speed[0]){const delta=.00001,slope=(dynamicVariation(d.variation.speed,age+delta,seed)-dynamicVariation(d.variation.speed,age-delta,seed))/(2*delta);motion.addScaledVector(born.direction,slope*travel);}
   const noise=d.noise_amplitude,frequency=d.noise_frequency;if(noise)for(let axis=0;axis<3;axis++){const phase=age*frequency+random(30+axis)*Math.PI*2;local.setComponent(axis,local.getComponent(axis)+noise*Math.sin(phase));if(tailParticle)motion.setComponent(axis,motion.getComponent(axis)+noise*frequency*Math.cos(phase));}
   // Local forces use authored channels and source-space positions. Integrating on
   // an age grid, rather than render dt, makes paused and restored views identical.
   const forces=localForceFrame(def,p,phase,d.local_forces);
   if(forces?.length)integrateForces(forces,initial,velocity,acceleration,age,drag,local,motion);
   // Local-space particles of this emitter share the exact current parent.
   // Scratch belongs to this call, so nested ground callbacks cannot corrupt it.
   const at=local.applyMatrix4(parent),worldVelocity=s.worldVelocity;
   if(tailParticle||type===2||(flags&2)!==0)worldVelocity.copy(tailParticle?motion:velocity).transformDirection(parent).multiplyScalar(tailParticle?motion.length():speed);
   if(flags&2){
    if(!forces?.length&&!noise&&!d.variation.speed[0]){at.copy(initial).applyMatrix4(parent);worldVelocity.copy(velocity).applyMatrix3(s.linear.setFromMatrix4(parent));groundParticleMotion(at,worldVelocity,age,gravity*gravityScale,drag,d.bounce,d.friction,ground);}
    else {const floor=ground(at)+.025;if(at.y<floor){const restitution=d.bounce;at.y=floor+(floor-at.y)*Math.max(0,restitution);worldVelocity.y=tailParticle?-worldVelocity.y*Math.max(0,restitution):Math.abs(worldVelocity.y)*restitution;}}
   }
   const sizes=born.sizes,smoothing=d.size_smoothing,baseSize=lifeCurve(sizes[0],sizes[1],sizes[2],t,d.size_anim_mid,smoothing,smoothing>=3?d.size_hold:0)+dynamicVariation(d.variation.size,age,seed),unitScale=(request.placement.scale??1)*1.4;
   let nativeScale=fixed?.scale??localScale;if(!fixed&&parent!==scaleParent||nativeScale===undefined){const parentScale=s.parentScale.setFromMatrixScale(parent);nativeScale=Math.max(0,(parentScale.x+parentScale.z)*.5);localScale=nativeScale;scaleParent=parent;}
   let width=Math.max(0,baseSize*nativeScale),length=width;const rot=born.rotation,angle=lifeCurve(rot[0],rot[1],rot[2],t,d.rotation_anim_mid,d.rotation_smoothing)+dynamicVariation(d.variation.rotation,age,seed);
   let along=worldVelocity;
   if(type===1||type===6||type===10){const moving=along.lengthSq()>1e-20,tail=d.instance_tail*unitScale,computed=moving?Math.abs(speed*travel)*unitScale:0;length=flags&0x100000?tail:flags&0x40000?Math.min(tail,computed):computed*tail;length=Math.max(width,Math.min(length,request.maxTailLength??Infinity));if(!moving)along.set(0,1,0);at.addScaledVector(s.along.copy(along).normalize(),-length*.5);}
   if(type===9){const emitterOrigin=s.emitterOrigin.set(0,0,0).applyMatrix4(parent);along=s.worldVelocity.copy(at).sub(emitterOrigin);length=Math.max(width,along.length());at.lerp(emitterOrigin,.5);}
   const reuse=stationary?born.quad:undefined,color=sourceColor(d,t,born,reuse?.color);color[3]=Math.max(0,Math.min(1,color[3]+dynamicVariation(d.variation.alpha,age,seed)));if(color[3]<=0||width<=0)continue;
   if(type===5||type===6)at.y=ground(at)+.03;
   const matrix=(reuse?.matrix??new THREE.Matrix4()).compose(at,orient(at,along,camera,type,angle,parent,s),s.scale.set(width,length,1));
   const uv=particleUv(d,t,seed,reuse?.uv);
   const quad=reuse??{materialReference:p.material_reference_index,emitter:index,born:birth.born,matrix,color,uv,phase:phaseNow};
   quad.phase=phaseNow;if(stationary)born.quad=quad;result.push(quad);
  }
 }
 return result;
}
