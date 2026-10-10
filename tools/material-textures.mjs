import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
/** Source-bound additions, kept separate from the immutable original runtime catalogue. */
export async function loadMaterialTextures({restore=false,check=false}={}){
 const catalog=JSON.parse(await fs.readFile('deploy/runtime/material-textures.json','utf8'));
 if(new Set(catalog.records.map(r=>r.id)).size!==catalog.records.length)throw Error('Duplicate material resource identity');
 if(catalog.version!==1||hash((await fs.readFile('src/assets/material-textures.ts','utf8')).replace(/\r\n/g,'\n'))!==catalog.generatedSha256)throw Error('Material texture registry differs');
 for(const r of catalog.records){
  if(!/^material\.(team|layer)\.[a-f0-9]{20}(\.[0-5])?$/.test(r.id)||r.gitPath!==`deploy/runtime/assets/${r.packedSha256}.png`||r.packedFile!==`public/${r.url}`||r.url!==`assets/materials/${r.id}.png`)throw Error('Invalid material resource identity');
  const b=await fs.readFile(r.gitPath);if(b.length!==r.bytes||hash(b)!==r.packedSha256)throw Error('Material resource differs: '+r.id);
  const current=await fs.readFile(r.packedFile).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  if(current&&hash(current)!==r.packedSha256)throw Error('Material runtime resource differs: '+r.id);
  if(!current){if(!restore||check)throw Error('Material runtime resource missing: '+r.id);await fs.mkdir(path.dirname(r.packedFile),{recursive:true});await fs.writeFile(r.packedFile,b);}
 }return catalog.records;
}
