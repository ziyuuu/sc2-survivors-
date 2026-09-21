/** Original Char terrain textures from the locked TerrainTexData; local DDS decoding only. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ddsToPng} from './dds-png.mjs';
import {materialDdsToPng} from './m3-materials.mjs';
const textures=[['terrain.char','char_dirt.dds'],['terrain.char.normal','char_dirtnormal.dds'],['terrain.rock','char_rock.dds'],['terrain.rock.normal','char_rocknormal.dds'],['terrain.cracked','char_dirt_cracked.dds']];
await fs.mkdir('public/assets/terrain',{recursive:true});await fs.mkdir('assets/private/dds',{recursive:true});
const manifest=[],failures=[];
for(const [id,name] of textures){const source='https://dist.sc2arcade.com/star-assets/textures/'+name,local='assets/private/dds/'+name;try{
 let bytes;try{bytes=await fs.readFile(local);}catch{const response=await fetch(source,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());}
 if(bytes.length<128||bytes.subarray(0,4).toString()!=='DDS ')throw Error('Invalid DDS magic/header');
 const normal=id.endsWith('.normal'),png=normal?materialDdsToPng(bytes,{normal:true}):ddsToPng(bytes),packedFile='public/assets/terrain/'+id+'.png';
 await fs.writeFile(local,bytes);await fs.writeFile(packedFile,png);manifest.push({id,kind:'texture',required:true,packedFile,source,sourcePath:'Assets/Textures/'+name,width:bytes.readUInt32LE(16),height:bytes.readUInt32LE(12),sha256:createHash('sha256').update(png).digest('hex'),colorSpace:normal?'linear':'srgb'});console.log(id,bytes.readUInt32LE(16)+'x'+bytes.readUInt32LE(12));
 }catch(e){failures.push({id,source,error:e.message});console.error(id,e.message);}}
await fs.writeFile('assets/private/terrain-pack.json',JSON.stringify({manifest,failures},null,2));if(failures.length)process.exitCode=1;
