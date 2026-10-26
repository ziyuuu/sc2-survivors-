import * as THREE from 'three';
import type {SourceEffectDefinition,SourceEffectRequest,SourceEmitter,SourcePhase} from './types';
import {boneMatrices,lifeCurve,sourceNumber as number,sourceVector as vector,sourceRandom,sourcePhase} from './timeline';
import {sourcePlacement,variation,type SourceParticleQuad} from './particles';

const linear=(v:number)=>{v=Math.max(0,v/255);return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
const xyz=(v:Record<string,number>)=>new THREE.Vector3(v.x??0,v.y??0,v.z??0);
function ribbonColor(p:SourceEmitter,phase:SourcePhase,t:number,age:number,seed:number):[number,number,number,number]{
 const a=vector(p,'color_base',phase),b=vector(p,'color_mid',phase),c=vector(p,'color_tip',phase),mid=number(p,'color_anim_mid',phase,.5),smoothing=number(p,'color_smoothing',phase);
 return [linear(lifeCurve(a.r,b.r,c.r,t,mid,smoothing)),linear(lifeCurve(a.g,b.g,c.g,t,mid,smoothing)),linear(lifeCurve(a.b,b.b,c.b,t,mid,smoothing)),Math.max(0,Math.min(1,lifeCurve(a.a,b.a,c.a,t,number(p,'alpha_anim_mid',phase,.5),smoothing)/255+variation(p,'alpha',phase,age,seed)))];
}
/** The M3 ribbon's spline, section count, width/colour curves and cylinder sides
 * remain source data. Motion trails sample the saved launch/current trajectory. */
export function sourceRibbonQuads(def:SourceEffectDefinition,request:SourceEffectRequest,camera:THREE.Camera):SourceParticleQuad[]{
 const result:SourceParticleQuad[]=[];if(!def.ribbons.length)return result;
 const phase=sourcePhase(def,request.age,request.loop,request.seed,request.clip),placement=sourcePlacement(def,request.placement,request.age);let bones:THREE.Matrix4[]|undefined;
 for(const [index,p]of def.ribbons.entries()){
  if(request.ribbonIndices&&!request.ribbonIndices.includes(index))continue;
  // Beam actors supply the live spline endpoints. Their original M3 splines
  // have active=0 with no visibility track; that flag gates free trail emission.
  const hosted=request.hostedBeam&&request.placement.end&&(p.spline as unknown[]|undefined)?.length;
  if(!hosted&&number(p,'active',phase)<=0)continue;
  bones??=boneMatrices(def,phase);
  const transform=placement.clone().multiply(bones[p.bone]??new THREE.Matrix4()),start=new THREE.Vector3().setFromMatrixPosition(transform),scale=vector(p,'scale',phase,{x:1,y:1,z:1}),spline=(p.spline??[]) as SourceEmitter[],divisions=Math.max(1,number(p,'divisions',phase,8)),type=number(p,'ribbon_type',phase),sections=type===2?Math.max(3,number(p,'sides',phase,4)):type===3?Math.max(2,number(p,'sides',phase,3)):1;
  const nativeScale=new THREE.Vector3().setFromMatrixScale(transform),widthScale=(nativeScale.x+nativeScale.z)*.5,life=Math.max(.001,number(p,'lifespan',phase,1)),trailAge=Math.min(request.ribbonAge??request.age,life),limit=number(p,'length',phase)+variation(p,'length',phase,request.age,request.seed),points:THREE.Vector3[]=[];
  // M3 stores signed Z-up acceleration, just like its particle emitters.
  // Convert the vector (and source scale) once; negative Z must fall, not rise.
  const acceleration=new THREE.Vector3(number(p,'gravity_x',phase),number(p,'gravity_y',phase),number(p,'gravity',phase)).applyMatrix3(new THREE.Matrix3().setFromMatrix4(placement));
  const end=spline.length?xyz(vector(spline[0],'emission_offset',phase)).applyMatrix4(bones[spline[0].bone]??new THREE.Matrix4()).applyMatrix4(placement):undefined;
  for(let i=0;i<=divisions;i++){
   const t=i/divisions;let at:THREE.Vector3;
   if(end){at=start.clone().lerp(end,t);const direction=end.clone().sub(start),tangent=xyz(vector(spline[0],'emission_vector',phase)).transformDirection(transform),velocity=number(spline[0],'velocity',phase),factor=number(spline[0],'velocity_base_fac',phase,1)*(1-t)+number(spline[0],'velocity_end_fac',phase,1)*t;at.addScaledVector(tangent,Math.sin(t*Math.PI)*velocity*factor*Math.min(1,direction.length()));}
   else {const ago=trailAge*t,past=sourcePlacement(def,request.placement,Math.max(0,request.age-ago)),pastPhase=sourcePhase(def,Math.max(0,request.age-ago),request.loop,request.seed,request.clip),pose=boneMatrices(def,pastPhase);at=new THREE.Vector3().setFromMatrixPosition(past.multiply(pose[p.bone]??new THREE.Matrix4()));const emitted=number(p,'speed',phase)*ago;at.addScaledVector(new THREE.Vector3(0,0,1).transformDirection(transform),emitted*widthScale);at.addScaledVector(acceleration,.5*ago*ago);}
   const noise=number(p,'noise_amplitude',phase),frequency=number(p,'noise_frequency',phase),envelope=Math.sin(Math.PI*t);if(noise)for(let axis=0;axis<3;axis++)at.setComponent(axis,at.getComponent(axis)+noise*widthScale*envelope*Math.sin(t*frequency+request.age*number(p,'noise_cohesion',phase)+sourceRandom(request.seed,index*13+axis)*Math.PI*2));
   points.push(at);
  }
  // A finite ribbon length trims its history by travelled arc length. Radial
  // clamping piles old sections onto one tip and makes opaque cylinders fan
  // into black plates. Resample the trimmed path so width/UV curves span it once.
  if(!end&&limit>0&&points.length>1){
   const path=[points[0]],distances=[0],maximum=limit*widthScale;let total=0;
   for(let i=1;i<points.length;i++){
    const previous=path[path.length-1],segment=previous.distanceTo(points[i]);if(segment<1e-8)continue;
    const remaining=maximum-total;if(segment>=remaining){path.push(previous.clone().lerp(points[i],remaining/segment));total=maximum;distances.push(total);break;}
    total+=segment;path.push(points[i]);distances.push(total);
   }
   if(total>1e-8){points.length=0;let segment=1;for(let i=0;i<=divisions;i++){const distance=total*i/divisions;while(segment<distances.length-1&&distances[segment]<distance)segment++;points.push(path[segment-1].clone().lerp(path[segment],(distance-distances[segment-1])/Math.max(1e-8,distances[segment]-distances[segment-1])));}}
  }
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],t=(i-.5)/divisions,direction=b.clone().sub(a),length=direction.length();if(length<1e-7)continue;
   const at=a.clone().add(b).multiplyScalar(.5),along=direction.normalize(),width=Math.max(0,(lifeCurve(scale.x,scale.y,scale.z,t,number(p,'scale_anim_mid',phase,.5),number(p,'scale_smoothing',phase))+variation(p,'scale',phase,request.age,request.seed))*widthScale),twist=vector(p,'twist',phase),angle=lifeCurve(twist.x,twist.y,twist.z,t,number(p,'twist_anim_mid',phase,.5));
   const eye=type===0?camera.position.clone().sub(at).normalize():new THREE.Vector3(0,0,1).transformDirection(transform);let right=new THREE.Vector3().crossVectors(along,eye).normalize();if(right.lengthSq()<.01)right=new THREE.Vector3().crossVectors(along,new THREE.Vector3(1,0,0).transformDirection(transform)).normalize();const normal=new THREE.Vector3().crossVectors(right,along).normalize(),color=ribbonColor(p,phase,t,request.age,request.seed);if(width<=0||color[3]<=0)continue;
   for(let side=0;side<sections;side++){
    const theta=angle+side*Math.PI*2/sections,basis=right.clone().multiplyScalar(Math.cos(theta)).addScaledVector(normal,Math.sin(theta)),faceNormal=new THREE.Vector3().crossVectors(basis,along).normalize(),position=at.clone(),faceWidth=type===2?width*Math.sin(Math.PI/sections):width;
    if(type===2)position.addScaledVector(faceNormal,width*.5*Math.cos(Math.PI/sections));
    const matrix=new THREE.Matrix4().makeBasis(basis.multiplyScalar(faceWidth),along.clone().multiplyScalar(length*1.015),faceNormal).setPosition(position);
    result.push({materialReference:p.material_reference_index,emitter:index,born:0,matrix,color:[...color],uv:[type===2?side/sections:0,(i-1)/divisions,type===2?1/sections:1,1/divisions],segmentedUv:true,phase});
   }
  }
 }
 return result;
}

