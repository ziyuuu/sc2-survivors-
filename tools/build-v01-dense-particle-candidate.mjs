import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='reports/local/v01-20261024',dir=base+'/dense-particle-candidate',manifest=JSON.parse(await fs.readFile(dir+'/manifest.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');for(const f of manifest.files){assert.equal(sha(await fs.readFile(f.file)),f.beforeSha256);assert.equal(sha(await fs.readFile(f.candidate)),f.afterSha256);}
let builder=await fs.readFile(base+'/build-dense-current.mjs','utf8');
builder=builder.replace("const result=await build",`const candidateManifest=JSON.parse(await fs.readFile(root+'/${dir}/manifest.json'));const candidateFiles=new Map(await Promise.all(candidateManifest.files.map(async f=>[root+'/'+f.file,await fs.readFile(root+'/'+f.candidate,'utf8')])));\nconst result=await build`);
builder=builder.replace("plugins:[{name:'v01-observation-surface'", "plugins:[{name:'v01-dense-particle-candidate',enforce:'pre',transform(code,id){return candidateFiles.get(id.replaceAll('\\\\','/'));}},{name:'v01-observation-surface'");
builder=builder.replace('const evidence={root,out,', 'const evidence={root,out,candidateManifest,');
builder=builder.replace('no production source edits, not ordinary production FPS', 'two isolated particle/timeline transforms explicitly listed in candidateManifest, no production source edits, not ordinary production FPS');
const file=base+'/build-dense-particle-candidate.mjs';await fs.writeFile(file,builder,{flag:'wx'});await import('../'+file);
