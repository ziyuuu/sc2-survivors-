import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

/** Build from the locked runtime files, without reviving obsolete conversion caches. */
export async function loadBuildAssets(){
 const catalog=JSON.parse(await fs.readFile('deploy/runtime/source-assets.json','utf8'));
 const metadata=JSON.parse(await fs.readFile('deploy/runtime/build-assets.json','utf8'));
 if(metadata.version!==1||metadata.records.length!==catalog.entries.length)throw Error('Build asset metadata differs from runtime catalog');
 const byId=new Map(metadata.records.map(r=>[r.id,r])),verified=new Set();
 if(byId.size!==metadata.records.length)throw Error('Duplicate build asset ID');
 for(const row of catalog.entries){
  const r=byId.get(row.runtime.id);
  if(!r||r.packedFile!==row.packedFile||r.bytes!==row.bytes||r.packedSha256!==row.sha256||Object.entries(row.runtime).some(([key,value])=>JSON.stringify(r[key])!==JSON.stringify(value)))throw Error('Build asset identity differs: '+row.runtime.id);
  if(verified.has(r.packedFile))continue;
  const bytes=await fs.readFile(r.packedFile);
  if(bytes.length!==row.bytes||createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('Build resource missing or changed: '+r.packedFile);
  verified.add(r.packedFile);
 }
 return metadata.records;
}
