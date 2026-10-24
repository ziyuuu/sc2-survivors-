import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {build} from 'esbuild';
const mode=process.argv[2]??'candidate',revision=process.env.SC2_BATCH_REVISION??'',folder='performance-x04-20261020',root='preview/'+folder+'-'+mode+revision,archive='reports/local/'+folder+'/'+mode+revision+'-inputs';
const previous='reports/local/performance-x03-20261020/candidate-r3-inputs',changes=['src/render/units/pod-view.ts','src/render/effects/source-combat-effects.ts','src/render/scene/battle-renderer.ts'];
const hash=b=>createHash('sha256').update(b).digest('hex'),loaded=new Map(),overrides=[];await fs.mkdir(root,{recursive:true});
const entry=root+'/main.ts';await fs.copyFile('preview/performance-x03-20261020-candidate-r3/main.ts',entry);
await fs.writeFile(entry,"import '../../tools/performance-x04-cold';\n"+await fs.readFile(entry,'utf8'));
const plugins=[{name:'accepted-inputs',setup(b){b.onLoad({filter:/\.(ts|mts|css|json|m?js)$/},async a=>{
 const relative=path.relative(process.cwd(),a.path).replaceAll('\\','/');let contents=await fs.readFile(a.path);
 if(relative.startsWith('src/')){
  if(changes.includes(relative)){if(mode==='baseline')contents=await fs.readFile(previous+'/'+relative);}
  else {const frozen=await fs.readFile(previous+'/'+relative);if(frozen.toString().replaceAll('\r\n','\n')!==contents.toString().replaceAll('\r\n','\n'))overrides.push(relative);contents=frozen;}
 }
 loaded.set(path.resolve(a.path),contents);const ext=path.extname(a.path);return {contents,loader:ext==='.mjs'?'js':ext==='.mts'?'ts':ext.slice(1),resolveDir:path.dirname(a.path)};
 });}}];
const result=await build({entryPoints:[entry],bundle:true,format:'iife',target:'es2022',outfile:root+'/main.js',metafile:true,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'},plugins});
for(const name of ['index.html','main.css'])await fs.copyFile('preview/performance-x03-20261020-candidate-r3/'+name,root+'/'+name);
const inputs=[];for(const file of Object.keys(result.metafile.inputs)){const bytes=loaded.get(path.resolve(file))??await fs.readFile(file);inputs.push({file,bytes:bytes.length,sha256:hash(bytes)});const dest=path.join(archive,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);}
const outputs=[];for(const name of ['index.html','main.css','main.js']){const file=root+'/'+name,bytes=await fs.readFile(file);outputs.push({file,bytes:bytes.length,sha256:hash(bytes)});}
await fs.writeFile(root+'/build-inputs.json',JSON.stringify({created:new Date().toISOString(),mode,previous,changes,overrides,inputs,outputs},null,2));
// The numerical comparison imports the exact same source versions as the browser.
const core=['player','particles','ribbons','timeline'].map(n=>`export * from './src/render/effects/source/${n}.ts';`).join('\n')+['terran','protoss','zerg'].map(r=>`export * from './src/render/effects/${r}-elite-effects.ts';`).join('\n');
await build({stdin:{contents:core,resolveDir:process.cwd(),sourcefile:'numeric-entry.ts'},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'reports/local/'+folder+'/'+mode+revision+'-numeric.mjs',plugins});
console.log(JSON.stringify({root,inputs:inputs.length,overrides,outputs}));
