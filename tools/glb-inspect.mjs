/** Structural checks only, NOT a rendering, identity, license, or Khronos conformance test. */
import { createHash } from 'node:crypto';
export function inspectGlb(input) {
  const b = Buffer.from(input);
  if (b.length < 20 || b.toString('ascii', 0, 4) !== 'glTF') throw new Error('Not a GLB file');
  if (b.readUInt32LE(4) !== 2) throw new Error('GLB version must be 2');
  if (b.readUInt32LE(8) !== b.length) throw new Error('GLB declared length does not match bytes');
  let offset = 12, doc = null, binBytes = 0;
  while (offset < b.length) {
    if (offset + 8 > b.length) throw new Error('Truncated chunk header');
    const length = b.readUInt32LE(offset), type = b.readUInt32LE(offset + 4);
    if (length % 4 || offset + 8 + length > b.length) throw new Error('Invalid chunk bounds or alignment');
    const payload = b.subarray(offset + 8, offset + 8 + length);
    if (offset === 12 && type !== 0x4e4f534a) throw new Error('First chunk must be JSON');
    if (type === 0x4e4f534a) {
      if (doc) throw new Error('Duplicate JSON chunk');
      doc = JSON.parse(payload.toString('utf8').trim());
    } else if (type === 0x004e4942) binBytes += length;
    offset += 8 + length;
  }
  if (!doc || doc.asset?.version !== '2.0') throw new Error('Missing glTF 2.0 document');
  if (!doc.meshes?.length) throw new Error('No model meshes');
  const externalResources = [...(doc.buffers ?? []), ...(doc.images ?? [])]
    .flatMap(x => x.uri && !x.uri.startsWith('data:') ? [x.uri] : []);
  const animationNames = (doc.animations ?? []).map((a, i) => a.name || `unnamed_${i}`);
  const geometryBytes = (doc.buffers ?? []).filter(x => !x.uri).reduce((sum, x) => sum + x.byteLength, 0);
  if (geometryBytes > binBytes) throw new Error('Embedded buffer length exceeds binary chunk');
  return {
    bytes: b.length, sha256: createHash('sha256').update(b).digest('hex'),
    meshCount: doc.meshes.length, materialCount: doc.materials?.length ?? 0,
    imageCount: doc.images?.length ?? 0, skinCount: doc.skins?.length ?? 0,
    animationCount: animationNames.length, animationNames, externalResources,
    requiredExtensions: doc.extensionsRequired ?? [], structuralCheckPassed: true,
    animatedTexturedCandidate: animationNames.length > 0 && (doc.images?.length ?? 0) > 0 && !externalResources.length,
    runtimeApproved: false, visualIdentityVerified: false, blenderVerified: false,
  };
}
