import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadStarshipAssets} from './starship-assets.mjs';
const root=path.resolve(process.env.SC2_UI_PREVIEW_DIR??'preview/starship-integrated-20261016'),hash=b=>createHash('sha256').update(b).digest('hex');
const art=await loadStarshipAssets({check:true});
await fs.mkdir(root,{recursive:true});
const opening=await fs.readFile('src/ui/presentation/opening.generated.html','utf8');
const entries=[{name:'main',entry:'src/main.ts',html:'index.html',label:'正式游戏入口'},{name:'diagnostic',entry:'tools/diagnostics/starship-ui-entry.ts',html:'diagnostic.html',label:'受控集成检查入口'}],reports=[];
for(const e of entries){
 const result=await build({entryPoints:[e.entry],bundle:true,format:'iife',target:'es2022',outfile:path.join(root,e.name+'.js'),metafile:true,minify:false,define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true'}});
 await fs.writeFile(path.join(root,e.html),'<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#101b24"><link rel="icon" href="data:,"><title>星际幸存小队 · '+e.label+'</title><link rel="stylesheet" href="/'+e.name+'.css"></head><body>'+opening+'<div id="game-root" inert><canvas id="battle" aria-label="星际幸存小队战场"></canvas><main id="interface"></main></div><script src="/'+e.name+'.js"></script></body></html>');
 const inputs=[];for(const file of Object.keys(result.metafile.inputs)){const bytes=await fs.readFile(file);inputs.push({file,bytes:bytes.length,sha256:hash(bytes)});}
 const outputs=[];for(const file of [e.name+'.js',e.name+'.css',e.html]){const bytes=await fs.readFile(path.join(root,file));outputs.push({file,bytes:bytes.length,sha256:hash(bytes)});}
 reports.push({...e,inputs,outputs});
}
await fs.writeFile(path.join(root,'build-inputs.json'),JSON.stringify({at:new Date().toISOString(),entries:reports,art:{records:art.length,bytes:art.reduce((n,r)=>n+r.bytes,0),catalogSha256:hash(await fs.readFile('deploy/runtime/starship-assets.json'))}},null,2));
console.log(JSON.stringify({root,entries:reports.map(({entry,inputs,outputs})=>({entry,inputs:inputs.length,outputs}))}));
