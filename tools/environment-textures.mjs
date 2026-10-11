import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
/** Original environment additions have their own immutable-source registry. */
export async function loadEnvironmentTextures({restore=false,check=false}={}){
 const catalog=JSON.parse(await fs.readFile('deploy/runtime/environment-textures.json','utf8'));
 if(catalog.version!==1||new Set(catalog.records.map(r=>r.id)).size!==catalog.records.length)throw Error('Invalid environment registry');
 if(hash((await fs.readFile('src/assets/environment-textures.ts','utf8')).replace(/\r\n/g,'\n'))!==catalog.generatedSha256)throw Error('Environment registry checksum differs');
 for(const r of catalog.records){
  if(!/^terrain\.visual\.[a-z0-9-]+$/.test(r.id)||r.gitPath!==`deploy/runtime/assets/${r.packedSha256}.png`||r.packedFile!==`public/${r.url}`||r.url!==`assets/environment/${r.id}.png`)throw Error('Invalid environment asset path');
  const original=await fs.readFile(r.gitPath);if(original.length!==r.bytes||hash(original)!==r.packedSha256)throw Error('Environment resource changed: '+r.id);
  const current=await fs.readFile(r.packedFile).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  if(current&&hash(current)!==r.packedSha256)throw Error('Preserving changed environment resource: '+r.id);
  if(!current){if(!restore||check)throw Error('Environment resource not restored: '+r.id);await fs.mkdir(path.dirname(r.packedFile),{recursive:true});await fs.writeFile(r.packedFile,original);}
 }
 return catalog.records;
}
