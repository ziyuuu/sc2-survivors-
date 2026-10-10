import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
const source='preview/visual-baseline-20261010',out=process.argv[2]??'reports/local/visual-baseline-20261010/lab';
const sha=b=>createHash('sha256').update(b).digest('hex');
const release=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8')),manifest=await fs.readFile('dist/web/'+release.manifest);
const result=await build({entryPoints:[source+'/main.ts'],bundle:true,write:false,metafile:true,format:'esm',target:'es2022',minify:true,define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true'}});
const inputs=[];for(const file of Object.keys(result.metafile.inputs).sort()){const bytes=await fs.readFile(file);inputs.push({file,bytes:bytes.length,sha256:sha(bytes)});}
await fs.mkdir(out,{recursive:true});const js=result.outputFiles[0].contents,html=(await fs.readFile(source+'/index.html','utf8')).replace('./main.ts','./main.js');
const css=(await fs.readFile('src/ui/presentation/world-labels.css','utf8'))+'\n'+(await fs.readFile('src/render/scene/battle-distress.css','utf8'))+'\n'+(await fs.readFile(source+'/style.css','utf8'));
const record={revision:'visual-baseline-r2',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),release,sourceDigest:sha(JSON.stringify(inputs)),jsSha256:sha(js),cssSha256:sha(css),htmlSha256:sha(html),inputs,method:'Compiled minified scene-only diagnostic with current source and unchanged shipped assets. Separate from the exact production Web/HUD measurements.'};
await fs.writeFile(path.join(out,'main.js'),js);await fs.writeFile(path.join(out,'index.html'),html);await fs.writeFile(path.join(out,'style.css'),css);await fs.writeFile(path.join(out,'asset-manifest.json'),manifest);await fs.writeFile(path.join(out,'build.json'),JSON.stringify(record,null,2));
const archive=path.join(path.dirname(out),'source-versions',record.sourceDigest);for(const input of inputs.filter(i=>!i.file.startsWith('node_modules/'))){const dest=path.join(archive,input.file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(input.file,dest);}await fs.writeFile(path.join(archive,'build.json'),JSON.stringify(record,null,2));
console.log(JSON.stringify({out,head:record.head,inputs:inputs.length,sourceDigest:record.sourceDigest,jsSha256:record.jsSha256}));
