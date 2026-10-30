import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import catalog from '../src/render/effects/source/catalog.json';
import {sourceParticleQuads,type SourceParticleQuad} from '../src/render/effects/source/particles';
import type {SourceEffectDefinition,SourceEffectRequest} from '../src/render/effects/source/types';

const camera=new THREE.PerspectiveCamera();camera.position.set(3,20,22);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
const ref=(value:any)=>({id:0,interpolation:1,default:value});
function fixture():SourceEffectDefinition{return {
 id:'ground-motion',source:'fixture',sourceSha256:'',scale:[1,1,1],
 materialProfile:{source:'fixture',sourceSha256:'',glbSha256:'',materials:[],composites:[],compositeTracks:[],clips:[{name:'Death',duration:5,tracks:[]}]},
 bones:[{name:'root',parent:-1,flags:0,location:ref({x:0,y:0,z:0}),rotation:ref({x:0,y:0,z:0,w:1}),scale:ref({x:1,y:1,z:1})}],
 materialReferences:[],displacementMaterials:[],particles:[{bone:0,material_reference_index:0,emit_rate:ref(0),emit_count:ref(1),lifespan:ref(5),size:ref({x:.02,y:.02,z:.02}),emit_speed:ref(0),gravity:-8,drag:0,bounce:.5,friction:0,particle_type:1,instance_tail:.1,flags:0x100002}],
 copies:[],ribbons:[],projections:[],attachments:[],forces:[],
};}
function head(q:SourceParticleQuad){const m=q.matrix.elements;return new THREE.Vector3(m[12]+m[4]*.5,m[13]+m[5]*.5,m[14]+m[6]*.5);}
const request=(def:SourceEffectDefinition,age:number,y=1.425):SourceEffectRequest=>({model:def.id,key:'gravity-test',age,seed:17,placement:{x:0,y,z:0,facing:.7}});
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('native ordinary tank gravity never adds horizontal drift through its tilted spark bone',()=>{
 const def=structuredClone(catalog.SiegeTankAttackImpact) as unknown as SourceEffectDefinition,zero=structuredClone(def);
 for(const p of zero.particles)p.gravity=0;
 for(const age of [.3,.75,1.5]){
  const a=sourceParticleQuads(def,request(def,age,100),camera,()=>-1000).filter(q=>q.emitter===1),b=sourceParticleQuads(zero,request(zero,age,100),camera,()=>-1000).filter(q=>q.emitter===1);
  assert.ok(a.length>0);assert.equal(a.length,b.length);
  for(let i=0;i<a.length;i++){const delta=head(a[i]).sub(head(b[i]));close(delta.x,0);close(delta.z,0);close(delta.y,.5*-8*1.4*(age-a[i].born)**2);}
 }
});
test('gravity stays vertical for rotated/scaled emitter bones and tilted placements, including world-space particles',()=>{
 for(const worldSpace of [0,1]){
  const def=fixture();def.particles[0].flags=0x100000;def.particles[0].world_space=worldSpace;
  const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(.9,.3,.7));def.bones[0].rotation=ref({x:rotation.x,y:rotation.y,z:rotation.z,w:rotation.w});def.bones[0].scale=ref({x:2,y:.5,z:3});
  const r=request(def,.5,10);r.placement.direction={x:.4,y:.6,z:.8};const p=head(sourceParticleQuads(def,r,camera,()=>-1000)[0]);close(p.x,0);close(p.z,0);close(p.y,10+.5*-8*1.4*.5**2);
 }
});
test('a terrain bounce loses height instead of accelerating upwards after the first impact',()=>{
 const def=fixture(),firstImpact=.5; // 1.4 units at -11.2 units/s².
 for(const [age,y]of [[firstImpact,.025],[.75,.375],[1,.025],[1.125,.1125],[2,.025]]){
  const q=sourceParticleQuads(def,request(def,age),camera,()=>0);assert.equal(q.length,1);assert.ok(Math.abs(head(q[0]).y-y)<2e-6,`${age}: ${head(q[0]).y} != ${y}`);
 }
});
test('terrain friction reduces travel after contact without removing the particle or changing its lifetime',()=>{
 const def=fixture();def.particles[0].emit_speed=ref(2);def.particles[0].emit_angle_x=ref(Math.PI/2);def.particles[0].bounce=0;def.particles[0].friction=1;
 const at=(age:number)=>sourceParticleQuads(def,request(def,age),camera,()=>0),hit=head(at(.5)[0]);
 for(const age of [.75,2,4.9]){const q=at(age);assert.equal(q.length,1);assert.ok(head(q[0]).distanceTo(hit)<1e-6);}
 assert.equal(at(5).length,0);
});
test('native ordinary sparks stay above terrain and near their impact throughout the surviving late phase',()=>{
 const def=structuredClone(catalog.SiegeTankAttackImpact) as unknown as SourceEffectDefinition;
 for(const age of [.75,1.5,2])for(const q of sourceParticleQuads(def,request(def,age,.6),camera,()=>0).filter(q=>q.emitter===1)){
  const p=head(q);assert.ok(p.y>=.025-1e-8);assert.ok(Math.hypot(p.x,p.z)<5,`${age}: spark drifted ${Math.hypot(p.x,p.z)}`);
 }
});
