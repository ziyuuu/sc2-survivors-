import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
const mode=process.argv[2]??'web',commit='be9e2982944314194c6dcc9dcc535bc321749eb4';
const root=mode==='logic'?'reports/local/performance-f05-20261019/logic-build':'preview/performance-f05-20261019'+(mode==='baseline'?'-baseline':'');
const archive=`reports/local/performance-f05-20261019/${mode}-inputs`;
const tracked=new Set(execFileSync('git',['ls-tree','-r','--name-only',commit,'src']).toString().trim().split('\n'));
const hash=b=>createHash('sha256').update(b).digest('hex');
await fs.mkdir(root,{recursive:true});
let entry='tools/performance-b03-natural.mts';
if(mode!=='logic'){
 entry=root+'/main.ts';
 const main=execFileSync('git',['show',commit+':src/main.ts']).toString().replaceAll("'./","'../../src/").replace('startGame().catch','startGame(529).then(installPerformanceF05).catch');
 await fs.writeFile(entry,"import {installPerformanceF05} from '../../tools/performance-f05-runtime';\n"+main);
}
const loaded=new Map(),overrides=[];
const result=await build({entryPoints:[entry],bundle:true,platform:mode==='logic'?'node':'browser',format:mode==='logic'?'esm':'iife',target:mode==='logic'?'node22':'es2022',outfile:root+(mode==='logic'?'/main.mjs':'/main.js'),metafile:true,minify:false,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'},plugins:[{name:'frozen-main',setup(b){b.onLoad({filter:/\.(ts|mts|css|json|m?js)$/},async a=>{let contents=await fs.readFile(a.path);const relative=path.relative(process.cwd(),a.path).replaceAll('\\','/');if(tracked.has(relative)&&(mode==='baseline'||!['src/simulation/world.ts','src/simulation/types.ts','src/simulation/starship/projections.ts','src/render/effects/equipment-effects.ts'].includes(relative))){const frozen=execFileSync('git',['show',commit+':'+relative],{maxBuffer:20*1024*1024});if(contents.toString().replaceAll('\r\n','\n')!==frozen.toString().replaceAll('\r\n','\n'))overrides.push(relative);contents=frozen;}loaded.set(path.resolve(a.path),contents);const ext=path.extname(a.path);return {contents,loader:ext==='.mjs'?'js':ext==='.mts'?'ts':ext.slice(1),resolveDir:path.dirname(a.path)};});}}]});
if(mode!=='logic'){
 const opening=execFileSync('git',['show',commit+':src/ui/presentation/opening.generated.html'],{maxBuffer:20*1024*1024}).toString();
 await fs.writeFile(root+'/index.html','<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="data:,"><title>B03 交互加载与长局基线</title><link rel="stylesheet" href="/main.css"></head><body>'+opening+'<div id="game-root" inert><canvas id="battle" aria-label="星际幸存小队战场"></canvas><main id="interface"></main></div><script src="/main.js"></script></body></html>');
 // Prototype instrumentation imports HUD earlier. Keep the already-bound production
 // presentation cascade byte-for-byte, independent of diagnostic import ordering.
 const css=await fs.readFile('preview/performance-b02-20261019/main.css');
 if(hash(css)!=='933acd9d0cf03eb12024b8ac615027441c29dec053f5ce657ecd956b17c66949')throw Error('B02 presentation baseline changed');
 await fs.writeFile(root+'/main.css',css);
}
const inputs=[];for(const file of Object.keys(result.metafile.inputs)){const bytes=loaded.get(path.resolve(file))??await fs.readFile(file);inputs.push({file,bytes:bytes.length,sha256:hash(bytes)});const dest=path.join(archive,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);}
const outputs=[];for(const name of mode==='logic'?['main.mjs']:['index.html','main.js','main.css']){const bytes=await fs.readFile(root+'/'+name);outputs.push({file:root+'/'+name,bytes:bytes.length,sha256:hash(bytes)});}
await fs.writeFile(root+'/build-inputs.json',JSON.stringify({created:new Date().toISOString(),commit,mode,sourcePolicy:'Baseline commit plus F05 source allowlist and new projection-cleanup.ts; unrelated changes excluded',presentationPolicy:mode==='logic'?null:'CSS copied byte-exact from hash-checked B02 frozen ordinary-entry presentation; avoids cascade changes from diagnostic prototype imports',overrides,inputs,outputs},null,2));
console.log(JSON.stringify({root,inputs:inputs.length,overrides,outputs}));
