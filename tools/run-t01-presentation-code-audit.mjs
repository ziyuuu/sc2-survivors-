import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {draftInspectionPlugin} from './t01/build-plugins.mjs';
await build({entryPoints:['tools/t01/audit-presentation-code.ts'],outfile:'.cache/t01-full-audit-20261026/audit.mjs',bundle:true,platform:'node',format:'esm',packages:'external',plugins:[draftInspectionPlugin()]});
const result=spawnSync(process.execPath,['.cache/t01-full-audit-20261026/audit.mjs',...process.argv.slice(2)],{stdio:'inherit',windowsHide:true});process.exitCode=result.status??1;
