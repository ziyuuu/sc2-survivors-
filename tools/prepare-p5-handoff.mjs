import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),destination=path.resolve('dist/P5-Coze-Application-20261006'),web=path.resolve('dist/web');
if(path.relative(path.resolve('dist'),destination)!=='P5-Coze-Application-20261006')throw Error('Unexpected output directory');
await fs.mkdir(destination); // Never replace an existing delivery tree.
const release=JSON.parse(await fs.readFile(path.join(web,'web-release.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(web,release.manifest),'utf8'));
const resourcePaths=new Set(Object.values(manifest.assets).map(a=>a.url));
async function copyTree(from,to,exclude=new Set(),relative=''){
 for(const entry of await fs.readdir(from,{withFileTypes:true})){
  const rel=relative+entry.name;if(exclude.has(rel))continue;
  const target=path.join(to,entry.name);if(entry.isDirectory()){await fs.mkdir(target,{recursive:true});await copyTree(path.join(from,entry.name),target,exclude,rel+'/');}
  else{await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(from,entry.name),target);}
 }
}
await copyTree(web,path.join(destination,'public'),resourcePaths);
await copyTree(path.join(root,'tools/backend'),path.join(destination,'backend'));
await fs.copyFile('tools/coze-web-server.mjs',path.join(destination,'coze-web-server.mjs'));
await fs.copyFile('docs/project/P5_BACKEND_HANDOFF_20261006.md',path.join(destination,'README.md'));
await fs.copyFile('docs/project/P5_PLAYER_DATA_NOTICE_20261006.md',path.join(destination,'PLAYER-DATA.md'));
const dependencies=JSON.parse(await fs.readFile('package.json','utf8'));
await fs.writeFile(path.join(destination,'package.json'),JSON.stringify({name:'sc2-p5-application',version:'0.5.0',private:true,type:'module',engines:{node:'>=22'},scripts:{start:'node coze-web-server.mjs',backend:'node backend/cli.mjs'},dependencies:{pg:dependencies.dependencies.pg},devDependencies:{'@electric-sql/pglite':dependencies.devDependencies['@electric-sql/pglite']}},null,2)+'\n');
await fs.writeFile(path.join(destination,'.env.example'),`# Disabled until actual production settings are supplied. No defaults or credentials.
SC2_BACKEND_ENABLED=0
SC2_LOCAL_DEV=0
PORT=3000
# Existing verified resources, or an HTTPS asset directory. Keep the current deployment choice.
ASSET_ROOT=
ASSET_BASE_URL=
SC2_PUBLIC_ORIGIN=
DATABASE_URL=
SC2_PRIVACY_OPERATOR=
SC2_PRIVACY_CONTACT=
SC2_BACKUP_RETENTION_DAYS=
# Absolute independently durable path, separate from restored database backups.
SC2_DELETION_JOURNAL=
# Local development only; never use ephemeral container storage for production.
SC2_PGLITE_DIR=
`);
await fs.writeFile(path.join(destination,'resource-delta.json'),JSON.stringify({from:release.release,to:release.release,appBuildId:release.appBuildId,resourceFiles:resourcePaths.size,resourceBytes:release.assetBytes,newResourceFiles:[],newResourceBytes:0,preserveExistingResources:true},null,2)+'\n');
async function files(dir,prefix=''){const values=[];for(const e of await fs.readdir(dir,{withFileTypes:true}))values.push(...(e.isDirectory()?await files(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]));return values;}
const entries=[];for(const file of await files(destination)){const bytes=await fs.readFile(path.join(destination,file));entries.push({path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await fs.writeFile(path.join(destination,'delivery.json'),JSON.stringify({status:'local application handoff; not deployed',appBuildId:release.appBuildId,release:release.release,runSchema:release.runSchema,includesDatabase:false,includesAccounts:false,resourcesIncluded:0,files:entries},null,2)+'\n');
console.log(JSON.stringify({destination,files:entries.length,bytes:entries.reduce((n,e)=>n+e.bytes,0),resourceBytesIncluded:0}));
