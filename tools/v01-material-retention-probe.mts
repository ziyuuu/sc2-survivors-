import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import * as THREE from 'three';
const source=process.argv[2]??'src',expected=process.argv[3]??'retained';
const {AnimatedBatch}=await import(pathToFileURL(path.resolve(source,'render/units/animated-batch.ts')).href);
const {bindUnitMaterial}=await import(pathToFileURL(path.resolve(source,'render/materials/unit-material-loader.ts')).href);
assert.equal(typeof globalThis.gc,'function','Run with --expose-gc');
function make(prepared:boolean){
 const oldImage={width:4,height:4,data:new Uint8Array(64).fill(31)},oldTexture=new THREE.Texture(oldImage),keptImage={width:4,height:4,data:new Uint8Array(64).fill(97)},keptTexture=new THREE.Texture(keptImage),material=new THREE.MeshStandardMaterial({map:oldTexture});
 let fallbackCalls=0;material.onBeforeCompile=()=>{fallbackCalls++;};material.customProgramCacheKey=()=>'retention-fallback';
 if(prepared)bindUnitMaterial(material,{profile:{source:'retention-probe',clips:[],composites:[]},source:{index:0,layers:{}},textures:{diffuse:keptTexture}} as any);
 const root=new THREE.Group(),bone=new THREE.Bone();bone.name='Root';root.add(bone);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));g.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1],2));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Array(12).fill(0),4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
 const mesh=new THREE.SkinnedMesh(g,material);root.add(mesh);root.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton([bone]));
 const clips=[new THREE.AnimationClip('Stand',1,[new THREE.VectorKeyframeTrack('Root.position',[0,1],[0,0,0,0,0,0])])],batch=new AnimatedBatch({scene:root,animations:clips},new THREE.Scene(),1);
 return {batch,oldMaterial:new WeakRef(material),oldImage:new WeakRef(oldImage),oldTexture:new WeakRef(oldTexture),keptImage:new WeakRef(keptImage),fallbackCalls:()=>fallbackCalls};
}
function shader(row:ReturnType<typeof make>){const m=row.batch.meshes[0].material as THREE.Material,s={uniforms:{},vertexShader:'#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>\n#include <project_vertex>',fragmentShader:['common','emissivemap_fragment','map_fragment','alphamap_fragment','normal_fragment_maps','lights_physical_fragment','lights_fragment_end','aomap_fragment','opaque_fragment'].map(k=>'#include <'+k+'>').join('\n')};m.onBeforeCompile(s as any,{} as any);return {key:m.customProgramCacheKey(),sha256:createHash('sha256').update(s.vertexShader+'\n'+s.fragmentShader).digest('hex')};}
const prepared=make(true),fallback=make(false),before={prepared:shader(prepared),fallback:shader(fallback)};
for(let i=0;i<12;i++){await new Promise(resolve=>setImmediate(resolve));globalThis.gc!();await new Promise(resolve=>setImmediate(resolve));}
const result={source,expected,before,after:{prepared:shader(prepared),fallback:shader(fallback)},prepared:{material:!!prepared.oldMaterial.deref(),image:!!prepared.oldImage.deref(),texture:!!prepared.oldTexture.deref(),replacement:!!prepared.keptImage.deref(),fallbackCalls:prepared.fallbackCalls()},fallback:{material:!!fallback.oldMaterial.deref(),image:!!fallback.oldImage.deref(),texture:!!fallback.oldTexture.deref(),fallbackCalls:fallback.fallbackCalls()}};
console.log(JSON.stringify(result,null,2));assert.deepEqual(result.after,result.before);assert.equal(result.prepared.material,expected==='retained');assert.equal(result.prepared.image,expected==='retained');assert.equal(result.prepared.texture,expected==='retained');assert.equal(result.prepared.replacement,true);assert.equal(result.prepared.fallbackCalls,0);assert.equal(result.fallback.material,true);assert.equal(result.fallback.image,true);assert.equal(result.fallback.texture,true);assert.equal(result.fallback.fallbackCalls,2);prepared.batch.dispose();fallback.batch.dispose();
