import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import assert from 'node:assert/strict';
const mode=process.argv[2],variant=process.argv[3];
assert.ok(['verify','restore'].includes(mode));assert.match(variant,/^r[0-9]+$/);
const root=path.resolve('reports/local/performance-d04-complete-20261021/offline-'+variant),binding=JSON.parse(await fs.readFile(root+'/build-inputs.json'));
const target=path.resolve(binding.html.file);assert.ok(target.startsWith(root+path.sep));
async function* chunks(){yield gunzipSync(await fs.readFile(binding.reconstruction.prefix));yield* createReadStream(binding.source.file,{start:binding.source.payloadStart,end:binding.source.payloadEndExclusive-1});yield gunzipSync(await fs.readFile(binding.reconstruction.suffix));}
async function verify(handle){const h=createHash('sha256');let size=0;for await(const chunk of chunks()){h.update(chunk);size+=chunk.length;if(handle)await handle.writeFile(chunk);}assert.equal(size,binding.html.bytes);assert.equal(h.digest('hex'),binding.html.sha256);}
await verify();if(mode==='restore'){const handle=await fs.open(target,'wx');try{await verify(handle);}finally{await handle.close();}}
console.log(JSON.stringify({mode,file:target,sha256:binding.html.sha256,pass:true}));
