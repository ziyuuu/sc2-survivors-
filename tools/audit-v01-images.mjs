import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const base='reports/local/v01-20261024',build=JSON.parse(await fs.readFile(base+'/web-game-r1-build.json')),manifest=JSON.parse(await fs.readFile(build.out+'/'+build.manifest)),files=new Map(build.resources.map(r=>[r.sha256,r.source])),models=[],groups=new Map();
for(const [id,a] of Object.entries(manifest.assets)){
 if(!id.startsWith('model.')||!a.url.endsWith('.glb'))continue;
 const b=await fs.readFile(files.get(a.sha256)),length=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+length).toString('utf8')),binStart=20+length+8,images=[];
 for(const [i,image]of (j.images??[]).entries()){
  if(image.bufferView===undefined)continue;const v=j.bufferViews[image.bufferView],bytes=b.subarray(binStart+(v.byteOffset??0),binStart+(v.byteOffset??0)+v.byteLength),hash=createHash('sha256').update(bytes).digest('hex'),row={model:id,index:i,bytes:bytes.length,mime:image.mimeType,hash};images.push(row);const all=groups.get(hash)??[];all.push(row);groups.set(hash,all);
 }
 models.push({id,glbSha:a.sha256,images});
}
const duplicate=[...groups].filter(([,r])=>new Set(r.map(x=>x.model)).size>1).map(([hash,r])=>({hash,count:r.length,encodedBytes:r[0].bytes,potentialDuplicateBytes:r[0].bytes*(r.length-1),models:r.map(x=>x.model)})).sort((a,b)=>b.potentialDuplicateBytes-a.potentialDuplicateBytes);
const report={scope:'Read-only exact encoded embedded-image SHA inventory. Duplicate bytes do not prove GPU reuse or performance benefit.',models:models.length,totalImages:models.reduce((n,m)=>n+m.images.length,0),uniqueImages:groups.size,duplicateGroups:duplicate.length,potentialDuplicateEncodedBytes:duplicate.reduce((n,g)=>n+g.potentialDuplicateBytes,0),duplicates:duplicate,rows:models};
await fs.writeFile(base+'/embedded-image-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,duplicates:duplicate.slice(0,6),rows:undefined},null,2));
