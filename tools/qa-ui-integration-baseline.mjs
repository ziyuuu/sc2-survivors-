import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const out='reports/local/ui-integration-20261006';
await fs.mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
async function collect(folder){const rows=[];for(const e of await fs.readdir(folder,{withFileTypes:true})){const p=folder+'/'+e.name;if(e.isDirectory())rows.push(...await collect(p));else{const b=await fs.readFile(p);rows.push({path:p,bytes:b.length,sha256:sha(b)});}}return rows;}
const source=await collect('src'),ui=await collect('preview/ui-20261003');
const web=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));
const manifest=JSON.parse(await fs.readFile('dist/web/'+web.manifest,'utf8'));
await fs.writeFile(out+'/baseline.json',JSON.stringify({at:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source,ui,web,manifest},null,2),{flag:'wx'});
console.log(JSON.stringify({source:source.length,protectedPreview:ui.length,release:web.release}));
