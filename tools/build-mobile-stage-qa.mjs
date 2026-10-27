import fs from 'node:fs/promises';import path from 'node:path';import {gzipSync} from 'node:zlib';import {build} from 'esbuild';
import {packedLauncher} from './packed-startup.mjs';
const output=path.resolve('reports/local/sites-mobile-20261028/packed');await fs.mkdir(output+'/assets',{recursive:true});
const original=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8')),source=JSON.parse(await fs.readFile('dist/web/'+original.manifest,'utf8')),release=JSON.parse(await fs.readFile(output+'/web-release.json','utf8')),packed=JSON.parse(await fs.readFile(output+'/'+release.manifest,'utf8'));
const result=await build({entryPoints:['tools/qa-mobile-stage-lifecycle.ts'],bundle:true,write:false,format:'esm',minify:true,target:'es2022',define:{'import.meta.env.DEV':'false'}});let code=result.outputFiles[0].text;
const hashes=new Map();for(const [id,a]of Object.entries(source.assets))if(a.mime==='model/gltf-binary')hashes.set(a.sha256,packed.assets[id].sha256);for(const [from,to]of hashes)code=code.replaceAll(from,to);
await fs.writeFile(output+'/assets/qa-lifecycle.js.gz',gzipSync(code));await fs.writeFile(output+'/assets/qa-lifecycle.js',packedLauncher('qa-lifecycle.js.gz'));
await fs.writeFile(output+'/qa-mobile.html',`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="sc2-asset-manifest" content="./${release.manifest}"><style>body{background:#10202c;color:white;font:14px system-ui}canvas{width:100%;height:50vh}pre{white-space:pre-wrap}</style><h1 id="qa-status">准备三关生命周期</h1><canvas id="battle"></canvas><main id="interface"></main><pre id="qa-result"></pre><script type="module" src="./assets/qa-lifecycle.js"></script>`);
console.log(output+'/qa-mobile.html');
