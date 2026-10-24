import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const root='preview/starship-native-ui-20261016-r22',source='preview/starship-field-ui-20261016-r21';
const resources=JSON.parse(await fs.readFile(source+'/resources.json','utf8')).resources,images={},files=[];
for(const [i,r] of resources.entries()){
 const src='/ship-art/'+i+path.extname(r.file),file=path.resolve(source,r.file);images[r.key]={src};files.push({url:src,file,sha256:r.sha256});
 if(r.detail){const url='/ship-art/'+i+'-detail'+path.extname(r.detail);images[r.key].detail=url;files.push({url,file:path.resolve(source,r.detail),sha256:r.detailSha256});}
}
await fs.writeFile(root+'/images.json',JSON.stringify(images));await fs.writeFile(root+'/art-files.json',JSON.stringify(files,null,2));
const result=await build({entryPoints:[root+'/main.ts'],bundle:true,format:'iife',target:'es2022',outfile:root+'/main.js',metafile:true,minify:false,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'}});
const opening=await fs.readFile('src/ui/presentation/opening.generated.html','utf8');
await fs.writeFile(root+'/index.html','<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#101b24"><link rel="icon" href="data:,"><title>舰装 UI · 原游戏流程 R22</title><link rel="stylesheet" href="/main.css"></head><body>'+opening+'<div id="game-root" inert><canvas id="battle" aria-label="星际幸存小队战场"></canvas><main id="interface"></main></div><script src="/main.js"></script></body></html>');
const inputs=[];for(const file of Object.keys(result.metafile.inputs)){const bytes=await fs.readFile(file);inputs.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const outputs=[];for(const file of ['main.js','main.css','index.html']){const bytes=await fs.readFile(root+'/'+file);outputs.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const report={at:new Date().toISOString(),entry:'Native production boot / World / BattleRenderer / HUD / menu / intermission, no enemies, real drops, isolated in-memory account',inputs,outputs,artFiles:files.length};await fs.writeFile(root+'/build-inputs.json',JSON.stringify(report,null,2));console.log(JSON.stringify({inputs:inputs.length,outputs,artFiles:files.length}));
