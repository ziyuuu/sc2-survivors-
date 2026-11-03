import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {sha256,PROVENANCE_FILE} from '../tools/compressed-resource-provenance.mjs';

const run=(tool,...args)=>execFileSync(process.execPath,['tools/'+tool,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'sc2-provenance-')),packed=root+'/packed',web=root+'/web';
 t.after(async()=>{const actual=await fs.realpath(root),tmp=await fs.realpath(os.tmpdir());assert.equal(path.dirname(actual),tmp);assert.ok(path.basename(actual).startsWith('sc2-provenance-'));await fs.rm(actual,{recursive:true,force:true});});
 await fs.mkdir(packed+'/assets',{recursive:true});await fs.mkdir(web+'/assets',{recursive:true});
 const row=(value,mime='model/gltf-binary')=>({url:'assets/'+sha256(value)+(mime==='image/png'?'.png':'.glb'),sha256:sha256(value),bytes:Buffer.byteLength(value),mime});
 const sources={model:row('original model'),texture:row('original image','image/png')},assets={model:row('compressed model'),texture:row('compressed image','image/png')};
 const original={version:1,release:sha256(JSON.stringify(sources)),assets:sources},target={version:1,release:'packed-baseline',assets};
 const write=(base,file,data)=>fs.writeFile(base+'/'+file,typeof data==='string'?data:JSON.stringify(data));
 const fresh={manifest:'original.json',release:original.release,appBuildId:'new-code',runSchema:26},old={manifest:'packed.json',release:target.release,appBuildId:'old-code',sourceWebRelease:original.release,runSchema:26};
 await write(web,'web-release.json',fresh);await write(packed,'web-release.json',old);await write(web,'original.json',original);await write(packed,'packed.json',target);
 await write(packed,'sites-pack-index.js','self.SC2_PACK_INDEX={};');await write(web,'index.html','<meta content="./original.json"><script type="module" src="./assets/entry.js"></script><link rel="stylesheet" href="./assets/style.css">');
 await write(web,'assets/entry.js','globalThis.modelHash="'+sources.model.sha256+'";');await write(web,'assets/style.css','body{}');
 for(const [dir,records,values]of [[web,sources,['original model','original image']],[packed,assets,['compressed model','compressed image']]])for(const [i,r]of Object.values(records).entries())await write(dir,r.url,values[i]);
 return {root,packed,web,original,target,fresh,old,write,seal:()=>run('seal-compressed-provenance.mjs',packed,web),update:()=>run('update-compressed-game.mjs',packed,web)};
}
test('a byte-verified original/compressed baseline permits code-only updates and legitimate model hash rebinding',async t=>{
 const f=await fixture(t);f.seal();const proof=f.packed+'/'+PROVENANCE_FILE;await fs.writeFile(proof,(await fs.readFile(proof,'utf8')).replaceAll('\n','\r\n'));f.seal();const output=JSON.parse(f.update());const code=gunzipSync(await fs.readFile(f.packed+'/'+output.entry)).toString();assert.ok(code.includes(f.target.assets.model.sha256));assert.ok(!code.includes(f.original.assets.model.sha256));
 const after=JSON.parse(await fs.readFile(f.packed+'/web-release.json'));assert.equal(after.appBuildId,'new-code');assert.equal(after.sourceWebRelease,f.original.release);assert.equal(after.release,f.target.release);
 const worker=await fs.readFile(f.packed+'/'+after.packedWorker);assert.equal(sha256(worker),after.packedWorkerSha256);assert.equal(after.packedWorker,'sites-sw.'+sha256(worker).slice(0,20)+'.js');assert.deepEqual(await fs.readFile(f.packed+'/sites-sw.js'),worker);
 const html=await fs.readFile(f.packed+'/index.html','utf8'),launcher=html.match(/src="\.\/([^\"]+\.js)"/)[1];assert((await fs.readFile(f.packed+'/'+launcher,'utf8')).includes(after.packedWorker));assert.equal(after.packedWorkerProtocol,1);f.update();
});
test('missing provenance rejects before any destination mutation',async t=>{
 const f=await fixture(t),before=await fs.readFile(f.packed+'/web-release.json');assert.throws(f.update,/Missing compressed resource provenance/);assert.deepEqual(await fs.readFile(f.packed+'/web-release.json'),before);assert.deepEqual(await fs.readdir(f.packed+'/assets'),Object.values(f.target.assets).map(r=>path.basename(r.url)).sort());
});
test('same IDs with changed original model or image content reject even when the fresh release is recalculated',async t=>{
 for(const id of ['model','texture']){const f=await fixture(t);f.seal();f.original.assets[id]={...f.original.assets[id],sha256:'a'.repeat(64)};f.original.release=sha256(JSON.stringify(f.original.assets));f.fresh.release=f.original.release;await f.write(f.web,'original.json',f.original);await f.write(f.web,'web-release.json',f.fresh);const before=await fs.readFile(f.packed+'/web-release.json');assert.throws(f.update,/Original resource content changed/);assert.throws(f.seal,/different\/unknown originals/);assert.deepEqual(await fs.readFile(f.packed+'/web-release.json'),before);}
});
test('forged source release, changed compressed variants and changed indexes cannot bypass the binding',async t=>{
 const f=await fixture(t);f.seal();const original=structuredClone(f.original);
 f.original.assets.model.sha256='f'.repeat(64);await f.write(f.web,'original.json',f.original);assert.throws(f.update,/Source resource content hash changed/);await f.write(f.web,'original.json',original);
 f.target.assets.model.variants={low:{...f.target.assets.model,sha256:'b'.repeat(64)}};await f.write(f.packed,'packed.json',f.target);assert.throws(f.update,/Packed resource manifest changed/);delete f.target.assets.model.variants;await f.write(f.packed,'packed.json',f.target);
 await f.write(f.packed,'sites-pack-index.js','self.SC2_PACK_INDEX={"unexpected":[]};');assert.throws(f.update,/Packed resource index changed/);
});
test('sealing verifies original and compressed bytes rather than trusting declarations',async t=>{
 for(const dir of ['web','packed']){const f=await fixture(t),row=dir==='web'?f.original.assets.model:f.target.assets.model;await f.write(f[dir],row.url,'wrong bytes');assert.throws(f.seal);await assert.rejects(fs.stat(f.packed+'/'+PROVENANCE_FILE),{code:'ENOENT'});}
});
