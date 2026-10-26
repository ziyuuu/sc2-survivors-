import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='reports/local/t01-20261024',active=JSON.parse(await fs.readFile(base+'/active-source.json','utf8')),file=active.out+'/'+active.manifest,manifest=JSON.parse(await fs.readFile(file,'utf8'));
const registry={records:[...JSON.parse(await fs.readFile('deploy/runtime/combat-effects.json','utf8')).records,...JSON.parse(await fs.readFile('deploy/runtime/combat-audio.json','utf8')).records]},added=[],removed=[];
const currentIds=new Set(registry.records.map(r=>r.id)),removedUrls=new Set();
for(const[id,a]of Object.entries(manifest.assets))if(id.startsWith('audio.sc2.source.')&&!currentIds.has(id)){delete manifest.assets[id];removed.push(id);removedUrls.add(a.url);}
const retainedUrls=new Set(Object.values(manifest.assets).map(a=>a.url));
for(const url of removedUrls)if(!retainedUrls.has(url)){
 const target=path.resolve(active.out,url);assert.ok(target.startsWith(path.resolve(active.out)+path.sep));
 // Only retired generated audio, never the original source recordings.
 const resource=active.resources.find(r=>r.url===url);if(resource){assert.equal(createHash('sha256').update(await fs.readFile(target)).digest('hex'),resource.sha256,target);await fs.unlink(target);}
 active.resources=active.resources.filter(r=>r.url!==url);
}
for(const r of registry.records){
 const old=manifest.assets[r.id];if(old){assert.equal(old.sha256,r.packedSha256,r.id);continue;}
 const bytes=await fs.readFile(r.gitPath);assert.equal(createHash('sha256').update(bytes).digest('hex'),r.packedSha256,r.id);
 const ext=path.extname(r.gitPath),url='assets/'+r.packedSha256+ext,source=path.resolve(active.out,url).replaceAll('\\','/');
 await fs.writeFile(source,bytes);manifest.assets[r.id]={url,bytes:bytes.length,sha256:r.packedSha256,mime:ext==='.wav'?'audio/wav':ext==='.ogg'?'audio/ogg':ext==='.png'?'image/png':'model/gltf-binary'};
 if(!active.resources.some(a=>a.url===url))active.resources.push({url,bytes:bytes.length,sha256:r.packedSha256,source});added.push(r.id);
}
active.assetCount=Object.keys(manifest.assets).length;
await fs.writeFile(file,JSON.stringify(manifest));await fs.writeFile(base+'/active-source.json',JSON.stringify(active,null,2));console.log(JSON.stringify({added,removed,assets:active.assetCount,resources:active.resources.length}));
