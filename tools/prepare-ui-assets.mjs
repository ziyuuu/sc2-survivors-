import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const root='preview/ui-20261003',manifest=JSON.parse(await fs.readFile(root+'/art-r11/manifest-r11.json','utf8'));
if(manifest.missing.length||Object.keys(manifest.entries).length!==129)throw Error('Incomplete approved R11 artwork');
const records=[];
async function add(id,source,expected){
 const bytes=await fs.readFile(source),hash=sha(bytes);if(expected&&hash!==expected)throw Error('UI source changed: '+source);
 const ext=path.extname(source),packedFile=`public/assets/ui/${hash}${ext}`,gitPath=`deploy/runtime/assets/${hash}${ext}`;
 await fs.mkdir(path.dirname(packedFile),{recursive:true});
 const old=await fs.readFile(packedFile).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
 if(old&&sha(old)!==hash)throw Error('Preserving changed UI resource: '+packedFile);
 if(!old)await fs.writeFile(packedFile,bytes);
 const gitOld=await fs.readFile(gitPath).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
 if(gitOld&&sha(gitOld)!==hash)throw Error('Preserving changed Git UI asset: '+gitPath);
 if(!gitOld)await fs.writeFile(gitPath,bytes);
 records.push({gitPath,id,kind:'ui-art',status:'available',required:true,url:packedFile.slice(7),packedFile,sourceFile:source,sourceSha256:hash,packedSha256:hash,bytes:bytes.length});
}
for(const [key,p] of Object.entries(manifest.plates))await add('ui.paint.'+key,root+'/art-r11/'+p.file,p.sha256);
const covers={terran:['raynor','nova','tychus'],zerg:['kerrigan','zagara','dehaka'],protoss:['artanis','zeratul','fenix']};
for(const [race,heroes] of Object.entries(covers))for(const hero of heroes)await add('ui.cover.'+hero,`${root}/covers/${race}-${hero}.png`);
const entries=Object.fromEntries(Object.entries(manifest.entries).map(([id,e])=>[id,Object.fromEntries(['width','height','assetKey','sceneBounds','bodyBounds','bodyHeight','bodyWidth','air','skyTop','skyBottom','atmosphere'].map(k=>[k,e[k]]))]));
const generated='// Generated from preserved R11 artwork. Presentation metadata only.\nexport const UI_ART_ASSETS = '+JSON.stringify(records.map(({id,kind,status,required,url})=>({id,kind,status,required,url})))+';\nexport const PAINTED_CARDS = '+JSON.stringify(entries)+';\n';
await fs.writeFile('src/assets/ui-art.generated.ts',generated);
await fs.writeFile('deploy/runtime/ui-assets.json',JSON.stringify({version:1,records,generatedSha256:sha(generated)},null,2)+'\n');
console.log(JSON.stringify({uiResources:records.length,bytes:records.reduce((s,r)=>s+r.bytes,0),identities:129+9}));
