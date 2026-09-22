import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createAssetPack} from '../tools/offline-pack.mjs';
import {restoreAssetPack} from '../src/assets/offline-pack';
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
function glb(seed:number){const image=Buffer.from(Array.from({length:2048},(_,i)=>i%251)),geometry=Buffer.alloc(2048,seed),bin=Buffer.concat([geometry,image]);
 const j=Buffer.from(JSON.stringify({asset:{version:'2.0'},buffers:[{byteLength:bin.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:geometry.length},{buffer:0,byteOffset:geometry.length,byteLength:image.length}],images:[{bufferView:1,mimeType:'image/png'}],animations:[{name:'Walk',channels:[],samplers:[]}]}));
 const json=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]),header=Buffer.alloc(12),jc=Buffer.alloc(8),bc=Buffer.alloc(8);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);jc.writeUInt32LE(json.length);jc.writeUInt32LE(0x4e4f534a,4);bc.writeUInt32LE(bin.length);bc.writeUInt32LE(0x004e4942,4);return {bytes:Buffer.concat([header,jc,json,bc,bin]),image};}
test('offline pack shares repeated GLB images and restores every asset byte using the browser decoder',async()=>{
 const first=glb(1),second=glb(2),assets=[{id:'unit',mime:'model/gltf-binary',bytes:first.bytes},{id:'death',mime:'model/gltf-binary',bytes:second.bytes},{id:'same-image',mime:'image/png',bytes:first.image},{id:'config',mime:'application/json',bytes:Buffer.from('{"rule":"same"}')}];
 const {pack,stats}=createAssetPack(assets);assert.ok(stats.deduplicatedBytes>=first.image.length*2);assert.ok(stats.storedBytes<stats.uniqueBytes);
 assert.deepEqual(createAssetPack(assets).pack,pack);const urls=await restoreAssetPack(JSON.parse(JSON.stringify(pack)),()=>{},true);
 try{for(const a of assets){const response=await fetch(urls[a.id]),bytes=new Uint8Array(await response.arrayBuffer());assert.equal(response.headers.get('content-type'),a.mime);assert.equal(hash(bytes),hash(a.bytes));assert.deepEqual(Buffer.from(bytes),a.bytes);}}finally{for(const url of Object.values(urls))URL.revokeObjectURL(url);}
});
test('offline pack rejects incomplete GLB files and missing/mis-sized chunks',async()=>{
 const bytes=glb(1).bytes;assert.throws(()=>createAssetPack([{id:'bad',mime:'model/gltf-binary',bytes:bytes.subarray(0,-1)}]),/header/);
 const {pack}=createAssetPack([{id:'text',mime:'text/plain',bytes:Buffer.from('hello')}]);const bad=structuredClone(pack);bad.chunks[0].bytes++;await assert.rejects(()=>restoreAssetPack(bad),/字节/);
 const missing=structuredClone(pack);missing.assets.text.parts=[50];await assert.rejects(()=>restoreAssetPack(missing),/缺失/);await assert.rejects(()=>restoreAssetPack({...pack,version:99}),/版本/);
});
