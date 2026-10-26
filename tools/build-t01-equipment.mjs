import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
const outfile='reports/local/t01-20261024/generate-equipment.mjs';await build({entryPoints:['tools/t01/generate-equipment.ts'],bundle:true,platform:'node',format:'esm',target:'node22',outfile});execFileSync(process.execPath,[outfile],{stdio:'inherit'});
