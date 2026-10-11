import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {build} from 'esbuild';
const label=process.argv[2]??'candidate-r1';if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid label');
const root='reports/local/camera-control-20261011',out=root+'/'+label,base='preview/camera-control-20261011',previous=root+'/baseline-source';
const sha=b=>createHash('sha256').update(b).digest('hex'),baseline=label.startsWith('baseline');
try{await fs.access(out+'/build.json');throw Error('Build evidence exists; use a fresh label');}catch(e){if(e.code!=='ENOENT')throw e;}
const plugin={name:'frozen-original-source',setup(b){b.onResolve({filter:/^\./},args=>{const file=path.resolve(args.resolveDir,args.path),relative=path.relative(path.resolve('src'),file);if(!relative.startsWith('..')&&!path.isAbsolute(relative)){const target=path.resolve(previous,'src',relative);return {path:path.extname(target)?target:target+'.ts'};}});}};
const result=await build({entryPoints:[base+'/main.ts'],bundle:true,write:false,metafile:true,format:'esm',target:'es2022',minify:true,define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true'},plugins:baseline?[plugin]:[]});
const inputs=[];for(const file of Object.keys(result.metafile.inputs).sort()){const bytes=await fs.readFile(file);inputs.push({file,bytes:bytes.length,sha256:sha(bytes)});}
const js=result.outputFiles[0].contents,html=(await fs.readFile(base+'/index.html','utf8')).replace('./main.ts','./main.js');
const frozen=JSON.parse(await fs.readFile(root+'/baseline.json','utf8')),manifestData=JSON.parse(await fs.readFile(root+'/baseline-asset-manifest.json','utf8'));
const added=baseline?[]:JSON.parse(await fs.readFile('deploy/runtime/environment-textures.json','utf8')).records;
for(const record of added)manifestData.assets[record.id]={url:record.url,sha256:record.packedSha256,bytes:record.bytes,kind:record.kind};
const manifest=JSON.stringify(manifestData),stamp={label,baseline,sourceDigest:sha(JSON.stringify(inputs)),jsSha256:sha(js),manifestSha256:sha(manifest),environmentResources:added.map(r=>({id:r.id,sha256:r.packedSha256})),inputs,release:frozen.release,method:baseline?'Frozen f106ac5 production source before camera controls':'Current camera renderer; same original World fixtures'};
await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/main.js',js);await fs.writeFile(out+'/index.html',html);await fs.writeFile(out+'/asset-manifest.json',manifest);await fs.writeFile(out+'/build.json',JSON.stringify(stamp,null,2));
for(const input of inputs.filter(i=>!i.file.startsWith('node_modules/')&&!i.file.startsWith('reports/'))){const file=path.join(out,'sources',input.file);await fs.mkdir(path.dirname(file),{recursive:true});await fs.copyFile(input.file,file);}
console.log(JSON.stringify({label,out,sourceDigest:stamp.sourceDigest,jsSha256:stamp.jsSha256}));
