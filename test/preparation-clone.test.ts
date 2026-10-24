import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {cloneForPreparation} from '../src/render/scene/preparation-clone';
import {bindSourceDepth,sourceDepthMaterial} from '../src/render/materials/posed-depth';
import {bindSceneTextures,sceneMaterialTextures} from '../src/render/materials/scene-textures';

test('detached particle warmup preserves live instances and the native source-color program variant',()=>{
 const geometry=new THREE.PlaneGeometry(),material=new THREE.MeshBasicMaterial(),mesh=new THREE.InstancedMesh(geometry,material,8),texture=new THREE.Texture();material.map=texture;
 geometry.setAttribute('sourceColor',new THREE.InstancedBufferAttribute(new Float32Array(32),4));mesh.setColorAt(0,new THREE.Color('red'));mesh.setMatrixAt(0,new THREE.Matrix4().makeTranslation(3,4,5));mesh.count=0;mesh.visible=false;
 const before=Array.from(mesh.instanceMatrix.array),copy=cloneForPreparation(mesh),cloned=copy.root as THREE.InstancedMesh;assert.equal(cloned.geometry,geometry);assert.notEqual(cloned.material,material);assert.equal((cloned.material as THREE.MeshBasicMaterial).map,texture);assert.equal(cloned.instanceColor,null);assert.notEqual(cloned.instanceMatrix,mesh.instanceMatrix);
 assert.deepEqual(Array.from(mesh.instanceMatrix.array),before);assert.equal(mesh.count,0);assert.equal(mesh.visible,false);assert.ok(mesh.instanceColor);
 let disposed=0;for(const source of [mesh,geometry,material,texture])source.addEventListener('dispose',()=>disposed++);copy.dispose();assert.equal(disposed,0);
});
test('detached material retains custom compile behavior, dynamic cache identity and source-depth binding',()=>{
 const material=new THREE.MeshStandardMaterial();material.userData.tag='base';material.customProgramCacheKey=function(){return this.userData.tag;};const compiler=()=>{};material.onBeforeCompile=compiler;bindSourceDepth(material,{key:()=> 'native-pose',compile:compiler});
 const copy=cloneForPreparation(new THREE.Mesh(new THREE.PlaneGeometry(),material)),cloned=(copy.root as THREE.Mesh).material as THREE.Material;
 assert.equal(cloned.onBeforeCompile,compiler);cloned.userData.tag='clone';assert.equal(cloned.customProgramCacheKey(),'clone');assert.equal(material.customProgramCacheKey(),'base');assert.match(sourceDepthMaterial(cloned).customProgramCacheKey(),/native-pose/);copy.dispose();
});
test('skinned warmup owns its skeleton and transforms while shared geometry survives disposal',()=>{
 const group=new THREE.Group(),bone=new THREE.Bone(),mesh=new THREE.SkinnedMesh(new THREE.PlaneGeometry(),new THREE.MeshStandardMaterial());group.add(bone,mesh);mesh.bind(new THREE.Skeleton([bone]));
 const copy=cloneForPreparation(group),cloned=copy.root.children.find(n=>n instanceof THREE.SkinnedMesh) as THREE.SkinnedMesh;assert.notEqual(cloned.skeleton,mesh.skeleton);assert.notEqual(cloned.skeleton.bones[0],bone);cloned.skeleton.bones[0].position.x=9;assert.equal(bone.position.x,0);let disposed=0;mesh.geometry.addEventListener('dispose',()=>disposed++);copy.dispose();assert.equal(disposed,0);
});
test('displacement warmup shares immutable texture inputs without sharing mutable uniform vectors',()=>{
 const texture=new THREE.Texture(),material=new THREE.ShaderMaterial({uniforms:{map:{value:texture},maps:{value:[texture]},size:{value:new THREE.Vector2(32,32)}}}),copy=cloneForPreparation(new THREE.Mesh(new THREE.PlaneGeometry(),material)),cloned=(copy.root as THREE.Mesh).material as THREE.ShaderMaterial;
 assert.equal(cloned.uniforms.map.value,texture);assert.equal(cloned.uniforms.maps.value[0],texture);assert.notEqual(cloned.uniforms.size.value,material.uniforms.size.value);copy.dispose();
});
test('displacement first draw uses the restored live frame uniforms and retains custom sampler metadata',()=>{
 const material=new THREE.ShaderMaterial({uniforms:{sceneDepth:{value:null},viewport:{value:new THREE.Vector2(1,1)}}}),texture=new THREE.Texture();bindSceneTextures(material,[texture]);const mesh=new THREE.Mesh(new THREE.PlaneGeometry(),material);mesh.userData.displacement=true;
 const copy=cloneForPreparation(mesh),cloned=(copy.root as THREE.Mesh).material as THREE.ShaderMaterial;
 assert.equal(cloned.uniforms.sceneDepth,material.uniforms.sceneDepth);assert.equal(cloned.uniforms.viewport,material.uniforms.viewport);assert.deepEqual(sceneMaterialTextures(cloned),[texture]);copy.dispose();
});
