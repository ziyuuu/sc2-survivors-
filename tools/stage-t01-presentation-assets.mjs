import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBuildAssets} from './load-build-assets.mjs';
import {ASSETS} from '../src/assets/manifest.ts';
const base='reports/local/t01-20261024',active=JSON.parse(await fs.readFile(base+'/active-source.json','utf8')),file=active.out+'/'+active.manifest,manifest=JSON.parse(await fs.readFile(file,'utf8'));
const byId=new Map((await loadBuildAssets()).map(r=>[r.id,r])),changed=[];
for(const a of ASSETS.values()){
 if(a.status!=='available')continue;const r=byId.get(a.id);assert.ok(r,a.id);if(manifest.assets[r.id]?.sha256===r.packedSha256)continue;
 const bytes=await fs.readFile(r.packedFile);assert.equal(createHash('sha256').update(bytes).digest('hex'),r.packedSha256,r.id);
 const ext=path.extname(r.packedFile),url='assets/'+r.packedSha256+ext,source=path.resolve(active.out,url).replaceAll('\\','/');await fs.writeFile(source,bytes);
 manifest.assets[r.id]={url,bytes:bytes.length,sha256:r.packedSha256,mime:ext==='.wav'?'audio/wav':ext==='.ogg'?'audio/ogg':ext==='.png'?'image/png':ext==='.glb'?'model/gltf-binary':ext==='.webp'?'image/webp':'application/octet-stream'};
 if(!active.resources.some(a=>a.url===url))active.resources.push({url,bytes:bytes.length,sha256:r.packedSha256,source});changed.push(r.id);
}
const urls=new Set(Object.values(manifest.assets).map(a=>a.url));active.resources=active.resources.filter(a=>urls.has(a.url));active.assetCount=Object.keys(manifest.assets).length;
await fs.writeFile(file,JSON.stringify(manifest));await fs.writeFile(base+'/active-source.json',JSON.stringify(active,null,2));console.log(JSON.stringify({changed,assets:active.assetCount,resources:active.resources.length}));
