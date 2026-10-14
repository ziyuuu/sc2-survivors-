import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root='reports/local/7a-20261013/baseline';
await fs.access(root).then(()=>{throw Error('7A baseline already exists');},e=>{if(e.code!=='ENOENT')throw e;});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const delivery=JSON.parse(await fs.readFile('reports/local/refraction-science-20261013/delivery.json','utf8'));
const web=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));
if(web.appBuildId!==delivery.appBuildId)throw Error('Current Web differs from the accepted 0.6.25 baseline');
await fs.mkdir(root,{recursive:true});
const source=[],protectedFiles=[];
async function visit(folder,copy){
 for(const entry of (await fs.readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const file=folder+'/'+entry.name;if(entry.isDirectory()){await visit(file,copy);continue;}if(!entry.isFile())continue;
  const bytes=await fs.readFile(file),row={file,bytes:bytes.length,sha256:hash(bytes)};protectedFiles.push(row);
  if(copy){source.push(row);const to=root+'/source/'+file;await fs.mkdir(path.dirname(to),{recursive:true});await fs.writeFile(to,bytes);}
 }
}
for(const folder of ['src','tools','test'])await visit(folder,true);
for(const folder of ['docs','dev','preview'])await fs.access(folder).then(()=>visit(folder,false),e=>{if(e.code!=='ENOENT')throw e;});
for(const file of ['AGENTS.md','README.md','package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html']){
 const bytes=await fs.readFile(file),row={file,bytes:bytes.length,sha256:hash(bytes)};source.push(row);protectedFiles.push(row);
 await fs.writeFile(root+'/source/'+file,bytes);
}
const assets=JSON.parse(await fs.readFile('dist/web/'+web.manifest,'utf8'));
const assetNames=new Set(Object.values(assets.assets).map(a=>a.url));
async function copyWeb(folder){for(const e of await fs.readdir(folder,{withFileTypes:true})){
 const file=folder+'/'+e.name;if(e.isDirectory()){await copyWeb(file);continue;}const rel=path.relative('dist/web',file).replaceAll('\\','/');
 if(assetNames.has(rel))continue;const to=root+'/web/'+rel;await fs.mkdir(path.dirname(to),{recursive:true});await fs.copyFile(file,to);
}}
await copyWeb('dist/web');
const htmlBytes=await fs.readFile(delivery.html.path);if(hash(htmlBytes)!==delivery.html.sha256)throw Error('Named baseline HTML changed');
await fs.copyFile('reports/local/offline-pack.json',root+'/offline-pack.json');
await fs.copyFile('reports/local/refraction-science-20261013/delivery.json',root+'/delivery.json');
const report={at:new Date().toISOString(),version:'0.6.25',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:execFileSync('git',['status','--porcelain=v1'],{encoding:'utf8'}),web,html:delivery.html,assetRoot:'deploy/runtime',source,protectedFiles,assets:assets.assets};
await fs.writeFile(root+'/baseline.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({baseline:root,source:source.length,protected:protectedFiles.length,web:web.appBuildId,html:delivery.html.sha256,assetCount:assetNames.size}));
