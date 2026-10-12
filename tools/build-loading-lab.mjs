import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const label=process.argv[2],baseline=process.argv.includes('--baseline'),root='reports/local/loading-20261012',out=root+'/'+label,base='preview/camera-control-20261011';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid label');
await fs.access(out+'/build.json').then(()=>{throw Error('Existing evidence');},e=>{if(e.code!=='ENOENT')throw e;});
const frozen=path.resolve(root,'baseline-source');
const plugin={name:'verified-frozen-source',setup(b){b.onResolve({filter:/^\./},args=>{const file=path.resolve(args.resolveDir,args.path),relative=path.relative(path.resolve('src'),file);if(!relative.startsWith('..')&&!path.isAbsolute(relative)){const target=path.join(frozen,'src',relative);return {path:path.extname(target)?target:target+'.ts'};}});}};
const result=await build({entryPoints:[base+'/main.ts'],bundle:true,write:false,metafile:true,format:'esm',target:'es2022',minify:true,define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true'},plugins:baseline?[plugin]:[]});
const sha=b=>createHash('sha256').update(b).digest('hex'),inputs=[];
for(const file of Object.keys(result.metafile.inputs).sort()){const bytes=await fs.readFile(file);inputs.push({file,bytes:bytes.length,sha256:sha(bytes)});}
const js=result.outputFiles[0].contents,html=(await fs.readFile(base+'/index.html','utf8')).replace('./main.ts','./main.js');
const manifest=await fs.readFile('reports/local/camera-control-20261011/candidate-r8/asset-manifest.json');
const record={label,baseline,jsSha256:sha(js),htmlSha256:sha(html),manifestSha256:sha(manifest),sourceDigest:sha(JSON.stringify(inputs)),inputs,method:'Same native diagnostic fixtures and camera; only loading/material-cache production changes. Baseline frozen from HEAD before this iteration.'};
await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/main.js',js);await fs.writeFile(out+'/index.html',html);await fs.writeFile(out+'/asset-manifest.json',manifest);await fs.writeFile(out+'/build.json',JSON.stringify(record,null,2));
for(const input of inputs.filter(i=>!i.file.startsWith('node_modules/')&&!i.file.startsWith('reports/'))){const dest=path.join(out,'sources',input.file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(input.file,dest);}
console.log(JSON.stringify({label,baseline,inputs:inputs.length,jsSha256:record.jsSha256}));
