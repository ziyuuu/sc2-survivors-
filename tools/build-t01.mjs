import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {draftInspectionPlugin} from './t01/build-plugins.mjs';
const base='reports/local/t01-20261024',out=base+'/web',sha=b=>createHash('sha256').update(b).digest('hex');
const original=JSON.parse(await fs.readFile(base+'/active-source.json','utf8'));
const manifest=JSON.parse(await fs.readFile(original.out+'/'+original.manifest,'utf8'));
await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/asset-manifest.json',JSON.stringify(manifest));await fs.writeFile(out+'/runtime-config.json',JSON.stringify({assetBaseUrl:''}));
const inputs=new Map(),artifacts=[];
const opening=await fs.readFile('src/ui/presentation/opening.generated.html','utf8');
for(const mode of ['dynamic','static','combined']){
 const result=await build({entryPoints:[process.argv.includes('--legacy')?'tools/t01/entry.ts':'tools/t01/gallery-entry.ts'],bundle:true,write:false,format:'iife',target:'es2022',minify:true,metafile:true,outfile:mode+'.js',plugins:[draftInspectionPlugin()],define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true','import.meta.env.VITE_FUN_LAB':'"1"',T01_MODE:JSON.stringify(mode)}});
 for(const f of result.outputFiles){const file=path.basename(f.path);await fs.writeFile(out+'/'+file,f.contents);artifacts.push({file,sha256:sha(f.contents),bytes:f.contents.length});}
 for(const p of Object.keys(result.metafile.inputs)){const bytes=await fs.readFile(p);inputs.set(p,{file:p,sha256:sha(bytes),bytes:bytes.length});}
 const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="sc2-asset-manifest" content="./asset-manifest.json"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>T01 · ${mode}</title><link rel="stylesheet" href="./${mode}.css"></head><body>${opening}<div id="game-root" inert><canvas id="battle"></canvas><main id="interface"></main></div><script src="./${mode}.js"></script></body></html>`;
 await fs.writeFile(out+'/'+mode+'.html',html);artifacts.push({file:mode+'.html',bytes:Buffer.byteLength(html),sha256:sha(html)});
}
const report={date:new Date().toISOString(),out,sourceBuild:base+'/active-source.json',inputs:[...inputs.values()],artifacts,resources:original.resources,assetCount:Object.keys(manifest.assets).length,productionMutated:false,scope:'T01 controlled isolated inspection tool for user review. Combined entry contains both dynamic and static/UI catalogues; user visual review is pending.'};
await fs.writeFile(base+'/build.json',JSON.stringify(report,null,2));console.log(JSON.stringify({out,inputs:inputs.size,artifacts:artifacts.length,assets:report.assetCount}));
