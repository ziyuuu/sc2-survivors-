import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function loadTutorialAssets({restore=false,check=false}={}){
 const c=JSON.parse(await fs.readFile('deploy/runtime/tutorial-assets.json','utf8'));
 if(c.version!==1||c.records.length!==3||hash((await fs.readFile('src/assets/tutorial.ts','utf8')).replace(/\r\n/g,'\n'))!==c.generatedSha256)throw Error('Tutorial registry differs');
 for(const r of c.records){
  if(!/^tutorial\.portrait\.(adjutant|queen|executor)$/.test(r.id)||r.gitPath!==`deploy/runtime/assets/${r.packedSha256}.png`||r.url!==`assets/tutorial/${r.packedSha256}.png`||r.packedFile!=='public/'+r.url)throw Error('Invalid tutorial resource');
  const b=await fs.readFile(r.gitPath);if(hash(b)!==r.packedSha256||b.length!==r.bytes)throw Error('Tutorial resource changed');
  const current=await fs.readFile(r.packedFile).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  if(current&&hash(current)!==r.packedSha256)throw Error('Preserving changed tutorial resource');
  if(!current){if(!restore||check)throw Error('Tutorial resource missing');await fs.mkdir(path.dirname(r.packedFile),{recursive:true});await fs.writeFile(r.packedFile,b);}
 }
 const voices=JSON.parse(await fs.readFile('deploy/runtime/tutorial-voices.json','utf8'));
 if(voices.version!==1||hash((await fs.readFile('src/assets/tutorial-voice.ts','utf8')).replace(/\r\n/g,'\n'))!==voices.generatedSha256)throw Error('Tutorial voice registry differs');
 for(const r of voices.records){
  if(!/^audio\.tutorial\.voice\.(terran|protoss)\.[a-f0-9]{20}$/.test(r.id)||r.gitPath!==`deploy/runtime/assets/${r.packedSha256}.mp3`||r.packedFile!=='public/'+r.url||r.url!==`assets/tutorial-voice/${r.packedSha256}.mp3`)throw Error('Invalid tutorial voice');
  const b=await fs.readFile(r.gitPath);if(hash(b)!==r.packedSha256||b.length!==r.bytes)throw Error('Tutorial voice changed');
  const current=await fs.readFile(r.packedFile).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  if(current&&hash(current)!==r.packedSha256)throw Error('Preserving changed tutorial voice');
  if(!current){if(!restore||check)throw Error('Tutorial voice missing');await fs.mkdir(path.dirname(r.packedFile),{recursive:true});await fs.writeFile(r.packedFile,b);}
 }
 return [...c.records,...voices.records];
}
