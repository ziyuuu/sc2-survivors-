// Rebuild application code only, retaining the already verified original asset
// manifest used to map compressed GLB identities. Does not replace dist/web.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'vite';
await import('./import-opening-reference.mjs');
const output=path.resolve('reports/local/sites-startup-20261028/web');
await build({root:process.cwd(),base:'./',publicDir:false,build:{target:'es2022',sourcemap:false,assetsInlineLimit:0,outDir:output,emptyOutDir:false}});
const original=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));
await fs.copyFile('dist/web/'+original.manifest,output+'/'+original.manifest);
await fs.copyFile('dist/web/runtime-config.json',output+'/runtime-config.json');
const hash=createHash('sha256');
async function collect(dir){for(const entry of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const full=path.join(dir,entry.name);if(entry.isDirectory())await collect(full);else hash.update(path.relative(output,full)).update(await fs.readFile(full));}}
await collect(output);const appBuildId=hash.digest('hex');
const html=await fs.readFile(output+'/index.html','utf8');
await fs.writeFile(output+'/index.html',html.replace('<head>',`<head><meta name="sc2-app-build" content="${appBuildId}"><meta name="sc2-asset-manifest" content="./${original.manifest}">`));
await fs.writeFile(output+'/web-release.json',JSON.stringify({...original,appBuildId},null,2)+'\n');
console.log(JSON.stringify({output,appBuildId}));
