import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {draftInspectionPlugin} from './t01/build-plugins.mjs';
const outfile='reports/local/t01-20261024/audit-ui-catalogue.mjs';
await build({entryPoints:['tools/t01/audit-ui-catalogue.ts'],outfile,bundle:true,platform:'node',format:'esm',target:'node22',plugins:[draftInspectionPlugin()],loader:{'.css':'empty'}});
execFileSync(process.execPath,[outfile],{stdio:'inherit'});
