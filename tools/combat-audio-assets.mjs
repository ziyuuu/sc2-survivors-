import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function loadCombatAudio({restore=false,check=false}={}){
 const catalog=JSON.parse(await fs.readFile('deploy/runtime/combat-audio.json','utf8'));
 if(catalog.version!==1||new Set(catalog.records.map(r=>r.id)).size!==catalog.records.length)throw Error('Invalid combat audio registry');
 for(const [file,key]of [['src/assets/combat-audio.ts','generatedSha256'],['src/data/combat-audio.json','catalogSha256']])if(hash((await fs.readFile(file,'utf8')).replace(/\r\n/g,'\n'))!==catalog[key])throw Error('Combat audio registry checksum differs: '+file);
 const verified=new Set();
 for(const r of catalog.records){
  if(!/^audio\.sc2\.source\.[a-f0-9]{24}$/.test(r.id)||r.gitPath!==`deploy/runtime/assets/${r.packedSha256}.wav`||r.url!==`assets/combat-audio/${r.packedSha256}.wav`||r.packedFile!=='public/'+r.url||!r.sampleExact)throw Error('Invalid original audio resource: '+r.id);
  if(verified.has(r.gitPath))continue;verified.add(r.gitPath);
  const bytes=await fs.readFile(r.gitPath);if(bytes.length!==r.bytes||hash(bytes)!==r.packedSha256)throw Error('Combat audio changed: '+r.id);
  const current=await fs.readFile(r.packedFile).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  if(current&&hash(current)!==r.packedSha256)throw Error('Preserving changed audio: '+r.id);
  if(!current){if(!restore||check)throw Error('Combat audio not restored: '+r.id);await fs.mkdir(path.dirname(r.packedFile),{recursive:true});await fs.writeFile(r.packedFile,bytes);}
 }
 return catalog.records;
}
