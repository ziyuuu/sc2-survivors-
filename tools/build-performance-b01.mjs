import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const root='preview/performance-b01-20261019';
await fs.mkdir(root,{recursive:true});
// Reuse the established deterministic fixture; explicitly mount current main's
// starship shell and preferences, which predate this measurement batch.
let entry=await fs.readFile('preview/difficulty-r2-20261016/main.ts','utf8');
entry=entry.replace("import {boot}","import {chooseCampaignMap} from '../../src/data/campaign-map';\nimport {applyDisplayPreferences} from '../../src/ui/display-preferences';\nimport {starshipImage} from '../../src/ui/starship/runtime-art';\nimport {selectRunData} from '../../src/simulation/persistence/run-fields';\nimport {boot}");
entry=entry.replace('setTextScale(textScale());','applyDisplayPreferences();');
// Elite budget subtraction can leave an empty ordinary wave. Math.max([])
// would turn the old fixture clock into -Infinity; empty waves use their due time.
entry=entry.replace('Math.max(...waves[index].members.map((m:any)=>m.offset))','Math.max(0,...waves[index].members.map((m:any)=>m.offset))');
entry=entry.replace('boot({equipmentAccount:account,seed:529})','boot({equipmentAccount:account,seed:529,starship:{resolveImage:starshipImage}})');
entry=entry.replace('let frozen=false,diagnostic=false','let frozen=true,diagnostic=false');
entry=entry.replace('const native=driver.advance.bind(driver);',`const nativePrepare=app.session.prepareNewRun.bind(app.session);
 app.session.prepareNewRun=(...args)=>{const ticket=nativePrepare(...args);ticket.campaignMap=chooseCampaignMap(529,'mar-sara');return ticket;};
 const native=driver.advance.bind(driver);`);
entry=entry.replace('{...app,account,summary,freeze,play,advance,jump,endless,focus,reset,frames,','{...app,account,summary,freeze,play,advance,jump,endless,focus,reset,frames,snapshot:()=>({run:selectRunData(w),statuses:w.statuses.snapshot(),specials:w.enemySpecials.snapshot(),account:w.starship.account}),');
entry=entry.replaceAll('难度 R2 预览','B01 主线性能基线');
await fs.writeFile(root+'/main.ts',entry);
const loaded=new Map();
const result=await build({entryPoints:[root+'/main.ts'],bundle:true,format:'iife',target:'es2022',outfile:root+'/main.js',metafile:true,minify:false,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'},plugins:[{name:'capture-inputs',setup(b){b.onLoad({filter:/\.(ts|css|json|m?js)$/},async a=>{const contents=await fs.readFile(a.path);loaded.set(path.resolve(a.path),contents);return {contents,loader:path.extname(a.path)==='.mjs'?'js':path.extname(a.path).slice(1),resolveDir:path.dirname(a.path)};});}}]});
const opening=await fs.readFile('src/ui/presentation/opening.generated.html','utf8');
await fs.writeFile(root+'/index.html','<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="data:,"><title>B01 主线性能基线</title><link rel="stylesheet" href="/main.css"></head><body>'+opening+'<div id="game-root" inert><canvas id="battle" aria-label="星际幸存小队战场"></canvas><main id="interface"></main></div><script src="/main.js"></script></body></html>');
const hash=b=>createHash('sha256').update(b).digest('hex');
const inputs=[];for(const file of Object.keys(result.metafile.inputs)){const b=loaded.get(path.resolve(file))??await fs.readFile(file);inputs.push({file,bytes:b.length,sha256:hash(b)});const dest=path.join('reports/local/performance-b01-20261019/inputs',file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,b);}
const outputs=[];for(const name of ['index.html','main.js','main.css']){const b=await fs.readFile(root+'/'+name);outputs.push({file:root+'/'+name,bytes:b.length,sha256:hash(b)});}
await fs.writeFile(root+'/build-inputs.json',JSON.stringify({created:new Date().toISOString(),inputs,outputs},null,2));
console.log(JSON.stringify({root,inputs:inputs.length,outputs}));