/** Original orthographic splats use their own extents and attack/hold/decay,
 * projected onto the unchanged terrain height rather than an auxiliary marker. */
export function sourceProjectionQuads(def:SourceEffectDefinition,request:SourceEffectRequest,ground:(p:{x:number;z:number})=>number):SourceParticleQuad[]{
 const result:SourceParticleQuad[]=[];if(!def.projections.length)return result;
 const phase=sourcePhase(def,request.age,request.loop,request.seed,request.clip),placement=sourcePlacement(def,request.placement,request.age);let bones:THREE.Matrix4[]|undefined;
 for(const [index,p]of def.projections.entries()){
  if(number(p,'active',phase)<=0)continue;
  const attack=number(p,'lifetime_attack',phase),hold=number(p,'lifetime_hold',phase),decay=number(p,'lifetime_decay',phase),age=request.age;if(age>=attack+hold+decay)continue;
  bones??=boneMatrices(def,phase);
  const alpha=age<attack?THREE.MathUtils.lerp(number(p,'alpha_init',phase),number(p,'alpha_mid',phase),age/Math.max(.001,attack)):age<attack+hold?number(p,'alpha_mid',phase):THREE.MathUtils.lerp(number(p,'alpha_mid',phase),number(p,'alpha_end',phase),(age-attack-hold)/Math.max(.001,decay));
  const parent=placement.clone().multiply(bones[p.bone]??new THREE.Matrix4()),offset=xyz(vector(p,'offset',phase)),x0=number(p,'box_offset_x_left',phase),x1=number(p,'box_offset_x_right',phase),y0=number(p,'box_offset_y_front',phase),y1=number(p,'box_offset_y_back',phase),divisions=4;
  for(let row=0;row<divisions;row++)for(let col=0;col<divisions;col++){
   const local=new THREE.Vector3(x0+(col+.5)/divisions*(x1-x0),y0+(row+.5)/divisions*(y1-y0),0).add(offset),at=local.applyMatrix4(parent);at.y=ground(at)+.035+index*.002;
   // The tile and its UV segment must share the projector's transformed axes.
   // Reconstructing a separate facing rotation mirrors non-cardinal angles and
   // breaks adjacency, exposing dark square seams in the source scorch texture.
   const axisX=new THREE.Vector3(parent.elements[0],0,parent.elements[2]).multiplyScalar((x1-x0)/divisions),axisY=new THREE.Vector3(parent.elements[4],0,parent.elements[6]).multiplyScalar((y1-y0)/divisions),normal=new THREE.Vector3().crossVectors(axisX,axisY).normalize();
   result.push({materialReference:p.material_reference_index,emitter:index,born:0,matrix:new THREE.Matrix4().makeBasis(axisX,axisY,normal).setPosition(at),color:[1,1,1,alpha],uv:[col/divisions,row/divisions,1/divisions,1/divisions],segmentedUv:true,phase});
  }
 }
 return result;
}
