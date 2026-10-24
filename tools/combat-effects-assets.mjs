import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function loadCombatEffects({restore=false,check=false}={}){
 const catalog=JSON.parse(await fs.readFile('deploy/runtime/combat-effects.json','utf8'));
 if(catalog.version!==1||new Set(catalog.records.map(r=>r.id)).size!==catalog.records.length)throw Error('Invalid combat effect registry');
 if(hash((await fs.readFile('src/assets/combat-effects.ts','utf8')).replace(/\r\n/g,'\n'))!==catalog.generatedSha256)throw Error('Combat effect registry checksum differs');
 if(hash((await fs.readFile('src/render/effects/source/catalog.json','utf8')).replace(/\r\n/g,'\n'))!==catalog.catalogSha256)throw Error('Combat effect source catalog checksum differs');
 for(const r of catalog.records){
  if(!/^combat-fx\.(texture|mesh)\.[\w.-]+$/.test(r.id)||r.gitPath!==`deploy/runtime/assets/${r.packedSha256}.${r.kind==='combat-effect-model'?'glb':'png'}`||r.packedFile!==`public/${r.url}`||![`assets/combat-effects/${r.id}.${r.kind==='combat-effect-model'?'glb':'png'}`,`assets/fun-fx/${r.id}.${r.kind==='combat-effect-model'?'glb':'png'}`].includes(r.url))throw Error('Invalid combat effect asset path');
  const bytes=await fs.readFile(r.gitPath);if(bytes.length!==r.bytes||hash(bytes)!==r.packedSha256)throw Error('Combat effect resource changed: '+r.id);
  const current=await fs.readFile(r.packedFile).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  if(current&&hash(current)!==r.packedSha256)throw Error('Preserving changed combat effect resource: '+r.id);
  if(!current){if(!restore||check)throw Error('Combat effect resource not restored: '+r.id);await fs.mkdir(path.dirname(r.packedFile),{recursive:true});await fs.writeFile(r.packedFile,bytes);}
 }
 return catalog.records;
}
