import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='reports/local/performance-d04-complete-20261021';
const read=async p=>JSON.parse(await fs.readFile(p));
async function check(file,bytes,sha256){const h=createHash('sha256');let n=0;for await(const b of createReadStream(file)){h.update(b);n+=b.length;}assert.equal(n,bytes,file);assert.equal(h.digest('hex'),sha256,file);}
const sources=await read('reports/local/performance-a03-20261021/asset-files-r2.json');
let total=0;for(const [key,a]of Object.entries(sources)){assert.equal(key,a.sha256);await check(a.source,a.bytes,a.sha256);total+=a.bytes;}
const previous=await read('reports/local/disk-cleanup-d04-20261021/protected-before.json');
const oldQa=await read('reports/qa/performance-d04-20261021.json');
const sourceVerification=await read(root+'/verification.json');assert.equal(sourceVerification.pass,true);
const mutableFiles=[...sourceVerification.changed,'docs/project/PERFORMANCE_BOARD.html','docs/project/PERFORMANCE_TODO.md'];
const replacedLiveSources=oldQa.evidence.filter(f=>mutableFiles.includes(f.file));
const protectedFiles=[...new Map([...previous.filter(f=>f.path.startsWith('reports/local/performance-d04-20261021/')||f.path.startsWith('preview/performance-d04-20261021-')||f.path==='reports/qa/performance-d04-20261021.json'||f.path==='dist/SC2-Survivors-Current-20261006.html'),...oldQa.evidence.filter(f=>!mutableFiles.includes(f.file)).map(f=>({...f,path:f.file}))].map(f=>[f.path,f])).values()];
for(const f of protectedFiles)await check(f.path,f.bytes,f.sha256);
const result={pass:true,assetSources:{count:Object.keys(sources).length,bytes:total,manifest:'reports/local/performance-a03-20261021/asset-files-r2.json',method:'Independent streaming SHA-256 and byte-length readback of every shared unique source.'},protectedFiles:{count:protectedFiles.length,bytes:protectedFiles.reduce((s,f)=>s+f.bytes,0),scope:'Original D04 final/baseline Web and offline outputs, original QA evidence except explicitly replaced live sources/tests and generated board views, original QA summary and unchanged Current; prior cleanup protection snapshot and original QA hashes.',replacedLiveSources,files:protectedFiles}};
await fs.writeFile(root+'/asset-protection-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({pass:true,assets:result.assetSources,protectedCount:protectedFiles.length}));
