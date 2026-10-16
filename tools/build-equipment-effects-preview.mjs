import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
const root=process.env.SC2_PREVIEW_DIR??'preview/equipment-effects-r1-20261016';
await fs.mkdir(root,{recursive:true});
let entry=await fs.readFile('preview/performance-20261016/main.ts','utf8');
entry="import {equipmentEffectsLoadout,installEquipmentEffectsLab} from '../../tools/equipment-effects-lab';\n"+entry;
entry=entry.replace("for(const race of ['terran','zerg','protoss'] as const)difficultyLoadout(race,quality,529,account);",'equipmentEffectsLoadout(account);');
entry=entry.replace(" const panel=document.createElement('details');"," installEquipmentEffectsLab(app);\n const panel=document.createElement('details');");
entry=entry.replace("action('地狱18关密度'","action('紫色虫卵外观',()=>(window as any).__EQUIPMENT_EFFECTS__.eggFixture());action('地狱18关密度'");
entry=entry.replaceAll('性能与入门难度预览','装备表现与性能预览')
 .replace(/<p>主菜单可正常开局。当前：.*?<\/p>/,'<p>主菜单可正常开局。使用隔离的真实装备账户，预置幻影、焦土及配套装备；不写入正式存档。下方跳关会开启友军锁血。</p>')
 .replace(/<p><a href="\?gear=0">.*?（重新载入）<\/p>/,'<p>设置 → 画面可切换全特效／中特效，均保留原生分辨率和完整动作。当前性能尚未达到 30／60 FPS 目标。</p>');
await fs.writeFile(root+'/main.ts',entry);
const snapshot=process.env.SC2_SOURCE_SNAPSHOT;
const overrides=process.env.SC2_SOURCE_OVERRIDES?JSON.parse(await fs.readFile(process.env.SC2_SOURCE_OVERRIDES,'utf8')):{};
const loaded=new Map();
const readInput=async file=>{const key=path.relative(process.cwd(),path.resolve(file)).replaceAll('\\','/');return overrides[key]?fs.readFile(overrides[key]):snapshot?await fs.readFile(path.join(snapshot,key)).catch(()=>fs.readFile(file)):fs.readFile(file);};
// Record the exact bytes handed to the compiler, including concurrent work in
// unrelated UI files. Comparison builds override only this task's changed files.
const plugins=[{name:'bound-inputs',setup(b){b.onResolve({filter:/^\./},args=>{for(const ext of ['','.ts','.js','.json']){const file=path.resolve(args.resolveDir,args.path+ext),key=path.relative(process.cwd(),file).replaceAll('\\','/');if(overrides[key])return {path:file};}});b.onLoad({filter:/\.(ts|css|json|m?js)$/},async args=>{const contents=await readInput(args.path);loaded.set(path.resolve(args.path),contents);return {contents,loader:path.extname(args.path)==='.mjs'?'js':path.extname(args.path).slice(1),resolveDir:path.dirname(args.path)};});}}];
const result=await build({entryPoints:[root+'/main.ts'],bundle:true,format:'iife',target:'es2022',outfile:root+'/main.js',metafile:true,minify:false,plugins,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'}});
const opening=await fs.readFile('src/ui/presentation/opening.generated.html','utf8');
await fs.writeFile(root+'/index.html','<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="data:,"><title>装备表现与性能预览</title><link rel="stylesheet" href="/main.css"></head><body>'+opening+'<div id="game-root" inert><canvas id="battle" aria-label="星际幸存小队战场"></canvas><main id="interface"></main></div><script src="/main.js"></script></body></html>');
const inputs=[];for(const file of Object.keys(result.metafile.inputs)){const bytes=loaded.get(path.resolve(file))??await readInput(file);inputs.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});if(process.env.SC2_BASELINE_SNAPSHOT){const dest=path.join(process.env.SC2_BASELINE_SNAPSHOT,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);}}
const bundle=await fs.readFile(root+'/main.js'),report={at:new Date().toISOString(),entry:'Production logic and renderer; isolated memory account. qa=1 alone pins native new-run map recipe/seed and freezes the diagnostic clock.',inputs,bundle:{bytes:bundle.length,sha256:createHash('sha256').update(bundle).digest('hex')}};
await fs.writeFile(root+'/build-inputs.json',JSON.stringify(report,null,2));console.log(JSON.stringify({root,inputs:inputs.length,...report.bundle}));
