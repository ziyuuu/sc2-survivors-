/** Copy the verified game entry and explicit GPU sidecars into the existing Site.
 * Existing bundles/backend/storage configuration remain intact. Test entries are
 * deliberately excluded. gpu-textures-* ships as static content, not R2 routes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [input,site,report]=process.argv.slice(2),destination=path.join(site,'public');
assert(input&&site&&report,'Provide candidate public, existing Site, and report');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const release=await read(input+'/web-release.json'),before=await read(destination+'/web-release.json');
const manifest=await read(input+'/'+release.manifest),html=await fs.readFile(input+'/index.html','utf8');
const indexData=await fs.readFile(input+'/sites-pack-index.js'),index=JSON.parse(indexData.toString().replace(/^self.SC2_PACK_INDEX=/,'').replace(/;\s*$/,''));
const files=new Set(['index.html','web-release.json',release.manifest,'sites-sw.js','sites-pack-index.js','sites-pack-index.'+sha(indexData).slice(0,20)+'.js','assets/sc2-entry.'+release.compressedEntrySha256.slice(0,16)+'.js.gz','basis/basis_transcoder.js','basis/basis_transcoder.wasm','basis/README.md','basis/LICENSE.txt']);
for(const match of html.matchAll(/(?:src|href)="\.\/(assets\/(?:index-)[^"]+\.(?:js|css))"/g))files.add(match[1]);
for(const record of Object.values(manifest.gpuTextures??{})){
 const row=index[record.url];assert(row&&/^gpu-textures-[a-f0-9]{20}\.bin$/.test(row[0]));
 const pack=await fs.readFile(input+'/assets/'+row[0]),data=pack.subarray(row[1],row[1]+row[2]);
 assert.equal(sha(data),record.sha256);assert.equal(data.length,record.bytes);files.add('assets/'+row[0]);
}
const copied=[];
for(const name of files){assert(!name.includes('..')&&!path.isAbsolute(name));const data=await fs.readFile(path.join(input,name));await fs.mkdir(path.dirname(path.join(destination,name)),{recursive:true});await fs.writeFile(path.join(destination,name),data);copied.push({name,bytes:data.length,sha256:sha(data)});}
// Every encoded resource still has its bundle in this source checkout.
for(const bundle of new Set(Object.values(index).map(row=>row[0])))await fs.access(path.join(destination,'assets',bundle));
await fs.writeFile(report,JSON.stringify({beforeBuild:before.appBuildId,appBuildId:release.appBuildId,resourceRelease:release.release,files:copied},null,2));
console.log(JSON.stringify({files:copied.length,bytes:copied.reduce((n,f)=>n+f.bytes,0),appBuildId:release.appBuildId}));
