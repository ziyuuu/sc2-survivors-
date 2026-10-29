/** Local packed-resource timing harness. No player UI or publishing changes. */
import {build} from 'vite';import fs from 'node:fs/promises';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {packedLauncher} from './packed-startup.mjs';
const label=process.argv[2]??'baseline';if(!['baseline','candidate'].includes(label))throw Error('Use baseline or candidate');
const root='dist/intermission-20261029',out=root+'/'+label,packed='sites/size-optimized-site/public',raw='dist/runtime-lifecycle-20261028/final/web';
const rawInfo=JSON.parse(await fs.readFile(raw+'/web-release.json','utf8')),packedInfo=JSON.parse(await fs.readFile(packed+'/web-release.json','utf8'));
const original=JSON.parse(await fs.readFile(raw+'/'+rawInfo.manifest,'utf8')),compressed=JSON.parse(await fs.readFile(packed+'/'+packedInfo.manifest,'utf8'));
const worker=await fs.readFile(packed+'/sites-sw.js','utf8'),index=(await fs.readdir(packed)).find(f=>/^sites-pack-index\.[a-f0-9]+\.js$/.test(f)&&worker.includes(f));if(!index)throw Error('Missing packed index');
await fs.mkdir(out+'/assets',{recursive:true});
const audio=label==='baseline'?execFileSync('git',['show','ff8140b:src/render/effects/audio.ts'],{encoding:'utf8'}):await fs.readFile('src/render/effects/audio.ts','utf8');
await build({base:'./',publicDir:false,plugins:[{name:'intermission-local-diagnostic',enforce:'pre',transform(code,id){const file=id.replaceAll('\\','/');
 if(file.endsWith('/src/render/effects/audio.ts'))return audio;
 if(file.endsWith('/src/platform/graphics-profile.ts'))return code.replace('export function deviceHints():DeviceHints {','export function deviceHints():DeviceHints { return {coarse:true,cores:6,dpr:1};');
 if(file.endsWith('/src/main.ts'))return code.replace('startGame().catch(','startGame(529).then(app=>{globalThis.__INTERMISSION_APP__=app;}).catch(');
}}],build:{outDir:out+'/build',emptyOutDir:true,minify:true,target:'es2022'}});
const html=await fs.readFile(out+'/build/index.html','utf8'),entry=html.match(/src="\.\/([^" ]+\.js)"/)[1];let code=await fs.readFile(out+'/build/'+entry,'utf8');
for(const [id,row]of Object.entries(original.assets))if(row.mime==='model/gltf-binary')code=code.replaceAll(row.sha256,compressed.assets[id].sha256);
const bytes=gzipSync(code),sha=createHash('sha256').update(bytes).digest('hex'),name='intermission.'+sha.slice(0,16)+'.js.gz';await fs.writeFile(out+'/assets/'+name,bytes);await fs.writeFile(out+'/assets/intermission-launcher.js',packedLauncher(name,index).replace("scope:'../'","scope:new URL('../',import.meta.url).href"));
const production=await fs.readFile(packed+'/index.html','utf8');await fs.writeFile(out+'/index.html',production.replace(/src="\.\/assets\/index-[^"]+\.js"/,'src="./assets/intermission-launcher.js"'));await fs.writeFile(out+'/diagnostic-build.json',JSON.stringify({label,sha,audioSha:createHash('sha256').update(audio).digest('hex'),baseline:'ff8140b',packedManifest:packedInfo.manifest,seed:529,graphics:'medium',deviceBudget:'unknown-memory touch 6-core'},null,2));console.log(label+' '+sha);
