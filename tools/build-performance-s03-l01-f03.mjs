import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
const mode=process.argv[2]??'web',commit='be9e2982944314194c6dcc9dcc535bc321749eb4';
const revision=process.env.SC2_BATCH_REVISION??'';
const root=mode==='logic'?'reports/local/performance-s03-l01-f03-20261019/logic-build':'preview/performance-s03-l01-f03-20261019'+(mode==='baseline'?'-baseline':mode==='native'?'-native':'')+revision;
const archive=`reports/local/performance-s03-l01-f03-20261019/${mode}${revision}-inputs`;
const tracked=new Set(execFileSync('git',['ls-tree','-r','--name-only',commit,'src']).toString().trim().split('\n'));
const hash=b=>createHash('sha256').update(b).digest('hex');
await fs.mkdir(root,{recursive:true});
let entry='tools/performance-s03-l01-f03-components.ts';
if(mode==='native'){
 entry=root+'/main.ts';
 const main=execFileSync('git',['show',commit+':src/main.ts']).toString().replaceAll("'./","'../../src/").replace('startGame().catch','startGame(529).then(installPerformanceF05).catch');
 await fs.writeFile(entry,"import {installPerformanceF05} from '../../tools/performance-f05-runtime';\n"+main);
}

const loaded=new Map(),overrides=[];
const result=await build({entryPoints:[entry],bundle:true,platform:mode==='logic'?'node':'browser',format:mode==='logic'?'esm':'iife',target:mode==='logic'?'node22':'es2022',outfile:root+(mode==='logic'?'/main.mjs':'/main.js'),metafile:true,minify:false,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'},plugins:[{name:'frozen-main',setup(b){b.onLoad({filter:/\.(ts|mts|css|json|m?js)$/},async a=>{let contents=await fs.readFile(a.path);const relative=path.relative(process.cwd(),a.path).replaceAll('\\','/');if(tracked.has(relative)&&(!['src/simulation/world.ts','src/simulation/types.ts','src/simulation/starship/projections.ts','src/render/effects/equipment-effects.ts','src/ui/starship/legacy-view.ts','src/ui/hud/m3-menu.ts','src/simulation/combat/tracking-mines.ts','src/data/campaign-map.ts','src/render/scene/battle-renderer.ts','src/render/effects/confirmed-hero/skill-effects.ts'].includes(relative))){const frozen=execFileSync('git',['show',commit+':'+relative],{maxBuffer:20*1024*1024});if(contents.toString().replaceAll('\r\n','\n')!==frozen.toString().replaceAll('\r\n','\n'))overrides.push(relative);contents=frozen;}if(mode==='baseline'&&['src/simulation/combat/tracking-mines.ts','src/data/campaign-map.ts','src/render/scene/battle-renderer.ts','src/render/effects/confirmed-hero/skill-effects.ts'].includes(relative))contents=await fs.readFile('reports/local/performance-s03-l01-f03-20261019/before/'+relative);loaded.set(path.resolve(a.path),contents);const ext=path.extname(a.path);return {contents,loader:ext==='.mjs'?'js':ext==='.mts'?'ts':ext.slice(1),resolveDir:path.dirname(a.path)};});}}]});
if(mode!=='logic'){
 await fs.writeFile(root+'/index.html','<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>S03 L01 F03 component evidence</title><style>body{margin:0;background:#101827}</style><canvas></canvas><script src="./main.js"></script>');
 await fs.writeFile(root+'/main.css','');
 if(mode==='native'){
  const opening=execFileSync('git',['show',commit+':src/ui/presentation/opening.generated.html'],{maxBuffer:20*1024*1024}).toString();
  await fs.writeFile(root+'/index.html','<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="data:,"><title>S03 L01 F03 主游戏验证</title><link rel="stylesheet" href="/main.css"></head><body>'+opening+'<div id="game-root" inert><canvas id="battle" aria-label="星际幸存小队战场"></canvas><main id="interface"></main></div><script src="/main.js"></script></body></html>');
  const css=await fs.readFile('preview/performance-b02-20261019/main.css');if(hash(css)!=='933acd9d0cf03eb12024b8ac615027441c29dec053f5ce657ecd956b17c66949')throw Error('CSS changed');await fs.writeFile(root+'/main.css',css);
 }

}
const inputs=[];for(const file of Object.keys(result.metafile.inputs)){const bytes=loaded.get(path.resolve(file))??await fs.readFile(file);inputs.push({file,bytes:bytes.length,sha256:hash(bytes)});const dest=path.join(archive,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);}
const outputs=[];for(const name of mode==='logic'?['main.mjs']:['index.html','main.js','main.css']){const bytes=await fs.readFile(root+'/'+name);outputs.push({file:root+'/'+name,bytes:bytes.length,sha256:hash(bytes)});}
await fs.writeFile(root+'/build-inputs.json',JSON.stringify({created:new Date().toISOString(),commit,mode,sourcePolicy:'Frozen main plus accepted F05/U02 in both; S03/L01/F03 current candidate versus archived pre-change inputs; unrelated changes excluded',presentationPolicy:mode==='logic'?null:'Controlled production component fixture',overrides,inputs,outputs},null,2));
console.log(JSON.stringify({root,inputs:inputs.length,overrides,outputs}));
