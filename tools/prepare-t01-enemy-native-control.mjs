import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
const base='reports/local/t01-20261024/enemy-visual-fix-r1',name=process.argv[2]??'native-control-before',original=await fs.readFile(base+'/src__simulation__combat__enemy-specials.ts','utf8');
const result=await build({entryPoints:['tools/t01/audit-enemy-branches.ts'],bundle:true,platform:'node',format:'esm',target:'es2022',outfile:base+'/'+name+'.mjs',metafile:true,packages:'external',plugins:[{name:'frozen-native-specials',setup(b){b.onLoad({filter:/[\\/]src[\\/]simulation[\\/]combat[\\/]enemy-specials\.ts$/},args=>({contents:original,loader:'ts',resolveDir:path.dirname(args.path)}));}}]});
await fs.writeFile(base+'/'+name+'-build.json',JSON.stringify({date:new Date().toISOString(),override:{file:'src/simulation/combat/enemy-specials.ts',sha256:createHash('sha256').update(original).digest('hex')},metafile:result.metafile},null,2),{flag:'wx'});
console.log(JSON.stringify({inputs:Object.keys(result.metafile.inputs).length}));
