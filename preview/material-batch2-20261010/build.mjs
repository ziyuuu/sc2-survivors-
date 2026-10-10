import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {build} from 'esbuild';
const label=process.argv[2]??'candidate-r1';if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid label');
const out='reports/local/material-batch2-20261010/'+label,base='preview/material-batch2-20261010';
const previous='reports/local/material-batch2-20261010/baseline-source';
const sha=b=>createHash('sha256').update(b).digest('hex'),baseline=label.startsWith('baseline');
try{await fs.access(out+'/build.json');throw Error('Build evidence exists; use a fresh label');}catch(e){if(e.code!=='ENOENT')throw e;}
const plugin={name:'frozen-original-source',setup(b){b.onResolve({filter:/^\./},args=>{const file=path.resolve(args.resolveDir,args.path),relative=path.relative(path.resolve('src'),file);if(!relative.startsWith('..')&&!path.isAbsolute(relative)){const target=path.resolve(previous,'src',relative);return {path:path.extname(target)?target:target+'.ts'};}});}};
const result=await build({entryPoints:[base+'/main.ts'],bundle:true,write:false,metafile:true,format:'esm',target:'es2022',minify:true,define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true'},plugins:baseline?[plugin]:[]});
const inputs=[];for(const file of Object.keys(result.metafile.inputs).sort()){const bytes=await fs.readFile(file);inputs.push({file,bytes:bytes.length,sha256:sha(bytes)});}
const js=result.outputFiles[0].contents,html=(await fs.readFile(base+'/index.html','utf8')).replace('./main.ts','./main.js');
const release=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8')),manifestData=JSON.parse(await fs.readFile('dist/web/'+release.manifest,'utf8'));
const materials=baseline?[]:JSON.parse(await fs.readFile('deploy/runtime/material-textures.json','utf8')).records;
for(const record of materials)manifestData.assets[record.id]={url:record.url,sha256:record.packedSha256,bytes:record.bytes,kind:record.kind};
const manifest=JSON.stringify(manifestData);
const stamp={label,baseline,sourceDigest:sha(JSON.stringify(inputs)),jsSha256:sha(js),manifestSha256:sha(manifest),materialResources:materials.map(r=>({id:r.id,sha256:r.packedSha256})),inputs,release,method:baseline?'Frozen b56201c production source before batch 2':'Current formal renderer and source-bound material resources; diagnostic fixture only'};
await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/main.js',js);await fs.writeFile(out+'/index.html',html);await fs.writeFile(out+'/asset-manifest.json',manifest);await fs.writeFile(out+'/build.json',JSON.stringify(stamp,null,2));
const archive=out+'/sources';for(const input of inputs.filter(i=>!i.file.startsWith('node_modules/')&&!i.file.startsWith('reports/'))){const file=path.join(archive,input.file);await fs.mkdir(path.dirname(file),{recursive:true});await fs.copyFile(input.file,file);}
console.log(JSON.stringify({label,out,sourceDigest:stamp.sourceDigest,jsSha256:stamp.jsSha256}));
