import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root=process.cwd();
const release=JSON.parse(await fs.readFile('reports/local/asset-reachability.json','utf8'));
const runtime=JSON.parse(await fs.readFile('reports/local/runtime-assets.json','utf8'));
if(release.rulesId!=='mvp-1.0'||release.mapId!=='kairos')throw Error('WeChat asset closure has wrong rules or map');
const byId=new Map(runtime.map(row=>[row.id,row]));
const rows=new Map(release.rows.map(row=>[row.id,row]));
if(rows.size!==release.selectedIds.length)throw Error('Duplicate WeChat release ID');
const assets={};let totalBytes=0;
for(const id of release.selectedIds){
 const row=rows.get(id),entry=byId.get(id);
 if(!row||!entry||entry.status!=='available'||entry.packedFile!==row.packedFile||!/^assets\/[A-Za-z0-9._/-]+$/.test(entry.url)||entry.url.split('/').includes('..'))throw Error('Invalid release asset: '+id);
 const publicFile=path.resolve(root,row.packedFile),publicDir=path.resolve(root,'public');
 if(!publicFile.startsWith(publicDir+path.sep))throw Error('Asset escapes public directory: '+id);
 // A portable handoff contains the exact released CDN assets, without the
 // larger conversion sources in public/assets or private SC extraction data.
 const releaseDir=path.resolve(root,'dist/web'),releaseFile=path.resolve(releaseDir,entry.url);
 if(!releaseFile.startsWith(releaseDir+path.sep))throw Error('Asset escapes release directory: '+id);
 const file=await fs.access(publicFile).then(()=>publicFile,()=>releaseFile);
 const bytes=await fs.readFile(file),sha256=createHash('sha256').update(bytes).digest('hex');
 if(bytes.length!==row.bytes||sha256!==row.sha256)throw Error('Changed or missing release asset: '+id);
 assets[id]={path:entry.url,bytes:row.bytes,sha256,kind:row.kind};totalBytes+=row.bytes;
}
const payload={schema:1,rulesId:release.rulesId,mapId:release.mapId,assetCount:release.selectedIds.length,totalBytes,assets};
const out=path.resolve(root,'dist/wechat/asset-manifest.json');
await fs.mkdir(path.dirname(out),{recursive:true});
await fs.writeFile(out,JSON.stringify(payload));
console.log(`WeChat asset manifest: ${out}; ${payload.assetCount} assets, ${totalBytes} verified source bytes, ${Buffer.byteLength(JSON.stringify(payload))} manifest bytes.`);
