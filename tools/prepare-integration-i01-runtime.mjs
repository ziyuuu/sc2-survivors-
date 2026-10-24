import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root='D:/星际',fun='C:/Users/zyuu/.codex/worktrees/mission/星际',out=root+'/reports/local/integration-i01-20261022';
const sha=b=>createHash('sha256').update(b).digest('hex'),rows=[];
const sources=new Map();
for(const r of JSON.parse(fs.readFileSync(root+'/tools/fun-dependencies.json','utf8')))sources.set(r.installFile,r.sha256);
for(const r of Object.values(JSON.parse(fs.readFileSync(root+'/src/render/effects/source/catalog.json','utf8'))))sources.set(r.source,r.sourceSha256);
for(const [p,expected] of sources){if(!p.startsWith('assets/private/')||p.includes('..'))throw Error('Unexpected provenance path '+p);const dest=root+'/'+p;if(fs.existsSync(dest)){if(sha(fs.readFileSync(dest))!==expected)throw Error('Existing source mismatch '+p);continue;}const bytes=fs.readFileSync(fun+'/'+p);if(sha(bytes)!==expected)throw Error('Fun source mismatch '+p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);rows.push({path:p,bytes:bytes.length,sha256:expected});}
fs.writeFileSync(out+'/source-provenance-added.json',JSON.stringify(rows,null,2));
let build=fs.readFileSync(root+'/reports/local/fun-third-feedback-20261022/build-web.mjs','utf8');
build=build.replaceAll('C:/Users/zyuu/.codex/worktrees/mission/星际',root).replace("branch:'feat/fun-gameplay'","branch:'main (local I01 integration)'").replaceAll('FUN_REVIEW_VERSION','I01_VERSION');
fs.writeFileSync(out+'/build-web.mjs',build);
let serve=fs.readFileSync(root+'/reports/local/fun-third-feedback-20261022/serve.mjs','utf8');
serve=serve.replaceAll('FUN_REVIEW_VERSION','I01_VERSION').replaceAll('4479','4480').replace('Final fun lab','I01 integrated preview');
fs.writeFileSync(out+'/serve.mjs',serve);
console.log(JSON.stringify({addedSourceFiles:rows.length,bytes:rows.reduce((n,r)=>n+r.bytes,0)}));
