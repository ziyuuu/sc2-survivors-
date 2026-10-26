import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import * as THREE from 'three';
import {SOURCE_EFFECTS} from '../src/render/effects/source/player';
import {sourceDependencies} from '../src/render/effects/source/materials';
import {DisplacementSurface,DISPLACEMENT_LAYER,displacementFrame} from '../src/render/effects/source/displacement';
import {sourcePhase,sourceSample} from '../src/render/effects/source/timeline';
import {SourceDrawBatch} from '../src/render/effects/source/draw-batch';
import {ScreenRefraction} from '../src/render/scene/screen-refraction';
import {sceneMaterialTextures} from '../src/render/materials/scene-textures';

test('every original type-2 mesh has a separately bound immutable GLB and every displacement sampler is required',()=>{
 const registry=JSON.parse(fs.readFileSync('deploy/runtime/combat-effects.json','utf8'));let definitions=0,meshes=0;
 for(const def of Object.values(SOURCE_EFFECTS)){
  const dependencies=sourceDependencies(def);for(const m of def.displacementMaterials??[])for(const l of Object.values(m.layers))if(l?.texture)assert.ok(dependencies.includes(l.texture),def.id);
  if(!def.displacementGlb)continue;definitions++;const row=registry.records.find((r:any)=>r.id===def.displacementGlb!.id);assert.ok(row);const bytes=fs.readFileSync(row.gitPath);assert.equal(createHash('sha256').update(bytes).digest('hex'),def.displacementGlb.sha256);
  const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));for(const n of json.nodes)if(n.mesh!==undefined){meshes++;assert.ok(def.displacementMaterials[n.extras.displacementMaterial]);assert.equal(json.materials[json.meshes[n.mesh].primitives[0].material].name,'source-displacement-'+n.extras.displacementMaterial);}
  assert.ok(json.animations.length>0);assert.ok(dependencies.includes(def.displacementGlb.id));
 }assert.equal(definitions,14);assert.equal(meshes,17);assert.ok(SOURCE_EFFECTS.GhostNukeExplode.displacementGlb);
});

test('displacement strength and independent normal/mask UV curves follow original clip time without cross-instance leakage',()=>{
 const def=SOURCE_EFFECTS.SiegeTankSiegedAttackImpact,source=def.displacementMaterials[0],normal=new THREE.Texture(),strength=new THREE.Texture(),surface=new DisplacementSurface({definition:def,source,textures:{normal,strength}},2);
 for(const [i,age]of [.05,.4].entries()){const phase=sourcePhase(def,age);surface.write(i,{clip:phase.clip.name,seconds:phase.seconds});assert.equal(surface.data[(6*2+i)*4],Math.fround(Number(sourceSample(phase.clip,phase.seconds,source.strength))));const offset=sourceSample(phase.clip,phase.seconds,source.layers.normal!.uvOffset) as any;assert.equal(surface.data[(1*2+i)*4+1],Math.fround(offset.y));}
 const frozen=surface.data.slice();surface.write(1,{clip:sourcePhase(def,.4).clip.name,seconds:sourcePhase(def,.4).seconds});assert.deepEqual(surface.data,frozen);assert.deepEqual(sceneMaterialTextures(surface.material),[normal,strength]);surface.material.dispose();surface.texture.dispose();
});

test('original shield displacement grows beyond initial capacity, clears on pause-time resubmission and never drops quads',()=>{
 const def=SOURCE_EFFECTS.ProtossShieldRipple,scene=new THREE.Scene(),batch=new SourceDrawBatch(scene,{definition:def,source:def.displacementMaterials[0],textures:{}}),q={matrix:new THREE.Matrix4(),color:[1,1,1,.5]as [number,number,number,number],uv:[0,0,1,1]as [number,number,number,number],phase:sourcePhase(def,.1)};
 batch.begin();for(let i=0;i<513;i++)batch.add(q);batch.end();assert.equal(batch.mesh.count,513);assert.equal(batch.report().dropped,0);assert.equal(batch.mesh.layers.mask,(1<<DISPLACEMENT_LAYER)>>>0);batch.begin();batch.end();assert.equal(batch.mesh.visible,false);assert.equal(batch.mesh.count,0);batch.dispose();assert.equal(scene.children.length,0);
});

test('screen pass does no work when inactive and restores renderer and camera state when field drawing fails',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),pass=new ScreenRefraction(scene,camera),read=new THREE.WebGLRenderTarget(8,8),write=new THREE.WebGLRenderTarget(8,8);let calls=0;
 pass.render({} as any,write,read);assert.equal(pass.needsSwap,false);
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial());mesh.userData.displacement=true;scene.add(mesh);scene.background=new THREE.Color('#234567');const background=scene.background,mask=camera.layers.mask;read.depthTexture=new THREE.DepthTexture(8,8);
 const renderer={autoClear:false,getRenderTarget:()=>read,getClearColor:(c:THREE.Color)=>c.set('#123456'),getClearAlpha:()=>.5,setRenderTarget:()=>{calls++;},setClearColor:()=>{},render:()=>{throw Error('GPU interrupted');}};
 assert.throws(()=>pass.render(renderer as any,write,read),/GPU interrupted/);assert.equal(renderer.autoClear,false);assert.equal(camera.layers.mask,mask);assert.equal(scene.background,background);assert.ok(calls>=2);pass.dispose();read.dispose();write.dispose();displacementFrame.depth.value=null;
});

test('empty entrances still warm the compositor and a failed warmup restores its textures and target',()=>{
 const pass=new ScreenRefraction(new THREE.Scene(),new THREE.PerspectiveCamera()),uniforms=(pass as any).material.uniforms;
 const prior=new THREE.WebGLRenderTarget(4,4),before={color:uniforms.color.value,field:uniforms.field.value,depth:uniforms.depth.value};let initialized=0,target:THREE.WebGLRenderTarget|null=prior,draws=0;
 const renderer={getRenderTarget:()=>target,setRenderTarget:(next:THREE.WebGLRenderTarget|null)=>{target=next;},initRenderTarget:()=>{initialized++;},render:()=>{draws++;assert.notEqual(target,prior);assert.ok(uniforms.color.value instanceof THREE.DataTexture);throw Error('First compositor draw failed');}};
 assert.throws(()=>pass.prepareComposite(renderer as any),/First compositor draw failed/);assert.equal(initialized,1);assert.equal(draws,1);assert.equal(target,prior);
 for(const key of ['color','field','depth']as const)assert.equal(uniforms[key].value,before[key]);pass.dispose();prior.dispose();
});
