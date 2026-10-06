import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Assemble a new immutable application package. Never deploys, installs or overwrites a release.
const arg=process.argv.indexOf('--out');
const destination=path.resolve(arg>=0?process.argv[arg+1]:'dist/Current-Coze-Application-20261006');
const web=path.resolve('dist/web'),baseline=path.resolve('deploy/coze');
const relative=path.relative(path.resolve('dist'),destination);
if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw Error('Output must be a new folder inside dist');
await fs.mkdir(destination,{recursive:false});
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const release=JSON.parse(await fs.readFile(path.join(web,'web-release.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(web,release.manifest),'utf8'));
const resources=new Set<string>(Object.values(manifest.assets).map((a:any)=>a.url));
async function copy(from:string,to:string,exclude=new Set<string>(),prefix=''){
 for(const e of await fs.readdir(from,{withFileTypes:true})){
  const name=prefix+e.name;if(exclude.has(name))continue;const dest=path.join(to,e.name);
  if(e.isDirectory()){await fs.mkdir(dest,{recursive:true});await copy(path.join(from,e.name),dest,exclude,name+'/');}
  else{await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join(from,e.name),dest);}
 }
}
await copy(web,path.join(destination,'public'),resources);
await copy('tools/backend',path.join(destination,'backend'));
for(const [from,to] of [
 ['tools/coze-web-server.mjs','coze-web-server.mjs'],['tools/apply-coze-update.mjs','apply-update.mjs'],
 ['tools/start-coze.mjs','start-coze.mjs'],['tools/fetch-coze-resources.mjs','fetch-resources.mjs'],
 ['docs/project/CURRENT_COZE_HANDOFF_20261006.md','README.md'],
 ['docs/project/P6_COZE_DEPLOY_20261006.md','P6_COZE_DEPLOY_20261006.md'],
 ['docs/project/P5_BACKEND_HANDOFF_20261006.md','P5_BACKEND_HANDOFF_20261006.md'],
 ['docs/project/P5_PLAYER_DATA_NOTICE_20261006.md','PLAYER-DATA.md'],
 ['deploy/coze/.env.example','.env.example']
])await fs.copyFile(from,path.join(destination,to));
const pkg=JSON.parse(await fs.readFile(path.join(baseline,'package.json'),'utf8'));
const lock=JSON.parse(await fs.readFile(path.join(baseline,'package-lock.json'),'utf8'));
pkg.name=lock.name=lock.packages[''].name='sc2-survivors-current-application';
pkg.version=lock.version=lock.packages[''].version='0.6.1';
for(const [name,data]of [['package.json',pkg],['package-lock.json',lock]]as const)await fs.writeFile(path.join(destination,name),JSON.stringify(data,null,2)+'\n');
const groups=JSON.parse(await fs.readFile(path.join(baseline,'resource-groups.json'),'utf8'));
if(groups.release!==release.release||groups.files.length!==resources.size)throw Error('Resource release must match the preserved P6 baseline');
for(const row of groups.files){const b=await fs.readFile(path.join(web,row.url));if(!resources.has(row.url)||b.length!==row.bytes||sha(b)!==row.sha256)throw Error('Resource mismatch: '+row.url);}
await fs.writeFile(path.join(destination,'resource-groups.json'),JSON.stringify(groups,null,2));
await fs.writeFile(path.join(destination,'resource-delta.json'),JSON.stringify({from:groups.release,to:release.release,appBuildId:release.appBuildId,files:[],reused:groups.files.length,newResourceBytes:0,retainedOldResources:true},null,2));
async function list(dir:string,prefix=''):Promise<string[]>{const out:string[]=[];for(const e of await fs.readdir(dir,{withFileTypes:true}))out.push(...(e.isDirectory()?await list(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]));return out;}
const appFiles=[];for(const file of await list(destination)){const b=await fs.readFile(path.join(destination,file));appFiles.push({path:file,bytes:b.length,sha256:sha(b)});}
const packageBuildId=sha(JSON.stringify([...appFiles].sort((a,b)=>a.path.localeCompare(b.path))));
await fs.writeFile(path.join(destination,'delivery.json'),JSON.stringify({status:'local current-rule cleanup candidate; not deployed',appBuildId:release.appBuildId,packageBuildId,runSchema:release.runSchema,profileVersion:6,release:release.release,appFiles,assets:groups.files.length,resourceBytes:release.assetBytes,includesDatabase:false,includesAccounts:false,resourcesIncluded:0},null,2));
console.log(JSON.stringify({destination,packageBuildId,appBuildId:release.appBuildId,runSchema:release.runSchema,appFiles:appFiles.length,resourceAdditions:0,deployed:false}));
