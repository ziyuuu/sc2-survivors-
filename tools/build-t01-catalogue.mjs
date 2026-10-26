import {build} from 'esbuild';
import {draftInspectionPlugin} from './t01/build-plugins.mjs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const outfile=path.resolve('reports/local/t01-20261024/generate-catalogue.mjs');
await build({entryPoints:['tools/t01/generate-catalogue.ts'],outfile,bundle:true,format:'esm',platform:'node',packages:'external',plugins:[draftInspectionPlugin()],loader:{'.css':'empty'}});
await import(pathToFileURL(outfile).href);
