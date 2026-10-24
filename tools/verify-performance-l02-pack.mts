import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {decode85} from '../reports/local/performance-u04-20261020/candidate-r2-web-inputs/src/assets/base85.mjs';
import {EmbeddedAssetStore,restoreEmbeddedContainerChunksAsync} from '../src/assets/offline-pack';
import {gunzipSync} from 'three/addons/libs/fflate.module.js';
const root='reports/local/performance-l02-20261020/pack-proof-'+(process.argv[2]??'1'),donor='dist/SC2-Survivors-Loot-Elites-R2-20261019.html';
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mts');
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),report:any={donor,chunks:[],assets:0,bytes:0,limits:'Every original chunk passes the final asynchronous parser and production EmbeddedAssetStore; decoded bytes match the original decoder. Unchanged part lists imply asset byte equality; no new runtime SHA check.'};
const variant=process.argv[3]??'candidate-r4',build=JSON.parse(await fs.readFile('preview/performance-l02-20261020-'+variant+'/build-inputs.json','utf8'));
for(const file of ['src/assets/base85.mjs','src/assets/offline-pack.ts'])assert.equal(hash(await fs.readFile(file)),build.inputs.find((i:any)=>i.file===file).sha256);
let buffer='',pack:any,started=false,ended=false;
for await(const input of createReadStream(donor,{encoding:'utf8',highWaterMark:1024*1024})){
 buffer+=input;
 if(!started){const index=buffer.indexOf('<script id="sc2-resource-pack"');if(index<0){buffer=buffer.slice(-64);continue;}buffer=buffer.slice(index);started=true;}
 for(;;){
  const end=buffer.indexOf('</script>');if(end<0)break;
  const tag=buffer.slice(0,buffer.indexOf('>')+1),payload=buffer.slice(tag.length,end);buffer=buffer.slice(end+9).trimStart();
  if(!pack){pack=JSON.parse(payload);report.assets=Object.keys(pack.assets).length;report.assetBytes=Object.values<any>(pack.assets).reduce((n,a)=>n+a.bytes,0);assert.equal(pack.container,'chunks-v1');}
  else if(tag.includes('data-sc2-resource-chunk')){
   const index=Number(tag.match(/data-sc2-resource-chunk="(\d+)"/)![1]),part=JSON.parse(payload),expected=pack.chunks[index];assert.ok(expected);assert.equal(expected.bytes,part.bytes);
   const stored=decode85(part.data,part.storedBytes),before=part.encoding==='gzip'?gunzipSync(stored):stored;
   const one:any={version:2,container:'chunks-v1',chunks:[{...part,data:''}],assets:{proof:{bytes:part.bytes,mime:'application/octet-stream',sha256:hash(before),parts:[0]}}};
   await restoreEmbeddedContainerChunksAsync(one,[{index:0,payload}]);const store=new EmbeddedAssetStore(one);await store.prepare(['proof']);const after=new Uint8Array(await(await fetch(store.urls.proof)).arrayBuffer());URL.revokeObjectURL(store.urls.proof);
   assert.equal(hash(before),hash(after),'chunk '+index);assert.equal(after.length,part.bytes);
   report.chunks.push({index,encoding:part.encoding,storedBytes:part.storedBytes,bytes:after.length,sha256:hash(after)});report.bytes+=after.length;
  }
  if(pack&&report.chunks.length===pack.chunks.length){ended=true;break;}
 }
 if(ended)break;
}
assert.ok(ended);assert.equal(new Set(report.chunks.map((c:any)=>c.index)).size,pack.chunks.length);
report.pass=true;await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:true,chunks:report.chunks.length,assets:report.assets,bytes:report.bytes,assetBytes:report.assetBytes}));
