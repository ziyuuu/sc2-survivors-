import * as THREE from 'three';
import {commitInstances} from '../units/instance-updates';

type P={x:number;y:number;z:number};
type Part='tendril'|'wet'|'eye'|'husk';
const axis=new THREE.Vector3(0,1,0);
const tendrilTip=new THREE.Vector3(.34,-.13,-.95);

function tendrilGeometry(){
 const curve=new THREE.CatmullRomCurve3([
  new THREE.Vector3(),new THREE.Vector3(.05,.25,-.21),new THREE.Vector3(.13,.33,-.53),
  new THREE.Vector3(.26,.18,-.79),tendrilTip
 ]);
 const segments=16,sides=7,g=new THREE.TubeGeometry(curve,segments,1,sides,false);
 const pos=g.getAttribute('position'),colors:number[]=[],v=new THREE.Vector3(),core=new THREE.Vector3();
 for(let i=0;i<=segments;i++){
  const t=i/segments;curve.getPointAt(t,core);
  const radius=(.119*(1-t)**.8+.008)*(i%3===1?.85:1);
  for(let j=0;j<=sides;j++){
   const k=i*(sides+1)+j;v.fromBufferAttribute(pos,k).sub(core).multiplyScalar(radius).add(core);
   pos.setXYZ(k,v.x,v.y,v.z);
   const shade=i%3===1?.48:1;colors.push(shade,.58*shade+t*.20,.68*shade+t*.08);
  }
 }
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}

function huskGeometry(){
 const shell=new THREE.SphereGeometry(1,20,14),pos=shell.getAttribute('position'),colors:number[]=[];
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  const band=.5+.5*Math.cos((z+.22*x*x)*12);
  const edge=band**4;
  pos.setXYZ(i,x*(.8-.32*z),y*(.68+.24*edge)+.85*z*z+.32*x*x,z);
  colors.push(.39+.48*edge,.19+.40*edge,.18+.18*edge);
 }
 shell.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));shell.computeVertexNormals();return shell;
}

export class BioOrgans {
 private batches:Partial<Record<Part,THREE.InstancedMesh>>={};
 private counts={tendril:0,wet:0,eye:0,husk:0};
 private obj=new THREE.Object3D();
 private color=new THREE.Color();
 private time={value:0};
 constructor(private scene:THREE.Scene){}
 begin(clock:number){this.time.value=clock;this.counts.tendril=this.counts.wet=this.counts.eye=this.counts.husk=0;}
 end(){for(const key of ['tendril','wet','eye','husk'] as const){const b=this.batches[key];if(b)commitInstances(b,this.counts[key]);}}
 report(){return {...this.counts};}
 private submit(key:Part,tint:number){
  let batch=this.batches[key];
  if(!batch){
   const g=key==='tendril'?tendrilGeometry():key==='husk'?huskGeometry():key==='eye'?new THREE.IcosahedronGeometry(1,1):new THREE.SphereGeometry(1,10,8);
   const mat=new THREE.MeshStandardMaterial({roughness:key==='tendril'||key==='husk'?.46:.28,metalness:.06,vertexColors:key==='tendril'||key==='husk',flatShading:key==='eye'});
   if(key==='tendril'){
    mat.onBeforeCompile=shader=>{
     shader.uniforms.bioClock=this.time;
     shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float bioClock;')
      .replace('#include <begin_vertex>',`#include <begin_vertex>
       float tip=clamp(-position.z,0.,1.);float beat=bioClock*2.4+instanceMatrix[3].x+instanceMatrix[3].z;
       transformed.xy+=tip*tip*vec2(.14*sin(beat+tip*3.),.11*cos(beat*.83+tip));`);
    };
   }
   batch=new THREE.InstancedMesh(g,mat,key==='eye'?2048:1024);batch.name='bio-'+key;
   batch.frustumCulled=false;batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
   this.batches[key]=batch;this.scene.add(batch);
  }
  const i=this.counts[key];if(i>=batch.instanceMatrix.count)return false;
  this.obj.updateMatrix();batch.setMatrixAt(i,this.obj.matrix);batch.setColorAt(i,this.color.set(tint));this.counts[key]++;
  return true;
 }
 private lobe(key:'eye'|'wet',p:P,facing:number,x:number,y:number,z:number,tint:number){
  this.obj.position.set(p.x,p.y,p.z);this.obj.rotation.set(0,facing,0);this.obj.scale.set(x,y,z);this.submit(key,tint);
 }
 tendril(p:P,facing:number,roll:number,length:number,tint:number,withMucus=false){
  this.obj.position.set(p.x,p.y,p.z);this.obj.rotation.set(-.18,facing,roll,'YXZ');this.obj.scale.setScalar(length);
  if(this.submit('tendril',tint)&&withMucus){
   // Keep the hanging drop at the animated tip, clear of the solid pauldron.
   const end=tendrilTip.clone(),t=-end.z,beat=this.time.value*2.4+p.x+p.z;
   end.x+=t*t*.14*Math.sin(beat+t*3);end.y+=t*t*.11*Math.cos(beat*.83+t);
   end.applyMatrix4(this.obj.matrix);
   this.mucus(end,{x:end.x,y:end.y-length*.42,z:end.z},length*.068);
  }
 }
 mucus(root:P,end:P,r:number){
  const v=new THREE.Vector3(end.x-root.x,end.y-root.y,end.z-root.z),len=v.length();if(len<.001)return;
  this.obj.position.set((root.x+end.x)/2,(root.y+end.y)/2,(root.z+end.z)/2);
  this.obj.quaternion.setFromUnitVectors(axis,v.divideScalar(len));this.obj.scale.set(r,len*.55,r);
  this.submit('wet',0x918667);
  this.lobe('wet',end,0,r*1.9,r*3,r*1.9,0xb5a47b);
 }
 peel(p:P,facing:number,h:number,t:number){
  const curl=Math.sin(Math.PI*t),width=(1-t*.86)*h;
  const edge={x:p.x+Math.cos(facing)*h*(.05+.11*t),y:p.y+h*(.055+.09*curl-.14*t),z:p.z-Math.sin(facing)*h*(.05+.11*t)};
  this.obj.position.set(edge.x,edge.y,edge.z);this.obj.rotation.set(.2+t*.8,facing,-curl*.65,'YXZ');
  this.obj.scale.set(width*.103,width*.028,width*.148);this.submit('husk',0xdac9b1);
  this.mucus(p,edge,h*.011*(1-.75*t));
 }
 eyes(head:P,facing:number,h:number,side:number,queen:boolean){
  const right=Math.cos(facing),front=Math.sin(facing);
  const temple=(x:number,y:number,z:number)=>({x:head.x+h*(right*x*side+front*z),y:head.y+h*y,z:head.z+h*(right*z-front*x*side)});
  const center=temple(0,0,0);
  this.lobe('wet',center,facing,h*.027,h*.048,h*.065,0x482f3c);
  for(let i=0;i<7;i++){
   const a=(i-1)*Math.PI/3,outer=i>0,r=(outer?.017:.024)*h;
   const lens=temple(outer?.019:.029,outer?Math.sin(a)*.032:0,outer?Math.cos(a)*.043:0);
   this.lobe('eye',lens,facing,r*.75,r,r*1.04,queen?0xe798a7:0xf7b46c);
  }
 }
}
