import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
const root='preview/difficulty-r2-20261016';
const result=await build({entryPoints:[root+'/main.ts'],bundle:true,format:'iife',target:'es2022',outfile:root+'/main.js',metafile:true,minify:false,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'}});
const opening=await fs.readFile('src/ui/presentation/opening.generated.html','utf8');
await fs.writeFile(root+'/index.html','<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#101b24"><link rel="icon" href="data:,"><title>四档战役与无尽 · R2 预览</title><link rel="stylesheet" href="/main.css"></head><body>'+opening+'<div id="game-root" inert><canvas id="battle" aria-label="星际幸存小队战场"></canvas><main id="interface"></main></div><script src="/main.js"></script></body></html>');
const inputs=[];for(const file of Object.keys(result.metafile.inputs)){const bytes=await fs.readFile(file);inputs.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const bundle=await fs.readFile(root+'/main.js'),report={at:new Date().toISOString(),entry:'Production boot/World/BattleRenderer/HUD with isolated memory account. Normal new game plus explicitly labeled stage/endless/health-lock diagnostic controls.',inputs,bundle:{bytes:bundle.length,sha256:createHash('sha256').update(bundle).digest('hex')}};
await fs.writeFile(root+'/build-inputs.json',JSON.stringify(report,null,2));console.log(JSON.stringify({inputs:inputs.length,...report.bundle}));
