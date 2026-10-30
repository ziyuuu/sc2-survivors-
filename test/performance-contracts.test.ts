import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {UNIT_MATERIAL_CATALOG} from '../src/render/materials/unit-material-catalog';
import effects from '../src/render/effects/source/catalog.json';
import {UnitMaterialSurface,restoreMaterialUploads} from '../src/render/materials/unit-material-batch';
import type {UnitMaterialProfile,UnitMaterialContext} from '../src/render/materials/source-tracks';
import {LegacyMaterialRows} from './fixtures/legacy-material-rows';
import {RenderableRegistry,sceneRenderables,hierarchyVisible} from '../src/render/scene/renderable-registry';
import {PosedDepthRegistry} from '../src/render/materials/posed-depth';
import {AdaptiveResolution} from '../src/render/settings/adaptive-quality';
import {resolveQuality,renderPixelRatio,QUALITY_LABELS} from '../src/render/settings/quality';
import {protossFixture,protossElite,target} from './helpers/protoss-elites';
import {compositeEliteBuff,compositeEliteDebuff} from '../src/simulation/combat/team-auras';
import {normalIntroPressure,continuousOrdinaryGrowth,ORDINARY_CURVES,linear} from '../src/data/enemy-tuning';
import {sourceParticleQuads,SourceParticleCache} from '../src/render/effects/source/particles';
import type {SourceEffectDefinition,SourceEffectRequest} from '../src/render/effects/source/types';
import {legacySourceParticleQuads} from './fixtures/legacy-source-particles';

