import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {SOURCE_EFFECTS} from '../src/render/effects/source/player';
import {SourceParticleCache,sourceParticleQuads} from '../src/render/effects/source/particles';
const camera=new THREE.PerspectiveCamera();camera.position.set(0,15,20);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
function fixture(){const def=structuredClone(SOURCE_EFFECTS.MarineAttackLaunch),p=def.particles[0];def.particles=[p];p.copy_indices=[];p.particle_type=5;p.flags=2;p.additional_flags=0;p.world_space=0;p.emit_count={id:90000001,default:4,interpolation:0,flags:0};p.emit_rate={id:90000002,default:0,interpolation:0,flags:0};p.lifespan={id:90000003,default:2,interpolation:0,flags:0};p.lifespan_randomize=0;p.size={x:1,y:1,z:1};p.size_randomize=0;p.color_init=p.color_mid=p.color_end={r:255,g:255,b:255,a:255};p.color_randomize=0;p.alpha_randomize=0;return def;}
test('particle scratch cannot escape through returned quads or a nested ground callback',()=>{
 const def=fixture(),request={model:def.id,key:'outer',age:.07,seed:529,placement:{x:1,y:2,z:3,facing:.7,scale:1.2}},cache=new SourceParticleCache();
 cache.begin(.07);const expected=sourceParticleQuads(def,request,camera,()=>.2,cache);cache.end();assert.ok(expected.length>=4);
 const saved=JSON.stringify(expected);assert.equal(new Set(expected.map(q=>q.matrix)).size,expected.length);
 let nested=0;cache.begin(.07);const actual=sourceParticleQuads(def,request,camera,()=>{nested++;sourceParticleQuads(def,{...request,key:'nested',age:.13,seed:1},camera,()=>1);return .2;},cache);cache.end();assert.ok(nested>0);assert.deepEqual(actual,expected);
 cache.begin(.2);sourceParticleQuads(def,{...request,age:.2},camera,()=>5,cache);cache.end();cache.reset();assert.equal(JSON.stringify(expected),saved);assert.equal(JSON.stringify(actual),saved);
});
test('interpreted birth parameters respect distinct clips, rewind and an exhausted birth cache',()=>{
 const def=fixture(),clips=def.materialProfile.clips;const a=structuredClone(clips[0]),b=structuredClone(clips[0]);a.name='first';b.name='second';
 const ref={id:90000004,default:1,interpolation:0,flags:0};def.particles[0].emit_speed=ref;def.particles[0].emit_speed_randomize=0;a.tracks.push({id:ref.id,frames:[0],values:[1]} as any);b.tracks.push({id:ref.id,frames:[0],values:[20]} as any);def.materialProfile.clips=[a,b];
 const request={model:def.id,key:'same',age:.1,seed:529,clip:'first',placement:{x:1,y:2,z:3,facing:.7}},cache=new SourceParticleCache(1);
 const draw=(clip:string,age:number)=>{cache.begin(age);const result=sourceParticleQuads(def,{...request,clip,age},camera,()=>.2,cache);cache.end();assert.ok(cache.report().liveBirths<=1);return result;};
 const first=draw('first',.1),second=draw('second',.1);assert.notDeepEqual(second,first);draw('second',.7);assert.deepEqual(draw('first',.1),first);cache.begin(3);cache.end();assert.equal(cache.report().liveBirths,0);assert.equal(cache.report().requests,0);
});
