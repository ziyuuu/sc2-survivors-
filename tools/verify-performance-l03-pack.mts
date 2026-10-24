import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {EmbeddedAssetStore,type AssetPack} from '../src/assets/offline-pack';
const rep=process.argv[2]??'1',root='reports/local/performance-l03-20261020/pack-proof-'+rep,donor='dist/SC2-Survivors-Loot-Elites-R2-20261019.html';
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mts');
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),report:any={donor,scope:'Every original asset passes production on-demand SHA verification; independently read back and rehashed. Test URLs are revoked only after checking, outside gameplay. No change to input bytes, ordering or packing.',assets:[],batches:[]};
let buffer='',pack:AssetPack|undefined,started=false,ended=false,count=0;
const startedAt=performance.now();
for await(const input of createReadStream(donor,{encoding:'utf8',highWaterMark:1024*1024})){
 buffer+=input;
 if(!started){const index=buffer.indexOf('<script id="sc2-resource-pack"');if(index<0){buffer=buffer.slice(-64);continue;}buffer=buffer.slice(index);started=true;}
 for(;;){
  const end=buffer.indexOf('</script>');if(end<0)break;
  const tag=buffer.slice(0,buffer.indexOf('>')+1),payload=buffer.slice(tag.length,end);buffer=buffer.slice(end+9).trimStart();
  if(!pack){pack=JSON.parse(payload);assert.equal(pack!.container,'chunks-v1');}
  else if(tag.includes('data-sc2-resource-chunk')){
   const index=Number(tag.match(/data-sc2-resource-chunk="(\d+)"/)![1]),chunk=JSON.parse(payload),expected=pack.chunks[index];assert.ok(expected);
   for(const key of ['encoding','bytes','storedBytes']as const)assert.equal(chunk[key],expected[key]);pack.chunks[index]=chunk;count++;
  }
  if(pack&&count===pack.chunks.length){ended=true;break;}
 }
 if(ended)break;
}
assert.ok(pack&&ended);buffer='';
const store=new EmbeddedAssetStore(pack!),ids=Object.keys(pack!.assets);
report.manifest={ids:ids.length,chunks:pack!.chunks.length,logicalBytes:Object.values(pack!.assets).reduce((n,a)=>n+a.bytes,0),uniqueChunkBytes:pack!.chunks.reduce((n,c)=>n+c.bytes,0),largestAssetBytes:Math.max(...Object.values(pack!.assets).map(a=>a.bytes))};
for(let i=0;i<ids.length;i+=64){
 const batch=ids.slice(i,i+64),start=performance.now();await store.prepare(batch);const prepareMs=performance.now()-start;
 for(const id of batch){const bytes=new Uint8Array(await(await fetch(store.urls[id])).arrayBuffer());assert.equal(hash(bytes),pack!.assets[id].sha256,id);assert.equal(bytes.length,pack!.assets[id].bytes,id);report.assets.push({id,bytes:bytes.length,sha256:hash(bytes)});URL.revokeObjectURL(store.urls[id]);}
 report.batches.push({first:i,count:batch.length,prepareMs});console.log(JSON.stringify({checked:report.assets.length,total:ids.length,prepareMs}));
}
assert.equal(store.preparedCount,ids.length);report.remainingEncodedChunks=(store as any).encodedChunks.filter((c:unknown)=>c!==null).length;assert.equal(report.remainingEncodedChunks,0);
report.ms=performance.now()-startedAt;report.pass=true;await fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:true,...report.manifest,ms:report.ms}));
