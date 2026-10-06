import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='reports/local/hellion-knight-correction-20261005';
const sha=b=>createHash('sha256').update(b).digest('hex');
async function fingerprint(path){const b=await fs.readFile(path);return {path,bytes:b.length,sha256:sha(b)};}
async function files(dir){const entries=await fs.readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]))).flat();}
await fs.mkdir(dir,{recursive:true});
const prior=JSON.parse(await fs.readFile('reports/local/protoss-effects-correction-20261005/delivery.json','utf8'));
const source=await Promise.all((await files('src')).sort().map(fingerprint));
const artifacts=await Promise.all(prior.artifacts.map(a=>fingerprint(a.path)));
const web=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));
await fs.writeFile(dir+'/baseline.json',JSON.stringify({source,artifacts,web,scope:'Protoss correction accepted by user; only Hellion hell-knight fan range/fill is questioned.'},null,2));
for(const p of ['src/simulation/combat/terran-elite-runtime.ts','src/render/effects/terran-elite-effects.ts','src/render/effects/terran-elite-materials.ts'])await fs.copyFile(p,dir+'/'+p.split('/').at(-1)+'.before');
console.log(JSON.stringify({source:source.length,artifacts:artifacts.length,release:web.release}));
