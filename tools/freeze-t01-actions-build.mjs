import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='reports/local/t01-20261024',run=process.argv[2]??'actions-r2';assert.match(run,/^[a-z0-9-]+$/);const out=base+'/'+run+'/frozen-web',build=JSON.parse(await fs.readFile(base+'/build.json','utf8'));await fs.mkdir(out,{recursive:false});
for(const row of build.artifacts){const bytes=await fs.readFile(build.out+'/'+row.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);await fs.writeFile(out+'/'+row.file,bytes);}
for(const file of ['asset-manifest.json','runtime-config.json'])await fs.copyFile(build.out+'/'+file,out+'/'+file);
await fs.writeFile(out+'/build.json',JSON.stringify({...build,out,frozenFor:run+' continuation, same compiled inputs and assets'},null,2));console.log(JSON.stringify({out,artifacts:build.artifacts.length}));
