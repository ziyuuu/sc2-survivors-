/** Seal a verified existing compression baseline; never relabel changed sources.
 * node tools/seal-compressed-provenance.mjs <packed directory> <original Web directory>
 * Requires its already recorded sourceWebRelease, all original bytes and packed
 * payloads. A missing/changed baseline must be rebuilt by the compression flow.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {PROVENANCE_FILE,sha256,verifySourceManifest,verifyCompressedProvenance} from './compressed-resource-provenance.mjs';
assert.ok(process.argv[2]&&process.argv[3],'Usage: seal-compressed-provenance.mjs <packed directory> <original Web directory>');
const destination=path.resolve(process.argv[2]),web=path.resolve(process.argv[3]),read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const old=await read(destination+'/web-release.json'),fresh=await read(web+'/web-release.json');
const packedBytes=await fs.readFile(destination+'/'+old.manifest),packed=JSON.parse(packedBytes),original=await read(web+'/'+fresh.manifest),indexBytes=await fs.readFile(destination+'/sites-pack-index.js');
verifySourceManifest(fresh,original);
assert.equal(old.sourceWebRelease,original.release,'Existing packed baseline has different/unknown originals: rebuild resources, do not bless the new source');
const proof={version:1,sourceRelease:original.release,packedRelease:packed.release,packedManifestSha256:sha256(packedBytes),packIndexSha256:sha256(indexBytes),sources:original.assets};
verifyCompressedProvenance(proof,old,fresh,packedBytes,original,indexBytes);
const index=JSON.parse(indexBytes.toString().trim().replace(/^self\.SC2_PACK_INDEX=/,'').replace(/;$/,''));
const verified=new Set();
for(const row of Object.values(original.assets)){
 assert.match(row.url,/^assets\/[a-f0-9]{64}\.[a-z0-9]+$/);if(verified.has(row.url))continue;
 const data=await fs.readFile(path.join(web,row.url));assert.equal(data.length,row.bytes,row.url);assert.equal(sha256(data),row.sha256,row.url);verified.add(row.url);
}
const records=[...Object.values(packed.assets).flatMap(row=>[row,...Object.values(row.variants??{})]),...Object.values(packed.gpuTextures??{})];
const unique=[...new Map(records.map(row=>[row.url,row])).values()].sort((a,b)=>(index[a.url]?.[0]??a.url).localeCompare(index[b.url]?.[0]??b.url));
let bundleName='',bundle=null;
for(const row of unique){
 assert.match(row.url,/^assets\/[a-f0-9]{64}\.[a-z0-9]+$/);const item=index[row.url];let data;
 if(item){
  const [name,offset,length,,compressed]=item;assert.match(name,/^[a-zA-Z0-9_-]+\.bin$/);
  if(name!==bundleName){bundle=await fs.readFile(destination+'/assets/'+name);bundleName=name;const hash=/-([a-f0-9]{20})\.bin$/.exec(name);if(hash)assert.ok(sha256(bundle).startsWith(hash[1]),name);}
  assert.ok(Number.isSafeInteger(offset)&&offset>=0&&Number.isSafeInteger(length)&&length>=0&&offset+length<=bundle.length,'Invalid packed range');
  data=bundle.subarray(offset,offset+length);if(compressed&&data[0]===31&&data[1]===139)data=gunzipSync(data);
 }else data=await fs.readFile(path.join(destination,row.url));
 assert.equal(data.length,row.bytes,row.url);assert.equal(sha256(data),row.sha256,row.url);
}
const file=path.join(destination,PROVENANCE_FILE),bytes=JSON.stringify(proof)+'\n';
try{assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')),proof,'Existing provenance differs; keep the old release and seal a new build directory');}catch(error){if(error.code!=='ENOENT')throw error;await fs.writeFile(file,bytes,{flag:'wx'});}
console.log(JSON.stringify({file,sourceRelease:proof.sourceRelease,packedRelease:proof.packedRelease,originalFiles:verified.size,packedFiles:unique.length}));
