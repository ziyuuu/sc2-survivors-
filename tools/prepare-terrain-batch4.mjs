/** Original SC2 pixels only. Existing DDS files are read-only; new sources are pinned on first acquisition. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fetchBinary} from './fetch-binary.mjs';
import {decodeDds,rgbaToPng} from './dds-png.mjs';
import {convertMaterialPixels} from './m3-materials.mjs';

const root='reports/local/terrain-batch4-20261011',check=process.argv.includes('--check'),lockFile='tools/terrain-batch4-sources.json';
const hash=b=>createHash('sha256').update(b).digest('hex');
const revision='fbbd6429b1eb6978c78a092dc68ba09029d03171';
const catalogUrl=`https://raw.githubusercontent.com/Joshua-Leibold/SC2Data/${revision}/mods/swarm.sc2mod/base.sc2data/gamedata/terraintexdata.xml`;
const inputs=[
 ['sand','marsaraex2_2.dds','color'],['sand-normal','meinhoffex3_1normal.dds','normal'],
 ['rock','marsaraex2_3.dds','color'],['rock-normal','korhalcityex2_7normal.dds','normal'],
 ['cracked','marsaraex2_4.dds','color'],['cracked-normal','marsaraex2_4normal.dds','normal'],
 ['dark-rock','marsaraex2_6.dds','color'],['dark-rock-normal','snowrefinery_05normal.dds','normal'],
 ['panels','castanarex2_panels.dds','color'],['panels-normal','castanarex2_panelsnormal.dds','normal'],
 ['plates','prisonship_7.dds','color'],['plates-normal','prisonship_7normal.dds','normal'],
 ['char-soil','char_dirt.dds','color'],['char-soil-normal','char_dirtnormal.dds','normal'],
 ['char-rock','char_rock.dds','color'],['char-rock-normal','char_rocknormal.dds','normal'],
 ['char-cracked','char_dirt_cracked.dds','color'],['char-cracked-normal','char_dirt_crackednormal.dds','normal'],
 ['snow','iceworld_1.dds','color'],['snow-normal','iceworld_1normal.dds','normal'],
 ['ice','iceworld_2.dds','color'],['ice-normal','iceworld_2normal.dds','normal'],
 ['ice-rock','iceworld_8.dds','color'],['ice-rock-normal','iceworld_8normal.dds','normal'],
 ['dust','dust3.dds','particle'],['smoke','smoke_wispy11.dds','particle'],
 ['ash','ash_r1.dds','particle'],['snow-fleck','dustdots2.dds','particle'],
];
const prior=await fs.readFile(lockFile,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
async function write(file,bytes){if(check){assert.equal(hash(await fs.readFile(file)),hash(bytes),file);}else{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);}}
await fs.mkdir(root,{recursive:true});
let catalog=await fs.readFile(root+'/source-catalog-swarm.xml').catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
if(!catalog){if(check)throw Error('Missing catalog evidence');catalog=await fetchBinary(catalogUrl,45);assert.match(catalog.toString(),/CTerrainTex id="IceWorld1"/);await write(root+'/source-catalog-swarm.xml',catalog);}
if(prior)assert.equal(hash(catalog),prior.catalog.sha256,'Pinned terrain catalog changed');
for(const [index,kind] of [[1,'Snow'],[2,'Ice'],[8,'Rock']]){
 const block=catalog.toString().match(new RegExp(`<CTerrainTex id="IceWorld${index}">([\\s\\S]*?)<\\/CTerrainTex>`))?.[1];
 assert.ok(block?.includes(`PhysicsMaterial value="${kind}"`)&&block.includes(`IceWorld_${index}Normal.dds`),'Missing original ice source binding');
}
const sources=[],records=[];
for(const [name,filename,role] of inputs){
 const file='assets/private/dds/'+filename,url='https://dist.sc2arcade.com/star-assets/textures/'+filename;
 let bytes=await fs.readFile(file).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
 const acquired=!bytes;
 if(!bytes){if(check)throw Error('Missing original source '+filename);bytes=await fetchBinary(url,45);assert.equal(bytes.toString('ascii',0,4),'DDS ');await write(file,bytes);}
 assert.equal(bytes.toString('ascii',0,4),'DDS ');const decoded=decodeDds(bytes),sourceSha256=hash(bytes);
 assert.ok(decoded.width>0&&decoded.height>0&&decoded.width<=4096&&decoded.height<=4096);
 const source={file,filename,sourcePath:'Assets/Textures/'+filename,source:url,bytes:bytes.length,sha256:sourceSha256,width:decoded.width,height:decoded.height};
 const old=prior?.sources.find(r=>r.filename===filename);if(prior){assert.ok(old,'Unpinned source '+filename);assert.equal(old.sha256,sourceSha256,'Source changed '+filename);assert.equal(old.bytes,bytes.length);}
 sources.push(source);
 const image=role==='normal'?convertMaterialPixels(decoded,{normal:true}):{...decoded,rgba:Buffer.from(decoded.rgba)};
 // Ground alpha is deliberately not interpreted as transparency, roughness or height.
 // Ash RGB has a nonblack rectangular background; retain its explicit DDS alpha cutout.
 // Other particle opacity remains the documented source-luminance adaptation, not client weather parity.
 let alphaMin=255,alphaMax=0;for(let p=0;p<decoded.rgba.length;p+=4){alphaMin=Math.min(alphaMin,decoded.rgba[p+3]);alphaMax=Math.max(alphaMax,decoded.rgba[p+3]);
  if(role==='color')image.rgba[p+3]=255;
  if(role==='particle'){const light=Math.max(decoded.rgba[p],decoded.rgba[p+1],decoded.rgba[p+2]);image.rgba[p]=image.rgba[p+1]=image.rgba[p+2]=255;image.rgba[p+3]=name==='ash'?decoded.rgba[p+3]:light;}
 }
 const packed=rgbaToPng(image),packedSha256=hash(packed),id='terrain.visual.'+name,assetUrl='assets/environment/'+id+'.png';
 const record={id,kind:'environment-texture',status:'available',required:true,url:assetUrl,packedFile:'public/'+assetUrl,gitPath:'deploy/runtime/assets/'+packedSha256+'.png',sourceFile:file,sourcePath:source.sourcePath,source:url,sourceSha256,packedSha256,bytes:packed.length,width:image.width,height:image.height,role,colorSpace:role==='normal'?'linear':'srgb',sourceAlpha:{min:alphaMin,max:alphaMax,used:role==='normal'||name==='ash',purpose:role==='normal'?'SC2 tangent normal X (not opacity, height or blend weight)':name==='ash'?'Explicit original DDS alpha retained as ash sprite coverage; not terrain height or blend weight':'unused; no source alpha height or opacity inference'},conversion:role==='normal'?'SC2 tangent X from alpha, inverted Y from green; normalized RGB':name==='ash'?'Original DDS alpha preserved pixel-for-pixel; white tintable RGB; original RGB is not a cutout mask':role==='particle'?'Original sprite maximum RGB luminance into alpha; white tintable RGB':'Original RGB unchanged, alpha set opaque; original alpha retained only in immutable DDS'};
 await write(record.gitPath,packed);await write(record.packedFile,packed);records.push(record);
 console.log(JSON.stringify({id,acquired,sourceBytes:bytes.length,packedBytes:packed.length,width:image.width,height:image.height}));
}
const generated='// Generated by tools/prepare-terrain-batch4.mjs; source-bound original environment pixels.\nexport const ENVIRONMENT_TEXTURE_ASSETS = '+JSON.stringify(records.map(({id,kind,status,required,url})=>({id,kind,status,required,url})),null,2)+';\n';
const lock={version:1,catalog:{revision,url:catalogUrl,sha256:hash(catalog)},sources};
await write(lockFile,JSON.stringify(lock,null,2)+'\n');await write('src/assets/environment-textures.ts',generated);
await write('deploy/runtime/environment-textures.json',JSON.stringify({version:1,generatedSha256:hash(generated),records},null,2)+'\n');
await write(root+'/terrain-source-stamp.json',JSON.stringify({version:1,method:'Exact original DDS and lossless derived PNG; PBR scalar and particle masks are explicitly authored adaptations.',...lock,records},null,2)+'\n');
console.log(JSON.stringify({sources:sources.length,records:records.length,sourceBytes:sources.reduce((n,r)=>n+r.bytes,0),packedBytes:records.reduce((n,r)=>n+r.bytes,0),verified:true}));
