import fs from 'node:fs/promises';
import {build} from '../node_modules/esbuild/lib/main.js';
const base='D:/星际/reports/local/integration-i02-20261022';
await build({stdin:{contents:"import * as inventory from './src/simulation/starship/inventory';window.I02QA={inventory};",resolveDir:'D:/星际',loader:'ts'},bundle:true,format:'iife',outfile:base+'/qa-helper.js'});
for(const file of ['assemble-offline','verify-offline']){
 const ext=file==='verify-offline'?'mts':'mjs',source=await fs.readFile(base+'/'+file+'.'+ext,'utf8');
 await fs.writeFile(base+'/'+file+'-r2.'+ext,source.replaceAll("-r1","-r2"));
}
console.log('Prepared browser inventory fixture and final offline wrappers.');
