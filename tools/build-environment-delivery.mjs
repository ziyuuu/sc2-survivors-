import fs from 'node:fs/promises';
import {constants,createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fullEnvironmentModelIds} from '../src/render/terrain/environment-compositions.ts';

const root='reports/local/mvp5-delivery-20261014',preview='preview/environment-delivery-20261014',web='dist/MVP5-Final-Web-20261014',html='dist/SC2-Survivors-MVP5-Final-20261014.html';
const mode=process.argv[2],revision=process.argv[3]??'r1';assert.ok(/^r\d+$/.test(revision));
const viewer='dist/SC2-Survivors-MVP5-Five-Map-Viewer'+(revision==='r1'?'':'-'+revision.toUpperCase())+'-20261014.html';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
async function hash(file){const h=createHash('sha256');for await(const b of createReadStream(file))h.update(b);return h.digest('hex')}
if(mode==='game'){
 const source='dist/MVP5-Lifecycle-Web-20261014-R2',binding=await read(source+'/build-inputs.json');
 await fs.access(web).then(()=>{throw Error('Final Web exists')},e=>{if(e.code!=='ENOENT')throw e});
 for(const r of binding.inputs)assert.equal(await hash(r.file),r.sha256,r.file);
 for(const r of binding.builtFiles)assert.equal(await hash(source+'/'+r.file),r.sha256,r.file);
 await fs.cp(source,web,{recursive:true,force:false,errorOnExist:true});
 for(const r of binding.builtFiles)assert.equal(await hash(web+'/'+r.file),r.sha256,r.file);
 const old=await read('reports/local/mvp5-lifecycle-20261014/offline-build-r2.json');
 assert.equal(await hash(old.html.path),old.html.sha256);await fs.copyFile(old.html.path,html,constants.COPYFILE_EXCL);assert.equal(await hash(html),old.html.sha256);
 await fs.writeFile(root+'/game-build.json',JSON.stringify({at:new Date().toISOString(),web,html:{...old.html,path:html},appBuildId:binding.appBuildId,sourceWeb:source,sourceHtml:old.html.path,inputs:binding.inputs,builtFiles:binding.builtFiles,method:'Byte-identical copy of the verified final step 3/4 runtime. Original build metadata is retained as provenance.'},null,2),{flag:'wx'});
 console.log(JSON.stringify({web,html,appBuildId:binding.appBuildId,byteExact:true}));
}else if(mode==='viewer'){
 const release=await read(web+'/web-release.json'),manifest=await read(web+'/'+release.manifest),ids=new Set(['industrial','ice','mar-sara','char','frontier'].flatMap(fullEnvironmentModelIds));
 for(const id of Object.keys(manifest.assets))if(id.startsWith('terrain.visual.')||id.startsWith('environment.sample.'))ids.add(id);
 const urls={},assets=[];
 for(const id of ids){const r=manifest.assets[id];assert.ok(r,id);const file='deploy/runtime/'+r.url,b=await fs.readFile(file);assert.equal(sha(b),r.sha256,id);if(file.endsWith('.gltf'))for(const m of b.toString().matchAll(/sc2asset:([^"\\\s]+)/g))ids.add(m[1]);urls[id]='/resources/'+r.url;assets.push({id,...r,file});}
 await fs.writeFile(preview+'/assets.json',JSON.stringify(urls));
 const result=await build({entryPoints:[preview+'/main.ts'],outfile:preview+'/sample.js',bundle:true,format:'esm',target:'es2022',metafile:true});
 const inputs=await Promise.all(Object.keys(result.metafile.inputs).map(async file=>({file,sha256:await hash(file)})));
 const native=(await read(web+'/build-inputs.json')).inputs;for(const r of inputs.filter(r=>r.file.startsWith('src/'))){const source=native.find(i=>i.file===r.file);assert.ok(source,'Viewer source absent in formal build '+r.file);assert.equal(r.sha256,source.sha256,r.file);}
 const report={at:new Date().toISOString(),appBuildId:release.appBuildId,release:release.release,preview,assets,inputs,files:await Promise.all(['index.html','main.ts','sample.js','assets.json'].map(async name=>({file:preview+'/'+name,sha256:await hash(preview+'/'+name)})))};
 await fs.writeFile(root+'/viewer-build-'+revision+'.json',JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({preview,assets:assets.length,inputs:inputs.length,nativeInputs:inputs.filter(r=>r.file.startsWith('src/')).length}));
}else if(mode==='offline'){
 const source=await read(root+'/viewer-build-'+revision+'.json'),urls={};for(const r of source.files)assert.equal(await hash(r.file),r.sha256,r.file);
 for(const r of source.assets){const b=await fs.readFile(r.file);assert.equal(sha(b),r.sha256,r.id);urls[r.id]='data:'+r.mime+';base64,'+b.toString('base64');}
 const sourceCode=await fs.readFile(preview+'/sample.js','utf8'),needle='var urls = await fetch("./assets.json").then((r) => r.json());';assert.equal(sourceCode.split(needle).length,2);
 const code=Buffer.from(sourceCode.replace(needle,'var urls = globalThis.__ENV_OFFLINE_URLS__;')).toString('base64');
 let entry=await fs.readFile(preview+'/index.html','utf8');const marker="<script type=\"module\">import './sample.js';</script>";assert.equal(entry.split(marker).length,2);
 entry=entry.replace(marker,()=>`<script id="embedded-assets" type="application/json">${JSON.stringify(urls)}</script><script type="module">globalThis.__ENV_OFFLINE_URLS__=JSON.parse(document.getElementById('embedded-assets').textContent);document.getElementById('embedded-assets').remove();try{await import('data:text/javascript;base64,${code}')}catch(error){document.getElementById('notice').textContent='环境启动失败，请重新打开文件。';console.error(error)}</script>`)
 .replace('href="/play/"','href="./SC2-Survivors-MVP5-Final-20261014.html"').replace(/<a id="offline-game"[\s\S]*?<\/a>/,'').replace(/<a id="offline-viewer"[\s\S]*?<\/a>/,'').replace('战斗请进入正式游戏。','战斗请进入正式游戏，并将两个 HTML 文件放在同一文件夹。');
 await fs.writeFile(viewer,entry,{flag:'wx'});await fs.writeFile(root+'/viewer-offline-build'+(revision==='r1'?'':'-'+revision)+'.json',JSON.stringify({at:new Date().toISOString(),file:viewer,bytes:Buffer.byteLength(entry),sha256:sha(entry),sourceBuild:root+'/viewer-build-'+revision+'.json',assets:source.assets.length,method:'Same production environment source, embedded closure, independent viewing clock. Formal game is a separate sibling self-contained HTML.'},null,2),{flag:'wx'});
 console.log(JSON.stringify({viewer,bytes:Buffer.byteLength(entry),assets:source.assets.length}));
}else throw Error('Expected game, viewer or offline');
