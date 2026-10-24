import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function loadMissionAssets({restore=false,check=false}={}){
 const catalog=JSON.parse(await fs.readFile('deploy/runtime/mission-assets.json','utf8'));
 if(sha((await fs.readFile('src/assets/mission-assets.ts','utf8')).replace(/\r\n/g,'\n'))!==catalog.generatedSha256)throw Error('Mission registry changed');
 for(const r of catalog.records){if(!r.gitPath.startsWith('deploy/runtime/mission-assets/')||r.gitPath.includes('..')||!(r.packedFile.startsWith('public/assets/animated/')||r.packedFile.startsWith('public/assets/fun/'))||r.packedFile.includes('..'))throw Error('Unsafe task asset path');const bytes=await fs.readFile(r.gitPath);if(sha(bytes)!==r.packedSha256||bytes.length!==r.bytes)throw Error('Mission asset hash mismatch '+r.id);const current=await fs.readFile(r.packedFile).catch(()=>null);if(current&&sha(current)!==r.packedSha256)throw Error('Mission runtime changed '+r.id);if(!current){if(!restore||check)throw Error('Mission runtime missing '+r.id);await fs.mkdir(path.dirname(r.packedFile),{recursive:true});await fs.writeFile(r.packedFile,bytes);}}
 return catalog.records;
}
