import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const outfile=path.resolve('reports/local/t01-20261024/generate-development.mjs');await build({entryPoints:['tools/t01/generate-development.ts'],outfile,bundle:true,format:'esm',platform:'node',packages:'external'});await import(pathToFileURL(outfile).href);
