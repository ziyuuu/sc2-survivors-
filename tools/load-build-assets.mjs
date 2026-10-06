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
 const ui=JSON.parse(await fs.readFile('deploy/runtime/ui-assets.json','utf8'));
 if(ui.version!==1||createHash('sha256').update((await fs.readFile('src/assets/ui-art.generated.ts','utf8')).replace(/\r\n/g,'\n')).digest('hex')!==ui.generatedSha256)throw Error('UI registry differs');
 for(const r of ui.records){
  if(byId.has(r.id)||!r.id.startsWith('ui.paint.')&&!r.id.startsWith('ui.cover.'))throw Error('Invalid UI identity: '+r.id);
  byId.set(r.id,r);
  for(const file of [r.sourceFile,r.gitPath,r.packedFile]){
   const bytes=await fs.readFile(file),pointer=file===r.sourceFile&&bytes.length<256?bytes.toString('utf8').match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize (\d+)\r?\n?$/):null;
   const matches=pointer?pointer[1]===r.packedSha256&&Number(pointer[2])===r.bytes:bytes.length===r.bytes&&createHash('sha256').update(bytes).digest('hex')===r.packedSha256;
   if(!matches||r.sourceSha256!==r.packedSha256)throw Error('UI resource changed: '+file);
  }
 }
 return [...metadata.records,...ui.records];
}
