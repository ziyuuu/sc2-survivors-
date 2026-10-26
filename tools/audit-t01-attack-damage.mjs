import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {draftInspectionPlugin} from './t01/build-plugins.mjs';
const outfile='reports/local/t01-20261024/mechanics-20261025/audit-attack-damage.mjs';
await build({entryPoints:['tools/t01/audit-attack-damage.ts'],bundle:true,platform:'node',format:'esm',target:'node22',outfile,plugins:[draftInspectionPlugin()],define:{'import.meta.env':JSON.stringify({VITE_FUN_LAB:'1',DEV:false,PROD:false})}});
execFileSync(process.execPath,[outfile,...process.argv.slice(2)],{stdio:'inherit'});
