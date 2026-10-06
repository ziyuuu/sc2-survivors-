import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const out='reports/local/fixed-performance-20261006';
await fs.mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
async function collect(dir){const rows=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const file=dir+'/'+e.name;if(e.isDirectory())rows.push(...await collect(file));else{const b=await fs.readFile(file);rows.push({path:file,bytes:b.length,sha256:sha(b)});}}return rows;}
const source=await collect('src'),preview=await collect('preview/ui-20261003'),web=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8')),manifest=JSON.parse(await fs.readFile('dist/web/'+web.manifest,'utf8'));
await fs.writeFile(out+'/baseline.json',JSON.stringify({at:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source,preview,web,manifest},null,2),{flag:'wx'});
// Immutable small baseline application; content-addressed resource bytes remain in dist/web.
await fs.cp('deploy/coze/public',out+'/baseline-web',{recursive:true,errorOnExist:true,force:false});
console.log(JSON.stringify({source:source.length,preview:preview.length,appBuildId:web.appBuildId}));
