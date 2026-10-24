import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
const archive='reports/local/performance-f05-20261019/baseline-inputs',root='reports/local/performance-f05-20261019';
await build({entryPoints:['test/starship-projection-cleanup.test.ts'],bundle:true,platform:'node',format:'esm',target:'node22',packages:'external',outfile:root+'/baseline-regression.mjs',plugins:[{name:'baseline-source',setup(b){b.onLoad({filter:/[\\/]src[\\/].*\.ts$/},async args=>{const relative=path.relative(process.cwd(),args.path).replaceAll('\\','/');let contents;try{contents=await fs.readFile(path.join(archive,relative),'utf8');}catch{contents=execFileSync('git',['show','be9e2982944314194c6dcc9dcc535bc321749eb4:'+relative],{maxBuffer:20*1024*1024}).toString();}return {contents,loader:'ts',resolveDir:path.dirname(args.path)};});}}]});
