import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {SOURCE_EFFECTS} from '../src/render/effects/source/player';
import {sourceParticleQuads} from '../src/render/effects/source/particles';
import type {SourceEffectRequest,SourceEmitter} from '../src/render/effects/source/types';
let nextId=93000000;const ref=(value:unknown)=>({id:nextId++,default:value,interpolation:1});
function fixture(){const def=structuredClone(SOURCE_EFFECTS.MarineAttackLaunch);def.materialProfile.clips=[{name:'Stand',duration:2,tracks:[]}];def.particles=[{bone:0,material_reference_index:0,emit_rate:ref(10),emit_count:ref(0),lifespan:ref(.25),size:ref({x:1,y:1,z:1}),color_init:{r:255,g:255,b:255,a:255},color_mid:{r:255,g:255,b:255,a:255},color_end:{r:255,g:255,b:255,a:255}} as SourceEmitter];def.copies=[];def.ribbons=[];def.projections=[];def.forces=[];return def;}
const camera=new THREE.PerspectiveCamera();camera.position.set(3,12,16);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
const request=(model:string,age:number):SourceEffectRequest=>({model,key:'lifetime',age,seed:529,placement:{x:1,y:2,z:3,facing:.7}});
test('animated lifespan and emitter copies retain births beyond the base default',()=>{
 const def=fixture(),p=def.particles[0],life=ref(.01);p.emit_rate=ref(0);p.emit_count=ref(4);p.lifespan=life;def.materialProfile.clips[0].tracks.push({id:life.id,frames:[0,1],values:[2,.1]});
 assert.equal(sourceParticleQuads(def,request(def.id,1.5),camera,()=>0).length,4);
 const copy=fixture();copy.particles[0].emit_rate=ref(0);copy.particles[0].emit_count=ref(4);copy.particles[0].copy_indices=[0];copy.copies=[{lifespan:ref(2),world_space:1} as SourceEmitter];
 const quads=sourceParticleQuads(copy,request(copy.id,1.5),camera,()=>0);assert.equal(quads.length,4);assert.ok(quads.every(q=>q.emitter===1000));
});
test('long looping histories and stopped emission retain exactly the recent native births',()=>{
 const def=fixture();for(const age of [.71,20.71,200.71]){const r={...request(def.id,age),loop:true},quads=sourceParticleQuads(def,r,camera,()=>0);assert.equal(quads.length,3);assert.ok(quads.every(q=>age-q.born>=0&&age-q.born<.25));
  const stopped=sourceParticleQuads(def,{...r,stopAt:age-.16},camera,()=>0);assert.equal(stopped.length,1);assert.equal(stopped[0].born,quads[0].born);
 }
});
test('decoration thinning preserves its original total-birth threshold after older births expire',()=>{
 const def=fixture(),r=request(def.id,.71),full=sourceParticleQuads(def,r,camera,()=>0),medium=sourceParticleQuads(def,r,camera,()=>0,undefined,0,new Set([0]));assert.equal(full.length,3);assert.equal(medium.length,1);assert.deepEqual(medium[0],full[0]);
 assert.deepEqual(sourceParticleQuads(def,r,camera,()=>0,undefined,0,new Set()),full);
});
test('random and numeric-string lifespan references preserve live particles',()=>{
 const def=fixture(),p=def.particles[0];p.emit_rate=ref(0);p.emit_count=ref(80);p.lifespan=ref(.1);p.lifespan_random=ref(2);p.lifespan_randomize=1;
 const quads=sourceParticleQuads(def,request(def.id,1),camera,()=>0);assert.ok(quads.length>0&&quads.length<80);
 const unusual=fixture();unusual.particles[0].lifespan=ref('0.9');assert.equal(sourceParticleQuads(unusual,request(unusual.id,.71),camera,()=>0).length,7);
});
