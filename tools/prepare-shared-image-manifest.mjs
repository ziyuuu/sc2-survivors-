/** Add verified image identities; do not re-encode or modify any resource bytes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function embeddedImages(bytes){
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length)),start=28+length;
 assert.equal(bytes.toString('ascii',24+length,28+length),'BIN\0');
 return (json.images??[]).map(image=>{if(image.bufferView===undefined)return null;const view=json.bufferViews[image.bufferView];assert.equal(view.buffer??0,0);const data=bytes.subarray(start+(view.byteOffset??0),start+(view.byteOffset??0)+view.byteLength);assert.equal(data.length,view.byteLength);return {hash:sha(data),mime:image.mimeType};});
}
export function imageFamilies(high,medium,low){
 assert.equal(high.length,medium.length);assert.equal(high.length,low.length);
 return high.map((_,index)=>sha(JSON.stringify([high[index],medium[index],low[index]])));
}
export async function prepareImageManifest(root){
 const release=JSON.parse(await fs.readFile(root+'/web-release.json','utf8')),oldName=release.manifest,manifest=JSON.parse(await fs.readFile(root+'/'+oldName,'utf8'));
 const index=JSON.parse((await fs.readFile(root+'/sites-pack-index.js','utf8')).replace(/^self.SC2_PACK_INDEX=/,'').replace(/;\s*$/,'')),images=new Map(),packs=new Map();let models=0;
 async function inspect(row){
  if(images.has(row.sha256))return images.get(row.sha256);
  const [name,offset,length,,compressed]=index[row.url];let pack=packs.get(name);if(!pack){pack=await fs.readFile(root+'/assets/'+name);packs.set(name,pack);if(packs.size>4)packs.delete(packs.keys().next().value);}
  let bytes=pack.subarray(offset,offset+length);if(compressed)bytes=gunzipSync(bytes);
  assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);const result=embeddedImages(bytes);images.set(row.sha256,result);models++;return result;
 }
 for(const row of Object.values(manifest.assets)){
  if(row.mime!=='model/gltf-binary')continue;
  const rows=[row,row.variants?.medium??row,row.variants?.low??row],sources=[];for(const r of rows)sources.push(await inspect(r));
  const families=imageFamilies(...sources);
  for(let tier=0;tier<rows.length;tier++)rows[tier].imageSources=sources[tier].map((image,i)=>image?{...image,family:families[i]}:null);
 }
 const nextRelease=sha(JSON.stringify(manifest.assets)),name=`asset-manifest.${nextRelease}.json`;
 manifest.release=nextRelease;release.release=nextRelease;release.manifest=name;release.sharedImageIdentities=1;
 await fs.writeFile(root+'/'+name,JSON.stringify(manifest));
 await fs.writeFile(root+'/index.html',(await fs.readFile(root+'/index.html','utf8')).replace(oldName,name));
 await fs.writeFile(root+'/web-release.json',JSON.stringify(release,null,2)+'\n');
 const report={models,images:[...images.values()].reduce((n,a)=>n+a.filter(Boolean).length,0),uniqueImagePayloads:new Set([...images.values()].flat().filter(Boolean).map(i=>i.hash)).size,release:nextRelease,manifest:name,resourceBytesChanged:0};
 console.log(JSON.stringify(report));return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert(process.argv[2],'Provide packed public directory');await prepareImageManifest(path.resolve(process.argv[2]));}
