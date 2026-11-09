import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
/** Keep long music separate from the combat AudioBuffer catalog. */
export async function loadMusicAssets({restore=false,check=false}={}){
 const catalog=JSON.parse(await fs.readFile('deploy/runtime/music-assets.json','utf8'));
 if(catalog.version!==1||hash((await fs.readFile('src/assets/music.ts','utf8')).replace(/\r\n/g,'\n'))!==catalog.generatedSha256)throw Error('Music registry differs');
 const ids=new Set();
 for(const r of catalog.records){
  if(ids.has(r.id)||!['music.menu','music.intermission'].includes(r.id)||r.kind!=='music'||r.status!=='available'||
   !/^[a-f0-9]{64}$/.test(r.packedSha256)||r.gitPath!==`deploy/runtime/assets/${r.packedSha256}.mp3`||
   r.sourceFile!==r.gitPath||r.sourceSha256!==r.packedSha256||r.url!==`assets/music/${r.packedSha256}.mp3`||r.packedFile!==`public/${r.url}`)throw Error('Invalid music identity: '+r.id);
  ids.add(r.id);
  const bytes=await fs.readFile(r.gitPath);
  if(bytes.length!==r.bytes||hash(bytes)!==r.packedSha256)throw Error('Music content differs: '+r.id);
  const current=await fs.readFile(r.packedFile).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
  if(current&&hash(current)!==r.packedSha256)throw Error('Preserving changed runtime music: '+r.id);
  if(!current){
   if(!restore||check)throw Error('Runtime music missing: '+r.id);
   await fs.mkdir(path.dirname(r.packedFile),{recursive:true});await fs.writeFile(r.packedFile,bytes);
  }
 }
 if(ids.size!==2)throw Error('Missing approved music track');
 return catalog.records;
}
