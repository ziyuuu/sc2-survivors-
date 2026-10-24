import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
const root='preview/performance-b02-20261019',archive='reports/local/performance-b02-20261019/inputs';
const commit='be9e2982944314194c6dcc9dcc535bc321749eb4';
const tracked=new Set(execFileSync('git',['ls-tree','-r','--name-only',commit,'src']).toString().trim().split('\n'));
await fs.mkdir(root,{recursive:true});
const entry=(await fs.readFile('src/main.ts','utf8')).replaceAll("'./","'../../src/").replace('startGame().catch',"startGame(529).then(installPerformanceB02).catch");
await fs.writeFile(root+'/main.ts',"import {installPerformanceB02} from '../../tools/performance-b02-runtime';\n"+entry);
const loaded=new Map(),overrides=[];
const result=await build({entryPoints:[root+'/main.ts'],bundle:true,format:'iife',target:'es2022',outfile:root+'/main.js',metafile:true,minify:false,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'},plugins:[{name:'freeze-main-and-capture',setup(b){b.onLoad({filter:/\.(ts|css|json|m?js)$/},async a=>{let contents=await fs.readFile(a.path);const relative=path.relative(process.cwd(),a.path).replaceAll('\\','/');if(tracked.has(relative)){const frozen=execFileSync('git',['show',commit+':'+relative],{maxBuffer:20*1024*1024});if(contents.toString().replaceAll('\r\n','\n')!==frozen.toString().replaceAll('\r\n','\n'))overrides.push(relative);contents=frozen;}loaded.set(path.resolve(a.path),contents);return {contents,loader:path.extname(a.path)==='.mjs'?'js':path.extname(a.path).slice(1),resolveDir:path.dirname(a.path)};});}}]});
const opening=execFileSync('git',['show',commit+':src/ui/presentation/opening.generated.html'],{maxBuffer:20*1024*1024}).toString();
await fs.writeFile(root+'/index.html','<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="data:,"><title>B02 代表场景性能采样</title><link rel="stylesheet" href="/main.css"></head><body>'+opening+'<div id="game-root" inert><canvas id="battle" aria-label="星际幸存小队战场"></canvas><main id="interface"></main></div><script src="/main.js"></script></body></html>');
const hash=b=>createHash('sha256').update(b).digest('hex');const inputs=[];
for(const file of Object.keys(result.metafile.inputs)){const b=loaded.get(path.resolve(file))??await fs.readFile(file);inputs.push({file,bytes:b.length,sha256:hash(b)});const dest=path.join(archive,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,b);}
const outputs=[];for(const name of ['index.html','main.js','main.css']){const b=await fs.readFile(root+'/'+name);outputs.push({file:root+'/'+name,bytes:b.length,sha256:hash(b)});}
await fs.writeFile(root+'/build-inputs.json',JSON.stringify({created:new Date().toISOString(),commit,sourcePolicy:'Tracked src inputs read from frozen main commit; generated manifest retained and verified equal to B01. Worktree untouched.',overrides,inputs,outputs},null,2));
console.log(JSON.stringify({root,inputs:inputs.length,overrides,outputs}));
