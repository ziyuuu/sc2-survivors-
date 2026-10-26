import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {draftInspectionPlugin} from './t01/build-plugins.mjs';
const outfile='reports/local/t01-20261024/debug-tavern.mjs';
await build({entryPoints:['tools/t01/debug-tavern.ts'],bundle:true,platform:'node',format:'esm',outfile,plugins:[draftInspectionPlugin()],define:{'import.meta.env':JSON.stringify({VITE_FUN_LAB:'1',DEV:false,PROD:false})}});
const r=spawnSync(process.execPath,[outfile,...process.argv.slice(2)],{stdio:'inherit'});process.exitCode=r.status;
