/** Rebuild the local Acropolis pack from its pinned LFS map after a clean checkout. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

const lock=JSON.parse(await fs.readFile('tools/acropolis-map-lock.json','utf8'));
const archive='assets/private/maps/'+lock.file,bytes=await fs.readFile(archive);
if(createHash('sha256').update(bytes).digest('hex')!==lock.sha256)throw Error(`Acropolis archive hash mismatch. Fetch the Git LFS file: ${archive}`);
let ready=false;
try{const pack=JSON.parse(await fs.readFile('assets/private/acropolis-map-pack.json','utf8'));ready=pack.manifest?.find(a=>a.id==='map.acropolis')?.sourceSha256===lock.sha256&&!!pack.manifest?.find(a=>a.id==='map.acropolis.terrain.diffuse')&&!!pack.manifest?.find(a=>a.id==='map.acropolis.terrain.normal')&&await Promise.all(pack.manifest.map(a=>fs.stat(a.packedFile).then(s=>s.size>0,()=>false))).then(rows=>rows.every(Boolean));}catch{}
if(!ready){
 let extracted=false;
 try{
  const runtime=JSON.parse(await fs.readFile('assets/private/maps/acropolis-runtime.json','utf8'));
  const terrain=JSON.parse(await fs.readFile('assets/private/maps/acropolis-extracted.json','utf8'));
  const textureLock=JSON.parse(await fs.readFile('tools/acropolis-textures-lock.json','utf8'));
  if(runtime.source?.sha256!==lock.sha256||terrain.source?.sha256!==lock.sha256||terrain.textures?.length<8)throw Error('Acropolis source mismatch');
  const mask=await fs.readFile('assets/private/maps/AcropolisLE/t3TextureMasks');
  if(mask.subarray(0,4).toString()!=='MASK')throw Error('Acropolis terrain mask mismatch');
  for(const entry of textureLock){const pixels=await fs.readFile('assets/private/dds/'+entry.name);if(pixels.length!==entry.bytes||createHash('sha256').update(pixels).digest('hex')!==entry.sha256)throw Error('Acropolis texture mismatch: '+entry.name);}
  extracted=true;
 }catch{}
 if(!extracted)await import('./prepare-acropolis.mjs');
 await import('./package-acropolis.mjs');
}
