/** Local verification entry only. Never include quality-lab.html in a release. */
import {build} from 'vite';
import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {packedLauncher} from './packed-startup.mjs';
const root=process.argv[2]??'dist/quality-20261028',out=root+'/harness';
await build({base:'./',publicDir:false,plugins:[{name:'quality-test-hooks',enforce:'pre',transform(code,id){
 if(id.replaceAll('\\','/').endsWith('/src/render/loaders/managed-textures.ts'))return code+`\nexport function localTextureInventory(){return [...bindings.values()].map(b=>({id:b.id,image:b.image,width:b.source.data?.width,height:b.source.data?.height,live:b.textures.filter(r=>r.deref()).length}));}\n`;
 if(!id.replaceAll('\\','/').endsWith('/src/main.ts'))return;
 return `import {spawnMission} from './simulation/missions/runtime';import {httpStore} from './assets/http-store';import {applyPendingTextureTier,localTextureInventory} from './render/loaders/managed-textures';import {deviceProbeReport} from './platform/device-probe';\n`+code.replace('startGame().catch(',`startGame(529).then(app=>{globalThis.__QUALITY_APP__={...app,httpStore,applyPendingTextureTier,deviceProbeReport,localTextureInventory,spawnMission};}).catch(`);
}}],build:{outDir:out,emptyOutDir:true,minify:true,target:'es2022'}});
const html=await fs.readFile(out+'/index.html','utf8'),entry=html.match(/src="\.\/([^" ]+\.js)"/)[1],source=await fs.readFile(out+'/'+entry,'utf8');
const info=JSON.parse(await fs.readFile(root+'/web/web-release.json','utf8')),packedInfo=JSON.parse(await fs.readFile(root+'/public/web-release.json','utf8')),original=JSON.parse(await fs.readFile(root+'/web/'+info.manifest,'utf8')),packed=JSON.parse(await fs.readFile(root+'/public/'+packedInfo.manifest,'utf8'));
let patched=source;for(const [id,row]of Object.entries(original.assets))if(row.mime==='model/gltf-binary')patched=patched.replaceAll(row.sha256,packed.assets[id].sha256);
const code=gzipSync(patched),name='sc2-quality-lab.'+createHash('sha256').update(code).digest('hex').slice(0,16)+'.js.gz';
const publicDir=root+'/public',files=await fs.readdir(publicDir),index=files.filter(f=>/^sites-pack-index\.[a-f0-9]+\.js$/.test(f));
const worker=await fs.readFile(publicDir+'/sites-sw.js','utf8'),indexName=index.find(f=>worker.includes(f));if(!indexName)throw Error('Missing immutable index');
await fs.writeFile(publicDir+'/assets/'+name,code);await fs.writeFile(publicDir+'/assets/quality-lab.js',packedLauncher(name,indexName));
const production=await fs.readFile(publicDir+'/index.html','utf8');await fs.writeFile(publicDir+'/quality-lab.html',production.replace(/src="\.\/assets\/index-[^"]+\.js"/,'src="./assets/quality-lab.js"'));
console.log('Local-only quality-lab.html ready');
