import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
const root='preview/starship-logic-20261015';
const result=await build({entryPoints:[root+'/main.ts'],bundle:true,format:'iife',target:'es2022',outfile:root+'/main.js',metafile:true,minify:false,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'}});
const opening=await fs.readFile('src/ui/presentation/opening.generated.html','utf8');
await fs.writeFile(root+'/index.html','<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#101b24"><link rel="icon" href="data:,"><title>舰装逻辑 · 主游戏内存验证</title><link rel="stylesheet" href="/main.css"></head><body>'+opening+'<div id="game-root" inert><canvas id="battle" aria-label="星际幸存小队战场"></canvas><main id="interface"></main></div><script src="/main.js"></script></body></html>');
const inputs=[];for(const file of Object.keys(result.metafile.inputs)){const bytes=await fs.readFile(file);inputs.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await fs.writeFile(root+'/build-inputs.json',JSON.stringify({at:new Date().toISOString(),diagnostic:true,entry:'production boot / World / BattleRenderer / HUD with an isolated equipment account',persistence:'disabled; no save/recovery acceptance',inputs},null,2));
console.log('Built '+root+' with '+inputs.length+' exact inputs');
