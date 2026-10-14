import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function loadEnvironmentScenery({restore=false,check=false}={}){
 const catalog=JSON.parse(await fs.readFile('deploy/runtime/environment-scenery.json','utf8'));
 assert.equal(catalog.version,1);assert.equal(new Set(catalog.records.map(r=>r.id)).size,catalog.records.length);
 assert.equal(sha((await fs.readFile('src/assets/environment-scenery.ts','utf8')).replace(/\r\n/g,'\n')),catalog.generatedSha256);
 for(const r of catalog.records){
  assert.match(r.id,/^environment\.sample\.[a-z0-9_]+$/);assert.equal(r.gitPath,'deploy/runtime/assets/'+r.packedSha256+'.png');assert.equal(r.packedFile,'public/'+r.url);assert.match(r.url,/^assets\/environment-samples\/[a-z0-9_]+\.png$/);
  const bytes=await fs.readFile(r.gitPath);assert.equal(sha(bytes),r.packedSha256,r.id);assert.equal(bytes.length,r.bytes);
  const current=await fs.readFile(r.packedFile).catch(e=>{if(e.code!=='ENOENT')throw e;return null});
  if(current)assert.equal(sha(current),r.packedSha256,'Preserving changed scenery: '+r.id);
  else{assert.ok(restore&&!check,'Missing restored scenery: '+r.id);await fs.mkdir(path.dirname(r.packedFile),{recursive:true});await fs.writeFile(r.packedFile,bytes);}
 }
 return catalog.records;
}
