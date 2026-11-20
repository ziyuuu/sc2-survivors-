import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {inspectGlb} from './glb-inspect.mjs';
import {ddsToPng} from './dds-png.mjs';

const registry='deploy/runtime/zerg-six-assets.json';
const runtime='src/assets/zerg-six.generated.ts';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async file=>JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));

export async function loadZergSixAssets({restore=false}={}){
 const {records,generatedHash}=await json(registry);
 const generated=(await fs.readFile(runtime,'utf8')).replaceAll('\r\n','\n');
 if(sha(generated)!==generatedHash)throw Error('Zerg trial asset catalog mismatch');
 for(const r of records){
  const blob='deploy/runtime/assets/'+r.packedSha256+path.extname(r.url);
  if(blob!==r.gitPath||!/^assets\/[a-zA-Z0-9_./-]+$/.test(r.url)||r.url.split('/').includes('..'))throw Error('Invalid Zerg trial asset '+r.id);
  const bytes=await fs.readFile(blob);
  if(sha(bytes)!==r.packedSha256)throw Error('Corrupt Zerg trial asset '+r.id);
  const dest='public/'+r.url;
  if(restore){await fs.mkdir(path.dirname(dest),{recursive:true});try{await fs.writeFile(dest,bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}}
  if(sha(await fs.readFile(dest))!==r.packedSha256)throw Error('Zerg trial runtime checksum mismatch '+r.id);
 }
 return records;
}

async function register(){
 const definitions=await json('tools/zerg-six-models.json'),pack=await json('assets/private/m3-pack.json');
 const audio=await json('tools/zerg-six-audio.json'),audioPins=await json('tools/zerg-six-audio-dependencies.json');
 const records=[],sounds=[];
 async function add(id,kind,url,bytes,pin,extra={}){
  const packedSha256=sha(bytes),gitPath='deploy/runtime/assets/'+packedSha256+path.extname(url);
  await fs.writeFile(gitPath,bytes,{flag:'wx'}).catch(async e=>{if(e.code!=='EEXIST'||sha(await fs.readFile(gitPath))!==packedSha256)throw e;});
  const dest='public/'+url;
  await fs.mkdir(path.dirname(dest),{recursive:true});
  await fs.writeFile(dest,bytes,{flag:'wx'}).catch(async e=>{if(e.code!=='EEXIST'||sha(await fs.readFile(dest))!==packedSha256)throw e;});
  records.push({id,kind,url,status:'available',required:false,sourcePath:pin.sourcePath,sourceSha256:pin.sourceSha256??pin.sha256,sourceBuild:pin.sourceBuild??pin.build??pin.version,bytes:bytes.length,packedSha256,gitPath,...extra});
 }
 for(const d of definitions.filter(x=>x.id.startsWith('model.')||x.id.startsWith('fx.'))){
  const entries=pack.manifest.filter(r=>r.id===d.id||r.id.startsWith(d.id+'.')&&/^\d+$/.test(r.id.slice(d.id.length+1)));
  if(!entries.length){console.warn('Missing original conversion: '+d.id);continue;}
  for(const r of entries){
   const bytes=await fs.readFile(r.packedFile);
   if(sha(bytes)!==r.sha256||!r.sourcePath||!r.sourceSha256||!r.sourceBuild)throw Error('Unverified original '+r.id);
   if(r.kind==='model'){
    const glb=inspectGlb(bytes);
    if(glb.externalResources.length||!glb.animationNames.length&&!r.id.includes('.projectile.'))throw Error('Incomplete original animation: '+r.id);
   }
   await add(r.id,r.kind,r.packedFile.slice(7),bytes,r,{sprite:r.sprite,animations:r.animations,clips:r.additionalAnimations});
  }
 }
 const icons=await json('tools/zerg-six-icons.json'),iconPins=await json('tools/zerg-six-icon-dependencies.json');
 for(const icon of icons){
  const pin=iconPins.find(p=>p.installFile==='assets/private/dds/'+icon.name+'.dds');
  if(!pin)throw Error('Missing original icon '+icon.id);
  const bytes=await fs.readFile(pin.installFile);
  if(sha(bytes)!==pin.sha256)throw Error('Changed original icon '+icon.id);
  await add(icon.id,'icon','assets/icons/'+icon.id+'.png',ddsToPng(bytes),pin);
 }
 for(const a of audio){
  const pin=audioPins.find(p=>p.sourcePath.toLowerCase().endsWith('/'+a.path.toLowerCase()));
  if(!pin){console.warn('Missing original audio: '+a.id);continue;}
  const bytes=await fs.readFile(pin.installFile);
  if(sha(bytes)!==pin.sha256)throw Error('Invalid source sound '+a.id);
  const conversion=spawnSync('python',['tools/zerg-six-audio-pcm.py',pin.installFile],{maxBuffer:8*1024*1024});
  if(conversion.status!==0||conversion.stdout.subarray(0,4).toString()!=='RIFF')throw Error('Audio conversion '+a.id+': '+(conversion.stderr?.toString()||conversion.error));
  const pcm=conversion.stdout,url='assets/combat-audio/'+sha(pcm)+'.wav';
  await add('audio.'+a.id,'audio',url,pcm,pin,{encoding:'PCM_16'});
  sounds.push({asset:a.id,unit:a.unit,kind:a.kind});
 }
 const assets=records.map(({id,kind,url,status,required,sprite})=>({id,kind,url,status,required,...(sprite?{sprite}:{})}));
 const generated='// Generated from pinned original models, icons and audio by tools/zerg-six-assets.mjs.\nexport const ZERG_SIX_ASSETS='+JSON.stringify(assets)+';\nexport const ZERG_SIX_AUDIO='+JSON.stringify(sounds)+';\n';
 await fs.writeFile(runtime,generated);
 await fs.writeFile(registry,JSON.stringify({generatedHash:sha(generated),records},null,2)+'\n');
 console.log('Zerg trial original assets: '+records.length);
}
if(process.argv.includes('--register'))await register();
if(process.argv.includes('--restore'))await loadZergSixAssets({restore:true});
if(process.argv.includes('--check'))console.log('Verified Zerg six assets: '+(await loadZergSixAssets()).length);
