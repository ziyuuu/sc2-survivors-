import './prepare-expansion-assets.mjs';
import './prepare-sc2-audio.mjs';
import {cascProvenance} from './casc-provenance.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {RUNTIME_ASSETS,filename} from './runtime-catalog.mjs';
import {inspectGlb} from './glb-inspect.mjs';
import './generate-audio.mjs';
import {SC2_AUDIO} from './sc2-audio-catalog.mjs';
const records=[];
let audioConversions=[];try{audioConversions=JSON.parse(await fs.readFile('assets/private/audio-conversion.json','utf8'));}catch{}
let imported=[];try{imported=JSON.parse(await fs.readFile('assets/private/m3-pack.json','utf8')).manifest;}catch{}
try{imported.push(...JSON.parse(await fs.readFile('assets/private/terrain-pack.json','utf8')).manifest);}catch{}
try{imported.push(...JSON.parse(await fs.readFile('assets/private/map-pack.json','utf8')).manifest);}catch{}
try{imported.push(...JSON.parse(await fs.readFile('assets/private/expansion-ui.json','utf8')).manifest);}catch{}
const importedById=new Map(imported.map(a=>[a.id,a]));
const assets=[...RUNTIME_ASSETS.map(a=>({...a,...importedById.get(a.id),required:a.required})),...[...importedById.values()].filter(a=>!RUNTIME_ASSETS.some(b=>b.id===a.id))];
let optimized=[];try{optimized=JSON.parse(await fs.readFile('assets/private/m6-webp-manifest.json','utf8')).records??[];}catch{}
const optimizedById=new Map(optimized.map(a=>[a.id,a]));
let optimizedTextures=[];try{optimizedTextures=JSON.parse(await fs.readFile('assets/private/m6-texture-webp-manifest.json','utf8')).records??[];}catch{}
const optimizedTextureById=new Map(optimizedTextures.map(a=>[a.id,a]));
let optimizedClips=[];try{optimizedClips=JSON.parse(await fs.readFile('assets/private/m6-clip-manifest.json','utf8')).records??[];}catch{}
const optimizedClipById=new Map(optimizedClips.map(a=>[a.id,a]));
let optimizedCount=0,optimizedTextureCount=0,optimizedClipCount=0;
for(const a of assets){const ext=a.kind==='model'?'.glb':a.kind==='icon'||a.kind==='effect-texture'?'.png':'.jpg';let file=a.packedFile??filename(a,ext),optimization;
 const candidate=a.kind==='model'?optimizedById.get(a.id):a.kind==='texture'?optimizedTextureById.get(a.id):undefined;
 if(candidate?.sourceFile===file){try{const source=await fs.readFile(file),output=await fs.readFile(candidate.packedFile);const hash=bytes=>createHash('sha256').update(bytes).digest('hex');if(hash(source)===candidate.sourceSha256&&hash(output)===candidate.sha256){file=candidate.packedFile;optimization='exact-pixel-webp-v1';if(a.kind==='model')optimizedCount++;else optimizedTextureCount++;}}catch{}}
 const clip=a.kind==='model'?optimizedClipById.get(a.id):undefined;
 if(clip?.sourceFile===file){try{const source=await fs.readFile(file),output=await fs.readFile(clip.packedFile);const hash=bytes=>createHash('sha256').update(bytes).digest('hex');if(hash(source)===clip.sourceSha256&&hash(output)===clip.sha256){const info=inspectGlb(output);if(clip.retainedClips.every(name=>info.animationNames.includes(name))&&clip.removedClips.every(name=>!info.animationNames.includes(name))){file=clip.packedFile;optimization='exact-pixel-webp-v1+verified-clip-prune-v1';optimizedClipCount++;}}}catch{}}
 let record={...a,id:a.id,kind:a.kind,status:'missing',url:file.replace('public/',''),packedFile:file,required:a.required,animations:[],bytes:0,...(optimization?{optimization}:{} )};
 try{const bytes=await fs.readFile(file);record.bytes=bytes.length;
 if(a.kind==='model'){
  const info=inspectGlb(bytes);if(info.externalResources.length)throw Error('External GLB dependencies are unsupported; provide a self-contained GLB');
  // Keep runtime models as the self-contained GLB produced by the M3 pipeline.
  // GLTFLoader accepts both glTF and GLB; one binary avoids sidecar fetches under file://.
  record.animations=info.animationNames;record.url=file.replace('public/','');record.glb=info;
 }else if(path.extname(file)==='.png'&&bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid image magic');
 else if(path.extname(file)==='.webp'&&(bytes.subarray(0,4).toString()!=='RIFF'||bytes.subarray(8,12).toString()!=='WEBP'))throw Error('Invalid WebP magic');
 record.status='available';
 }catch(e){record.error=e.message;}
 records.push(record);
}
for(const name of ['shot','blast','alert']){const file=`public/assets/audio/${name}.wav`;const bytes=await fs.readFile(file);records.push({id:'audio.'+name,kind:'audio',status:'available',url:file.replace('public/',''),packedFile:file,required:true,animations:[],bytes:bytes.length});}
for(const [id,sourcePath] of SC2_AUDIO){const packedFile=`public/assets/audio/sc2/${path.basename(sourcePath)}`;const record={id,kind:'audio',status:'missing',url:packedFile.replace('public/',''),packedFile,sourcePath,required:false,animations:[],bytes:0};try{const b=await fs.readFile(packedFile);if(sourcePath.endsWith('.ogg')?b.subarray(0,4).toString()!=='OggS':b.subarray(0,4).toString()!=='RIFF'||b.subarray(8,12).toString()!=='WAVE')throw Error('Invalid audio header');record.status='available';record.bytes=b.length;Object.assign(record,cascProvenance(packedFile,b));const conversion=audioConversions.find(a=>a.id===id);if(conversion){Object.assign(record,cascProvenance(packedFile,await fs.readFile(conversion.source)),{conversion});}}catch{}records.push(record);}
await fs.mkdir('src/assets',{recursive:true});await fs.writeFile('src/assets/runtime.generated.ts','// Generated by tools/prepare-assets.mjs. Local assets are never committed.\nexport const RUNTIME_ASSETS = '+JSON.stringify(records.map(r=>Object.fromEntries(['id','kind','status','url','required','sprite'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]]))),null,2)+';\n');
await fs.mkdir('reports/local',{recursive:true});await fs.writeFile('reports/local/runtime-assets.json',JSON.stringify(records,null,2));
console.log(`Prepared ${records.filter(r=>r.status==='available').length}/${records.length} assets; ${records.filter(r=>r.required&&r.status==='missing').length} required missing; ${optimizedCount} exact-pixel WebP model derivatives, ${optimizedTextureCount} texture derivatives, ${optimizedClipCount} verified clip derivatives.`);
