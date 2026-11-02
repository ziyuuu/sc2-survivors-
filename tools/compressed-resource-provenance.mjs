/** Content binding for code-only updates. A packed hash differs legitimately
 * from its original, so verify the sealed original-to-packed pair first. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const PROVENANCE_FILE='compressed-resource-provenance.json';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function verifySourceManifest(release,manifest){
 assert.equal(manifest.version,1,'Unsupported source manifest');
 assert.equal(manifest.release,release.release,'Source release and manifest disagree');
 assert.equal(sha256(JSON.stringify(manifest.assets)),manifest.release,'Source resource content hash changed: rebuild Web resources');
}
export function verifyCompressedProvenance(proof,old,fresh,packedBytes,original,indexBytes){
 verifySourceManifest(fresh,original);
 const packed=JSON.parse(packedBytes);
 assert.equal(proof.version,1,'Unsupported compressed provenance');
 assert.equal(packed.release,old.release,'Packed release and manifest disagree');
 assert.equal(proof.packedRelease,old.release,'Packed provenance release mismatch');
 assert.equal(proof.packedManifestSha256,sha256(packedBytes),'Packed resource manifest changed: reseal rebuilt resources');
 assert.equal(proof.packIndexSha256,sha256(indexBytes),'Packed resource index changed: reseal rebuilt resources');
 assert.equal(proof.sourceRelease,old.sourceWebRelease,'Packed original source identity changed');
 assert.equal(proof.sourceRelease,original.release,'Original resource content changed: rebuild compressed resources first');
 assert.equal(sha256(JSON.stringify(proof.sources)),proof.sourceRelease,'Invalid sealed source records');
 assert.deepEqual(proof.sources,original.assets,'Original resource records changed: rebuild compressed resources first');
 assert.deepEqual(Object.keys(packed.assets).sort(),Object.keys(original.assets).sort(),'Resource IDs changed: rebuild compressed resources first');
 return packed;
}
