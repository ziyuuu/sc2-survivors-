import fs from 'node:fs/promises';
import path from 'node:path';
import {AssetCatalog} from '../src/assets/catalog.mjs';
import {inspectGlb} from './glb-inspect.mjs';
import {RUNTIME_ASSETS,filename} from './runtime-catalog.mjs';
const catalog=new AssetCatalog(),report=[];
for(const a of RUNTIME_ASSETS){let r={...a,status:'missing'};try{
 const resolved=await catalog.resolve(a);Object.assign(r,resolved);if(resolved.status!=='indexed')throw Error('Exact asset not indexed: '+a.names.join(', '));
 const url=a.kind==='model'?resolved.sourceUrl:resolved.previewUrl,ext=path.extname(new URL(url).pathname);const destination=filename(a,ext);
 let bytes;try{bytes=await fs.readFile(destination);}catch{try{bytes=await fs.readFile(`assets/private/${a.id}${ext}`);}catch{const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`HTTP ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());}}
 if(a.kind==='model'){r.glb=inspectGlb(bytes);if(r.glb.externalResources.length)throw Error('GLB has external resources; import self-contained GLB');}
 else if(ext==='.png'){if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG magic');}
 else if(bytes[0]!==255||bytes[1]!==216)throw Error('Invalid JPEG magic');
 await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination+'.part',bytes);await fs.rename(destination+'.part',destination);
 Object.assign(r,{status:'bytes-checked',file:destination,bytes:bytes.length});
 }catch(e){r.error=e.message;r.status='missing';}report.push(r);console.log(`${r.id}: ${r.status}${r.error?' '+r.error:''}`);
}
await fs.mkdir('reports/local',{recursive:true});await fs.writeFile('reports/local/runtime-download.json',JSON.stringify(report,null,2));
const missing=report.filter(r=>r.status==='missing');
// M3 and true terrain resources are handled by assets:animate. Keep the handoff document stable.
if(missing.some(r=>r.required&&r.kind==='icon'))process.exitCode=1;
