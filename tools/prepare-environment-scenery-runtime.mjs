import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const source=JSON.parse(await fs.readFile('src/render/terrain/environment-sample-assets.json','utf8'));
const records=[];
for(const r of source.records){
 const bytes=await fs.readFile(r.packedFile);assert.equal(sha(bytes),r.sha256);assert.equal(bytes.length,r.bytes);
 const gitPath='deploy/runtime/assets/'+r.sha256+'.png',prior=await fs.readFile(gitPath).catch(e=>{if(e.code!=='ENOENT')throw e;return null});
 if(prior)assert.equal(sha(prior),r.sha256);else await fs.writeFile(gitPath,bytes,{flag:'wx'});
 records.push({...r,kind:'environment-texture',status:'available',required:true,packedSha256:r.sha256,gitPath});
}
const generated='// Original scenery channels and shore pixels, shared with the accepted environment samples.\nexport const ENVIRONMENT_SCENERY_ASSETS = '+JSON.stringify(records.map(({id,kind,status,required,url})=>({id,kind,status,required,url})),null,2)+';\n';
await fs.writeFile('src/assets/environment-scenery.ts',generated);
await fs.writeFile('deploy/runtime/environment-scenery.json',JSON.stringify({version:1,generatedSha256:sha(generated),records},null,2)+'\n');
console.log(JSON.stringify({records:records.length,bytes:records.reduce((n,r)=>n+r.bytes,0)}));
