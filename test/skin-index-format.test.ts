import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {prepareFloatSkinIndices} from '../src/render/units/skin-index-format';

function fixture(attribute?:THREE.BufferAttribute|THREE.InterleavedBufferAttribute){
 const root=new THREE.Group(),geometry=new THREE.BufferGeometry();
 if(attribute)geometry.setAttribute('skinIndex',attribute);
 const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshBasicMaterial());root.add(mesh);
 return {root,geometry,mesh};
}

test('skin indices preserve every unsigned-short value and unrelated render data',()=>{
 const values=Uint16Array.from({length:65536},(_,i)=>i),indices=new THREE.BufferAttribute(values,4);
 indices.name='JOINTS_0';indices.setUsage(THREE.DynamicDrawUsage);
 const {root,geometry,mesh}=fixture(indices),positions=new THREE.Float32BufferAttribute([1,2,3],3),weights=new THREE.Float32BufferAttribute([1,0,0,0],4);
 geometry.setAttribute('position',positions);geometry.setAttribute('skinWeight',weights);geometry.setIndex([0]);
 const index=geometry.index,material=mesh.material,matrix=mesh.bindMatrix.clone();
 prepareFloatSkinIndices(root);const result=geometry.getAttribute('skinIndex');
 assert.ok(result instanceof THREE.BufferAttribute&&result.array instanceof Float32Array);
 assert.deepEqual(Array.from(result.array),Array.from(values));assert.equal(result.itemSize,4);assert.equal(result.normalized,false);
 assert.equal(result.name,indices.name);assert.equal(result.usage,indices.usage);
 assert.equal(geometry.getAttribute('position'),positions);assert.equal(geometry.getAttribute('skinWeight'),weights);assert.equal(geometry.index,index);assert.equal(mesh.material,material);assert.deepEqual(mesh.bindMatrix,matrix);
});

test('unsigned-byte indices also retain their exact values',()=>{
 const values=Uint8Array.from({length:256},(_,i)=>i),{root,geometry}=fixture(new THREE.BufferAttribute(values,4));
 prepareFloatSkinIndices(root);assert.deepEqual(Array.from(geometry.getAttribute('skinIndex').array),Array.from(values));assert.ok(geometry.getAttribute('skinIndex').array instanceof Float32Array);
});

test('interleaved indices respect stride and offset without modifying neighbouring data',()=>{
 const data=new THREE.InterleavedBuffer(new Uint16Array([99,1,2,3,4,88,98,5,6,7,8,87]),6).setUsage(THREE.DynamicDrawUsage),attribute=new THREE.InterleavedBufferAttribute(data,4,1),before=data.array.slice();
 const {root,geometry}=fixture(attribute);prepareFloatSkinIndices(root);const result=geometry.getAttribute('skinIndex');
 assert.deepEqual(Array.from(result.array),[1,2,3,4,5,6,7,8]);assert.deepEqual(data.array,before);assert.equal((result as THREE.BufferAttribute).usage,data.usage);
});

test('already converted and shared geometry retain one stable attribute',()=>{
 const {root,geometry}=fixture(new THREE.Uint16BufferAttribute([0,1,2,3],4));root.add(new THREE.SkinnedMesh(geometry));
 prepareFloatSkinIndices(root);const converted=geometry.getAttribute('skinIndex');prepareFloatSkinIndices(root);assert.equal(geometry.getAttribute('skinIndex'),converted);
 const existing=new THREE.Float32BufferAttribute([0,1,2,3],4);geometry.setAttribute('skinIndex',existing);prepareFloatSkinIndices(root);assert.equal(geometry.getAttribute('skinIndex'),existing);
});

test('normalised, unsupported and missing attributes are left intact',()=>{
 for(const attribute of [new THREE.Uint16BufferAttribute([0,1,2,3],4,true),new THREE.Uint32BufferAttribute([0,1,16777217,3],4),new THREE.Int16BufferAttribute([0,1,2,3],4),undefined]){
  const {root,geometry}=fixture(attribute);prepareFloatSkinIndices(root);assert.equal(geometry.getAttribute('skinIndex'),attribute);
 }
});

test('ordinary meshes are not treated as skinned geometry',()=>{
 const geometry=new THREE.BufferGeometry(),attribute=new THREE.Uint16BufferAttribute([0,1,2,3],4);geometry.setAttribute('skinIndex',attribute);
 prepareFloatSkinIndices(new THREE.Mesh(geometry));assert.equal(geometry.getAttribute('skinIndex'),attribute);
});
