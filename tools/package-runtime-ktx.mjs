import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=process.argv[2],input=process.argv[3],sha=b=>createHash('sha256').update(b).digest('hex');
const release=JSON.parse(await fs.readFile(root+'/web-release.json','utf8')),old=release.manifest,manifest=JSON.parse(await fs.readFile(root+'/'+old,'utf8'));
const index=JSON.parse((await fs.readFile(root+'/sites-pack-index.js','utf8')).replace(/^self.SC2_PACK_INDEX=/,'').replace(/;\s*$/,''));
const samples=JSON.parse(await fs.readFile(input+'/samples.json','utf8'));manifest.gpuTextures={};let records=[],bytes=0,total=0;const bundles=[];
async function flush(){if(!records.length)return;const raw=Buffer.concat(records.map(r=>r.data)),name='gpu-textures-'+sha(raw).slice(0,20)+'.bin';await fs.writeFile(root+'/assets/'+name,raw);let offset=0;
 for(const r of records){index[r.row.url]=[name,offset,r.data.length,'image/ktx2',false];r.row.bundle=name;offset+=r.data.length;}
 bundles.push({name,bytes:raw.length,sha256:sha(raw)});records=[];bytes=0;
}
for(const s of samples){const data=await fs.readFile(input+'/'+s.name+'.ktx2');assert.equal(data.subarray(0,12).toString('hex'),'ab4b5458203230bb0d0a1a0a');assert.equal(data.readUInt32LE(20),s.width);assert.equal(data.readUInt32LE(24),s.height);
 const hash=sha(data),row={url:'assets/'+hash+'.ktx2',bytes:data.length,sha256:hash,mime:'image/ktx2',width:s.width,height:s.height};
 manifest.gpuTextures[s.sourceHash]=row;if(bytes+data.length>2*1024**2)await flush();records.push({row,data});bytes+=data.length;total+=data.length;
}
await flush();manifest.release=sha(JSON.stringify({assets:manifest.assets,gpuTextures:manifest.gpuTextures}));const name='asset-manifest.'+manifest.release+'.json';
await fs.writeFile(root+'/'+name,JSON.stringify(manifest));await fs.writeFile(root+'/sites-pack-index.js','self.SC2_PACK_INDEX='+JSON.stringify(index)+';');
await fs.writeFile(root+'/index.html',(await fs.readFile(root+'/index.html','utf8')).replace(old,name));
const prior=release.gpuTextureSidecars??{count:0,bytes:0};
Object.assign(release,{manifest:name,release:manifest.release,gpuTextureSidecars:{count:samples.length,bytes:total,source:'tier-invariant normal/specular; UASTC level3; same dimensions'},fileCount:release.fileCount-prior.count+samples.length,assetBytes:release.assetBytes-prior.bytes+total,logicalBytes:release.logicalBytes-prior.bytes+total,packedBytes:release.packedBytes-prior.bytes+total});
await fs.writeFile(root+'/web-release.json',JSON.stringify(release,null,2)+'\n');await fs.writeFile(input+'/package.json',JSON.stringify({release:manifest.release,count:samples.length,total,bundles},null,2));console.log(JSON.stringify({count:samples.length,total,bundles:bundles.length,release:manifest.release}));
