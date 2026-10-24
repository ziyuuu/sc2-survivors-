import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function loadFunPropAssets({restore=false,check=false}={}){
 const catalog=JSON.parse(await fs.readFile('deploy/runtime/fun-props.json','utf8'));
 if(catalog.version!==1||catalog.records.length!==1||sha((await fs.readFile('src/assets/fun-props.generated.ts','utf8')).replace(/\r\n/g,'\n'))!==catalog.generatedSha256)throw Error('Authored prop registry differs');
 for(const r of catalog.records){
  if(r.id!=='model.fun-props'||r.kind!=='model'||!/^[a-f0-9]{64}$/.test(r.packedSha256)||r.gitPath!==`deploy/runtime/fun-props/${r.packedSha256}.glb`||r.url!==`assets/fun/${r.packedSha256}.glb`||r.packedFile!==`public/${r.url}`)throw Error('Invalid prop identity');
  const bytes=await fs.readFile(r.gitPath);if(bytes.length!==r.bytes||sha(bytes)!==r.packedSha256)throw Error('Authored prop asset changed');
  const current=await fs.readFile(r.packedFile).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  if(current&&sha(current)!==r.packedSha256)throw Error('Authored prop runtime changed');
  if(!current){if(!restore||check)throw Error('Authored prop runtime missing');await fs.mkdir(path.dirname(r.packedFile),{recursive:true});await fs.writeFile(r.packedFile,bytes);}
 }
 return catalog.records;
}
