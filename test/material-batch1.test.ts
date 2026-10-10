import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {UNIT_MATERIAL_PROFILES as profiles} from '../src/render/materials/unit-material-profiles';
import {BarrierMaterialTimeline,sampleBarrierAlpha,sampleMaterialTrack} from '../src/render/materials/source-tracks';
import {UnitMaterialSurface} from '../src/render/materials/unit-material-batch';
import {deathPoseTime} from '../src/render/units/death-clock';

test('four material profiles bind to unchanged runtime GLBs and actual source material names',()=>{
 assert.deepEqual(Object.keys(profiles),['immortal','elite.immortal.1','zealot.death','elite.zealot.1.death']);
 for(const [key,p] of Object.entries(profiles)){
  const b=fs.readFileSync('public/assets/optimized/model.'+key+'.glb');
  assert.equal(createHash('sha256').update(b).digest('hex'),p.glbSha256,key);
  const glb=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
  for(const m of glb.materials)assert.ok(p.materials.some(s=>m.name===s.name+'#'+s.index));
  for(const clip of p.clips)for(const track of clip.tracks){assert.equal(track.frames.length,track.values.length);assert.ok(track.frames.every((t,i)=>i===0||t>=track.frames[i-1]));}
 }
});
test('source scalar, vector and constant/step tracks keep their actual interpolation',()=>{
 const track={id:1,frames:[0,.2,1],values:[0,1,0]},ref={id:1,default:3,interpolation:1};
 assert.equal(sampleMaterialTrack(track,.1,ref),.5);assert.equal(sampleMaterialTrack(track,2,ref),0);
 assert.equal(sampleMaterialTrack(track,.1,{...ref,interpolation:0}),0);assert.equal(sampleMaterialTrack(track,.2,{...ref,interpolation:0}),1);
 assert.equal(sampleMaterialTrack(undefined,0,{...ref,interpolation:65535}),3);
 assert.deepEqual(sampleMaterialTrack({id:1,frames:[0,1],values:[{x:0,y:2},{x:2,y:0}]},.5,ref),{x:1,y:1});
});
test('both original shield composites start closed and use source start/hold/end curves',()=>{
 for(const key of ['immortal','elite.immortal.1']){const p=profiles[key],index=p.composites[0].parts[0].material.index;
  assert.equal(sampleBarrierAlpha(p,index),0);assert.equal(sampleBarrierAlpha(p,index,{phase:'start',seconds:.083}),.5);
  assert.equal(sampleBarrierAlpha(p,index,{phase:'hold',seconds:.6}),1);assert.equal(sampleBarrierAlpha(p,index,{phase:'end',seconds:.083}),.5);
  assert.equal(sampleBarrierAlpha(p,index,{phase:'end',seconds:.166}),0);assert.equal(sampleBarrierAlpha(p,index,{phase:'end',seconds:3}),0);
 }
});
test('four stable identities preserve staggered shield phases through reordering and pause',()=>{
 const timeline=new BarrierMaterialTimeline();timeline.begin('a',5.1);
 for(const id of [1,2,3,4])timeline.observe(id,true,5-(id-1)*.5);
 const before=[1,2,3,4].map(id=>timeline.get(id));assert.equal(before[0].phase,'start');assert.equal(before[3].phase,'hold');
 timeline.begin('a',5.1);for(const id of [4,2,1,3])timeline.observe(id,true,5-(id-1)*.5);timeline.finish();
 assert.deepEqual([1,2,3,4].map(id=>timeline.get(id)),before);
 timeline.begin('a',5.2);for(const id of [3,1,4,2])timeline.observe(id,id!==2,5-(id-1)*.5,id===2?5.15:undefined);
 assert.equal(timeline.get(1).phase,'start');assert.equal(timeline.get(2).phase,'end');assert.ok(Math.abs(timeline.get(2).seconds-.05)<1e-8);
});
test('off-camera depletion, time rewind and reused IDs cannot replay another shield',()=>{
 const timeline=new BarrierMaterialTimeline();timeline.begin('a',10);timeline.observe(7,true,8);
 timeline.begin('a',10.1);timeline.observe(7,false,8,10.05);assert.equal(timeline.get(7).phase,'end');
 timeline.begin('a',12);timeline.observe(7,false,8);assert.equal(timeline.get(7).phase,'inactive');
 timeline.begin('a',9);timeline.observe(7,true,8);assert.equal(timeline.get(7).phase,'start');
 timeline.begin('b',9);timeline.observe(7,false,8);assert.equal(timeline.get(7).phase,'inactive');
 timeline.reset();timeline.begin('b',12);timeline.observe(7,true,8);assert.equal(timeline.get(7).phase,'hold');
 timeline.reset();timeline.begin('b',12);timeline.observe(7,false,8);assert.equal(timeline.get(7).phase,'inactive');
});
test('shared surface stores independent slot values at native 1024 capacity, including reordered slots',()=>{
 const profile=profiles.immortal,source=profile.materials.find(m=>m.name==='Mat_Immortal_Shield_Scroll')!;
 const surface=new UnitMaterialSurface({profile,source,textures:{}},new THREE.MeshBasicMaterial(),1024),pose={clip:'Stand',seconds:.2};
 const write=(slot:number,id:number,seconds:number)=>surface.write(slot,pose,{runId:'a',entityId:id,time:5,barrier:{phase:'start',seconds}});
 write(0,1,.083);write(1023,2,.166);assert.equal(surface.data[10*1024*4],.5);assert.equal(surface.data[(10*1024+1023)*4],1);
 write(0,2,.166);write(1023,1,.083);assert.equal(surface.data[10*1024*4],1);assert.equal(surface.data[(10*1024+1023)*4],.5);
 surface.write(0,pose);assert.equal(surface.data[10*1024*4],0);assert.throws(()=>write(1024,1,0));
});
test('death opacity and UV follow the same complete source clock as the native skeleton',()=>{
 for(const key of ['zealot.death','elite.zealot.1.death']){const profile=profiles[key],clip=profile.clips.find(c=>c.name==='Death')!,life=Math.min(5,Math.max(1.5,clip.duration));
  for(const source of profile.materials){const surface=new UnitMaterialSurface({profile,source,textures:{}},new THREE.MeshBasicMaterial(),1024);
   for(const age of [0,.2,.5,1.5,life,life+.39]){const seconds=deathPoseTime(age,clip.duration,life);surface.write(0,{clip:'Death',seconds},{runId:'a',entityId:19,time:6+age,deathAt:6});
    const layer=source.layers.alpha;if(layer){const expected=Number(sampleMaterialTrack(clip.tracks.find(t=>t.id===layer.add.id),seconds,layer.add));assert.equal(surface.data[6*1024*4+1],Math.fround(expected));}
   }
  }
 }
});
