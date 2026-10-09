import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {EmbeddedAssetStore,type AssetPack} from '../src/assets/offline-pack';
const file=process.env.SC2_ENTRY_HTML??'dist/SC2-Survivors-Entry-Fixes-20261009.html',out=process.env.SC2_ENTRY_PACK_REPORT??'reports/local/entry-fixes-20261009/offline-byte-verification.json';
async function readPack(){const bytes=await fs.readFile(file),tag=Buffer.from('<script id="sc2-resource-pack" type="application/json">'),start=bytes.indexOf(tag)+tag.length,end=bytes.indexOf('</script>',start);assert.ok(start>=tag.length&&end>start);return {pack:JSON.parse(bytes.toString('utf8',start,end)) as AssetPack,htmlBytes:bytes.length,htmlSha256:createHash('sha256').update(bytes).digest('hex')};}
const {pack,htmlBytes,htmlSha256}=await readPack();(globalThis as any).gc?.();
const original=JSON.parse(await fs.readFile('reports/local/asset-reachability.json','utf8')),byId=new Map<string,any>(original.rows.map((r:any)=>[r.id,r]));
assert.deepEqual(Object.keys(pack.assets).sort(),[...original.selectedIds].sort());
const store=new EmbeddedAssetStore(pack),checked=[];for(const [id,meta]of Object.entries(pack.assets)){
 await store.prepare([id]);try{const bytes=new Uint8Array(await(await fetch(store.urls[id])).arrayBuffer()),digest=createHash('sha256').update(bytes).digest('hex'),source=byId.get(id);assert.equal(bytes.length,source.bytes,id);assert.equal(digest,source.sha256,id);assert.equal(digest,meta.sha256,id);checked.push({id,bytes:bytes.length,sha256:digest});}finally{URL.revokeObjectURL(store.urls[id]);}
 if(checked.length%100===0){(globalThis as any).gc?.();console.log(checked.length+' original assets reconstructed');}
}
const result={file,htmlBytes,htmlSha256,method:'Every shipped asset reconstructed sequentially from the actual HTML by the production EmbeddedAssetStore/Base85/gzip decoder; SHA-256 compared to the original resource closure.',assets:checked.length,rawBytes:checked.reduce((n,r)=>n+r.bytes,0),checked};await fs.writeFile(out,JSON.stringify(result,null,2));console.log(JSON.stringify({assets:result.assets,rawBytes:result.rawBytes,htmlBytes,htmlSha256}));
