import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SharedImageSources} from '../src/render/loaders/shared-image-sources';
import {parsePreparedMaterialGltf} from '../src/render/loaders/prepared-material-gltf';
import {deviceBudget,deviceTier} from '../src/platform/graphics-profile';
import {gltfImageIdentities} from '../src/render/loaders/gltf-image-identities';
import {imageFamilies} from '../tools/prepare-shared-image-manifest.mjs';

test('unknown touch-device memory uses bounded preparation without changing the requested graphics tier',()=>{
 const safari={cores:6,coarse:true,dpr:3};assert.equal(deviceTier(safari),'medium');
 const budget=deviceBudget(safari);assert.equal(budget.decode,1);assert.equal(budget.audio,1);assert.equal(budget.network,2);assert.equal(budget.pcmBytes,32*1024**2);
 assert.equal(deviceBudget({memory:8,cores:8,coarse:true}).decode,2);assert.equal(deviceBudget({cores:8,coarse:false}).network,4);
});

test('different model parsers share decoded immutable pixels while material parameters stay independent',async()=>{
 const cache=new SharedImageSources();let loads=0;const decode=async()=>{loads++;await new Promise(r=>setTimeout(r,1));return new THREE.Texture({width:1024,height:1024});};
 const [a,b]=await Promise.all([cache.texture('verified-map-pixels',decode),cache.texture('verified-map-pixels',decode)]);
 assert.equal(loads,1);assert.notEqual(a,b);assert.equal(a.source,b.source);
 a.wrapS=THREE.RepeatWrapping;b.wrapS=THREE.ClampToEdgeWrapping;a.colorSpace=THREE.SRGBColorSpace;b.colorSpace=THREE.NoColorSpace;
 a.dispose();assert.equal(b.image.width,1024);assert.equal(b.wrapS,THREE.ClampToEdgeWrapping);assert.equal(b.colorSpace,THREE.NoColorSpace);
 const c=await cache.texture('verified-map-pixels',decode);assert.equal(c.source,b.source);assert.equal(loads,1);
});

test('quality swaps invalidate immutable keys and decoder failures can retry',async()=>{
 const cache=new SharedImageSources();let calls=0;
 const decode=async()=>{calls++;if(calls===1)throw Error('bad image');return new THREE.Texture({width:512,height:512});};
 await assert.rejects(cache.texture('image',decode),/bad image/);const a=await cache.texture('image',decode);
 cache.invalidate(a.source);a.source.data={width:128,height:128};const b=await cache.texture('image',decode);
 assert.equal(calls,3);assert.notEqual(a.source,b.source);assert.equal(b.image.width,512);
});

test('shared compressed pixels preserve mipmaps and format while eviction leaves live wrappers intact',async()=>{
 const cache=new SharedImageSources(),mips=[{data:new Uint8Array(16),width:4,height:4}];let calls=0;
 const decode=async()=>{calls++;return new THREE.CompressedTexture(mips,4,4,THREE.RGBA_BPTC_Format);};
 const a=await cache.texture('compressed',decode),b=await cache.texture('compressed',decode);
 assert.ok(a instanceof THREE.CompressedTexture);assert.equal(a.format,THREE.RGBA_BPTC_Format);assert.equal(a.mipmaps[0].data.byteLength,16);assert.equal(a.source,b.source);assert.equal(calls,1);
 cache.forget(['compressed']);const c=await cache.texture('compressed',decode);assert.equal(calls,2);assert.notEqual(c.source,b.source);assert.equal(b.mipmaps[0].data.byteLength,16);
});

test('embedded sharing requires identical payloads through every graphics tier',()=>{
 const h={hash:'a'.repeat(64),mime:'image/png'},l={hash:'b'.repeat(64),mime:'image/webp'},other={hash:'c'.repeat(64),mime:'image/webp'};
 const same=imageFamilies([h],[l],[l]),different=imageFamilies([h],[l],[other]);assert.notEqual(same[0],different[0]);
 const row=(family:string)=>({url:'assets/model.glb',bytes:1,sha256:'f'.repeat(64),mime:'model/gltf-binary',imageSources:[{...h,family}]});
 const compatible={version:1 as const,release:'x',assets:{body:row(same[0]),death:row(same[0])}};
 assert.ok(gltfImageIdentities(compatible,'f'.repeat(64))?.[0]);
 const conflicting={...compatible,assets:{...compatible.assets,other:row(different[0])}};
 assert.equal(gltfImageIdentities(conflicting,'f'.repeat(64))?.[0],null);
});

function fixture(){
 const geometry=new Float32Array([0,0,0,1,0,0,0,1,0]);
 const json={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:'source-mesh',mesh:0,translation:[1,2,3]}],meshes:[{primitives:[{attributes:{POSITION:0},material:0}]}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]}],bufferViews:[{buffer:0,byteOffset:0,byteLength:geometry.byteLength}],buffers:[{byteLength:geometry.byteLength}],materials:[{name:'original#0',pbrMetallicRoughness:{baseColorTexture:{index:0}}}],textures:[{source:0}],images:[{uri:'must-not-be-decoded.png'}]};
 const text=new TextEncoder().encode(JSON.stringify(json)),length=(text.length+3)&~3,result=new ArrayBuffer(28+length+geometry.byteLength),view=new DataView(result),bytes=new Uint8Array(result);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,result.byteLength,true);view.setUint32(12,length,true);view.setUint32(16,0x4e4f534a,true);bytes.fill(32,20,20+length);bytes.set(text,20);view.setUint32(20+length,geometry.byteLength,true);view.setUint32(24+length,0x004e4942,true);bytes.set(new Uint8Array(geometry.buffer),28+length);return result;
}

test('source-effect GLB binds prepared material without decoding discarded embedded material images',async()=>{
 const material=new THREE.MeshStandardMaterial({name:'original#0'}),bytes=fixture(),before=new Uint8Array(bytes).slice();
 const g=await parsePreparedMaterialGltf(bytes,(name,index)=>{assert.equal(name,'original#0');assert.equal(index,0);return material;});
 const mesh=g.scene.getObjectByName('source-mesh') as THREE.Mesh;
 assert.deepEqual([...mesh.geometry.attributes.position.array],[0,0,0,1,0,0,0,1,0]);assert.deepEqual(mesh.position.toArray(),[1,2,3]);assert.equal((mesh.material as THREE.Material).name,material.name);assert.equal((mesh.material as THREE.MeshStandardMaterial).map,null);
 assert.deepEqual(Object.keys(g.parser.sourceCache),[]);assert.deepEqual(new Uint8Array(bytes),before);
 await assert.rejects(parsePreparedMaterialGltf(bytes,()=>{throw Error('Unbound source');}),/Unbound source/);
});
