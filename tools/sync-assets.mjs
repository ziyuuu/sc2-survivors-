import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {assertManifest,AssetCatalog} from '../src/assets/catalog.mjs';
import {inspectGlb} from './glb-inspect.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=assertManifest(JSON.parse(await fs.readFile(path.join(root,'assets/manifest.json'),'utf8')));
const indexesOnly=process.argv.includes('--index-only');
const kind=process.argv.find(a=>a.startsWith('--kind='))?.split('=')[1];
if(kind&&!manifest.assets.some(a=>a.kind===kind))throw Error('Unknown asset kind');
const catalog=new AssetCatalog();
const report={checkedAt:new Date().toISOString(),indexOnly:indexesOnly,assets:[],fonts:'not-downloaded',runtimeApproved:false};
const output=path.join(root,'assets/private');await fs.mkdir(output,{recursive:true});
for(const item of manifest.assets.filter(a=>!kind||a.kind===kind)){
 let row={id:item.id,kind:item.kind};
 try{
  Object.assign(row,await catalog.resolve(item));
  if(row.status!=='indexed')throw Error(row.status==='ambiguous'?'Ambiguous exact candidates':'No exact match');
  if(!indexesOnly){
   const isModel=item.kind==='model',url=isModel?row.sourceUrl:row.previewUrl;
   if(!/\.(glb|png|jpe?g)$/i.test(new URL(url).pathname))throw Error('Unsupported runtime representation');
   const response=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error(`HTTP ${response.status}`);
   let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.byteLength;if(size>50*1024*1024)throw Error('Asset exceeds 50 MiB cap');chunks.push(chunk);}
   const bytes=Buffer.concat(chunks),ext=isModel?'.glb':path.extname(new URL(url).pathname);
   if(isModel)row.glb=inspectGlb(bytes);
   else if(ext.toLowerCase()==='.png'){if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG header');row.width=bytes.readUInt32BE(16);row.height=bytes.readUInt32BE(20);if(!row.width||!row.height)throw Error('Empty PNG');}
   else if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)throw Error('Invalid JPEG markers');
   const filename=item.id+ext,destination=path.join(output,filename);await fs.writeFile(destination+'.part',bytes);await fs.rename(destination+'.part',destination);
   row.localPath='assets/private/'+filename;row.bytes=bytes.length;row.sha256=createHash('sha256').update(bytes).digest('hex');row.status='bytes-checked';row.originalIdentityVerified=false;
  }
 }catch(e){row.error=e.message;row.status='failed';}
 report.assets.push(row);console.log(`${row.id}: ${row.status}${row.error?' — '+row.error:''}`);
}
await fs.mkdir(path.join(root,'reports/local'),{recursive:true});
await fs.writeFile(path.join(root,'reports/local/assets.json'),JSON.stringify(report,null,2));
await fs.writeFile(path.join(output,'manifest.runtime.json'),JSON.stringify(report,null,2));
const failed=report.assets.filter(a=>a.status==='failed').length;console.log(`Inspected ${report.assets.length}, failed ${failed}. No original-identity approval implied.`);if(failed)process.exitCode=1;
