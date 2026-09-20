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
await fs.writeFile('docs/ASSET_DOWNLOAD_REQUIRED.md',`# Asset download / import status\n\n${new Date().toISOString()}\n\n${report.filter(r=>r.kind==='model'&&r.status==='bytes-checked'&&r.id!=='model.hive').length}/8 combat GLBs passed structural validation. Animation and rendering are separately reported.\n\n## Animation/effect packages\n\nRun \`npm run assets:animate\` for the original M3 unit/death/morph packages and effect textures. Exact links and destinations: [ANIMATION_EFFECTS.md](ANIMATION_EFFECTS.md). The nine optional original WAV slots and their manual import paths are listed there; they are marked missing in the generated manifest until valid local files are supplied.\n\n## Missing resources\n\n${missing.length?missing.map(r=>`- **${r.id}**: ${r.error}. Local destination: \`${filename(r,'.glb')}\`. [Source index](https://github.com/sc2-arcade-watcher/asset-explorer/blob/main/site/list/${r.category}.json). No verified binary download link exists for this missing entry. ${r.note??''}`).join('\n'):'None.'}\n\n## Stable manual destinations\n\n| ID | Exact filename / destination | Verified download |\n|---|---|---|\n${report.filter(r=>r.file).map(r=>`| ${r.id} | \`${r.file}\` | [source](${r.kind==='model'?r.sourceUrl:r.previewUrl}) |`).join('\n')}\n\nPlace valid files at these paths and run \`npm run assets:prepare\` / \`npm run build\`. No code change is necessary. Fonts are not downloaded. The catalog preview GLBs are static. Run \`npm run assets:animate\` to download original M3 animation/effect packages and convert locally; see [ANIMATION_EFFECTS.md](ANIMATION_EFFECTS.md).\n`);
if(missing.some(r=>r.required))process.exitCode=1;
