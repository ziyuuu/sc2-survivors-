import fs from 'node:fs/promises';
import {build} from 'vite';
const source=process.argv[2],target=process.argv[3];
await build({root:'tools/runtime-ktx',base:'./',publicDir:false,build:{outDir:'../../'+target,emptyOutDir:false}});
for(const name of await fs.readdir(source))if(/\.(ktx2|webp)$/.test(name)||name==='samples.json')await fs.copyFile(source+'/'+name,target+'/'+name);
await fs.mkdir(target+'/basis',{recursive:true});for(const name of ['basis_transcoder.js','basis_transcoder.wasm'])await fs.copyFile('node_modules/three/examples/jsm/libs/basis/'+name,target+'/basis/'+name);
