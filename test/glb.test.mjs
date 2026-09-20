import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectGlb } from '../tools/glb-inspect.mjs';
function mockGlb(extra = {}) {
  const text = JSON.stringify({asset:{version:'2.0'},meshes:[{primitives:[]}],...extra});
  const json = Buffer.from(text.padEnd(Math.ceil(Buffer.byteLength(text)/4)*4, ' '));
  const out = Buffer.alloc(20+json.length);out.write('glTF');out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
  out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);return out;
}
test('GLB inspector rejects downloaded HTML instead of treating it as a model',()=>assert.throws(()=>inspectGlb(Buffer.from('<html>bad gateway</html>'))));
test('GLB inspector rejects incorrect declared file length',()=>{const b=mockGlb();b.writeUInt32LE(0,8);assert.throws(()=>inspectGlb(b));});
test('GLB inspector rejects oversized chunk bounds',()=>{const b=mockGlb();b.writeUInt32LE(1000000,12);assert.throws(()=>inspectGlb(b));});
test('GLB inspector never auto-approves a model for production',()=>{const r=inspectGlb(mockGlb());assert.equal(r.runtimeApproved,false);assert.equal(r.visualIdentityVerified,false);assert.equal(r.blenderVerified,false);});
test('GLB inspector detects missing animation and materials',()=>{const r=inspectGlb(mockGlb());assert.equal(r.animatedTexturedCandidate,false);assert.equal(r.animationCount,0);});
test('GLB inspector reports unbundled texture dependencies',()=>{const r=inspectGlb(mockGlb({images:[{uri:'missing.png'}],animations:[{name:'Walk'}]}));assert.deepEqual(r.externalResources,['missing.png']);assert.equal(r.animatedTexturedCandidate,false);});
test('GLB inspector records a reproducible SHA-256',()=>{const b=mockGlb();assert.equal(inspectGlb(b).sha256,inspectGlb(b).sha256);assert.equal(inspectGlb(b).sha256.length,64);});
