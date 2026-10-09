import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
/** Locked copies of the approved native HUD art; no dependency on the preview. */
export async function loadNativeHudAssets({restore=false,check=false}={}){
 const catalog=JSON.parse(await fs.readFile('deploy/runtime/native-hud-assets.json','utf8'));
 if(catalog.version!==1||hash((await fs.readFile('src/assets/native-hud-art.ts','utf8')).replace(/\r\n/g,'\n'))!==catalog.generatedSha256)throw Error('Native HUD registry differs');
 for(const r of catalog.records){
  if(!/^ui\.native\.[a-zA-Z0-9_-]+$/.test(r.id)||r.gitPath!==`deploy/runtime/assets/${r.packedSha256}.png`||r.sourceFile!==r.gitPath||r.packedFile!==`public/${r.url}`||r.url!==`assets/ui/native-hud/${r.id.slice(10)}.png`)throw Error('Invalid native HUD resource identity');
  const b=await fs.readFile(r.gitPath);if(b.length!==r.bytes||hash(b)!==r.packedSha256)throw Error('Native HUD art differs: '+r.id);
  const current=await fs.readFile(r.packedFile).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  if(current&&hash(current)!==r.packedSha256)throw Error('Native HUD runtime art differs: '+r.id);
  if(!current){if(!restore||check)throw Error('Native HUD runtime art missing: '+r.id);await fs.mkdir(path.dirname(r.packedFile),{recursive:true});await fs.writeFile(r.packedFile,b);}
 }
 return catalog.records;
}
