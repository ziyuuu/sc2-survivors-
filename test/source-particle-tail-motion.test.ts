import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import catalog from '../src/render/effects/source/catalog.json';
import {sourceParticleQuads,type SourceParticleQuad} from '../src/render/effects/source/particles';
import type {SourceEffectDefinition,SourceEffectRequest} from '../src/render/effects/source/types';

const camera=new THREE.PerspectiveCamera();camera.position.set(3,20,22);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
const ref=(value:any)=>({id:0,interpolation:1,default:value});
function fixture(overrides:Record<string,unknown>={}):SourceEffectDefinition{return {
 id:'tail-motion',source:'fixture',sourceSha256:'',scale:[1,1,1],
 materialProfile:{source:'fixture',sourceSha256:'',glbSha256:'',materials:[],composites:[],compositeTracks:[],clips:[{name:'Death',duration:3,tracks:[]}]},
 bones:[{name:'root',parent:-1,flags:0,location:ref({x:0,y:0,z:0}),rotation:ref({x:0,y:0,z:0,w:1}),scale:ref({x:1,y:1,z:1})}],
 materialReferences:[],displacementMaterials:[],particles:[{bone:0,material_reference_index:0,emit_rate:ref(0),emit_count:ref(1),lifespan:ref(3),size:ref({x:.02,y:.02,z:.02}),emit_speed:ref(4),emit_angle_x:ref(.7),gravity:-8,drag:2,particle_type:1,instance_tail:2,flags:0x40000,...overrides}],
 copies:[],ribbons:[],projections:[],attachments:[],forces:[],
};}
const request=(def:SourceEffectDefinition,age:number):SourceEffectRequest=>({model:def.id,key:'tail-test',age,seed:17,placement:{x:0,y:10,z:0,facing:.7}});
function head(q:SourceParticleQuad){const m=q.matrix.elements;return new THREE.Vector3(m[12]+m[4]*.5,m[13]+m[5]*.5,m[14]+m[6]*.5);}
function checkTangent(def:SourceEffectDefinition,age:number,ground=()=>-1000,emitter=0){
 const draw=(t:number)=>sourceParticleQuads(def,request(def,t),camera,ground).filter(q=>q.emitter===emitter),a=draw(age-.0001),b=draw(age+.0001),middle=draw(age);
 assert.ok(a.length>0);assert.equal(a.length,b.length);assert.equal(a.length,middle.length);
 for(let i=0;i<a.length;i++){assert.equal(a[i].born,b[i].born);const along=new THREE.Vector3().setFromMatrixColumn(middle[i].matrix,1).normalize(),motion=head(b[i]).sub(head(a[i])).normalize();assert.ok(along.dot(motion)>.99999,`${def.id}/${emitter}/${age}: tail opposes particle motion (${along.dot(motion)})`);}
}

test('native tank impact sparks follow their trajectory after gravity reverses their motion',()=>{
 const def=structuredClone(catalog.SiegeTankAttackImpact) as unknown as SourceEffectDefinition;
 for(const age of [.3,.6,1])checkTangent(def,age,()=>-1000,1);
});
test('native siege sparks and gravity-free fire tails follow their own trajectory',()=>{
 const def=structuredClone(catalog.SiegeTankSiegedAttackImpact) as unknown as SourceEffectDefinition;
 for(const age of [.15,.35]){checkTangent(def,age,()=>-1000,0);checkTangent(def,age,()=>-1000,9);}
});
test('tails combine drag, signed acceleration, non-uniform scale and procedural noise',()=>{
 const def=fixture({noise_amplitude:.1,noise_frequency:5});def.scale=[2,1,.5];checkTangent(def,.63);
});
test('speed variation contributes to the tail trajectory derivative',()=>{
 const def=fixture({speed_var_amplitude:ref(2),speed_var_shape:1,speed_var_frequency:ref(1.2)});checkTangent(def,.63);
});
test('gravity can orient a tail even when emission speed is zero',()=>{
 const def=fixture({emit_speed:ref(0),flags:0x100000});checkTangent(def,.5);
});
test('a reflected ground trajectory also reflects the tail direction',()=>{
 const def=fixture({gravity:-40,bounce:.6,flags:0x40002});checkTangent(def,1,()=>0);
});
test('authored fixed and clamped tail lengths survive the direction correction',()=>{
 for(const [flags,tail]of [[0x100000,2],[0x40000,.2]]){
  const def=fixture({flags,instance_tail:tail});const rows=sourceParticleQuads(def,request(def,1),camera,()=>-1000);assert.equal(rows.length,1);
  const length=new THREE.Vector3().setFromMatrixColumn(rows[0].matrix,1).length();assert.ok(Math.abs(length-tail*1.4)<1e-10);
 }
});
test('force-integrated tails use the resulting velocity instead of their launch direction',()=>{
 const def=fixture({gravity:-8,drag:0,local_forces:1,emit_angle_x:ref(Math.PI/2)});def.forces=[{bone:0,material_reference_index:0,channels:1,width:0,strength:0}];
 const q=sourceParticleQuads(def,request(def,.5),camera,()=>-1000)[0],axis=new THREE.Vector3().setFromMatrixColumn(q.matrix,1).normalize();
 // Four units/sec horizontally and -8 * .5 vertically: equal horizontal/downward components.
 assert.ok(Math.abs(axis.y+Math.SQRT1_2)<1e-10);assert.ok(Math.abs(Math.hypot(axis.x,axis.z)-Math.SQRT1_2)<1e-10);
});
