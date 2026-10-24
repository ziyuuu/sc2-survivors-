import fs from 'node:fs/promises';
import {build} from '../node_modules/esbuild/lib/main.js';
const base='D:/星际/reports/local/integration-i03-20261022';
const result=await build({stdin:{contents:"import * as inventory from './src/simulation/starship/inventory';import * as combat from './src/simulation/combat/expedition-combat';import * as drops from './src/simulation/starship/drops';window.I03QA={inventory,combat,drops};",resolveDir:'D:/星际',loader:'ts'},bundle:true,format:'iife',outfile:base+'/qa-helper.js',metafile:true});
await fs.writeFile(base+'/qa-helper-inputs.json',JSON.stringify(result.metafile.inputs,null,2));
