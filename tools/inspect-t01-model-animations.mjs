import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='reports/local/t01-20261024',sha=b=>createHash('sha256').update(b).digest('hex');
const build=JSON.parse(await fs.readFile(base+'/build.json','utf8')),assets=JSON.parse(await fs.readFile(build.out+'/asset-manifest.json','utf8')).assets;
const file=base+'/basic-action-source-r1.json';let rows=[];try{rows=JSON.parse(await fs.readFile(file,'utf8'));}catch{}
for(const key of process.argv.slice(2)){
 assert.match(key,/^[a-z0-9._-]+$/);const id='model.'+key,asset=assets[id];assert.ok(asset,'No registered asset: '+id);
 const resource=build.resources.find(r=>r.url===asset.url);assert.ok(resource);const bytes=await fs.readFile(resource.source);
 assert.equal(sha(bytes),resource.sha256);assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(16),0x4e4f534a);
 const data=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8')),animations=(data.animations??[]).map(a=>a.name);
 const row={id,source:resource.source,sha256:resource.sha256,animations,namedBirth:animations.filter(n=>/birth|spawn/i.test(n)),namedHit:animations.filter(n=>/^(hit|hurt|wound|flinch)(\s|$)/i.test(n)),scope:'Actual active asset animation names; source absence is not a visual failure. Profile-specific mappings and material feedback are checked separately.'};
 const index=rows.findIndex(r=>r.id===id);if(index<0)rows.push(row);else rows[index]=row;
 console.log(JSON.stringify({id,animations:animations.length,namedBirth:row.namedBirth,namedHit:row.namedHit}));
}
await fs.writeFile(file,JSON.stringify(rows,null,2));
