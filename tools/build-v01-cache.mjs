import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {build} from 'esbuild';
const root='reports/local/v01-20261024/cache-probe';await fs.mkdir(root,{recursive:true});
const result=await build({stdin:{contents:"import {HttpAssetStore} from './src/assets/http-store';import {ResourceCache} from './src/assets/persistent-cache';globalThis.A03Cache={HttpAssetStore,ResourceCache};",resolveDir:process.cwd(),sourcefile:'v01-cache-entry.ts'},bundle:true,format:'iife',target:'es2022',outfile:root+'/cache.js',metafile:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),inputs=[];
for(const file of Object.keys(result.metafile.inputs)){if(file==='v01-cache-entry.ts')continue;const b=await fs.readFile(file);inputs.push({file,sha256:hash(b),bytes:b.length});}
const bytes=await fs.readFile(root+'/cache.js');await fs.writeFile(root+'/build.json',JSON.stringify({inputs,output:{sha256:hash(bytes),bytes:bytes.length}},null,2));
await fs.writeFile(root+'/cache.html','<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>V01 isolated resource cache fixture</title><script src="./cache.js"></script>');
