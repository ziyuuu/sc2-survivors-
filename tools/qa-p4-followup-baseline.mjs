import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
const dir='reports/local/p4-followup-20261005';
export async function fingerprint(path){const h=createHash('sha256');let bytes=0;for await(const b of createReadStream(path)){h.update(b);bytes+=b.length;}return {path,bytes,sha256:h.digest('hex')};}
async function files(dir){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true}))out.push(...(e.isDirectory()?await files(dir+'/'+e.name):[dir+'/'+e.name]));return out;}
await fs.mkdir(dir,{recursive:true});
const prior=JSON.parse(await fs.readFile('reports/local/protoss-elites-auras-20261005/delivery.json','utf8'));
const artifacts=[];for(const a of [...prior.preservation.artifacts,...prior.preservation.outputs])artifacts.push(await fingerprint(a.path));
const source=[];for(const p of (await files('src')).sort())source.push(await fingerprint(p));
const proposals=[];for(const p of ['docs/project/TEAM_AURA_REBALANCE_VALUES_20261005.json','docs/project/NEXT_ITERATION_P4_VALUES_20261005.json'])proposals.push(await fingerprint(p));
const web=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));
await fs.writeFile(dir+'/baseline.json',JSON.stringify({source,artifacts,proposals,web,scope:'User requested continuing work after P4. Complete remaining P4-D/E then local P5. Preserve all approved numerical rules, hero/elite presentation, resources and historical artifacts.'},null,2),{flag:'wx'});
console.log(JSON.stringify({source:source.length,artifacts:artifacts.length,release:web.release}));
