import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fullEnvironmentModelIds} from '../src/render/terrain/environment-compositions.ts';

const preview='preview/environment-full-map-20261014';
const evidence='reports/local/mvp5-full-map-20261014/offline-viewer';
const output='dist/SC2-Survivors-Environment-Full-Maps-20261014.html';
const sha=b=>createHash('sha256').update(b).digest('hex');
const registry=JSON.parse(await fs.readFile(preview+'/assets.json','utf8'));
const ids=new Set(['industrial','ice','mar-sara','char','frontier'].flatMap(fullEnvironmentModelIds));
// Include ordinary layouts for the bundled pre-edit comparison as well.
const landscape=await fs.readFile('src/data/campaign-landscape.ts','utf8');
for(const m of landscape.matchAll(/['"](model\.map\.[^'"]+)['"]/g))ids.add(m[1]);
for(const id of Object.keys(registry))if(id.startsWith('terrain.visual.')||id.startsWith('environment.sample.'))ids.add(id);
const urls={},assets=[];
for(const id of ids){
 const file=registry[id];assert.ok(file,'Missing registry entry: '+id);
 const relative=file.replace(/^\//,'');assert.ok(relative.startsWith('public/assets/'));
 const bytes=await fs.readFile(relative),ext=path.extname(relative);
 const mime=ext==='.gltf'?'model/gltf+json':ext==='.png'?'image/png':ext==='.webp'?'image/webp':null;
 assert.ok(mime,'Unsupported asset '+relative);
 if(ext==='.gltf')for(const m of bytes.toString('utf8').matchAll(/sc2asset:([^"\\\s]+)/g))ids.add(m[1]);
 urls[id]='data:'+mime+';base64,'+bytes.toString('base64');
 assets.push({id,path:relative,bytes:bytes.length,sha256:sha(bytes)});
}
const bundles=[];
for(const name of ['sample','before']){
 const bytes=await fs.readFile(preview+'/'+name+'.js'),source=bytes.toString('utf8');
 const needle='var urls = await fetch("./assets.json").then((r) => r.json());';
 assert.equal(source.split(needle).length,2,'Expected one asset loader');
 const offline=source.replace(needle,'var urls = globalThis.__ENV_OFFLINE_URLS__;');
 bundles.push({name,sourceSha256:sha(bytes),code:Buffer.from(offline).toString('base64')});
}
let html=await fs.readFile(preview+'/index.html','utf8');
const marker='<script type="module">const p=new URLSearchParams(location.search);import(p.has(\'before\')?\'./before.js\':\'./sample.js\');</script>';
assert.equal(html.split(marker).length,2);
const boot=`<script id="embedded-assets" type="application/json">${JSON.stringify(urls)}</script>
<script type="module">
globalThis.__ENV_OFFLINE_URLS__=JSON.parse(document.getElementById('embedded-assets').textContent);
document.getElementById('embedded-assets').remove();
// Keep both versions self-contained when switching through the comparison link.
const code=new URLSearchParams(location.search).has('before')?'${bundles[1].code}':'${bundles[0].code}';
try{await import('data:text/javascript;base64,'+code)}catch(error){document.getElementById('notice').textContent='启动失败：'+error;console.error(error)}
</script>`;
html=html.replace(marker,()=>boot).replace('<title>五图完整环境</title>','<title>五图环境小样 · 离线版</title>').replace('地表 · 贴地 · 岸线','离线版 · 地表 · 贴地 · 岸线');
await fs.mkdir('dist',{recursive:true});await fs.mkdir(evidence,{recursive:true});
await fs.writeFile(output,html,{flag:'wx'});
const result={at:new Date().toISOString(),output,bytes:Buffer.byteLength(html),sha256:sha(html),assets,bundles:bundles.map(({code,...record})=>record),scope:'Full environment layouts using native game-camera projection and the actual pre-layout bundle. Independent inspection only; not the playable full game.'};
await fs.writeFile(evidence+'/build.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({output,bytes:result.bytes,sha256:result.sha256,assets:assets.length}));
