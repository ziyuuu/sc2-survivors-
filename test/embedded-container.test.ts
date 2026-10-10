import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createAssetPack} from '../tools/offline-pack.mjs';
import {EmbeddedAssetStore,restoreEmbeddedContainerChunks,type AssetPack} from '../src/assets/offline-pack';
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const make=()=>{const bytes=Buffer.from('原始资源'.repeat(300)),{pack}=createAssetPack([{id:'model.fixture',mime:'application/octet-stream',bytes}]);return {bytes,pack:pack as AssetPack};};
test('bounded HTML container reconstructs identical production-decoded bytes without one combined JSON string',async()=>{
 const {bytes,pack}=make(),metadata={...pack,container:'chunks-v1' as const,chunks:pack.chunks.map(c=>({...c,data:''}))};
 restoreEmbeddedContainerChunks(metadata,pack.chunks.map((chunk,index)=>({index,payload:JSON.stringify(chunk)})));
 const store=new EmbeddedAssetStore(metadata);await store.prepare(['model.fixture']);const restored=new Uint8Array(await(await fetch(store.urls['model.fixture'])).arrayBuffer());assert.equal(sha(restored),sha(bytes));URL.revokeObjectURL(store.urls['model.fixture']);
});
test('bounded HTML container rejects missing, duplicate, out-of-range and mismatched chunk metadata',()=>{
 const {pack}=make(),metadata=()=>({...pack,container:'chunks-v1' as const,chunks:pack.chunks.map(c=>({...c,data:''}))}),part={index:0,payload:JSON.stringify(pack.chunks[0])};
 assert.throws(()=>restoreEmbeddedContainerChunks(metadata(),[]),/缺失/);
 assert.throws(()=>restoreEmbeddedContainerChunks(metadata(),[part,part]),/编号/);
 assert.throws(()=>restoreEmbeddedContainerChunks(metadata(),[{...part,index:99}]),/编号/);
 assert.throws(()=>restoreEmbeddedContainerChunks(metadata(),[{index:0,payload:JSON.stringify({...pack.chunks[0],bytes:0})}]),/元数据/);
});
