import {build} from 'esbuild';
import {draftInspectionPlugin} from './t01/build-plugins.mjs';
const base='reports/local/t01-20261024';
await build({stdin:{contents:"import{STATIC_CASES,DYNAMIC_CASES}from './tools/t01/catalogue';import fs from'node:fs';fs.writeFileSync('reports/local/t01-20261024/catalogue-current.json',JSON.stringify({dynamic:DYNAMIC_CASES,static:STATIC_CASES}));console.log(JSON.stringify({dynamic:DYNAMIC_CASES.length,static:STATIC_CASES.length}));",resolveDir:process.cwd()},outfile:base+'/catalogue-current.mjs',bundle:true,format:'esm',platform:'node',plugins:[draftInspectionPlugin()],define:{'import.meta.env':'{"VITE_FUN_LAB":"1","DEV":false,"PROD":false}'}});
await import('../'+base+'/catalogue-current.mjs');