test('all body/effect material rows match the frozen numerical writer through shared phases, reordering and flush',()=>{
 const profiles=[...Object.values(UNIT_MATERIAL_CATALOG),...Object.values(effects).map(e=>e.materialProfile as UnitMaterialProfile)];let surfaces=0;
 for(const profile of profiles)for(const source of profile.materials){const prepared={profile,source,textures:{}},old=new LegacyMaterialRows(prepared,7),current=new UnitMaterialSurface(prepared,new THREE.MeshStandardMaterial(),7);
  const contexts:(UnitMaterialContext|undefined)[]=[undefined,{entityId:1,runId:'a',time:1,teamColor:[.2,.4,.6],activity:.7},{entityId:2,runId:'a',time:3,barrier:{phase:'hold',seconds:.44}}];
  for(const clip of profile.clips.length?profile.clips:[{name:'',duration:1}])for(const seconds of [0,.123,clip.duration*.8]){const pose={clip:clip.name,seconds,attackClip:profile.clips.find(c=>c.name==='Attack')?.name,attackSeconds:.27};for(let i=0;i<7;i++){const context=contexts[i%3];old.write(6-i,pose,context);current.write(6-i,pose,context);}assert.deepEqual(current.data.subarray(0,old.data.length),old.data,profile.source+'/'+source.name+'/'+clip.name);current.flush();}
  current.material.dispose();current.texture.dispose();surfaces++;
 }assert.ok(surfaces>475);
});
test('renderable registry follows nested additions, reparenting, removal and live visibility/material changes',()=>{
 const a=new THREE.Scene(),b=new THREE.Scene(),group=new THREE.Group(),bone=new THREE.Bone(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()),line=new THREE.Line(),ra=new RenderableRegistry(a),rb=new RenderableRegistry(b);group.add(bone);bone.add(mesh);a.add(group,line);assert.deepEqual([...ra.objects],[mesh,line]);assert.equal(hierarchyVisible(mesh),true);group.visible=false;assert.equal(hierarchyVisible(mesh),false);b.add(group);assert.deepEqual([...ra.objects],[line]);assert.deepEqual([...rb.objects],[mesh]);group.remove(bone);assert.equal(rb.objects.size,0);group.add(bone);assert.equal(rb.objects.size,1);
 const depth=new PosedDepthRegistry();group.visible=true;depth.configure(b);assert.equal(mesh.castShadow,true);mesh.material=new THREE.MeshBasicMaterial({transparent:true});depth.configure(b);assert.equal(mesh.castShadow,false);assert.equal(sceneRenderables(b).size,1);ra.dispose();rb.dispose();assert.equal(ra.objects.size,0);assert.equal(rb.objects.size,0);
});
test('aura candidates remain live across same-tick promotion, capture, death and replacement',()=>{
 const w=protossFixture(),friend=w.addUnit('stalker','terran',3,0),foe=target(w),source=w.addUnit('sentry','terran',0,0);assert.equal(compositeEliteBuff(w,friend).maxShield,0);source.eliteId='sentry.1';w.refreshStats(source,true);assert.equal(compositeEliteBuff(w,friend).maxShield,.4);source.hp=0;assert.equal(compositeEliteBuff(w,friend).maxShield,0);source.hp=source.maxHp;source.owner='zerg';assert.equal(compositeEliteBuff(w,friend).maxShield,0);source.owner='terran';assert.equal(compositeEliteBuff(w,friend).maxShield,.4);
 w.entities.delete(source.id);const replacement=protossElite(w,'sentry.2');assert.equal(w.entities.size>0,true);assert.equal(compositeEliteBuff(w,friend).maxShield,0);assert.equal(compositeEliteDebuff(w,foe,'speed'),.35);replacement.x=100;assert.equal(compositeEliteDebuff(w,foe,'speed'),0);
});
test('adaptive quality responds to sustained GPU pressure, recovers slowly and ignores pauses/outliers',()=>{
 const q=new AdaptiveResolution();for(let t=100;t<=16000;t+=100)q.sample(28,t);assert.equal(q.scale,.75);const changes=q.changes;q.suspend();assert.equal(q.scale,.75);q.sample(NaN,17000);q.sample(0,17100);q.sample(3000,17200);assert.equal(q.changes,changes);for(let t=18000;t<=55000;t+=100)q.sample(7,t);assert.equal(q.scale,1);
 q.reset();for(let t=100;t<=60000;t+=100)q.sample(9,t);assert.equal(q.changes,0,'slow CPU with light GPU must not lower resolution');assert.equal(resolveQuality('adaptive'),'adaptive');assert.equal(QUALITY_LABELS.adaptive,'自适应');assert.equal(renderPixelRatio('adaptive',1,1440,900),1);assert.equal(renderPixelRatio('native',2,1440,900),2);
});
test('normal introduction joins the original curve continuously without changing later/endless strength',()=>{
 assert.deepEqual(normalIntroPressure(0),{health:.35,damage:.18});
 for(const p of [3/18,6/18]){const left=normalIntroPressure(p-1e-10),right=normalIntroPressure(p+1e-10);assert.ok(Math.abs(left.health-right.health)<1e-8);assert.ok(Math.abs(left.damage-right.damage)<1e-8);}
 for(const p of [6/18,12/18,1]){const g=continuousOrdinaryGrowth('normal',p),c=ORDINARY_CURVES.normal;assert.equal(g.health,linear(c.health[0],c.health[1],p));assert.equal(g.damage,linear(c.damage[0],c.damage[1],p));}
});
test('particle birth reuse preserves source channels through motion, repeat frames, capacity fallback and expiry',()=>{
 const camera=new THREE.PerspectiveCamera();camera.position.set(3,20,11);camera.lookAt(0,0,0);camera.updateMatrixWorld();const ground=(p:{x:number;z:number})=>p.x*.01+p.z*.02;
 const cache=new SourceParticleCache(8192),tiny=new SourceParticleCache(2);let emitted=0,frame=0;
 const pack=(rows:ReturnType<typeof sourceParticleQuads>)=>rows.map(q=>[q.materialReference,q.emitter,q.born,q.matrix.elements,q.color,q.uv,q.phase.clip.name,q.phase.seconds]);
 for(const def of Object.values(effects) as unknown as SourceEffectDefinition[])for(const seed of [17,43])for(const age of [0,.13,.13,.44,.81,1.31]){frame++;const request:SourceEffectRequest={key:def.id+':'+seed,model:def.id,seed,age,placement:{x:Math.sin(frame),y:.2,z:Math.cos(frame),facing:frame*.01,age,from:{x:-1,y:0,z:-1}},mesh:false};cache.begin(frame);tiny.begin(frame);
  const legacy=pack(legacySourceParticleQuads(def,request,camera,ground)),expected=pack(sourceParticleQuads(def,request,camera,ground));
  // The frozen writer has the old tail direction, bone-rotated gravity and
  // mirrored ground-contact bugs. Preserve every authored channel, plus exact
  // geometry outside those paths. Corrected trajectories have independent
  // physical tests in source-particle-{tail,ground}-motion.test.ts.
  const authored=(rows:typeof expected)=>rows.map(row=>{const p=def.particles[Number(row[1])%1000],changed=[1,6,10].includes(Number(p.particle_type))||Number(p.gravity??0)!==0||!!(Number(p.flags)&2);return changed?row.map((v,i)=>i===3?null:v):row;});
  assert.deepEqual(authored(expected),authored(legacy),def.id+'/authored');
  assert.deepEqual(pack(sourceParticleQuads(def,request,camera,ground,cache)),expected,def.id+'/'+age);assert.deepEqual(pack(sourceParticleQuads(def,request,camera,ground,tiny)),expected,def.id+'/capacity');cache.end();tiny.end();emitted+=expected.length;assert.ok(tiny.report().liveBirths<=2);
 }
 assert.ok(emitted>1000);assert.ok(cache.hits>0);cache.begin(frame+1);cache.end();assert.equal(cache.report().liveBirths,0);assert.equal(cache.report().requests,0);tiny.reset();assert.equal(tiny.report().liveBirths,0);
});
test('material dirty rows retain pending writes and fully restore a new GPU context',()=>{
 const profile=UNIT_MATERIAL_CATALOG.marine,surface=new UnitMaterialSurface({profile,source:profile.materials[0],textures:{}},new THREE.MeshStandardMaterial(),1024),gpu=new Float32Array(surface.data.length),pose={clip:'Stand',seconds:.2};
 const upload=()=>{const ranges=surface.texture.updateRanges;if(!ranges.length)gpu.set(surface.data);else for(const r of ranges){assert.equal(Math.floor(r.start/(1024*4)),Math.floor((r.start+r.count-1)/(1024*4)));gpu.set(surface.data.subarray(r.start,r.start+r.count),r.start);}surface.texture.clearUpdateRanges();surface.texture.onUpdate?.(surface.texture);assert.deepEqual(gpu,surface.data);};
 surface.write(4,pose);surface.flush();assert.equal(surface.texture.updateRanges.length,0);upload();
 const context={runId:'a',entityId:1,time:0,teamColor:[.2,.4,.6] as const};surface.write(4,pose,context);surface.flush();assert.ok(surface.texture.updateRanges.length>0);surface.write(7,pose,{...context,teamColor:[.4,.6,.2]});surface.flush();upload();
 restoreMaterialUploads();gpu.fill(0);surface.flush();assert.equal(surface.texture.updateRanges.length,0);upload();surface.material.dispose();surface.texture.dispose();
});
