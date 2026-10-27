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
let html=await fs.readFile(web+'/index.html','utf8'),previous=await fs.readFile(destination+'/index.html','utf8');
const entry=html.match(/<script type="module"[^>]*src="\.\/([^\"]+\.js)"/)[1],css=html.match(/<link rel="stylesheet"[^>]*href="\.\/([^\"]+\.css)"/)[1];
let code=await fs.readFile(web+'/'+entry,'utf8');
// Material profiles bind the exact GLB bytes. Use the compressed manifest's
// already verified identities, as in the original compression pipeline.
const identities=new Map();for(const [id,a]of Object.entries(original.assets))if(a.mime==='model/gltf-binary'&&a.sha256!==packed.assets[id].sha256){const oldHash=identities.get(a.sha256);assert.ok(!oldHash||oldHash===packed.assets[id].sha256);identities.set(a.sha256,packed.assets[id].sha256);}
let modelIdentityReferences=0;for(const [a,b]of identities){modelIdentityReferences+=code.split(a).length-1;code=code.replaceAll(a,b);}
// Same bounded packed-resource concurrency as the approved compressed build.
const concurrency=/length:Math\.min\(4,([\w$]+)\.length\)/g;assert.equal([...code.matchAll(concurrency)].length,1);code=code.replace(concurrency,'length:Math.min(12,$1.length)');
const packedCode=gzipSync(code,{level:9}),codeName='assets/sc2-entry.'+sha(packedCode).slice(0,16)+'.js.gz';
const launcher=packedLauncher(path.basename(codeName));
const launcherName='assets/index-'+sha(launcher).slice(0,16)+'.js';
await fs.writeFile(destination+'/'+codeName,packedCode);await fs.writeFile(destination+'/'+launcherName,launcher);await fs.copyFile(web+'/'+css,destination+'/'+css);
await fs.copyFile(new URL('./packed-sites-sw.js',import.meta.url),destination+'/sites-sw.js');
html=html.replace('./'+entry,'./'+launcherName).replace('./'+fresh.manifest,'./'+old.manifest);
await fs.writeFile(destination+'/index.html',html);
await fs.writeFile(destination+'/web-release.json',JSON.stringify({...old,appBuildId:fresh.appBuildId,runSchema:fresh.runSchema,sourceWebRelease:fresh.release,compressedEntrySha256:sha(packedCode)},null,2)+'\n');
// Delete only superseded code referenced by the preceding entry, never packed resources.
const obsolete=[...previous.matchAll(/(?:src|href)="\.\/(assets\/[^\"]+\.(?:js|css))"/g)].map(m=>m[1]);
for(const relative of obsolete)if(![css,launcherName].includes(relative)){
 const oldCode=await fs.readFile(destination+'/'+relative,'utf8').catch(()=>''),gzip=oldCode.match(/new URL\('\.\/(sc2-entry[^']*\.js\.gz)'/);
 if(gzip&&'assets/'+gzip[1]!==codeName)await fs.rm(destination+'/assets/'+gzip[1],{force:true});
 await fs.rm(destination+'/'+relative,{force:true});
}
console.log(JSON.stringify({destination,appBuildId:fresh.appBuildId,resourceRelease:old.release,entry:codeName,css,resourceIds:Object.keys(packed.assets).length,modelIdentityReferences}));
