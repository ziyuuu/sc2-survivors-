import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import path from 'node:path';
const revision=process.argv[2]??'r2',root='preview/performance-l02-measure-20261020-'+revision,hash=x=>createHash('sha256').update(x).digest('hex'),loaded=new Map();
await fs.mkdir(root,{recursive:true});
const proof=JSON.parse(await fs.readFile('reports/local/performance-l02-20261020/pack-proof-1/report.json','utf8'));
const chosen=['raw','gzip'].map(encoding=>proof.chunks.filter(c=>c.encoding===encoding).sort((a,b)=>b.bytes-a.bytes)[0]).filter(Boolean),wanted=new Set(chosen.map(c=>c.index)),fixtures=[];
let buffer='',started=false,pack;
for await(const input of createReadStream('dist/SC2-Survivors-Loot-Elites-R2-20261019.html',{encoding:'utf8',highWaterMark:1048576})){
 buffer+=input;if(!started){const i=buffer.indexOf('<script id="sc2-resource-pack"');if(i<0){buffer=buffer.slice(-64);continue;}buffer=buffer.slice(i);started=true;}
 for(;;){const end=buffer.indexOf('</script>');if(end<0)break;const tag=buffer.slice(0,buffer.indexOf('>')+1),payload=buffer.slice(tag.length,end);buffer=buffer.slice(end+9).trimStart();
  if(!pack)pack=JSON.parse(payload);
  else if(tag.includes('data-sc2-resource-chunk')){const index=Number(tag.match(/data-sc2-resource-chunk="(\d+)"/)[1]);if(wanted.has(index)){const row=chosen.find(c=>c.index===index),part=JSON.parse(payload),file=root+`/chunk-${index}.json`;await fs.writeFile(file,payload);fixtures.push({...row,file,fixtureSha256:hash(payload)});wanted.delete(index);}}
  if(!wanted.size)break;
 }if(!wanted.size)break;
}
assert.equal(wanted.size,0);
const entry=root+'/main.ts';
await fs.writeFile(entry,`import {decode85} from '../../reports/local/performance-u04-20261020/candidate-r2-web-inputs/src/assets/base85.mjs';import {gunzipSync} from 'three/addons/libs/fflate.module.js';import {decodeEmbeddedChunk} from '../../src/assets/offline-pack';window.L02Measure={baseline:part=>{const stored=decode85(part.data,part.storedBytes);return part.encoding==='gzip'?gunzipSync(stored):stored;},candidate:part=>decodeEmbeddedChunk(part,part.data)};`);
const result=await build({entryPoints:[entry],bundle:true,platform:'browser',format:'iife',target:'es2022',outfile:root+'/main.js',metafile:true,plugins:[{name:'frozen-candidate',setup(b){b.onLoad({filter:/\.(ts|mjs|json)$/},async a=>{const file=path.relative(process.cwd(),a.path).replaceAll('\\','/');if(!file.startsWith('src/'))return;const bytes=await fs.readFile('reports/local/performance-l02-20261020/candidate-'+revision+'-inputs/'+file);loaded.set(file,bytes);return {contents:bytes,loader:file.endsWith('.mjs')?'js':file.endsWith('.json')?'json':'ts',resolveDir:path.dirname(a.path)};});}}]});
await fs.writeFile(root+'/index.html','<!doctype html><meta charset="utf-8"><title>L02 bounded decode measurement</title><p>Original resource chunk decoding — controlled measurement</p><script src="/main.js"></script>');
const inputs=[];for(const file of Object.keys(result.metafile.inputs)){const b=loaded.get(file)??await fs.readFile(file);inputs.push({file,bytes:b.length,sha256:hash(b)});}
const final=JSON.parse(await fs.readFile('preview/performance-l02-20261020-candidate-'+revision+'/build-inputs.json','utf8'));
for(const i of inputs.filter(i=>i.file.startsWith('src/')))assert.equal(i.sha256,final.inputs.find(j=>j.file===i.file)?.sha256,i.file);
const outputs=[];for(const file of ['index.html','main.js']){const b=await fs.readFile(root+'/'+file);outputs.push({file:root+'/'+file,bytes:b.length,sha256:hash(b)});}
await fs.writeFile(root+'/build-inputs.json',JSON.stringify({inputs,outputs,fixtures},null,2));console.log(JSON.stringify({fixtures,outputs}));
