import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
/** Restore packaged UI art without relying on local preview directories. */
export async function loadStarshipAssets({restore=false,check=false}={}){
 const catalog=JSON.parse(await fs.readFile('deploy/runtime/starship-assets.json','utf8'));
 if(catalog.version!==1||hash((await fs.readFile('src/assets/starship-art.generated.ts','utf8')).replace(/\r\n/g,'\n'))!==catalog.generatedSha256)throw Error('Starship registry differs');
 const ids=new Set(),verified=new Map();
 for(const r of catalog.records){
  const ext=path.extname(r.gitPath),expectedId='ui.starship.'+r.imageKey.replaceAll('/','.')+(r.variant==='detail'?'.detail':'');
  if(ids.has(r.id)||r.id!==expectedId||!['src','detail'].includes(r.variant)||!['.png','.webp'].includes(ext)||!/^[a-f0-9]{64}$/.test(r.packedSha256)||r.gitPath!==`deploy/runtime/assets/${r.packedSha256}${ext}`||r.sourceFile!==r.gitPath||r.sourceSha256!==r.packedSha256||r.packedFile!==`public/${r.url}`||r.url!==`assets/ui/starship/${r.packedSha256}${ext}`)throw Error('Invalid starship resource identity: '+r.id);
  ids.add(r.id);
  let bytes=verified.get(r.gitPath);if(!bytes){bytes=await fs.readFile(r.gitPath);verified.set(r.gitPath,bytes);}
  if(bytes.length!==r.bytes||hash(bytes)!==r.packedSha256)throw Error('Starship art differs: '+r.id);
  const current=await fs.readFile(r.packedFile).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  if(current&&hash(current)!==r.packedSha256)throw Error('Starship runtime art differs: '+r.id);
  if(!current){if(!restore||check)throw Error('Starship runtime art missing: '+r.id);await fs.mkdir(path.dirname(r.packedFile),{recursive:true});await fs.writeFile(r.packedFile,bytes);}
 }
 return catalog.records;
}
