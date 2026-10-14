import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const out=process.argv[2];assert.ok(out?.startsWith('reports/local/mvp5-lifecycle-20261014/')&&!out.includes('..'));
await fs.access(out).then(()=>{throw Error('Preserve existing fixture');},e=>{if(e.code!=='ENOENT')throw e});await fs.mkdir(out,{recursive:false});
const result=await build({entryPoints:['preview/environment-full-map-20261014/main.ts'],outfile:out+'/sample.js',bundle:true,format:'esm',target:'es2022',define:{BEFORE:'false'},metafile:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),inputs=[];for(const file of Object.keys(result.metafile.inputs))inputs.push({file,sha256:sha(await fs.readFile(file))});await fs.writeFile(out+'/build.json',JSON.stringify({at:new Date().toISOString(),inputs,bundle:{file:out+'/sample.js',sha256:sha(await fs.readFile(out+'/sample.js'))}},null,2));console.log('Built current production map fixture: '+out);
