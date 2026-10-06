import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

/** Copies a verified application into Git's delivery directory. Does not deploy or push. */
const arg=process.argv.indexOf('--app');
if(arg<0||!process.argv[arg+1])throw Error('Usage: node --import tsx tools/publish-coze-tree.mts --app <verified application package>');
const source=path.resolve(process.argv[arg+1]),destination=path.resolve('deploy/coze'),web=path.resolve('dist/web');
const sha=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
const inside=(base:string,relative:string)=>{const target=path.resolve(base,relative),p=path.relative(base,target);if(!p||p.startsWith('..')||path.isAbsolute(p))throw Error('Path escapes package: '+relative);return target;};
if(source===destination)throw Error('The verified input must be separate from the Git delivery directory');
const delivery=JSON.parse(await fs.readFile(path.join(source,'delivery.json'),'utf8'));
const names=new Set<string>();
for(const row of delivery.appFiles){
 if(names.has(row.path))throw Error('Duplicate application file');names.add(row.path);
 const bytes=await fs.readFile(inside(source,row.path));if(bytes.length!==row.bytes||sha(bytes)!==row.sha256)throw Error('Application package differs: '+row.path);
}
for(const required of ['package.json','package-lock.json','backend/service.mjs','public/web-release.json','.env.example'])if(!names.has(required))throw Error('Incomplete application package: '+required);
if(sha(JSON.stringify([...delivery.appFiles].sort((a,b)=>a.path.localeCompare(b.path))))!==delivery.packageBuildId)throw Error('Application identity differs');
const release=JSON.parse(await fs.readFile(path.join(source,'public/web-release.json'),'utf8'));
if(release.appBuildId!==delivery.appBuildId||release.release!==delivery.release||release.runSchema!==delivery.runSchema)throw Error('Application release differs');
const groups=JSON.parse(await fs.readFile(path.join(source,'resource-groups.json'),'utf8'));
if(groups.release!==release.release||groups.files.length!==delivery.assets)throw Error('Resource groups differ');
for(const row of groups.files){const bytes=await fs.readFile(inside(web,row.url));if(bytes.length!==row.bytes||sha(bytes)!==row.sha256)throw Error('Web resource differs: '+row.url);}
const prior=JSON.parse(await fs.readFile(path.join(destination,'delivery.json'),'utf8'));
await fs.mkdir(destination,{recursive:true});
for(const row of delivery.appFiles){const output=inside(destination,row.path);await fs.mkdir(path.dirname(output),{recursive:true});await fs.copyFile(inside(source,row.path),output);}
await fs.copyFile(path.join(source,'delivery.json'),path.join(destination,'delivery.json'));
// Only obsolete files explicitly recorded in the previous generated application are removed.
for(const row of prior.appFiles)if(!names.has(row.path))await fs.rm(inside(destination,row.path),{force:true});
let added=0;
for(const row of groups.files){
 const output=inside(path.resolve('deploy/runtime'),row.url),existing=await fs.readFile(output).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
 if(existing){if(existing.length!==row.bytes||sha(existing)!==row.sha256)throw Error('Existing Git resource differs: '+row.url);continue;}
 await fs.mkdir(path.dirname(output),{recursive:true});await fs.copyFile(inside(web,row.url),output);added++;
}
console.log(JSON.stringify({app:'deploy/coze',appBuildId:delivery.appBuildId,packageBuildId:delivery.packageBuildId,runSchema:delivery.runSchema,resources:groups.files.length,addedResources:added,deployed:false}));
