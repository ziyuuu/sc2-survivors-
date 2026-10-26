import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createAssetPack} from './offline-pack.mjs';

const base='reports/local/t01-20261024',run=process.argv[2];assert.match(run,/^offline-r\d+$/);
const root=base+'/'+run,build=JSON.parse(await fs.readFile(process.argv[3]??base+'/build.json','utf8'));
const externalBase='C:/Users/zyuu/.codex/visualizations/2026/09/20/01a0bf9c-1981-7eb3-8a7e-55c9fd6884c9/t01-evidence';
if(process.argv[4])assert.equal(path.resolve(process.argv[4]),path.resolve(externalBase));
const outputParent=process.argv[4]??base,outputRoot=process.argv[4]?path.join(outputParent,run):root;
const activeSource=JSON.parse(await fs.readFile(base+'/active-source.json','utf8')),donorReport=activeSource.offlineDonor;
const donor=donorReport.out,sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await fs.readFile(build.out+'/asset-manifest.json','utf8'));
const modes=build.artifacts.some(a=>a.file==='combined.html')?['combined']:['dynamic','static'];
const disk=await fs.statfs(outputParent),needed=(await fs.stat(donor)).size*modes.length+100000000;
assert.ok(disk.bavail*disk.bsize>needed,'Insufficient space for complete offline document');
await fs.mkdir(root,{recursive:false});
if(outputRoot!==root)await fs.mkdir(outputRoot,{recursive:false});
for(const file of build.artifacts)assert.equal(sha(await fs.readFile(build.out+'/'+file.file)),file.sha256,file.file);
const report={scope:'One isolated T01 inspection HTML for the user: dynamic and static/UI modes share the complete verified embedded assets. Packing alone is not visual or offline acceptance.',sourceBuild:build,outputRoot,donor:{file:donor,sha256:donorReport.htmlSha256},artifacts:[],offlineVerified:false};
for(const mode of modes){
 const out=path.join(outputRoot,mode==='combined'?'T01-综合检测.html':mode+'.html'),html=await fs.readFile(build.out+'/'+mode+'.html','utf8'),js=await fs.readFile(build.out+'/'+mode+'.js','utf8'),css=await fs.readFile(build.out+'/'+mode+'.css','utf8');
 const prepared=html.replace(/<meta name="sc2-asset-manifest"[^>]*>/,'').replace(`<link rel="stylesheet" href="./${mode}.css">`,'<style>'+css.replace(/<\/style/gi,'<\\/style')+'</style>').replace(`<script src="./${mode}.js"></script>`,'');
 assert.ok(!prepared.includes('sc2-asset-manifest'));const bodyEnd=prepared.lastIndexOf('</body>');assert.ok(bodyEnd>0);
 const handle=await fs.open(out,'wx'),hash=createHash('sha256'),payloadHash=createHash('sha256');let bytes=0,payloadBytes=0,metadata,extraChunks=[],buffer='',started=false,closed=false;
 const write=async value=>{const b=Buffer.from(value);await handle.writeFile(b);hash.update(b);bytes+=b.length;};
 try{
  await write(prepared.slice(0,bodyEnd));
  for await(const chunk of createReadStream(donor,{encoding:'utf8',highWaterMark:1048576})){
   buffer+=chunk;
   if(!started){const start=buffer.indexOf('<script id="sc2-resource-pack"');if(start<0){buffer=buffer.slice(-64);continue;}buffer=buffer.slice(start);const end=buffer.indexOf('</script>');if(end<0)continue;metadata=JSON.parse(buffer.slice(buffer.indexOf('>')+1,end));for(const[id,a]of Object.entries(metadata.assets)){if(a.sha256!==manifest.assets[id]?.sha256||a.bytes!==manifest.assets[id]?.bytes)delete metadata.assets[id];}
    const additions=[];for(const[id,a]of Object.entries(manifest.assets))if(!metadata.assets[id]){const resource=build.resources.find(r=>r.url===a.url);assert.ok(resource,id);const bytes=await fs.readFile(resource.source);assert.equal(sha(bytes),a.sha256,id);additions.push({id,mime:a.mime,bytes});}
    if(additions.length){const {pack}=createAssetPack(additions),offset=metadata.chunks.length;extraChunks=pack.chunks.map((chunk,i)=>({index:offset+i,chunk}));for(const[id,a]of Object.entries(pack.assets))metadata.assets[id]={...a,parts:a.parts.map(n=>n+offset)};metadata.chunks.push(...pack.chunks.map(({data,...m})=>({...m,data:''})));buffer=buffer.slice(0,buffer.indexOf('>')+1)+JSON.stringify(metadata)+buffer.slice(end);}
    assert.equal(Object.keys(metadata.assets).length,build.assetCount);started=true;}
   const end=buffer.indexOf('<script>'),part=end>=0?buffer.slice(0,end):buffer.slice(0,-64);
   if(part){await write(part);payloadHash.update(part);payloadBytes+=Buffer.byteLength(part);}
   if(end>=0){closed=true;break;}buffer=buffer.slice(-64);
  }
  assert.ok(started&&closed);for(const {index,chunk}of extraChunks){const part=`<script type="application/json" data-sc2-resource-chunk="${index}">${JSON.stringify(chunk)}</script>`;await write(part);payloadHash.update(part);payloadBytes+=Buffer.byteLength(part);}await write('<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script>'+prepared.slice(bodyEnd));
 }finally{await handle.close();}
 report.artifacts.push({mode,file:out,bytes,sha256:hash.digest('hex'),jsSha256:sha(js),cssSha256:sha(css),payloadSha256:payloadHash.digest('hex'),payloadBytes,assets:Object.keys(metadata.assets).length,chunks:metadata.chunks.length});
 console.log(JSON.stringify({mode,bytes,assets:Object.keys(metadata.assets).length}));
}
const donorHash=createHash('sha256');for await(const bytes of createReadStream(donor))donorHash.update(bytes);assert.equal(donorHash.digest('hex'),donorReport.htmlSha256);
await fs.writeFile(root+'/build.json',JSON.stringify(report,null,2));
if(report.artifacts.length===1){activeSource.offlineDonor={out:report.artifacts[0].file,htmlSha256:report.artifacts[0].sha256};await fs.writeFile(base+'/active-source.json',JSON.stringify(activeSource,null,2));}
