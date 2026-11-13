import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
/** Incremental source-verified models, separate from the retained core bundle. */
export async function loadArmedSupportAssets({restore=false,check=false}={}){
 const manifest=JSON.parse(await fs.readFile('deploy/runtime/armed-support-assets.json','utf8'));
 if(manifest.version!==1||new Set(manifest.records.map(r=>r.id)).size!==manifest.records.length)throw Error('Invalid armed asset manifest');
 if(createHash('sha256').update((await fs.readFile('src/assets/armed-support.ts','utf8')).replace(/\r\n/g,'\n')).digest('hex')!==manifest.generatedSha256)throw Error('Armed registry changed');
 for(const row of manifest.records){
  if(row.kind!=='model'||row.status!=='available'||!row.sourcePath||!row.sourceBuild||!/^[a-f0-9]{64}$/.test(row.sourceSha256)||!row.packedFile.startsWith('public/assets/')||row.packedFile.includes('..')||row.url!==row.packedFile.slice(7))throw Error('Invalid armed source identity '+row.id);
  if(row.gitPath!=='deploy/runtime/assets/'+row.packedSha256+'.glb')throw Error('Invalid armed Git resource '+row.id);
  const source=await fs.readFile(row.gitPath);if(source.length!==row.bytes||createHash('sha256').update(source).digest('hex')!==row.packedSha256)throw Error('Armed immutable source changed '+row.id);
  let bytes=await fs.readFile(row.packedFile).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  if(!bytes){if(!restore||check)throw Error('Armed runtime model missing '+row.id);await fs.mkdir(path.dirname(row.packedFile),{recursive:true});await fs.writeFile(row.packedFile,source);bytes=source;}
  if(bytes.length!==row.bytes||createHash('sha256').update(bytes).digest('hex')!==row.packedSha256||!row.animations.length)throw Error('Armed model changed '+row.id);
 }
 return manifest.records;
}
