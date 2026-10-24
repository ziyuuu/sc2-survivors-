import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const variant=process.argv[2]??'candidate-r1',root='reports/local/performance-d02-medium-20261021',web='preview/performance-d02-medium-20261021-'+variant,previous='preview/performance-a03-20261021-r2';
const baseline=variant.startsWith('baseline'),frozen='reports/local/performance-a03-20261021/frozen-inputs';
const changes=['src/render/effects/source/detail.ts','src/render/effects/source/particles.ts','src/render/effects/source/player.ts','src/render/scene/scene-shadows.ts','src/render/scene/scene-contact.ts','src/render/scene/screen-refraction.ts','src/render/scene/battle-renderer.ts','src/ui/presentation/settings-screen.ts'];
const hash=b=>createHash('sha256').update(b).digest('hex'),loaded=new Map(),overrides=[];
await fs.mkdir(web,{recursive:false});
for(const name of ['main.ts','surface.ts','main.css','index.html','current.json','runtime-config.json'])await fs.copyFile(previous+'/'+name,web+'/'+name);
const plugin={name:'d02-frozen-with-explicit-medium-changes',setup(b){b.onLoad({filter:/\.(ts|mts|css|json|m?js)$/},async a=>{
 const file=path.relative(process.cwd(),a.path).replaceAll('\\','/');let bytes=await fs.readFile(a.path);
 if(file.startsWith('src/')&&(baseline||!changes.includes(file))){const old=await fs.readFile(frozen+'/'+file);if(!bytes.equals(old))overrides.push(file);bytes=old;}
 loaded.set(file,bytes);const ext=path.extname(file);return {contents:bytes,loader:ext==='.mjs'?'js':ext==='.mts'?'ts':ext.slice(1),resolveDir:path.dirname(a.path)};
});}};
const result=await build({entryPoints:[web+'/main.ts'],bundle:true,platform:'browser',format:'iife',target:'es2022',outfile:web+'/main.js',metafile:true,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'},plugins:[plugin]});
const inputs=[];for(const [file,bytes]of loaded){inputs.push({file,bytes:bytes.length,sha256:hash(bytes)});const target=root+'/'+variant+'-inputs/'+file;await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);}
const outputs=[];for(const name of ['main.js','main.css','index.html','current.json','runtime-config.json']){const bytes=await fs.readFile(web+'/'+name);outputs.push({file:web+'/'+name,bytes:bytes.length,sha256:hash(bytes)});}
const original=JSON.parse(await fs.readFile(previous+'/build-inputs.json')),production=inputs.filter(f=>f.file.startsWith('src/'));
for(const f of production){const old=original.inputs.find(o=>o.file===f.file);if(baseline||!changes.includes(f.file))assert.equal(f.sha256,old?.sha256,f.file);}
if(baseline)assert.equal(production.length,414);else assert.equal(production.length,415);
await fs.writeFile(web+'/build-inputs.json',JSON.stringify({variant,scope:'A03 frozen production baseline; only listed medium-preset files from workspace. Same seed529/Char diagnostic entry, real HTTP assets. No simulation instrumentation.',changes:baseline?[]:changes,inputs,outputs,overrides,metafile:result.metafile},null,2)+'\n');
console.log(JSON.stringify({variant,production:production.length,changes:baseline?0:changes.length,main:outputs[0]}));
