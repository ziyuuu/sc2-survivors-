import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),base=path.join(root,'reports/local/integration-i03-20261022');
const hash=b=>createHash('sha256').update(b).digest('hex');
await fs.mkdir(base,{recursive:true});
try{await fs.access(path.join(base,'before.json'));throw Error('I03 baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
async function walk(rel){const out=[];for(const e of await fs.readdir(path.join(root,rel),{withFileTypes:true})){const p=rel+'/'+e.name;if(e.isDirectory())out.push(...await walk(p));else if(e.isFile())out.push(p);}return out;}
const names=[...await walk('src'),...await walk('test'),'package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','fun-lab.html','docs/project/performance-board.json','docs/DESIGN.md','docs/ARCHITECTURE.md','AGENTS.md','README.md'];
const files=[];for(const name of names.sort()){const bytes=await fs.readFile(path.join(root,name)),dest=path.join(base,'before',name);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);files.push({path:name,bytes:bytes.length,sha256:hash(bytes)});}
const current='dist/SC2-Survivors-Current-20261006.html';
const report={at:new Date().toISOString(),root,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:execFileSync('git',['status','--short','--branch'],{encoding:'utf8'}),scope:'I03 all-content lawful reachability, actual effect paths and dead ends. Preserve existing main camera/input/UI, performance, source assets and Current. Persistence D05 remains deferred.',current:{path:current,sha256:hash(await fs.readFile(path.join(root,current)))},files};
await fs.writeFile(path.join(base,'before.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({base,files:files.length,bytes:files.reduce((n,r)=>n+r.bytes,0),head:report.head,current:report.current.sha256}));
