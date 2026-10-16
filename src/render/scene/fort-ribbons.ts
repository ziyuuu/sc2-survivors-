import * as THREE from 'three';
import {lifeCurve,sourceNumber,sourceVector} from '../effects/source/timeline';
import type {SourceEmitter,SourcePhase} from '../effects/source/types';
import type {MaterialClip} from '../materials/source-tracks';

interface SplineData {version:number;sourceBone:string;endBone:string;ribbon:SourceEmitter;clips:MaterialClip[]}
interface Binding {mesh:THREE.Mesh;start:THREE.Object3D;end:THREE.Object3D;data:SplineData}
const bindings=new WeakMap<THREE.Object3D,Binding[]>();
function bind(root:THREE.Object3D){
 const result:Binding[]=[];root.traverse(n=>{if(!(n instanceof THREE.Mesh)||!n.userData.sc2Spline)return;const data=n.userData.sc2Spline as SplineData,start=root.getObjectByName(data.sourceBone),end=root.getObjectByName(data.endBone);if(!start||!end)throw Error('Missing original SpineCrawler ribbon attachment');n.geometry=n.geometry.clone();n.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);n.frustumCulled=false;result.push({mesh:n,start,end,data});});bindings.set(root,result);return result;
}
/** These two source splines are continuously hosted by their animated bones.
 * Their active=0 gates free trail emission; it does not hide the body connection.
 * Uses this game's existing native spline interpolation policy, not SC2 parity. */
export function updateFortRibbons(root:THREE.Object3D,clipName:string,seconds:number){
 const list=bindings.get(root)??bind(root);if(!list.length)return;root.updateWorldMatrix(true,true);
 for(const {mesh,start,end,data}of list){
  const clip=data.clips.find(c=>c.name===clipName);if(!clip)throw Error('Missing original ribbon animation '+clipName);const phase:SourcePhase={clip,seconds:Math.max(0,Math.min(seconds,clip.duration)),offset:0,cycle:0},p=data.ribbon,spline=(p.spline as unknown as SourceEmitter[])[0],inverse=mesh.matrixWorld.clone().invert(),startMatrix=inverse.clone().multiply(start.matrixWorld),endMatrix=inverse.clone().multiply(end.matrixWorld),a=new THREE.Vector3().setFromMatrixPosition(startMatrix),offset=sourceVector(spline,'emission_offset',phase),b=new THREE.Vector3(offset.x,offset.y,offset.z).applyMatrix4(endMatrix),nativeScale=new THREE.Vector3().setFromMatrixScale(startMatrix),widthScale=(nativeScale.x+nativeScale.z)*.5,delta=b.clone().sub(a),distance=delta.length(),divisions=Number(p.divisions),sides=Number(p.sides),scale=sourceVector(p,'scale',phase),twist=sourceVector(p,'twist',phase),emission=sourceVector(spline,'emission_vector',phase),tangent=new THREE.Vector3(emission.x,emission.y,emission.z).transformDirection(startMatrix),velocity=sourceNumber(spline,'velocity',phase),base=sourceNumber(spline,'velocity_base_fac',phase,1),tip=sourceNumber(spline,'velocity_end_fac',phase,1),points:THREE.Vector3[]=[];
  for(let ring=0;ring<=divisions;ring++){const t=ring/divisions;points.push(a.clone().lerp(b,t).addScaledVector(tangent,Math.sin(t*Math.PI)*velocity*(base*(1-t)+tip*t)*Math.min(1,distance)));}
  const position=mesh.geometry.attributes.position as THREE.BufferAttribute;
  for(let ring=0;ring<=divisions;ring++){
   const t=ring/divisions,along=points[Math.min(divisions,ring+1)].clone().sub(points[Math.max(0,ring-1)]).normalize(),reference=new THREE.Vector3(1,0,0).transformDirection(startMatrix);if(Math.abs(reference.dot(along))>.98)reference.set(0,1,0);const right=new THREE.Vector3().crossVectors(along,reference).normalize(),normal=new THREE.Vector3().crossVectors(right,along).normalize(),width=lifeCurve(scale.x,scale.y,scale.z,t,sourceNumber(p,'scale_anim_mid',phase,.5),sourceNumber(p,'scale_smoothing',phase))*widthScale,angle=lifeCurve(twist.x,twist.y,twist.z,t,sourceNumber(p,'twist_anim_mid',phase,.5));
   for(let side=0;side<=sides;side++){const theta=angle+side/sides*Math.PI*2,point=points[ring].clone().addScaledVector(right,Math.cos(theta)*width*.5).addScaledVector(normal,Math.sin(theta)*width*.5);position.setXYZ(ring*(sides+1)+side,point.x,point.y,point.z);}
  }
  position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();mesh.userData.sourceRibbonSpan=distance;
 }
}
export function disposeFortRibbons(root:THREE.Object3D){for(const {mesh}of bindings.get(root)??[])mesh.geometry.dispose();bindings.delete(root);}
