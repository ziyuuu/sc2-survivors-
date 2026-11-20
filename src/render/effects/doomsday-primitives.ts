import * as T from 'three';
import {commitInstances,uploadActive} from '../units/instance-updates';
import {DISPLACEMENT_LAYER} from './source/displacement';
import {atmosphereMaterial,type AtmosphericEffect,type SmokeAtlas} from './doomsday-atmosphere';

type Solid='chip'|'core'|'ring'|'beam'|'shell';
type Kind=Solid|AtmosphericEffect;
export type V3={x:number;y:number;z:number};
type Batch={mesh:T.InstancedMesh;params:T.InstancedBufferAttribute;count:number};
const identity=new T.Quaternion(),rotation=new T.Quaternion(),obj=new T.Object3D();
const color=new T.Color(),up=new T.Vector3(0,1,0),direction=new T.Vector3();
const atmospheric=(k:Kind):k is AtmosphericEffect=>k==='mist'||k==='glow'||k==='vortex'||k==='well'||k==='scan'||k==='shield'||k==='lens';

function solidGeometry(kind:Solid){
 switch(kind){
  case 'ring':return new T.TorusGeometry(1,.025,3,36);
  case 'core':return new T.OctahedronGeometry(.5);
  case 'beam':return new T.CylinderGeometry(1,1,1,12,1);
  case 'shell':{
   // Flat base, a short full-calibre jacket and a rounded ogive. Local +Y points forward.
   const profile=[[0,-.5],[.77,-.5],[.92,-.41],[1,-.30],[.96,.08],[.79,.25],[.48,.41],[.13,.49],[0,.5]];
   return new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),16);
  }
  default:return new T.BoxGeometry(1,1,1);
 }
}
function solidMaterial(kind:Solid){
 const material=kind==='shell'
  ?new T.MeshStandardMaterial({color:0xffffff,metalness:.48,roughness:.3,emissive:0x30251e})
  :new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide,toneMapped:false});
 material.transparent=true;material.depthWrite=false;material.forceSinglePass=true;
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 dsParams;varying float dsOpacity;').replace('#include <begin_vertex>','#include <begin_vertex>\ndsOpacity=dsParams.x;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float dsOpacity;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=dsOpacity;');
 };
 material.customProgramCacheKey=()=> 'doomsday-solid-opacity-v2';
 return material;
}

export class DoomsdayPrimitives {
 readonly root=new T.Group();
 private batches=new Map<Kind,Batch>();
 constructor(parent:T.Object3D,private smoke?:SmokeAtlas){
  this.root.name='doomsday-particles';this.root.userData.visualRole='effect';parent.add(this.root);
 }
 private create(kind:Kind,capacity:number){
  const geometry=atmospheric(kind)?new T.PlaneGeometry(1,1):solidGeometry(kind);
  const material=atmospheric(kind)?atmosphereMaterial(kind):solidMaterial(kind);
  const params=new T.InstancedBufferAttribute(new Float32Array(capacity*3),3).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('dsParams',params);
  const mesh=new T.InstancedMesh(geometry,material,capacity);
  mesh.name='doomsday-'+kind;mesh.count=0;mesh.frustumCulled=false;
  mesh.renderOrder=kind==='mist'?3:kind==='vortex'||kind==='well'?4:kind==='scan'||kind==='glow'?5:1;
  if(kind==='lens'){mesh.layers.set(DISPLACEMENT_LAYER);mesh.userData.displacement=true;}
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.setColorAt(0,color.set(0xffffff));
  mesh.instanceColor!.setUsage(T.DynamicDrawUsage);this.root.add(mesh);
  const batch={mesh,params,count:0};this.batches.set(kind,batch);return batch;
 }
 begin(){for(const b of this.batches.values())b.count=0;}
 add(kind:Kind,p:V3,size:V3|number,tint:number,opacity=1,q?:T.Quaternion,phase=0,seed=0){
  if(opacity<=.003)return;
  let b=this.batches.get(kind)??this.create(kind,128);
  if(b.count===b.mesh.instanceMatrix.count){
   const old=b;b=this.create(kind,old.count*2);b.count=old.count;
   b.mesh.instanceMatrix.array.set(old.mesh.instanceMatrix.array);
   b.mesh.instanceColor!.array.set(old.mesh.instanceColor!.array);b.params.array.set(old.params.array);this.retire(old);
  }
  obj.position.set(p.x,p.y,p.z);obj.quaternion.copy(q??identity);
  if(typeof size==='number')obj.scale.setScalar(size);else obj.scale.set(size.x,size.y,size.z);
  obj.updateMatrix();b.mesh.setMatrixAt(b.count,obj.matrix);b.mesh.setColorAt(b.count,color.set(tint));
  b.params.setXYZ(b.count++,Math.min(1,opacity),phase,seed-Math.floor(seed));
 }
 sprite(kind:AtmosphericEffect,p:V3,width:number,height:number,tint:number,opacity:number,phase=0,seed=0){
  this.add(kind,p,{x:width,y:height,z:1},tint,opacity,undefined,phase,seed);
 }
 beam(a:V3,b:V3,width:number,tint:number,opacity=1,kind:'shell'|'beam'='beam'){
  direction.set(b.x-a.x,b.y-a.y,b.z-a.z);
  const length=direction.length();if(length<.001||width<=0)return;
  rotation.setFromUnitVectors(up,direction.divideScalar(length));
  this.add(kind,{x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2},{x:width,y:length,z:width},tint,opacity,rotation);
 }
 end(){
  const mist=this.batches.get('mist');
  if(mist?.count){
   const uniforms=(mist.mesh.material as T.ShaderMaterial).uniforms,source=this.smoke?.()?.uniforms;
   uniforms.hasAtlas.value=!!source?.map.value;
   if(source){uniforms.atlas.value=source.map.value;uniforms.grid.value.copy(source.grid.value);}
  }
  for(const b of this.batches.values()){commitInstances(b.mesh,b.count);uploadActive(b.params,b.count);}
 }
 count(){let n=0;for(const b of this.batches.values())n+=b.count;return n;}
 private retire(b:Batch){b.mesh.removeFromParent();b.mesh.geometry.dispose();(b.mesh.material as T.Material).dispose();b.mesh.dispose();}
 reset(){for(const b of this.batches.values()){b.count=b.mesh.count=0;b.mesh.visible=false;}}
 dispose(){for(const b of this.batches.values())this.retire(b);this.batches.clear();this.root.removeFromParent();}
}
