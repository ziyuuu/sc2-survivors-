import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {bindPylonBirthMaterial,preparePylonBirthMaterials} from '../src/render/units/pylon-birth-materials';
test('original PylonBirth curves control independent cloned emission/alpha and suppress untextured additive white',async()=>{
 const effect=new THREE.MeshStandardMaterial({emissive:0xffffff,emissiveMap:new THREE.Texture()});effect.name='222233dd#0';
 const body=new THREE.MeshStandardMaterial({map:new THREE.Texture(),emissive:0xffffff,emissiveMap:new THREE.Texture(),alphaTest:.5});body.name='pylon_te#1';body.userData.sc2={layers:[{role:'alpha',index:3,uv:1}]};
 const alpha=new THREE.Texture(),scene=new THREE.Group();scene.add(new THREE.Mesh(new THREE.BoxGeometry(),body));scene.add(new THREE.Mesh(new THREE.BoxGeometry(),effect));
 await preparePylonBirthMaterials({scene,parser:{getDependency:async()=>alpha}} as any);
 const a=body.clone(),b=body.clone(),aa=bindPylonBirthMaterial(body,a)!,bb=bindPylonBirthMaterial(body,b)!;
 aa.update(3);bb.update(4);assert.equal(a.opacity,0);assert.equal(b.opacity,1);assert.equal(a.emissiveIntensity,0);assert.equal(b.emissiveIntensity,25);assert.notEqual(a.alphaMap,b.alphaMap);assert.notEqual(a.emissiveMap,b.emissiveMap);assert.notEqual(a.alphaMap!.offset.y,b.alphaMap!.offset.y);assert.equal(alpha.offset.y,0);assert.equal(body.opacity,0);
 const e=effect.clone(),ee=bindPylonBirthMaterial(effect,e)!;ee.update(3);assert.equal(e.color.getHex(),0);assert.equal(e.emissiveIntensity,1);ee.update(0);assert.equal(e.emissiveIntensity,0);
 aa.update(4);assert.equal(a.opacity,b.opacity);assert.equal(a.alphaMap!.offset.y,b.alphaMap!.offset.y,'restored source time gives same original UV pose');assert.match(a.customProgramCacheKey(),/pylon-birth/);
 aa.dispose();bb.dispose();ee.dispose();
});
