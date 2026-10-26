import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const additions=JSON.parse(await fs.readFile('tools/t01-mission-death-models.json','utf8'));
const definitions=JSON.parse(await fs.readFile('tools/mission-models.json','utf8'));
for(const r of additions)if(!definitions.some(d=>d.id===r.id))definitions.push(r);
await fs.writeFile('tools/mission-models.json',JSON.stringify(definitions,null,2)+'\n');
execFileSync(process.execPath,['tools/import-m3-pack.mjs',...additions.map(d=>d.id)],{stdio:'inherit',windowsHide:true});
const imported=JSON.parse(await fs.readFile('assets/private/m3-pack.json','utf8')).manifest,registry=JSON.parse(await fs.readFile('deploy/runtime/mission-assets.json','utf8'));
for(const d of additions){const r=imported.find(r=>r.id===d.id);if(!r)throw Error('Missing original mission death '+d.id);const bytes=await fs.readFile(r.packedFile),packedSha256=createHash('sha256').update(bytes).digest('hex'),gitPath='deploy/runtime/mission-assets/'+packedSha256+'.glb';await fs.writeFile(gitPath,bytes);registry.records=registry.records.filter(r=>r.id!==d.id);registry.records.push({...r,gitPath,bytes:bytes.length,packedSha256,url:r.packedFile.replace('public/',''),status:'available'});}
const source='// Task-only additions; original source and hashes are recorded in deploy/runtime/mission-assets.json.\nexport const MISSION_ASSETS = '+JSON.stringify(registry.records.map(r=>({id:r.id,kind:r.kind,status:r.status,url:r.url,required:false})),null,2)+';\n';
registry.generatedSha256=createHash('sha256').update(source).digest('hex');await fs.writeFile('src/assets/mission-assets.ts',source);await fs.writeFile('deploy/runtime/mission-assets.json',JSON.stringify(registry,null,2)+'\n');
