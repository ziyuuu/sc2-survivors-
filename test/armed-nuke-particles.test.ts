import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PerspectiveCamera} from 'three';
import catalog from '../src/render/effects/source/catalog.json';
import {sourceParticleQuads,StationaryParticleCache} from '../src/render/effects/source/particles';
import type {SourceEffectDefinition,SourceEffectRequest} from '../src/render/effects/source/types';

const def=catalog.GhostNukeExplode as unknown as SourceEffectDefinition;
const request:SourceEffectRequest={key:'nuke:77',model:def.id,age:0,seed:12345,clip:'Death',placement:{x:2,y:.7,z:-3,facing:0,scale:.32,heightScale:.5}};
const camera=new PerspectiveCamera();camera.position.set(3,14,12);camera.lookAt(1,0,2);
const ground=()=>.7;
test('stationary nuclear impact preserves authored particle matrices, colour and UV through burst, overlap and decay',()=>{
 // Recorded from the pre-optimization native player, with a 1e-7 world-space tolerance.
 const frames=[
  [.4,641,'6cdbae440576addef1190966465942782e805140a4b539376434a4eb0c813957'],
  [1.712,720,'29c3fabcc74fbefefb2f1091ff9c91ded2328d697bd86c5dd05cd4336a05acb1'],
  [3.18,1215,'6d0ee598c337f701568c682e5131e13837fb356e1beb94061d102c4db39843a4'],
  [6.17,404,'5bf26196bff0dc876a4f2950e2233611dbb8cb2b430a16913779a4eafb84b57f']
 ] as const;
 const cache=new StationaryParticleCache();cache.prepare(def,'Death');
 for(const [age,count,expected] of frames){
  cache.begin(age);
  const quads=sourceParticleQuads(def,{...request,age},camera,ground,undefined,1,undefined,cache);
  assert.equal(quads.length,count);
  const packed=quads.map(q=>[q.emitter,q.materialReference,...q.matrix.elements,...q.color,...q.uv].map(v=>Math.round(v*1e7)));
  assert.equal(createHash('sha256').update(JSON.stringify(packed)).digest('hex'),expected);
  cache.end();
 }
 cache.begin(7);cache.end();assert.equal(cache.size,0);
});
test('interleaved impacts, repeat, placement change and checkpoint rewind match independent source samples',()=>{
 const cache=new StationaryParticleCache();
 for(const age of [.41,.83,.83,.21]){
  cache.begin(age);
  for(const [i,offset] of [0,4].entries()){
   const r={...request,key:'nuke:'+i,age,seed:37+i,placement:{...request.placement,x:3+age+offset}};
   const actual=sourceParticleQuads(def,r,camera,ground,undefined,1,undefined,cache);
   const expected=sourceParticleQuads(def,r,camera,ground);
   assert.deepEqual(actual.map(q=>[q.emitter,q.born,q.matrix.elements,q.color,q.uv]),expected.map(q=>[q.emitter,q.born,q.matrix.elements,q.color,q.uv]));
  }
  cache.end();assert.equal(cache.size,2);
 }
 cache.reset();assert.equal(cache.size,0);
});
