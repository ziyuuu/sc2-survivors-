/** Refresh game code in an existing packed-resource Web build; do not recompress assets. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {packedLauncher} from './packed-startup.mjs';
const destination=path.resolve(process.argv[2]??''),web=path.resolve(process.argv[3]??'dist/web');
assert.ok(process.argv[2],'Usage: node tools/update-compressed-game.mjs <packed public directory> [web directory]');
const sha=x=>createHash('sha256').update(x).digest('hex'),read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const old=await read(destination+'/web-release.json'),fresh=await read(web+'/web-release.json');
const packed=await read(destination+'/'+old.manifest),original=await read(web+'/'+fresh.manifest);
assert.deepEqual(Object.keys(packed.assets).sort(),Object.keys(original.assets).sort(),'Resource IDs changed: rebuild compressed resources first');
let html=await fs.readFile(web+'/index.html','utf8');
const entry=html.match(/<script type="module"[^>]*src="\.\/([^\"]+\.js)"/)[1],css=html.match(/<link rel="stylesheet"[^>]*href="\.\/([^\"]+\.css)"/)[1];
let code=await fs.readFile(web+'/'+entry,'utf8');
// Material profiles bind the exact GLB bytes. Use the compressed manifest's
// already verified identities, as in the original compression pipeline.
const identities=new Map();for(const [id,a]of Object.entries(original.assets))if(a.mime==='model/gltf-binary'&&a.sha256!==packed.assets[id].sha256){const oldHash=identities.get(a.sha256);assert.ok(!oldHash||oldHash===packed.assets[id].sha256);identities.set(a.sha256,packed.assets[id].sha256);}
let modelIdentityReferences=0;for(const [a,b]of identities){modelIdentityReferences+=code.split(a).length-1;code=code.replaceAll(a,b);}
const packedCode=gzipSync(code,{level:9}),codeName='assets/sc2-entry.'+sha(packedCode).slice(0,16)+'.js.gz';
const indexCode=await fs.readFile(destination+'/sites-pack-index.js','utf8'),indexName='sites-pack-index.'+sha(indexCode).slice(0,20)+'.js';
const launcher=packedLauncher(path.basename(codeName),indexName);
const launcherName='assets/index-'+sha(launcher).slice(0,16)+'.js';
await fs.writeFile(destination+'/'+codeName,packedCode);await fs.writeFile(destination+'/'+launcherName,launcher);await fs.copyFile(web+'/'+css,destination+'/'+css);
await fs.writeFile(destination+'/'+indexName,indexCode);const worker=(await fs.readFile(new URL('./packed-sites-sw.js',import.meta.url),'utf8')).replace("'./sites-pack-index.js'",JSON.stringify('./'+indexName));await fs.writeFile(destination+'/sites-sw.js',worker);
if(packed.gpuTextures){await fs.mkdir(destination+'/basis',{recursive:true});for(const name of ['basis_transcoder.js','basis_transcoder.wasm','README.md'])await fs.copyFile('node_modules/three/examples/jsm/libs/basis/'+name,destination+'/basis/'+name);await fs.copyFile('tools/runtime-ktx/BASIS-LICENSE.txt',destination+'/basis/LICENSE.txt');}
html=html.replace('./'+entry,'./'+launcherName).replace('./'+fresh.manifest,'./'+old.manifest);
await fs.writeFile(destination+'/index.html',html);
await fs.writeFile(destination+'/web-release.json',JSON.stringify({...old,appBuildId:fresh.appBuildId,runSchema:fresh.runSchema,sourceWebRelease:fresh.release,compressedEntrySha256:sha(packedCode)},null,2)+'\n');
// Keep preceding immutable entry/CSS files for already-open or updating pages.
// Retire a release only through an explicit, scoped delivery cleanup.
console.log(JSON.stringify({destination,appBuildId:fresh.appBuildId,resourceRelease:old.release,entry:codeName,css,resourceIds:Object.keys(packed.assets).length,modelIdentityReferences}));
