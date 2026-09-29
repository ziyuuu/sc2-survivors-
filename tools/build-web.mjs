import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'vite';

const root=process.cwd(),dist=path.resolve(root,'dist');
const staging=path.resolve(dist,`web-staging-${process.pid}`),published=path.resolve(dist,'web'),backup=path.resolve(dist,'web-previous');
const inside=(base,target)=>{const relative=path.relative(base,target);return relative!==''&&!relative.startsWith('..')&&!path.isAbsolute(relative);};
for(const target of [staging,published,backup])if(!inside(dist,target))throw Error('Web build destination escapes dist: '+target);
const records=JSON.parse(await fs.readFile('reports/local/runtime-assets.json','utf8'));
const reachability=JSON.parse(await fs.readFile('reports/local/asset-reachability.json','utf8'));
if(reachability.rulesId!=='mvp-1.0'||reachability.mapId!=='kairos')throw Error('Release resource closure is stale');
const selected=new Set(reachability.selectedIds);
if(selected.size!==reachability.selectedIds.length)throw Error('Duplicate selected release asset');
const rows=new Map(reachability.rows.map(row=>[row.id,row]));
if(rows.size!==selected.size||[...selected].some(id=>!rows.has(id)))throw Error('Release resource rows do not match selection');
const byId=new Map(records.map(record=>[record.id,record]));
const files=new Map(),assets={},sharing=new Map();
const mime=ext=>({glb:'model/gltf-binary',gltf:'model/gltf+json',json:'application/json',webp:'image/webp',png:'image/png',jpg:'image/jpeg',ogg:'audio/ogg',mp3:'audio/mpeg',wav:'audio/wav'}[ext]??'application/octet-stream');
for(const id of selected){
 const record=byId.get(id),row=rows.get(id);
 if(!record||record.status!=='available'||record.packedFile!==row.packedFile||!/^assets\/[A-Za-z0-9._/-]+$/.test(record.url)||record.url.split('/').includes('..'))throw Error('Invalid web resource: '+id);
 const source=path.resolve(root,record.packedFile),publicRoot=path.resolve(root,'public');
 if(!inside(publicRoot,source))throw Error('Web resource source escapes public: '+id);
 const ext=path.extname(record.url).slice(1).toLowerCase(),url=sharing.get(row.sha256)??`assets/${row.sha256}.${ext}`;
 sharing.set(row.sha256,url);assets[id]={url,bytes:row.bytes,sha256:row.sha256,mime:mime(ext)};
 files.set(url,{source,bytes:row.bytes,sha256:row.sha256});
}
await fs.mkdir(dist,{recursive:true});
if(await fs.stat(staging).then(()=>true,()=>false))throw Error('Web staging directory already exists: '+staging);
let staged=false;
try{
 await build({root,base:'./',publicDir:false,build:{target:'es2022',sourcemap:false,assetsInlineLimit:0,outDir:staging,emptyOutDir:false}});
 let bytes=0;
 for(const [relative,file] of files){
  const destination=path.resolve(staging,relative);
  if(!inside(staging,destination))throw Error('Web resource destination escapes staging: '+relative);
  const sourceBytes=await fs.readFile(file.source);
  if(sourceBytes.length!==file.bytes||createHash('sha256').update(sourceBytes).digest('hex')!==file.sha256)throw Error('Release resource changed after closure audit: '+relative);
  await fs.mkdir(path.dirname(destination),{recursive:true});
  await fs.writeFile(destination,sourceBytes);bytes+=sourceBytes.length;
 }
 const appHash=createHash('sha256');
 async function hashApp(folder){for(const e of (await fs.readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const full=path.join(folder,e.name);if(e.isDirectory())await hashApp(full);else if(!files.has(path.relative(staging,full).replaceAll('\\','/')))appHash.update(path.relative(staging,full)).update(await fs.readFile(full));}}
 await hashApp(staging);const appBuildId=appHash.digest('hex');
 const release=createHash('sha256').update(JSON.stringify(assets)).digest('hex'),manifestName=`asset-manifest.${release}.json`;
 await fs.writeFile(path.join(staging,manifestName),JSON.stringify({version:1,release,assets}));
 await fs.writeFile(path.join(staging,'runtime-config.json'),JSON.stringify({assetBaseUrl:''}));
 let index=await fs.readFile(path.join(staging,'index.html'),'utf8');
 index=index.replace('<head>',`<head><meta name="sc2-asset-manifest" content="./${manifestName}">`);
 await fs.writeFile(path.join(staging,'index.html'),index);
 if(!index.includes('id="battle"')||!index.includes('type="module"'))throw Error('Web entry point missing battle canvas or module');
 await fs.writeFile(path.join(staging,'web-release.json'),JSON.stringify({appBuildId,runSchema:12,rulesId:'mvp-1.0',mapId:'kairos',assetCount:selected.size,fileCount:files.size,assetBytes:bytes,logicalBytes:Object.values(assets).reduce((n,a)=>n+a.bytes,0),sharedBytes:Object.values(assets).reduce((n,a)=>n+a.bytes,0)-bytes,manifest:manifestName,release,source:'reports/local/asset-reachability.json'},null,2));
 staged=true;
}finally{if(!staged)await fs.rm(staging,{recursive:true,force:true});}
const exists=async target=>fs.stat(target).then(()=>true,()=>false);
if(await exists(backup))await fs.rm(backup,{recursive:true,force:true});
const hadPublished=await exists(published);
if(hadPublished)await fs.rename(published,backup);
try{await fs.rename(staging,published);}catch(error){if(hadPublished)await fs.rename(backup,published);throw error;}
if(hadPublished)await fs.rm(backup,{recursive:true,force:true});
const result=JSON.parse(await fs.readFile(path.join(published,'web-release.json'),'utf8'));
console.log(`Web directory: ${published}; ${result.assetCount} assets in ${result.fileCount} files; ${result.assetBytes} verified resource bytes.`);
