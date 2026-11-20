import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {ddsToPng} from './dds-png.mjs';
import {inspectGlb} from './glb-inspect.mjs';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const registry='deploy/runtime/terran-six-assets.json', runtime='src/assets/terran-six.ts';
export async function registerSixAssets(){
 const definitions=JSON.parse(await fs.readFile('tools/terran-six-models.json','utf8'));
 const pack=JSON.parse(await fs.readFile('assets/private/m3-pack.json','utf8')).manifest,records=[];
 for(const def of definitions.filter(d=>d.id.startsWith('model.'))){
  const entries=pack.filter(r=>r.id===def.id||r.id.startsWith(def.id+'.')&&/^\d+$/.test(r.id.slice(def.id.length+1)));
  if(!entries.length)throw Error('No packed asset for '+def.id);
  for(const entry of entries){
   const bytes=await fs.readFile(entry.packedFile),sha=digest(bytes);
   if(sha!==entry.sha256||!entry.sourcePath||!entry.sourceSha256||!entry.sourceBuild)throw Error('Missing pinned source '+entry.id);
   if(entry.kind==='model'){const glb=inspectGlb(bytes);if(glb.externalResources.length||!glb.animationNames.length)throw Error('Incomplete model '+entry.id);}
   const gitPath='deploy/runtime/assets/'+sha+path.extname(entry.packedFile);
   try{await fs.writeFile(gitPath,bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST'||digest(await fs.readFile(gitPath))!==sha)throw e;}
   const {id,kind,packedFile,sourcePath,sourceSha256,sourceBuild,animations,sprite,particle}=entry;
   records.push({id,kind,packedFile,sourcePath,sourceSha256,sourceBuild,animations,sprite,particle,bytes:bytes.length,packedSha256:sha,gitPath,url:packedFile.slice(7),status:'available',required:false});
  }
 }
 const icons=JSON.parse(await fs.readFile('tools/terran-six-icons.json','utf8')),pins=JSON.parse((await fs.readFile('tools/terran-six-dependencies.json','utf8')).replace(/^\uFEFF/,''));
 const baseline=JSON.parse(await fs.readFile('deploy/runtime/build-assets.json','utf8')).records;
 for(const icon of icons){
  const pin=pins.find(p=>p.installFile==='assets/private/dds/'+icon.name+'.dds');if(!pin)throw Error('Missing original icon '+icon.id);
  const bytes=await fs.readFile(pin.installFile);if(digest(bytes)!==pin.sha256)throw Error('Changed icon '+icon.id);
  if(baseline.some(r=>r.id===icon.id))continue;
  const png=ddsToPng(bytes),sha=digest(png),url='assets/icons/'+icon.id+'.png',packedFile='public/'+url,gitPath='deploy/runtime/assets/'+sha+'.png';
  await fs.mkdir(path.dirname(packedFile),{recursive:true});await fs.writeFile(packedFile,png);await fs.writeFile(gitPath,png);
  records.push({id:icon.id,kind:'icon',packedFile,url,gitPath,sourcePath:pin.sourcePath,sourceSha256:pin.sha256,sourceBuild:pin.version,bytes:png.length,packedSha256:sha,status:'available',required:false});
 }
 const generated='// Generated from pinned M3 and texture records.\nexport const TERRAN_SIX_ASSETS = '+JSON.stringify(records.map(({id,kind,url,status,required})=>({id,kind,url,status,required})),null,2)+';\n';
 await fs.writeFile(runtime,generated);await fs.writeFile(registry,JSON.stringify({generatedSha256:digest(generated),records},null,2)+'\n');
}
export async function loadSixAssets({restore=false}={}){
 const {records,generatedSha256}=JSON.parse(await fs.readFile(registry,'utf8'));
 if(digest((await fs.readFile(runtime,'utf8')).replace(/\r\n/g,'\n'))!==generatedSha256)throw Error('Six-unit registry changed');
 for(const r of records){
  const expected='deploy/runtime/assets/'+r.packedSha256+path.extname(r.packedFile);
  if(!r.packedFile.startsWith('public/assets/')||r.packedFile.includes('..')||expected!==r.gitPath)throw Error('Invalid asset path '+r.id);
  const bytes=await fs.readFile(r.gitPath);if(digest(bytes)!==r.packedSha256)throw Error('Invalid immutable resource '+r.id);
  if(restore){await fs.mkdir(path.dirname(r.packedFile),{recursive:true});try{await fs.access(r.packedFile);}catch{await fs.writeFile(r.packedFile,bytes);}}
  if(digest(await fs.readFile(r.packedFile))!==r.packedSha256)throw Error('Invalid runtime resource '+r.id);
 }
 return records;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await registerSixAssets();
