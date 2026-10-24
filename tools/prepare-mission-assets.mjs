import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const definitions=[...JSON.parse(await fs.readFile('tools/mission-models.json','utf8')),...JSON.parse(await fs.readFile('tools/fun-models.json','utf8'))];
const imported=JSON.parse(await fs.readFile('assets/private/m3-pack.json','utf8')).manifest;
const saved=JSON.parse(await fs.readFile('deploy/runtime/mission-assets.json','utf8')).records;
const records=[];
for(const d of definitions){
 const r=d.id.startsWith('model.fun-')?saved.find(r=>r.id===d.id):imported.find(r=>r.id===d.id);if(!r)throw Error('Missing mission import '+d.id);
 const bytes=await fs.readFile(r.packedFile).catch(error=>r.gitPath?fs.readFile(r.gitPath):Promise.reject(error)),packedSha256=sha(bytes),json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
 if(!json.nodes.some(n=>n.extras?.sc2FortMaterials))throw Error('Missing native material tracks '+d.id);
 const gitPath='deploy/runtime/mission-assets/'+packedSha256+'.glb';await fs.mkdir('deploy/runtime/mission-assets',{recursive:true});await fs.writeFile(gitPath,bytes);
 records.push({...r,gitPath,bytes:bytes.length,packedSha256,url:r.packedFile.replace('public/',''),status:'available'});
}
const source='// Task-only additions; original source and hashes are recorded in deploy/runtime/mission-assets.json.\nexport const MISSION_ASSETS = '+JSON.stringify(records.map(r=>({id:r.id,kind:r.kind,status:r.status,url:r.url,required:false})),null,2)+';\n';
await fs.writeFile('src/assets/mission-assets.ts',source);await fs.writeFile('deploy/runtime/mission-assets.json',JSON.stringify({version:1,generatedSha256:sha(source),records},null,2)+'\n');
console.log(JSON.stringify(records.map(r=>({id:r.id,bytes:r.bytes,sha:r.packedSha256}))));
