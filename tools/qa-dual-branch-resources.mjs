/** Verify a current original/packed pair without writing build artifacts or changing runtime data. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {PROVENANCE_FILE,sha256,verifyCompressedProvenance,verifySourceManifest} from './compressed-resource-provenance.mjs';

const [webArg,packedArg,baselineArg]=process.argv.slice(2);
assert.ok(webArg&&packedArg,'Usage: node tools/qa-dual-branch-resources.mjs <original-web> <packed-web> [previous-packed-web]');
const web=path.resolve(webArg),packed=path.resolve(packedArg);
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const sourceRelease=await read(path.join(web,'web-release.json'));
const packedRelease=await read(path.join(packed,'web-release.json'));
const source=await read(path.join(web,sourceRelease.manifest));
verifySourceManifest(sourceRelease,source);
const manifestBytes=await fs.readFile(path.join(packed,packedRelease.manifest));
const indexBytes=await fs.readFile(path.join(packed,'sites-pack-index.js'));
const proof=await read(path.join(packed,PROVENANCE_FILE));
const manifest=verifyCompressedProvenance(proof,packedRelease,sourceRelease,manifestBytes,source,indexBytes);
assert.equal(packedRelease.appBuildId,sourceRelease.appBuildId);
assert.equal(packedRelease.runSchema,sourceRelease.runSchema);
const index=JSON.parse(indexBytes.toString().replace(/^self\.SC2_PACK_INDEX=/,'').replace(/;\s*$/,''));
const bundles=new Map(),seen=new Set();let glbs=0;
const inside=(root,file)=>{const p=path.resolve(root,file);assert.ok(p.startsWith(root+path.sep),'Path escapes build');return p;};
const rows=Object.values(manifest.assets).flatMap(r=>[r,...Object.values(r.variants??{})]).concat(Object.values(manifest.gpuTextures??{}));
for(const row of rows){
 if(seen.has(row.url))continue;seen.add(row.url);
 const entry=index[row.url];let bytes;
 if(entry){
  const [name,offset,length,,compressed]=entry;
  assert.ok(Number.isSafeInteger(offset)&&offset>=0&&Number.isSafeInteger(length)&&length>0);
  if(!bundles.has(name))bundles.set(name,await fs.readFile(inside(packed,'assets/'+name)));
  const bundle=bundles.get(name);assert.ok(offset+length<=bundle.length);
  bytes=bundle.subarray(offset,offset+length);if(compressed)bytes=gunzipSync(bytes);
 }else bytes=await fs.readFile(inside(packed,row.url));
 assert.equal(bytes.length,row.bytes,row.url);assert.equal(sha256(bytes),row.sha256,row.url);
 if(row.mime==='model/gltf-binary'){assert.equal(bytes.readUInt32LE(0),0x46546c67,row.url);assert.equal(bytes.readUInt32LE(8),bytes.length,row.url);glbs++;}
}
for(const family of ['aberration','devourer','infestor','swarm_host','viper','brood_lord','ghost','widow_mine','cyclone','raven','liberator','battlecruiser'])assert.ok(manifest.assets['model.'+family],family);
const worker=await fs.readFile(inside(packed,packedRelease.packedWorker));assert.equal(sha256(worker),packedRelease.packedWorkerSha256);
const html=await fs.readFile(path.join(packed,'index.html'),'utf8');
const script=html.match(/<script type="module"[^>]*src="\.\/([^"]+\.js)"/);assert.ok(script);
const launcher=await fs.readFile(inside(packed,script[1]),'utf8');
const codeName=launcher.match(/sc2-entry\.[a-f0-9]+\.js\.gz/);assert.ok(codeName);
assert.equal(sha256(await fs.readFile(inside(packed,'assets/'+codeName[0]))),packedRelease.compressedEntrySha256);
let reused=null,added=null;
if(baselineArg){
 const base=await read(path.join(path.resolve(baselineArg),PROVENANCE_FILE));
 for(const [id,row] of Object.entries(base.sources))assert.deepEqual(source.assets[id],row,id);
 reused=Object.keys(base.sources).length;added=Object.keys(source.assets).length-reused;
}
console.log(JSON.stringify({appBuildId:sourceRelease.appBuildId,sourceRelease:sourceRelease.release,packedRelease:packedRelease.release,assets:Object.keys(manifest.assets).length,verifiedPayloads:seen.size,verifiedGlbs:glbs,reused,added,checks:['source provenance','all quality variants and GPU textures','payload lengths and SHA256','GLB headers','twelve new family models','compressed entry and worker']}));
