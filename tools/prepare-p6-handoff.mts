import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {FAMILIES_BY_RACE} from '../src/data/races';
import {HEROES} from '../src/data/heroes';
import {ELITES} from '../src/data/elites';
const destination=path.resolve('dist/P6-Coze-Application-20261006'),patch=path.resolve('dist/P6-Coze-Resources-From-Live-20261006'),web=path.resolve('dist/web');
await fs.mkdir(destination,{recursive:process.argv.includes('--refresh')});await fs.mkdir(patch,{recursive:process.argv.includes('--refresh')}); // Only this in-progress P6 candidate may be refreshed.
const release=JSON.parse(await fs.readFile(path.join(web,'web-release.json'),'utf8')),manifest=JSON.parse(await fs.readFile(path.join(web,release.manifest),'utf8'));
const baseline=JSON.parse(await fs.readFile('reports/local/p6-20261006/coze-baseline-manifest.json','utf8')),previous=new Set(Object.values(baseline.assets).map((a:any)=>a.sha256));
const records=Object.entries(manifest.assets) as [string,{url:string;sha256:string;bytes:number;mime:string}][],resourcePaths=new Set(records.map(([,a])=>a.url));
async function copyTree(from:string,to:string,exclude=new Set<string>(),prefix=''){
 for(const e of await fs.readdir(from,{withFileTypes:true})){const relative=prefix+e.name;if(exclude.has(relative))continue;const target=path.join(to,e.name);if(e.isDirectory()){await fs.mkdir(target,{recursive:true});await copyTree(path.join(from,e.name),target,exclude,relative+'/');}else{await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(from,e.name),target);}}
}
await copyTree(web,path.join(destination,'public'),resourcePaths);
await copyTree('tools/backend',path.join(destination,'backend'));
for(const [from,to] of [['tools/coze-web-server.mjs','coze-web-server.mjs'],['tools/apply-coze-update.mjs','apply-update.mjs'],['tools/start-coze.mjs','start-coze.mjs'],['tools/fetch-coze-resources.mjs','fetch-resources.mjs'],['docs/project/P6_COZE_DEPLOY_20261006.md','README.md'],['docs/project/P5_BACKEND_HANDOFF_20261006.md','P5_BACKEND_HANDOFF_20261006.md'],['docs/project/P5_PLAYER_DATA_NOTICE_20261006.md','PLAYER-DATA.md'],['dist/P5-Coze-Application-20261006/.env.example','.env.example']])await fs.copyFile(from,path.join(destination,to));
const pkg=JSON.parse(await fs.readFile('dist/P5-Coze-Application-20261006/package.json','utf8')),lock=JSON.parse(await fs.readFile('dist/P5-Coze-Application-20261006/package-lock.json','utf8'));
pkg.name=lock.name=lock.packages[''].name='sc2-p6-application';pkg.version=lock.version=lock.packages[''].version='0.6.0';pkg.scripts.start='node start-coze.mjs';
await fs.writeFile(path.join(destination,'package.json'),JSON.stringify(pkg,null,2)+'\n');await fs.writeFile(path.join(destination,'package-lock.json'),JSON.stringify(lock,null,2)+'\n');
const raceModels=new Map<string,string>();for(const [race,families] of Object.entries(FAMILIES_BY_RACE))for(const id of families)raceModels.set(id,race);
for(const hero of Object.values(HEROES))raceModels.set(hero.model,hero.race);for(const elite of Object.values(ELITES))raceModels.set(elite.model,raceModels.get(elite.family)!);
for(const [key,race] of Object.entries({scv:'terran',barracks:'terran',drone:'zerg',hatchery:'zerg',probe:'protoss',pylon:'protoss',interceptor:'protoss'}))raceModels.set(key,race);
function group(id:string){if(id.startsWith('map.')||id.startsWith('doodad.')||id.startsWith('texture.'))return 'campaign';if(id.startsWith('model.fort.'))return 'endless';if(id.startsWith('model.')){const key=id.slice(6),match=[...raceModels.keys()].sort((a,b)=>b.length-a.length).find(k=>key===k||key.startsWith(k+'.'));if(match)return raceModels.get(match)!;if(['hive','egg','projectile.hydralisk'].some(k=>key===k||key.startsWith(k+'.')))return 'enemies';}return 'common';}
const physical=new Map<string,any>();for(const [id,a] of records){let row=physical.get(a.url);if(!row){row={...a,groups:new Set<string>(),ids:[],gitPath:'deploy/runtime/'+a.url};physical.set(a.url,row);}row.ids.push(id);row.groups.add(group(id));if(FAMILIES_BY_RACE.zerg.some(f=>id==='model.'+f||id.startsWith('model.'+f+'.')))row.groups.add('enemies');}
const files=[...physical.values()].map(f=>({...f,groups:[...f.groups]})).sort((a,b)=>a.url.localeCompare(b.url)),delta=files.filter(f=>!previous.has(f.sha256));
for(const row of files){const bytes=await fs.readFile(path.join(web,row.url));if(bytes.length!==row.bytes||createHash('sha256').update(bytes).digest('hex')!==row.sha256)throw Error('Resource mismatch: '+row.url);if(!previous.has(row.sha256)){const to=path.join(patch,row.url);await fs.mkdir(path.dirname(to),{recursive:true});await fs.writeFile(to,bytes);}}
await fs.writeFile(path.join(destination,'resource-groups.json'),JSON.stringify({version:1,release:release.release,groups:['common','terran','zerg','protoss','enemies','campaign','endless'],files},null,2));
const deltaRecord={from:baseline.release,to:release.release,appBuildId:release.appBuildId,files:delta,reused:files.length-delta.length,newResourceBytes:delta.reduce((n,f)=>n+f.bytes,0),retainedOldResources:true};
await fs.writeFile(path.join(destination,'resource-delta.json'),JSON.stringify(deltaRecord,null,2));await fs.writeFile(path.join(patch,'resource-delta.json'),JSON.stringify(deltaRecord,null,2));
async function list(dir:string,prefix=''):Promise<string[]>{const out:string[]=[];for(const e of await fs.readdir(dir,{withFileTypes:true}))out.push(...(e.isDirectory()?await list(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]));return out;}
const appFiles=[];for(const relative of await list(destination)){if(relative==='delivery.json')continue;const b=await fs.readFile(path.join(destination,relative));appFiles.push({path:relative,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}
const packageBuildId=createHash('sha256').update(JSON.stringify([...appFiles].sort((a,b)=>a.path.localeCompare(b.path)))).digest('hex');
await fs.writeFile(path.join(destination,'delivery.json'),JSON.stringify({status:'local P6 release candidate; not deployed',appBuildId:release.appBuildId,packageBuildId,runSchema:release.runSchema,release:release.release,appFiles,assets:files.length,resourceBytes:release.assetBytes,includesDatabase:false,includesAccounts:false,resourcesIncluded:0},null,2));
console.log(JSON.stringify({destination,packageBuildId,appFiles:appFiles.length,patch,deltaFiles:delta.length,deltaBytes:deltaRecord.newResourceBytes}));
