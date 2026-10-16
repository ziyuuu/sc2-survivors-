/** Original renderer before performance changes, with signed acceleration corrected. */
import * as THREE from 'three';
import type {SourceEffectDefinition,SourceEffectRequest,SourceEmitter,SourcePhase,SourcePlacement} from '../../src/render/effects/source/types';
import {activeBirths,boneMatrices,lifeCurve,sourceNumber as number,sourceVector as vector,sourceRandom,sourcePhase} from '../../src/render/effects/source/timeline';
import type {SourceQuad} from '../../src/render/effects/source/draw-batch';

export interface SourceParticleQuad extends SourceQuad {materialReference:number;emitter:number;born:number}
const origin=new THREE.Vector3(),zAxis=new THREE.Vector3(0,0,1),up=new THREE.Vector3(0,1,0);
const conversion=new THREE.Matrix4().makeRotationX(-Math.PI/2);
const linear=(v:number)=>{v=Math.max(0,v/255);return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
const randRange=(a:number,b:number,r:number)=>a+(b-a)*r;
export function sourcePlacement(def:SourceEffectDefinition,p:SourcePlacement,sampleAge=p.age??0){
 if(p.matrix)return new THREE.Matrix4().fromArray(p.matrix);
 const translation=new THREE.Vector3(p.x,p.y,p.z);if(p.from&&p.age&&sampleAge<p.age)translation.lerp(new THREE.Vector3(p.from.x,p.from.y,p.from.z),1-Math.max(0,sampleAge/p.age));
 const forward=p.end?new THREE.Vector3(p.end.x-p.x,p.end.y-p.y,p.end.z-p.z).normalize():new THREE.Vector3(Math.sin(p.facing),0,Math.cos(p.facing));
 const rotation=new THREE.Quaternion().setFromUnitVectors(zAxis,forward.lengthSq()?forward:zAxis),scale=(p.scale??1)*1.4;
 const v=new THREE.Vector3((def.scale[0]??1)*scale,(def.scale[1]??1)*scale,(def.scale[2]??1)*scale);
 if(p.end){const anchor=def.bones.find(b=>b.name==='Attacher'),length=Math.abs(anchor?.rest?.position[1]??(anchor?.location.default as Record<string,number>|undefined)?.y??0);if(length>.001)v.y=new THREE.Vector3(p.end.x-p.x,p.end.y-p.y,p.end.z-p.z).length()/length;}
 return new THREE.Matrix4().compose(translation,rotation,new THREE.Vector3(1,1,1)).multiply(conversion).multiply(new THREE.Matrix4().makeScale(v.x,v.y,v.z));
}
export function variation(p:SourceEmitter,key:string,phase:SourcePhase,age:number,seed:number){
 const shape=number(p,key+'_var_shape',phase),amplitude=number(p,key+'_var_amplitude',phase),f=age*number(p,key+'_var_frequency',phase)+number(p,'phase_shift',phase);
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
function sourceColor(p:SourceEmitter,phase:SourcePhase,t:number,seed:number):[number,number,number,number]{
 const colors=['init','mid','end'].map((key,i)=>{const a=vector(p,'color_'+key,phase,{r:255,g:255,b:255,a:255}),b=vector(p,'color2_'+key,phase,a),rgb=number(p,'color_randomize',phase)?sourceRandom(seed,60):0,alpha=number(p,'alpha_randomize',phase)?sourceRandom(seed,61):0;return {r:randRange(a.r,b.r,rgb),g:randRange(a.g,b.g,rgb),b:randRange(a.b,b.b,rgb),a:randRange(a.a,b.a,alpha)};});
 const mid=number(p,'color_anim_mid',phase,.5),smooth=number(p,'color_smoothing',phase),hold=smooth>=3?number(p,'color_hold',phase):0;
 const channel=(key:'r'|'g'|'b')=>linear(lifeCurve(colors[0][key],colors[1][key],colors[2][key],t,mid,smooth,hold));
 const alpha=lifeCurve(colors[0].a,colors[1].a,colors[2].a,t,number(p,'alpha_anim_mid',phase,.5),smooth,smooth>=3?number(p,'alpha_hold',phase):0)/255;
 return [channel('r'),channel('g'),channel('b'),Math.max(0,Math.min(1,alpha))];
}
function particleUv(p:SourceEmitter,phase:SourcePhase,t:number,seed:number):[number,number,number,number]{
 const cols=Math.max(1,number(p,'uv_flipbook_cols',phase,1)),rows=Math.max(1,number(p,'uv_flipbook_rows',phase,1)),mid=number(p,'uv_flipbook_start_lifespan_factor',phase,1),start=number(p,'uv_flipbook_start_init_index',phase),a=number(p,'uv_flipbook_start_stop_index',phase),b=number(p,'uv_flipbook_end_init_index',phase),end=number(p,'uv_flipbook_end_stop_index',phase);
 let frame=t<=mid?randRange(start,a,Math.min(1,t/Math.max(1e-9,mid))):randRange(b,end,(t-mid)/Math.max(1e-9,1-mid));
 if(number(p,'flags',phase)&0x10000)frame+=Math.floor(sourceRandom(seed,73)*cols*rows);
 frame=((Math.floor(frame)%(cols*rows))+(cols*rows))%(cols*rows);return [(frame%cols)/cols,(rows-1-Math.floor(frame/cols))/rows,1/cols,1/rows];
}
function orient(position:THREE.Vector3,direction:THREE.Vector3,camera:THREE.Camera,type:number,angle:number,bone:THREE.Matrix4){
 const q=new THREE.Quaternion();
 if(type===5||type===6)q.setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
 else if(type===2)q.setFromUnitVectors(zAxis,direction.clone().normalize());
 else if(type===7)bone.decompose(new THREE.Vector3(),q,new THREE.Vector3());
 else q.copy(camera.quaternion);
 if(type===1||type===6||type===9||type===10){const along=direction.clone().normalize(),eye=type===6?up:camera.position.clone().sub(position).normalize(),right=new THREE.Vector3().crossVectors(along,eye).normalize(),normal=new THREE.Vector3().crossVectors(right,along).normalize();if(right.lengthSq()>.01)q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,along,normal));}
 else q.multiply(new THREE.Quaternion().setFromAxisAngle(zAxis,angle));return q;
}
/** Replay all authored emitters analytically from native time, including after a render gap. */
export function legacySourceParticleQuads(def:SourceEffectDefinition,request:SourceEffectRequest,camera:THREE.Camera,ground:(p:{x:number;z:number})=>number):SourceParticleQuad[]{
 const result:SourceParticleQuad[]=[],phaseNow=sourcePhase(def,request.age,request.loop,request.seed,request.clip),nowBones=boneMatrices(def,phaseNow),nowPlacement=sourcePlacement(def,request.placement,request.age);
 const emitters=def.particles.flatMap((p,index)=>[{p,index},...((p.copy_indices as number[]|undefined)??[]).map(copy=>({p:{...p,...def.copies[copy]},index:index+1000*(copy+1)}))]);
 for(const {p,index}of emitters){let emitted=0;const flags=number(p,'flags',phaseNow),additional=number(p,'additional_flags',phaseNow),worldSpace=!!(additional&8)||!!number(p,'world_space',phaseNow),type=number(p,'particle_type',phaseNow),max=number(p,'emit_max',phaseNow,Infinity);
  const births=activeBirths(def,p,request.age,!!request.loop,request.seed,request.clip);
  for(const birth of births){const age=request.age-birth.born,phase=birth.phase,seed=(request.seed^Math.imul(index+1,7919)^Math.imul(birth.ordinal+1,104729))>>>0,random=(i:number)=>sourceRandom(seed,i);
   const lifeA=number(p,'lifespan',phase),life=(additional&2)||number(p,'lifespan_randomize',phase)?randRange(lifeA,number(p,'lifespan_random',phase,lifeA),random(18)):lifeA;if(life<=0||age<0||age>=life||request.stopAt!==undefined&&birth.born>request.stopAt)continue;
   if(emitted>=max)break;emitted++;const t=age/life;
   const initial=shapePoint(p,phase,seed),angles=new THREE.Euler(number(p,'emit_angle_x',phase)+(random(8)-.5)*number(p,'emit_spread_x',phase),number(p,'emit_angle_y',phase)+(random(9)-.5)*number(p,'emit_spread_y',phase),0,'YXZ');
   let direction=new THREE.Vector3(0,0,1).applyEuler(angles);const emitType=number(p,'emit_type',phase);if(emitType===1)direction=initial.lengthSq()?initial.clone().normalize():new THREE.Vector3(random(11)-.5,random(12)-.5,random(13)-.5).normalize();if(emitType===2)direction.set(0,0,random(14)<.5?-1:1);
   const speedA=number(p,'emit_speed',phase),speed=((additional&1)||number(p,'emit_speed_randomize',phase)?randRange(speedA,number(p,'emit_speed_random',phase,speedA),random(19)):speedA)+variation(p,'speed',phase,age,seed),velocity=direction.multiplyScalar(speed);
   const drag=Math.max(0,number(p,'drag',phase)),travel=drag>1e-8?(1-Math.exp(-drag*age))/drag:age,local=initial.clone().addScaledVector(velocity,travel),gravity=number(p,'gravity',phase)*(flags&0x20000?((additional&4)||number(p,'mass_randomize',phase)?randRange(number(p,'mass',phase,1),number(p,'mass2',phase,1),random(20)):number(p,'mass',phase,1)):1);local.z+=.5*gravity*age*age;
   const noise=number(p,'noise_amplitude',phase),frequency=number(p,'noise_frequency',phase);if(noise)for(let axis=0;axis<3;axis++)local.setComponent(axis,local.getComponent(axis)+noise*Math.sin(age*frequency+random(30+axis)*Math.PI*2));
   // Local forces use authored channels and source-space positions. Integrating on
   // an age grid, rather than render dt, makes paused and restored views identical.
   const localForces=number(p,'local_forces',phase),forces=def.forces.filter(f=>(Number(f.channels)&localForces)!==0);
   if(forces.length){const pose=boneMatrices(def,phase),emitter=pose[p.bone]??new THREE.Matrix4(),inverse=emitter.clone().invert(),position=initial.clone(),v=velocity.clone(),steps=Math.max(1,Math.ceil(age*60)),dt=age/steps;
    for(let step=0;step<steps;step++){const acceleration=new THREE.Vector3(0,0,gravity);for(const f of forces){const center=new THREE.Vector3().setFromMatrixPosition(pose[f.bone]??new THREE.Matrix4()).applyMatrix4(inverse),delta=position.clone().sub(center),distance=delta.length(),radius=number(f,'width',phase);if(distance>1e-5&&(!radius||distance<=radius))acceleration.addScaledVector(delta.normalize(),number(f,'strength',phase));}v.addScaledVector(acceleration,dt).multiplyScalar(Math.exp(-drag*dt));position.addScaledVector(v,dt);}local.copy(position);
   }
   const parent=worldSpace?sourcePlacement(def,request.placement,birth.born).multiply(boneMatrices(def,phase)[p.bone]??new THREE.Matrix4()):nowPlacement.clone().multiply(nowBones[p.bone]??new THREE.Matrix4());
   const at=local.applyMatrix4(parent),emitterOrigin=origin.clone().applyMatrix4(parent),worldVelocity=velocity.clone().transformDirection(parent).multiplyScalar(speed);
   if(flags&2){const floor=ground(at)+.025;if(at.y<floor){const restitution=number(p,'bounce',phase);at.y=floor+(floor-at.y)*Math.max(0,restitution);worldVelocity.y=Math.abs(worldVelocity.y)*restitution;}}
   const sizeA=vector(p,'size',phase,{x:1,y:1,z:1}),sizeB=vector(p,'size2',phase,sizeA),sizeRandom=number(p,'size_randomize',phase)?random(40):0,sizes=['x','y','z'].map(k=>randRange(sizeA[k],sizeB[k],sizeRandom)),smoothing=number(p,'size_smoothing',phase),baseSize=lifeCurve(sizes[0],sizes[1],sizes[2],t,number(p,'size_anim_mid',phase,.5),smoothing,smoothing>=3?number(p,'size_hold',phase):0)+variation(p,'size',phase,age,seed),unitScale=(request.placement.scale??1)*1.4;
   const parentScale=new THREE.Vector3().setFromMatrixScale(parent),nativeScale=Math.max(0,(parentScale.x+parentScale.z)*.5);
   let width=Math.max(0,baseSize*nativeScale),length=width;const turnA=vector(p,'rotation',phase),turnB=vector(p,'rotation2',phase,turnA),rr=number(p,'rotation_randomize',phase)?random(41):0,rot=['x','y','z'].map(k=>randRange(turnA[k],turnB[k],rr)),angle=lifeCurve(rot[0],rot[1],rot[2],t,number(p,'rotation_anim_mid',phase,.5),number(p,'rotation_smoothing',phase))+variation(p,'rotation',phase,age,seed);
   let along=worldVelocity;
   if(type===1||type===6||type===10){const tail=number(p,'instance_tail',phase,1)*unitScale,computed=Math.abs(speed*travel)*unitScale;length=flags&0x100000?tail:flags&0x40000?Math.min(tail,computed):computed*tail;length=Math.max(width,length);at.addScaledVector(along.clone().normalize(),-length*.5);}
   if(type===9){along=at.clone().sub(emitterOrigin);length=Math.max(width,along.length());at.lerp(emitterOrigin,.5);}
   const color=sourceColor(p,phase,t,seed);color[3]=Math.max(0,Math.min(1,color[3]+variation(p,'alpha',phase,age,seed)));if(color[3]<=0||width<=0)continue;
   if(type===5||type===6)at.y=ground(at)+.03;
   const matrix=new THREE.Matrix4().compose(at,orient(at,along,camera,type,angle,parent),new THREE.Vector3(width,length,1));
   result.push({materialReference:p.material_reference_index,emitter:index,born:birth.born,matrix,color,uv:particleUv(p,phase,t,seed),phase:phaseNow});
  }
 }
 return result;
}
